// Profile-likelihood calibration: the physical parameters (µ, speed and
// lateral terms) are searched with Nelder-Mead; for each candidate the
// surface-equipment offsets of every well (stripper friction and reel back
// tension, which operators set per job) are solved in closed form from the
// robust (median) RIH / POOH residuals:
//   RIH:  W = F − WHP·Ao − Fs − RBT      POOH: W = F − WHP·Ao + Fs − RBT
//
//   node tools/ct-calibration/fit_profile.mjs --train B3A2 --test C1A \
//        --params muRIH,muPOOH,speedCoefRIH,speedCoefPOOH [--fix name=v,...]
import fs from 'node:fs'
import path from 'node:path'
import { loadData, makePredictor, nelderMead, parseArgs, dataDir } from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
const trainPads = (args.train || 'B3A2,C1A').split(',')
const testPads = (args.test || '').split(',').filter(Boolean)
const START = { muRIH: 0.3, muPOOH: 0.2, speedCoefRIH: 0.1, speedCoefPOOH: 0.15, muLatRIH: 1, muLatPOOH: 1, ertLbfPerBpm: Number(args.ert ?? 1000), speedSurfRIH: 0, speedSurfPOOH: 0, speedDragRIH: 0, speedDragPOOH: 0 }
const STEP = { muRIH: 0.05, muPOOH: 0.05, speedCoefRIH: 0.05, speedCoefPOOH: 0.05, muLatRIH: 0.15, muLatPOOH: 0.15, ertLbfPerBpm: 300, speedSurfRIH: 100, speedSurfPOOH: 100, speedDragRIH: 20, speedDragPOOH: 20 }
const names = (args.params || 'muRIH,muPOOH,speedCoefRIH,speedCoefPOOH').split(',')
const fixed = Object.fromEntries((args.fix || '').split(',').filter(Boolean).map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]))
const { bins, paths } = loadData()
const predict = makePredictor(paths, { ert: Number(args.ert ?? 1000) })
const med = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

// predictions with zero surface terms → per-well offsets in closed form
export function evaluate(P, set) {
  const base = set.map((b) => predict({ ...P, strip: 0, rbt: 0 }, b))
  const byWell = {}
  set.forEach((b, i) => {
    if (Number.isFinite(base[i])) (byWell[b.well] ||= { RIH: [], POOH: [] })[b.dir].push(b.W - base[i])
  })
  const surf = {}
  for (const [w, g] of Object.entries(byWell)) {
    const aR = med(g.RIH)
    const aP = med(g.POOH)
    surf[w] = { strip: (aP - aR) / 2, rbt: -(aP + aR) / 2 }
  }
  const res = set.map((b, i) => {
    const s = surf[b.well] || { strip: 0, rbt: 0 }
    const pred = base[i] + (b.dir === 'POOH' ? s.strip : -s.strip) - s.rbt
    return { b, pred, e: pred - b.W }
  })
  return { res, surf }
}

function huber(res, d = 3000) {
  let s = 0
  for (const r of res) {
    if (!Number.isFinite(r.e)) {
      s += 1e8
      continue
    }
    const a = Math.abs(r.e)
    s += a < d ? 0.5 * r.e * r.e : d * (a - d / 2)
  }
  return s / res.length
}

function table(res) {
  const g = {}
  for (const r of res) (g[`${r.b.well} ${r.b.dir}`] ||= []).push(r)
  return Object.entries(g)
    .sort()
    .map(([k, a]) => {
      const ok = a.filter((r) => Number.isFinite(r.e))
      const abs = ok.map((r) => Math.abs(r.e)).sort((x, y) => x - y)
      const lat = ok.filter((r) => r.b.bin > 3500)
      const up = ok.filter((r) => r.b.bin <= 3500)
      return {
        k,
        n: ok.length,
        medAbsErr: Math.round(abs[Math.floor(abs.length / 2)]),
        p90AbsErr: Math.round(abs[Math.floor(abs.length * 0.9)]),
        biasUpper: up.length ? Math.round(med(up.map((r) => r.e))) : null,
        biasLateral: lat.length ? Math.round(med(lat.map((r) => r.e))) : null,
        lockups: a.length - ok.length,
      }
    })
}

const train = bins.filter((b) => trainPads.includes(b.pad))
const test = bins.filter((b) => testPads.includes(b.pad))
const toP = (x) => ({ ...START, ...fixed, ...Object.fromEntries(names.map((n, i) => [n, x[i]])) })
const f = (x) => {
  const P = toP(x)
  if (P.muRIH < 0.03 || P.muPOOH < 0.03 || P.muRIH > 0.9 || P.muPOOH > 0.9 || P.muLatRIH < 0.2 || P.muLatPOOH < 0.2) return 1e30
  return huber(evaluate(P, train).res)
}
const t0 = Date.now()
const r = nelderMead(f, names.map((n) => START[n]), names.map((n) => STEP[n]), Number(args.iters || 400))
const P = toP(r.x)
console.log(`train=${trainPads} test=${testPads} params=${names} — ${((Date.now() - t0) / 1000).toFixed(0)} s, loss ${r.fx.toFixed(0)}`)
console.log(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, +v.toFixed(4)])))
const tr = evaluate(P, train)
const fmtSurf = (s) => Object.fromEntries(Object.entries(s).map(([w, v]) => [w, `Fs ${Math.round(v.strip)} / RBT ${Math.round(v.rbt)}`]))
console.log('surface offsets (train):', fmtSurf(tr.surf))
console.log('TRAIN')
console.table(table(tr.res))
let te = null
if (test.length) {
  te = evaluate(P, test)
  console.log('surface offsets (test, per well):', fmtSurf(te.surf))
  console.log('TEST (physics from train, surface offsets per well)')
  console.table(table(te.res))
}
const tag = args.tag || `profile-${trainPads.join('+')}`
fs.writeFileSync(path.join(dataDir, `cal-${tag}.json`), JSON.stringify({ P, names, trainPads, testPads, surfTrain: tr.surf, surfTest: te?.surf }, null, 1))
const all = evaluate(P, bins)
fs.writeFileSync(path.join(dataDir, `pred-${tag}.csv`), 'well,pad,dir,bin,W,pred,v,WHP,Q\n' + all.res.map((x) => [x.b.well, x.b.pad, x.b.dir, x.b.bin, x.b.W, Math.round(x.pred), x.b.v, x.b.WHP, x.b.Q].join(',')).join('\n'))
