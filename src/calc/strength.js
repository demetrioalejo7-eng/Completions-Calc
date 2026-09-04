// Section 4 — Dimensions and Strengths.
// Estimates burst (internal yield), collapse and pipe-body tension ratings
// from OD, ID/wall thickness and a grade's minimum yield strength, using
// the standard API formulas (Barlow / API elastic collapse). These are
// engineering ESTIMATES for quick field reference — for design work use
// certified API 5C3 tables.

export function wallThickness(od, id) {
  return (od - id) / 2
}

// Barlow's formula with the API 0.875 wall-tolerance factor.
export function burstPressure(od, id, yieldPsi) {
  const t = wallThickness(od, id)
  return (0.875 * 2 * yieldPsi * t) / od
}

// API RP 5C3 elastic collapse formula (valid for thin-wall / high D/t pipe;
// for thick-wall pipe the true API value is governed by yield or plastic
// collapse and will be lower than this elastic estimate).
export function collapsePressureElastic(od, id) {
  const t = wallThickness(od, id)
  const dOverT = od / t
  return (46.95e6) / (dOverT * Math.pow(dOverT - 1, 2))
}

// Minimum internal-yield collapse (thick wall, very low D/t): governed by
// yield strength rather than elastic buckling.
export function collapsePressureYield(od, id, yieldPsi) {
  const dOverT = od / (od - id) * 2 // = od / t
  return 2 * yieldPsi * ((dOverT - 1) / (dOverT * dOverT))
}

export function crossSectionalArea(od, id) {
  return (Math.PI / 4) * (od * od - id * id)
}

export function pipeBodyYieldStrength(od, id, yieldPsi) {
  return crossSectionalArea(od, id) * yieldPsi
}

export function airWeightPerFt(wtPerFt, lengthFt) {
  return wtPerFt * lengthFt
}
