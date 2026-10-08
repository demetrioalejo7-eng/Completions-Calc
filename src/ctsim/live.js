// Seguimiento en vivo de una carrera: compara cada lectura (bin de 25 m del
// CSV) con el modelo, re-estima el offset de superficie con las lecturas
// anteriores y marca los desvíos fuera de la banda de campo (precaución) o
// más allá de los umbrales de alarma (asentamiento en RIH, sobretensión en
// POOH). Ver FIELD_BANDS / LIVE en calibration.js.
import { buildContext, forcesAtDepth, surfaceWeight } from './forces.js'
import { FIELD_BANDS, LIVE } from './calibration.js'

const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : NaN
}

export const zoneOf = (md, kop, lp) => (kop != null && md < kop ? 'vert' : lp != null && md < lp ? 'curve' : 'lat')

// Model weight at each run point, with the point's own speed, wellhead
// pressure and pump rate when the run carries them (null at lock-up).
export function predictPoints(params, model, points) {
  const ctx = buildContext(params, model)
  return points.map((pt) => {
    const p = { ...ctx.p, whp: pt.whp ?? ctx.p.whp, rateBpm: pt.q ?? ctx.p.rateBpm }
    if (pt.q != null) p.noPumpAboveKop = null
    if (pt.dir === 'RIH') p.speedRIH = pt.v || ctx.p.speedRIH
    else p.speedPOOH = pt.v || ctx.p.speedPOOH
    const r = forcesAtDepth({ ...ctx, p }, pt.md, pt.dir)
    return r.lockup ? null : surfaceWeight(r.surfaceForce, pt.dir, p, ctx.string, ctx.model)
  })
}

// points: [{ dir, md, w, t? }], pred: model weights (same order).
// Returns every point with its deviation and level, the current offset per
// direction and the alarm / caution events (first point of each streak).
export function liveTrack(points, pred, { kop = null, lp = null } = {}, opts = LIVE, bands = FIELD_BANDS.live) {
  const out = points.map((pt, i) => ({ ...pt, pred: pred[i], e: pred[i] == null ? null : pt.w - pred[i], offset: null, d: null, level: null }))
  const offset = { RIH: null, POOH: null }
  for (const dir of ['RIH', 'POOH']) {
    // reading order: time when the CSV has it, else the trip direction
    const seq = out
      .filter((x) => x.dir === dir && x.e != null)
      .sort((a, b) => (a.t != null && b.t != null ? a.t - b.t : dir === 'RIH' ? a.md - b.md : b.md - a.md))
    seq.forEach((x, i) => {
      if (i < opts.minBins) return
      const ref = seq.slice(Math.max(0, i - opts.gapBins - opts.windowBins), i - opts.gapBins).map((y) => y.e)
      x.offset = median(ref)
      x.d = x.e - x.offset
      const zone = zoneOf(x.md, kop, lp)
      const [lo, hi] = bands[dir][zone]
      // alarms only below the KOP: in the vertical a large deviation is
      // usually a tag / restriction or a surface effect (caution)
      if (zone !== 'vert' && dir === 'RIH' && x.d <= -opts.alarmSetDownLbf) x.level = 'alarm'
      else if (zone !== 'vert' && dir === 'POOH' && x.d >= opts.alarmOverpullLbf) x.level = 'alarm'
      else if (x.d < lo || x.d > hi) x.level = 'caution'
      else x.level = 'ok'
    })
    // offset for what comes next: the latest window
    if (seq.length >= opts.minBins) offset[dir] = median(seq.slice(-opts.windowBins).map((y) => y.e))
    // events: first point of each run of alarm / caution readings
    let prev = null
    for (const x of seq) {
      if (x.level && x.level !== 'ok' && x.level !== prev) x.event = true
      prev = x.level
    }
  }
  const events = out.filter((x) => x.event).sort((a, b) => (a.t != null && b.t != null ? a.t - b.t : 0))
  const last = [...out].filter((x) => x.level).sort((a, b) => (a.t != null && b.t != null ? a.t - b.t : 0)).pop() || null
  return { points: out, offset, events, last, alarms: events.filter((x) => x.level === 'alarm') }
}
