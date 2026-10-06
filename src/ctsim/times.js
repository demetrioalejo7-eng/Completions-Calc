// Tiempos de operación: RIH por tramos (boca→KOP, KOP→LP y el lateral en
// bloques de 500 m hasta la profundidad objetivo) y POOH (lateral, curva,
// vertical), esperados a partir de velocidades promedio y reales a partir de
// la serie profundidad–tiempo del CSV de la carrera.
//
// Las velocidades son PROMEDIO EFECTIVAS (distancia / tiempo transcurrido):
// incluyen paradas, fresado de tapones y viajes cortos. Las de referencia
// son la mediana de 10 carreras (pads B3A2, C1A y B1B; sin BdC-1030h r1, que
// se sacó antes de TD), medidas igual que en la app: RIH por primer paso,
// tiempo en fondo aparte y POOH desde que se deja el fondo.
export const HIST_SPEEDS = {
  rih: { vert: 20, curve: 9, lat: [3.7, 3.4, 3.1, 2.6, 2.3, 1.9, 1.4] },
  pooh: { lat: 9.3, curve: 12, vert: 22 },
  bottomH: 1.3,
  blockM: 500,
}

export const SURFACE_M = 50
const BOTTOM_TOL = 30 // m: still "at bottom" while within this of it

// Planned segments. kop / lp may be null (vertical well): everything is
// then "vertical". Speeds in m/min, times in minutes.
export function planSegments({ kop, lp, target, plan }) {
  const blockM = plan.blockM || 500
  const rih = []
  const push = (arr, key, label, from, to, v) => {
    if (!(to > from)) return
    arr.push({ key, label, from, to, len: to - from, v, min: v > 0 ? (to - from) / v : null })
  }
  const k = kop != null ? Math.min(kop, target) : target
  const l = lp != null ? Math.min(lp, target) : target
  push(rih, 'vert', 'Boca → KOP', 0, k, plan.rih.vert)
  push(rih, 'curve', 'KOP → LP', k, l, plan.rih.curve)
  for (let i = 0, d = l; d < target - 1e-6; i++, d += blockM) {
    const to = Math.min(d + blockM, target)
    const v = plan.rih.lat[i] ?? plan.rih.lat[plan.rih.lat.length - 1]
    push(rih, `lat${i}`, `Lateral ${i * blockM}–${Math.round(to - l)} m desde LP`, d, to, v)
  }
  const pooh = []
  push(pooh, 'plat', 'Lateral', l, target, plan.pooh.lat)
  push(pooh, 'pcurve', 'Curva', k, l, plan.pooh.curve)
  push(pooh, 'pvert', 'Vertical', 0, k, plan.pooh.vert)
  const sum = (a) => a.reduce((s, x) => s + (x.min || 0), 0)
  const bottomMin = (plan.bottomH || 0) * 60
  return { rih, pooh, rihMin: sum(rih), poohMin: sum(pooh), bottomMin, totalMin: sum(rih) + sum(pooh) + bottomMin }
}

// Time (s) at which the series first reaches depth d going down, from index
// i0 on; linear interpolation between samples. null if never.
function firstDown(series, d, i0 = 0) {
  for (let i = Math.max(1, i0); i < series.length; i++) {
    const [t1, m1] = series[i]
    if (m1 >= d) {
      const [t0, m0] = series[i - 1]
      return m1 > m0 && m0 < d ? t0 + ((d - m0) / (m1 - m0)) * (t1 - t0) : t1
    }
  }
  return null
}

function firstUp(series, d, i0) {
  for (let i = Math.max(1, i0); i < series.length; i++) {
    const [t1, m1] = series[i]
    if (m1 <= d) {
      const [t0, m0] = series[i - 1]
      return m0 > m1 && m0 > d ? t0 + ((m0 - d) / (m0 - m1)) * (t1 - t0) : t1
    }
  }
  return null
}

// Actual times from a run series [[t (s), md], …] for the planned segments.
// RIH: first passage through each boundary. Bottom: from reaching the job
// bottom (target, or the deepest point if it fell short) to the last time
// near it (within 30 m: reciprocating / milling at bottom). POOH: first passage upwards after leaving the bottom.
export function actualTimes(series, plan) {
  if (!series?.length) return null
  const i0 = series.findIndex(([, m]) => m > SURFACE_M)
  if (i0 < 0) return null
  const tStart = series[i0][0]
  const maxMd = Math.max(...series.map(([, m]) => m))
  const target = plan.rih.length ? plan.rih[plan.rih.length - 1].to : 0
  const bottom = Math.min(target, maxMd)
  const tBottom = firstDown(series, bottom - 0.5, i0)
  let iLeave = -1
  for (let i = series.length - 1; i >= 0; i--)
    if (series[i][1] >= bottom - BOTTOM_TOL) {
      iLeave = i
      break
    }
  const tLeave = iLeave >= 0 ? series[iLeave][0] : null
  const down = (d) => (d <= SURFACE_M ? tStart : firstDown(series, d, i0))
  const up = (d) => (iLeave < 0 ? null : firstUp(series, Math.max(d, SURFACE_M), iLeave))
  const seg = (s, tA, tB, len) => {
    if (tA === null || tB === null || !(tB > tA)) return { ...s, realMin: null, realV: null }
    const min = (tB - tA) / 60
    return { ...s, realMin: min, realV: len / min }
  }
  const rih = plan.rih.map((s) => (s.to > maxMd + 1 ? { ...s, realMin: null, realV: null, short: true } : seg(s, down(s.from), down(s.to), s.to - Math.max(s.from, SURFACE_M))))
  // POOH timing starts when the CT leaves the bottom zone (BOTTOM_TOL above
  // the bottom), so the deepest section is measured from there
  const pooh = plan.pooh.map((s) => {
    const from = Math.min(s.to, bottom - BOTTOM_TOL)
    if (from <= s.from) return { ...s, realMin: null, realV: null }
    return seg(s, up(from), up(s.from), from - Math.max(s.from, SURFACE_M))
  })
  const tSurf = up(SURFACE_M)
  const tEnd = tSurf ?? series[series.length - 1][0]
  return {
    rih,
    pooh,
    tStart,
    tEnd,
    maxMd,
    bottom,
    reachedTarget: maxMd >= target - 1,
    rihMin: tBottom !== null ? (tBottom - tStart) / 60 : null,
    bottomMin: tBottom !== null && tLeave !== null && tLeave > tBottom ? (tLeave - tBottom) / 60 : null,
    poohMin: tLeave !== null && tSurf !== null ? (tSurf - tLeave) / 60 : null,
    totalMin: tSurf !== null ? (tSurf - tStart) / 60 : null,
    curve: series.filter(([t]) => t >= tStart && t <= tEnd).map(([t, m]) => ({ h: (t - tStart) / 3600, md: m })),
  }
}

// Planned depth–time curve: [{ h, md }] (RIH, time at bottom, POOH).
export function plannedCurve(plan) {
  const out = [{ h: 0, md: 0 }]
  let t = 0
  for (const s of plan.rih) {
    t += (s.min || 0) / 60
    out.push({ h: t, md: s.to })
  }
  if (plan.bottomMin) {
    t += plan.bottomMin / 60
    out.push({ h: t, md: out[out.length - 1].md })
  }
  for (const s of plan.pooh) {
    t += (s.min || 0) / 60
    out.push({ h: t, md: s.from })
  }
  return out
}

// "12:05 h" from minutes.
export function fmtDuration(min) {
  if (min === null || min === undefined || !Number.isFinite(min)) return '—'
  const m = Math.round(min)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`
}
