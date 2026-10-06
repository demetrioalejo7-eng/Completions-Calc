// "Friction matching" against a measured run: finds the µ (one value, POOH
// at the calibrated ratio) and the surface-equipment offsets (stripper
// friction, reel back tension / indicator zero) that best reproduce the
// measured weight-vs-depth medians of a loaded run.
//
// Surface offsets enter linearly (Tech Note Eq 17):
//   RIH:  W = F_E − WHP·A_o − F_s − RBT       POOH: W = F_E − WHP·A_o + F_s − RBT
// so for any µ the per-direction offset is the median residual; µ is then
// chosen by a 1-D scan minimizing the median absolute error of both.
import { buildContext, forcesAtDepth, surfaceWeight } from './forces.js'

const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : NaN
}

function residuals(ctx, pts, dir, mu) {
  const p = { ...ctx.p, stripperLbf: 0, reelTensionRIH: 0, reelTensionPOOH: 0, indicatorOffset: 0 }
  if (dir === 'RIH') p.muRIH = mu
  else p.muPOOH = mu
  const out = []
  for (const pt of pts) {
    if (dir === 'RIH') p.speedRIH = pt.v || ctx.p.speedRIH
    else p.speedPOOH = pt.v || ctx.p.speedPOOH
    // per-point wellhead pressure and pump rate when the run carries them
    p.whp = pt.whp ?? ctx.p.whp
    p.rateBpm = pt.q ?? ctx.p.rateBpm
    const r = forcesAtDepth({ ...ctx, p }, pt.md, dir)
    if (r.lockup) continue
    out.push(pt.w - surfaceWeight(r.surfaceForce, dir, p, ctx.string, ctx.model))
  }
  return out
}

// One µ for the run (µPOOH keeps the calibrated POOH / RIH ratio): with a
// free offset per direction µRIH and µPOOH cannot be told apart from the
// weights alone, and fitting them separately drifts to unphysical values.
// For each µ the stripper / reel offsets are the median residuals.
function scanJoint(ctx, rih, pooh, ratio, lo, hi) {
  let best = null
  for (let mu = lo; mu <= hi + 1e-9; mu += 0.005) {
    const rR = residuals(ctx, rih, 'RIH', mu)
    const rP = residuals(ctx, pooh, 'POOH', mu * ratio)
    if (rR.length < rih.length * 0.8 || rP.length < pooh.length * 0.8) continue
    let oR = median(rR)
    let oP = median(rP)
    // stripper friction can't be negative (POOH reads at least as high as
    // RIH): if it would, both directions share one offset
    if (oP < oR) {
      const all = median([...rR, ...rP])
      oR = all
      oP = all
    }
    const maeR = median(rR.map((e) => Math.abs(e - oR)))
    const maeP = median(rP.map((e) => Math.abs(e - oP)))
    const score = (maeR * rR.length + maeP * rP.length) / (rR.length + rP.length)
    if (!best || score < best.score) best = { mu: +mu.toFixed(3), oR, oP, maeR, maeP, score }
  }
  return best
}

// params: simulator params (as passed to simulateTrip);
// points: [{ dir, md, w, v, whp?, q? }] — whp / q per point override the form values
export function matchRun(params, model, points, { minDepthM = 150 } = {}) {
  const ctx = buildContext(params, model)
  const td = ctx.path.tdM
  const use = points.filter((p) => p.md >= minDepthM && p.md <= td)
  const rih = use.filter((p) => p.dir === 'RIH')
  const pooh = use.filter((p) => p.dir === 'POOH')
  if (rih.length < 10 || pooh.length < 10) throw new Error('La carrera necesita tramos RIH y POOH en movimiento estable para el ajuste.')
  const ratio = params.muRIH > 0 ? params.muPOOH / params.muRIH : 0.9
  const b = scanJoint(ctx, rih, pooh, ratio, 0.1, 0.55)
  if (!b) throw new Error('No se pudo ajustar la carrera (lock-up en todo el rango de µ).')
  // aR = −Fs − RBT, aP = +Fs − RBT
  const stripper = (b.oP - b.oR) / 2
  const rbt = -(b.oP + b.oR) / 2
  return {
    muRIH: b.mu,
    muPOOH: +(b.mu * ratio).toFixed(3),
    stripperLbf: Math.round(stripper),
    reelTension: Math.round(rbt),
    maeRIH: Math.round(b.maeR),
    maePOOH: Math.round(b.maeP),
    nRIH: rih.length,
    nPOOH: pooh.length,
  }
}

// Surface offsets from two field readings (e.g. RIH weight at KOP and the
// pull test at the LP): solves stripper friction and reel back tension so
// the model reproduces both readings with the current µ.
export function matchSurfaceReadings(params, model, rih, pooh) {
  const ctx = buildContext(params, model)
  const p = { ...ctx.p, stripperLbf: 0, reelTensionRIH: 0, reelTensionPOOH: 0, indicatorOffset: 0 }
  const base = (dir, md) => {
    if (p.speedAt) {
      p.speedRIH = p.speedAt(md, 'RIH')
      p.speedPOOH = p.speedAt(md, 'POOH')
    }
    const r = forcesAtDepth({ ...ctx, p }, md, dir)
    if (r.lockup) throw new Error(`Lock-up en la simulación ${dir} a ${md} m.`)
    return surfaceWeight(r.surfaceForce, dir, p, ctx.string, ctx.model)
  }
  const aR = rih.w - base('RIH', rih.md) // = −Fs − RBT
  const aP = pooh.w - base('POOH', pooh.md) // = +Fs − RBT
  return { stripperLbf: Math.round((aP - aR) / 2), reelTension: Math.round(-(aP + aR) / 2) }
}
