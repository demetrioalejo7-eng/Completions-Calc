// Field calibration of the CT weight simulator (src/ctsim/forces.js).
//
// Fitted with tools/ct-calibration/fit_profile.mjs on 11 post-frac clean-out
// runs (pads B3A2, C1A and B1B: 2 3/8" tapered string, 5" 21.4# casing,
// slickwater, 3.7–4.6 bpm, WHP 3200–5500 psi, laterals ~3300 m, TD
// 6700–6900 m MD, Terrapulse high-intensity ERT = 1500 lbf/bpm).
//
// B1B with 1 s data. BdC-1030h was run twice: run 1 with the ERT failed
// milled down to 5632 m (25-30 klb slacked off, no lock-up) and was pulled;
// run 2 with the ERT working reached TD (6745 m). Free-running weights show
// no measurable ERT effect (r2 reads ~3.5 klb lighter in BOTH directions:
// a surface offset, not drag), so the ERT size comes from reaching TD
// without lock-up: a friction-factor reduction of ~22 % over the last
// ~3750 m (8-22 % across the pad cross-validation folds: uncertain).
// Cross-validation by pad: median |error| 1.0-5.1 klb.
export const CT_CALIBRATION = {
  model: {
    // friction vs pipe speed (rate-and-state-like, log law): weak once the
    // surface term below is included
    speedRef: 5,
    speedCoefRIH: 0.04,
    speedCoefPOOH: -0.029,
    // surface equipment term vs speed, relative to 20 m/min (lbf per m/min,
    // + opposes motion): the indicator reads ≈ 370 lb heavier per m/min in
    // both directions (injector / stripper dynamics). Previously it was
    // referenced to 0 m/min, which made the vertical RIH (run at 20–27
    // m/min) ~8–11 klb too heavy with the default stripper / reel values.
    speedSurfRIH: -284,
    speedSurfPOOH: 457,
    speedSurfRef: 20,
    speedDragRIH: 0,
    speedDragPOOH: 0,
    lateralMuFactorRIH: 1,
    lateralMuFactorPOOH: 1,
    lateralIncDeg: 80,
    // ERT as a friction-factor reduction in the zone above the tool, scaled
    // by k_ERT·Q relative to the reference tool (1500 lbf/bpm at 4.2 bpm)
    ertMode: 'mu',
    ertMuReductionRef: 0.22,
    ertRefLbfPerBpm: 1500,
    ertRefRateBpm: 4.2,
    ertZoneM: 3750,
    ertPoohEfficiency: 0.5,
    // residual-bend wall contact (lbf/ft): small (the vertical slopes
    // already match with the soft-string model)
    residualContact: 0.09,
    frDragReduction: 0.5,
    lockupForce: 150000,
  },
  // Surface offsets that make the model unbiased on the 11 runs (median of
  // the per-run fits). The weight indicator barely sees the reel back
  // tension; the per-run combined offset still varies ±5 klb between jobs.
  stripperLbf: 4000,
  reelTensionLbf: 500,
  ertDefault: 'high',
  note: 'Calibrado con 11 carreras (pads B3A2, C1A y B1B, incluida la carrera de BdC-1030h con el ERT fallado). El offset de superficie (stripper + reel) varía ±5 klb entre trabajos: usá "Ajuste con lecturas de campo" o una carrera previa para corregirlo.',
}

// Friction presets: the RIH value is the user's CT–casing coefficient; the
// POOH value keeps the calibrated POOH/RIH ratio (0.273 / 0.276).
const POOH_RATIO = 0.99
export const MU_LEVELS = {
  low: { label: 'Bajo', rih: 0.25, pooh: +(0.25 * POOH_RATIO).toFixed(3) },
  std: { label: 'Estándar', rih: 0.3, pooh: +(0.3 * POOH_RATIO).toFixed(3) },
  cal: { label: 'Calibrado (B3A2 + C1A + B1B)', rih: 0.276, pooh: 0.273 },
  high: { label: 'Alto', rih: 0.35, pooh: +(0.35 * POOH_RATIO).toFixed(3) },
}

export const ERT_LEVELS = {
  none: { label: 'Sin ERT', value: 0 },
  low: { label: 'Baja intensidad — 500 lbf/bpm', value: 500 },
  medium: { label: 'Media intensidad — 1000 lbf/bpm', value: 1000 },
  high: { label: 'Alta intensidad — 1500 lbf/bpm', value: 1500 },
}
