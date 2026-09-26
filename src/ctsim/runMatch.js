// "Friction matching" against a measured run: finds the µ (RIH / POOH) and
// the surface-equipment offsets (stripper friction, reel back tension) that
// best reproduce the measured weight-vs-depth medians of a loaded run.
//
// Surface offsets enter linearly (Tech Note Eq 17):
//   RIH:  W = F_E − WHP·A_o − F_s − RBT       POOH: W = F_E − WHP·A_o + F_s − RBT
// so for any µ the per-direction offset is the median residual; µ of each
// direction is then chosen by a 1-D scan minimizing the median absolute error.
import { buildContext, forcesAtDepth, surfaceWeight } from './forces.js'

const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : NaN
}

function residuals(ctx, pts, dir, mu) {
  const p = { ...ctx.p, stripperLbf: 0, reelTensionRIH: 0, reelTensionPOOH: 0 }
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

function scan(ctx, pts, dir, lo, hi) {
  let best = null
  for (let mu = lo; mu <= hi + 1e-9; mu += 0.01) {
    const res = residuals(ctx, pts, dir, mu)
    if (res.length < pts.length * 0.8) continue
    const off = median(res)
    const mae = median(res.map((e) => Math.abs(e - off)))
    if (!best || mae < best.mae) best = { mu: +mu.toFixed(2), off, mae }
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
  const bR = scan(ctx, rih, 'RIH', 0.1, 0.6)
  const bP = scan(ctx, pooh, 'POOH', 0.05, 0.5)
  if (!bR || !bP) throw new Error('No se pudo ajustar la carrera (lock-up en todo el rango de µ).')
  // aR = −Fs − RBT, aP = +Fs − RBT
  const stripper = (bP.off - bR.off) / 2
  const rbt = -(bP.off + bR.off) / 2
  return {
    muRIH: bR.mu,
    muPOOH: bP.mu,
    stripperLbf: Math.round(stripper),
    reelTension: Math.round(rbt),
    maeRIH: Math.round(bR.mae),
    maePOOH: Math.round(bP.mae),
    nRIH: rih.length,
    nPOOH: pooh.length,
  }
}

// Surface offsets from two field readings (e.g. RIH weight at KOP and the
// pull test at the LP): solves stripper friction and reel back tension so
// the model reproduces both readings with the current µ.
export function matchSurfaceReadings(params, model, rih, pooh) {
  const ctx = buildContext(params, model)
  const p = { ...ctx.p, stripperLbf: 0, reelTensionRIH: 0, reelTensionPOOH: 0 }
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
