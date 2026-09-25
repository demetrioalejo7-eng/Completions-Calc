// Shared data loading / prediction / fitting helpers for the CT weight
// calibration (see calibrate.mjs). Field data lives in the git-ignored
// field-data/ folder.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWellPath, buildString, makeCasing, forcesAtDepth, surfaceWeight, annularFrictionGradient, DEFAULT_MODEL } from '../../src/calc/ctForces.js'
import { STANDARD_STRING_2375, CASING_5_21_4, DEFAULT_BHA } from '../../src/data/ctSimDefaults.js'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const dataDir = path.join(root, 'field-data')
export const FLUID_PPG = 8.4

export function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]
  return out
}

export function loadData() {
  const surveys = JSON.parse(fs.readFileSync(path.join(dataDir, 'surveys.json'), 'utf8'))
  const lines = fs.readFileSync(path.join(dataDir, 'bins.csv'), 'utf8').trim().split('\n')
  const hdr = lines[0].split(',')
  const bins = lines
    .slice(1)
    .map((l) => {
      const v = l.split(',')
      const o = {}
      hdr.forEach((h, i) => (o[h] = v[i] === '' || isNaN(Number(v[i])) ? v[i] : Number(v[i])))
      return o
    })
    .filter((b) => b.bin > 60 && Number.isFinite(b.W) && Number.isFinite(b.WHP))
  const paths = Object.fromEntries(Object.entries(surveys).map(([w, s]) => [w, buildWellPath(s, 10)]))
  return { surveys, bins, paths }
}

const STRING_DEF = process.env.CT_STRING_REVERSED
  ? { ...STANDARD_STRING_2375, sections: [...STANDARD_STRING_2375.sections].reverse().map((x) => ({ length: x.length, wallStart: x.wallEnd, wallEnd: x.wallStart })) }
  : STANDARD_STRING_2375
const string = buildString(STRING_DEF)
const casing = makeCasing(CASING_5_21_4)

// A "spec" lists the free parameters. Each parameter has a name, a start
// value and a step. Names understood by predict():
//   muRIH, muPOOH, muLatRIH, muLatPOOH (lateral multipliers, inc > 80°),
//   speedCoefRIH, speedCoefPOOH, strip_<pad>, rbt_<pad>, off_<well>,
//   ertLbfPerBpm, whpFactor
export function makePredictor(paths, { ert = 1000 } = {}) {
  return function predict(P, b) {
    const model = {
      ...DEFAULT_MODEL,
      speedCoefRIH: P.speedCoefRIH ?? 0,
      speedCoefPOOH: P.speedCoefPOOH ?? 0,
      speedDragRIH: P.speedDragRIH ?? 0,
      speedDragPOOH: P.speedDragPOOH ?? 0,
      speedSurfRIH: P.speedSurfRIH ?? 0,
      speedSurfPOOH: P.speedSurfPOOH ?? 0,
      lateralMuFactorRIH: P.muLatRIH ?? 1,
      lateralMuFactorPOOH: P.muLatPOOH ?? 1,
    }
    const p = {
      muRIH: P.muRIH,
      muPOOH: P.muPOOH,
      speedRIH: b.v,
      speedPOOH: b.v,
      rateBpm: b.Q > 0 ? b.Q : 0,
      ertLbfPerBpm: P.ertLbfPerBpm ?? ert,
      fluidPpg: FLUID_PPG,
      bha: DEFAULT_BHA,
      annularGradient: annularFrictionGradient({ rateBpm: b.Q, casingId: 4.126, od: 2.375, densityPpg: FLUID_PPG, dragReduction: model.frDragReduction }),
      whp: b.WHP * (P.whpFactor ?? 1),
      stripperLbf: P[`strip_${b.well}`] ?? P[`strip_${b.pad}`] ?? P.strip ?? 0,
      reelTensionRIH: P[`rbt_${b.well}`] ?? P[`rbt_${b.pad}`] ?? P.rbt ?? 0,
      reelTensionPOOH: P[`rbt_${b.well}`] ?? P[`rbt_${b.pad}`] ?? P.rbt ?? 0,
    }
    const r = forcesAtDepth({ path: paths[b.well], string, casing, p, model }, b.bin, b.dir)
    if (r.lockup) return NaN
    return surfaceWeight(r.surfaceForce, b.dir, p, string, model) + (P[`off_${b.well}`] ?? 0)
  }
}

export function huberLoss(predict, P, set, delta = 3000) {
  let s = 0
  for (const b of set) {
    const e = predict(P, b) - b.W
    if (!Number.isFinite(e)) {
      s += 1e8
      continue
    }
    const a = Math.abs(e)
    s += a < delta ? 0.5 * e * e : delta * (a - delta / 2)
  }
  return s / set.length
}

export function nelderMead(f, x0, step, iters = 1500) {
  const n = x0.length
  let pts = [x0.slice()]
  for (let i = 0; i < n; i++) {
    const p = x0.slice()
    p[i] += step[i]
    pts.push(p)
  }
  let vals = pts.map(f)
  for (let it = 0; it < iters; it++) {
    const idx = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b])
    pts = idx.map((i) => pts[i])
    vals = idx.map((i) => vals[i])
    const c = Array(n).fill(0)
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) c[k] += pts[i][k] / n
    const refl = c.map((v, k) => v + (v - pts[n][k]))
    const fr = f(refl)
    if (fr < vals[0]) {
      const exp = c.map((v, k) => v + 2 * (v - pts[n][k]))
      const fe = f(exp)
      if (fe < fr) [pts[n], vals[n]] = [exp, fe]
      else [pts[n], vals[n]] = [refl, fr]
    } else if (fr < vals[n - 1]) [pts[n], vals[n]] = [refl, fr]
    else {
      const con = c.map((v, k) => v + 0.5 * (pts[n][k] - v))
      const fc = f(con)
      if (fc < vals[n]) [pts[n], vals[n]] = [con, fc]
      else
        for (let i = 1; i <= n; i++) {
          pts[i] = pts[i].map((v, k) => pts[0][k] + 0.5 * (v - pts[0][k]))
          vals[i] = f(pts[i])
        }
    }
    if (it > 200 && Math.abs(vals[n] - vals[0]) < 1e-7 * Math.max(1, Math.abs(vals[0]))) break
  }
  return { x: pts[0], fx: vals[0] }
}

export function fit(predict, spec, set, iters = 1500, fixed = {}) {
  const names = spec.map((s) => s.name)
  const toP = (x) => ({ ...fixed, ...Object.fromEntries(names.map((n, i) => [n, x[i]])) })
  const f = (x) => {
    const P = toP(x)
    if ((P.muRIH ?? 0.3) < 0.03 || (P.muPOOH ?? 0.2) < 0.03 || P.muRIH > 0.9 || P.muPOOH > 0.9) return 1e30
    return huberLoss(predict, P, set)
  }
  const r = nelderMead(f, spec.map((s) => s.x0), spec.map((s) => s.step), iters)
  return { P: toP(r.x), loss: r.fx }
}

export function errorTable(predict, P, set) {
  const groups = {}
  for (const b of set) {
    const e = predict(P, b) - b.W
    ;(groups[`${b.well} ${b.dir}`] ||= []).push({ e, b })
  }
  return Object.entries(groups)
    .sort()
    .map(([k, arr]) => {
      const ok = arr.filter((a) => Number.isFinite(a.e))
      const es = ok.map((a) => a.e).sort((a, b) => a - b)
      const abs = es.map(Math.abs).sort((a, b) => a - b)
      const lat = ok.filter((a) => a.b.bin > 3500)
      return {
        k,
        n: es.length,
        bias: Math.round(es[Math.floor(es.length / 2)]),
        medAbsErr: Math.round(abs[Math.floor(abs.length / 2)]),
        p90AbsErr: Math.round(abs[Math.floor(abs.length * 0.9)]),
        lateralBias: lat.length ? Math.round(lat.reduce((s, a) => s + a.e, 0) / lat.length) : null,
        lockups: arr.length - ok.length,
      }
    })
}

export function writePred(predict, P, set, file) {
  const rows = set.map((b) => [b.well, b.pad, b.dir, b.bin, b.W, Math.round(predict(P, b)), b.v, b.WHP, b.Q].join(','))
  fs.writeFileSync(path.join(dataDir, file), 'well,pad,dir,bin,W,pred,v,WHP,Q\n' + rows.join('\n'))
}
