// Límites operativos triaxiales del coiled tubing (elipse de von Mises).
//
// Esfuerzos de Lamé (cilindro de pared gruesa) en las caras interna y
// externa, con carga axial real F (tracción +):
//   σr(r) = A − B/r²,  σθ(r) = A + B/r²,  σa = F / As
//   A = (pi·ri² − po·ro²)/(ro² − ri²),  B = (pi − po)·ri²·ro²/(ro² − ri²)
//   σVME = √{½[(σa−σθ)² + (σθ−σr)² + (σr−σa)²]}
// El envolvente se traza contra la presión diferencial Δp = pi − po
// (Δp > 0: estallido con po = 0; Δp < 0: colapso con pi = 0), como el
// gráfico de límites de Cerberus/Hercules. La curva de colapso es la de
// fluencia (von Mises): no incluye ovalidad ni colapso elástico.

export function tubeGeometry(od, wall) {
  const ro = od / 2
  const ri = ro - wall
  if (ri <= 0) throw new Error('Espesor de pared inválido para ese OD.')
  const As = Math.PI * (ro * ro - ri * ri)
  return { od, wall, ro, ri, As, Ai: Math.PI * ri * ri, Ao: Math.PI * ro * ro }
}

function lame(g, pi, po, r) {
  const d = g.ro * g.ro - g.ri * g.ri
  const A = (pi * g.ri * g.ri - po * g.ro * g.ro) / d
  const B = ((pi - po) * g.ri * g.ri * g.ro * g.ro) / d
  return { sr: A - B / (r * r), sh: A + B / (r * r) }
}

// Von Mises equivalent stress (psi): maximum of inner and outer surfaces.
export function vonMises(g, F, pi, po) {
  const sa = F / g.As
  let max = 0
  for (const r of [g.ri, g.ro]) {
    const { sr, sh } = lame(g, pi, po, r)
    const v = Math.sqrt(0.5 * ((sa - sh) ** 2 + (sh - sr) ** 2 + (sr - sa) ** 2))
    if (v > max) max = v
  }
  return max
}

const pressures = (dp) => (dp >= 0 ? { pi: dp, po: 0 } : { pi: 0, po: -dp })

// Admissible axial stress range [lo, hi] at a pressure state for σVME ≤ S.
function axialRange(g, pi, po, S) {
  let lo = -Infinity
  let hi = Infinity
  for (const r of [g.ri, g.ro]) {
    const { sr, sh } = lame(g, pi, po, r)
    // a² − a(h + r) + (h² + r² − h·r − S²) = 0
    const b = sh + sr
    const c = sh * sh + sr * sr - sh * sr - S * S
    const disc = b * b - 4 * c
    if (disc < 0) return null
    const s = Math.sqrt(disc)
    lo = Math.max(lo, (b - s) / 2)
    hi = Math.min(hi, (b + s) / 2)
  }
  return lo <= hi ? [lo, hi] : null
}

// Axial-load range (lbf) allowed at differential pressure dp for a fraction
// `factor` of the yield strength.
export function allowableLoad(g, smys, factor, dp) {
  const { pi, po } = pressures(dp)
  const r = axialRange(g, pi, po, factor * smys)
  return r ? { compression: r[0] * g.As, tension: r[1] * g.As } : null
}

// Limit Δp (psi) at F = 0 in burst (+) or collapse (−) direction.
function limitPressure(g, smys, factor, sign) {
  let lo = 0
  let hi = 60000
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const r = allowableLoad(g, smys, factor, sign * mid)
    if (r && r.compression <= 0 && r.tension >= 0) lo = mid
    else hi = mid
  }
  return sign * lo
}

// Closed envelope [{ F, dp }] for plotting (tension side then compression side).
export function envelope(g, smys, factor, n = 120) {
  const pb = limitPressure(g, smys, factor, 1)
  const pc = limitPressure(g, smys, factor, -1)
  // the envelope extends slightly past the F = 0 limits (ellipse tilt)
  let pMax = pb
  let pMin = pc
  while (allowableLoad(g, smys, factor, pMax * 1.002 + 1)) pMax = pMax * 1.002 + 1
  while (allowableLoad(g, smys, factor, pMin * 1.002 - 1)) pMin = pMin * 1.002 - 1
  const right = []
  const left = []
  for (let i = 0; i <= n; i++) {
    const dp = pMin + ((pMax - pMin) * i) / n
    const r = allowableLoad(g, smys, factor, dp)
    if (!r) continue
    right.push({ F: r.tension, dp })
    left.push({ F: r.compression, dp })
  }
  return { points: [...right, ...left.reverse()], burst: pb, collapse: pc, tensionAtZero: factor * smys * g.As }
}

// Utilization (σVME / SMYS) of an operating point with explicit pi / po.
export function utilization(g, smys, F, pi, po) {
  return vonMises(g, F, pi, po) / smys
}

// ---------------------------------------------------------------------------
// Colapso con ovalidad (API RP 5C7 / Timoshenko, primera fluencia del tubo
// ovalizado):
//   Pc² − [Py + (1 + 1.5·Δ·D/t)·Pe]·Pc + Py·Pe = 0
//   Py = 2·σy·t/D (colapso por fluencia), Pe = 2E/(1−ν²)·(t/D)³ (elástico)
//   Δ = ovalidad = (Dmax − Dmin)/D
// (equivale a la forma 1 + 3·f·D/t con f = (Dmax−Dmin)/(Dmax+Dmin)).
// La carga axial reduce la fluencia efectiva (API 5C3):
//   σy,a = σy·[√(1 − 0.75(σa/σy)²) − 0.5·σa/σy]
// Se calcula con el espesor mínimo.
const E_COLLAPSE = 30e6
const NU = 0.3

export function collapseOval({ od, tmin, smys, ovality, axialStress = 0 }) {
  const r = axialStress / smys
  const red = 1 - 0.75 * r * r
  if (red <= 0) return 0
  const sy = smys * (Math.sqrt(red) - 0.5 * r)
  if (sy <= 0) return 0
  const Py = (2 * sy * tmin) / od
  const Pe = ((2 * E_COLLAPSE) / (1 - NU * NU)) * (tmin / od) ** 3
  const b = Py + (1 + 1.5 * ovality * (od / tmin)) * Pe
  const c = Py * Pe
  return (b - Math.sqrt(Math.max(0, b * b - 4 * c))) / 2
}

// Collapse curve vs axial load for plotting: [{ F, dp: −factor·Pc }]
export function collapseCurve({ od, tmin, smys, ovality, factor, Fmin, Fmax, As, n = 120 }) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const F = Fmin + ((Fmax - Fmin) * i) / n
    out.push({ F, dp: -factor * collapseOval({ od, tmin, smys, ovality, axialStress: F / As }) })
  }
  return out
}
