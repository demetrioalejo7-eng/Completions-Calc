// Field calibration of the CT weight simulator (src/ctsim/forces.js).
//
// Fitted with tools/ct-calibration/fit_profile.mjs on 6 post-frac clean-out
// runs (pads B3A2 and C1A: 2 3/8" tapered string, 5" 21.4# casing,
// slickwater, 3.7–4 bpm, WHP 4500–5500 psi, laterals ~3300 m, TD
// 6700–6900 m MD, Terrapulse high-intensity ERT = 1500 lbf/bpm).
//
// Cross-validation (physics fitted on one pad, tested on the other, surface
// offsets per well): median |error| 1.2–2.4 klb (B3A2 → C1A) and
// 1.2–4.1 klb (C1A → B3A2); µRIH 0.319–0.325 in both folds.
export const CT_CALIBRATION = {
  model: {
    // friction grows with pipe speed (rate-and-state-like, log law)
    speedRef: 5,
    speedCoefRIH: 0.128,
    speedCoefPOOH: 0.112,
    // surface equipment term vs speed (lbf per m/min, + opposes motion):
    // the fit gives ≈ +400 lb of indicator reading per m/min in BOTH
    // directions, i.e. reel back tension relieved at higher speed.
    speedSurfRIH: -418,
    speedSurfPOOH: 397,
    speedDragRIH: 0,
    speedDragPOOH: 0,
    lateralMuFactorRIH: 1,
    lateralMuFactorPOOH: 1,
    lateralIncDeg: 80,
    ertPoohEfficiency: 0.5,
    ertZoneM: 1500,
    frDragReduction: 0.5,
    lockupForce: 150000,
  },
  // Typical surface settings reported for these jobs (stripper 800 psi,
  // reel 1000 psi). Fitted per-well values ranged 4.5–8.2 klb (stripper)
  // and 4.6–17.5 klb (reel): calibrate with a field reading when possible.
  stripperLbf: 5000,
  reelTensionLbf: 6000,
  ertDefault: 'high',
  note: 'Calibrado con 6 carreras (pads B3A2 y C1A). La fricción del stripper y la tensión del reel cambian de un trabajo a otro (hasta ~12 klb entre pozos del mismo pad): usá "Ajuste con lecturas de campo" o una carrera previa para corregir el offset.',
}

// Friction presets: the RIH value is the user's CT–casing coefficient; the
// POOH value keeps the calibrated POOH/RIH ratio (0.269 / 0.319).
const POOH_RATIO = 0.84
export const MU_LEVELS = {
  low: { label: 'Bajo', rih: 0.25, pooh: +(0.25 * POOH_RATIO).toFixed(3) },
  std: { label: 'Estándar', rih: 0.3, pooh: +(0.3 * POOH_RATIO).toFixed(3) },
  cal: { label: 'Calibrado B3A2 + C1A', rih: 0.319, pooh: 0.269 },
  high: { label: 'Alto', rih: 0.35, pooh: +(0.35 * POOH_RATIO).toFixed(3) },
}

export const ERT_LEVELS = {
  none: { label: 'Sin ERT', value: 0 },
  low: { label: 'ERT baja intensidad — 500 lbf/bpm', value: 500 },
  medium: { label: 'ERT intensidad media — 1000 lbf/bpm', value: 1000 },
  high: { label: 'ERT alta intensidad (Terrapulse) — 1500 lbf/bpm', value: 1500 },
}
