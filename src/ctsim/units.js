// Unidades de visualización. El simulador calcula siempre en m, lbf y psi;
// estas funciones convierten solo al mostrar y al leer lo que se escribe.
export const UNIT_SYSTEMS = {
  len: {
    m: { f: 1, label: 'm', d: 0 },
    ft: { f: 3.280839895, label: 'ft', d: 0 },
  },
  force: {
    lbf: { f: 1, label: 'lb', d: 0 },
    kN: { f: 0.0044482216152605, label: 'kN', d: 1 },
    tf: { f: 0.00045359237, label: 'tf', d: 2 },
  },
  press: {
    psi: { f: 1, label: 'psi', d: 0 },
    bar: { f: 0.0689475729, label: 'bar', d: 1 },
    MPa: { f: 0.00689475729, label: 'MPa', d: 2 },
  },
}

export const DEFAULT_UNITS = { len: 'm', force: 'lbf', press: 'psi' }

export const UNIT_CHOICES = {
  len: [
    ['m', 'm'],
    ['ft', 'ft'],
  ],
  force: [
    ['lbf', 'lb'],
    ['kN', 'kN'],
    ['tf', 'tf (t-fuerza)'],
  ],
  press: [
    ['psi', 'psi'],
    ['bar', 'bar'],
    ['MPa', 'MPa'],
  ],
}

// Conversion helpers for a unit selection { len, force, press }.
//   u.cv.len(m) → display value, u.inv.len(display) → m (same for force,
//   press and speed = length per minute), u.label.*, u.d.* (display decimals)
export function makeUnits(sel = DEFAULT_UNITS) {
  const pickU = (kind) => UNIT_SYSTEMS[kind][sel?.[kind]] || UNIT_SYSTEMS[kind][DEFAULT_UNITS[kind]]
  const L = pickU('len')
  const F = pickU('force')
  const P = pickU('press')
  const mk = (f) => (v) => (v === null || v === undefined || !Number.isFinite(v) ? v : v * f)
  const ik = (f) => (v) => (v === null || v === undefined || !Number.isFinite(v) ? v : v / f)
  return {
    sel: { len: sel?.len || 'm', force: sel?.force || 'lbf', press: sel?.press || 'psi' },
    cv: { len: mk(L.f), force: mk(F.f), press: mk(P.f), speed: mk(L.f) },
    inv: { len: ik(L.f), force: ik(F.f), press: ik(P.f), speed: ik(L.f) },
    label: { len: L.label, force: F.label, press: P.label, speed: `${L.label}/min` },
    d: { len: L.d, force: F.d, press: P.d, speed: L.f === 1 ? 1 : 0 },
    f: { len: L.f, force: F.f, press: P.f, speed: L.f },
  }
}

// Nice axis step for a range and a target number of ticks (1, 2, 2.5, 5 ×10^n).
export function niceStep(range, ticks = 6) {
  if (!(range > 0)) return 1
  const raw = range / ticks
  const p = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p
  return 10 * p
}

// Input step scaled to the display unit (keeps steps round).
export function scaledStep(step, f) {
  if (!step || step === 'any' || f === 1) return step
  return niceStep(step * f, 1)
}
