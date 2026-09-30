// Field calibration of the CT weight simulator (src/ctsim/forces.js).
//
// Fitted with tools/ct-calibration/fit_profile.mjs on 11 post-frac clean-out
// runs (pads B3A2, C1A and B1B: 2 3/8" tapered string, 5" 21.4# casing,
// slickwater, 3.7–4.6 bpm, WHP 3200–5500 psi, laterals ~3300 m, TD
// 6700–6900 m MD, Terrapulse high-intensity ERT = 1500 lbf/bpm).
//
// BdC-1030h was run twice: run 1 with the ERT failed stalled at ~5580 m MD,
// run 2 with the ERT working reached TD (6718 m). That stall is a constraint
// of the fit and sets the size of the ERT effect: a friction-factor
// reduction of ~29 % over the last ~4100 m of CT (curve + lateral).
export const CT_CALIBRATION = {
  model: {
    // friction vs pipe speed (rate-and-state-like, log law): weak once the
    // surface term below is included
    speedRef: 5,
    speedCoefRIH: 0.014,
    speedCoefPOOH: 0.036,
    // surface equipment term vs speed, relative to 20 m/min (lbf per m/min,
    // + opposes motion): the indicator reads ≈ 300 lb heavier per m/min in
    // both directions (injector / stripper dynamics). Previously it was
    // referenced to 0 m/min, which made the vertical RIH (run at 20–27
    // m/min) ~8–11 klb too heavy with the default stripper / reel values.
    speedSurfRIH: -301,
    speedSurfPOOH: 308,
    speedSurfRef: 20,
    speedDragRIH: 0,
    speedDragPOOH: 0,
    lateralMuFactorRIH: 1,
    lateralMuFactorPOOH: 1,
    lateralIncDeg: 80,
    // ERT as a friction-factor reduction in the zone above the tool, scaled
    // by k_ERT·Q relative to the reference tool (1500 lbf/bpm at 4.2 bpm)
    ertMode: 'mu',
    ertMuReductionRef: 0.288,
    ertRefLbfPerBpm: 1500,
    ertRefRateBpm: 4.2,
    ertZoneM: 4100,
    ertPoohEfficiency: 0.5,
    // residual-bend wall contact: fitted ≈ 0 (the vertical slopes already
    // match with the soft-string model)
    residualContact: 0,
    frDragReduction: 0.5,
    lockupForce: 150000,
  },
  // Surface offsets that make the model unbiased on the 11 runs (median of
  // the per-run fits). The weight indicator barely sees the reel back
  // tension; the per-run combined offset still varies ±5 klb between jobs.
  stripperLbf: 4500,
  reelTensionLbf: 0,
  ertDefault: 'high',
  note: 'Calibrado con 11 carreras (pads B3A2, C1A y B1B, incluida la carrera de BdC-1030h con el ERT fallado). El offset de superficie (stripper + reel) varía ±5 klb entre trabajos: usá "Ajuste con lecturas de campo" o una carrera previa para corregirlo.',
}

// Friction presets: the RIH value is the user's CT–casing coefficient; the
// POOH value keeps the calibrated POOH/RIH ratio (0.259 / 0.288).
const POOH_RATIO = 0.9
export const MU_LEVELS = {
  low: { label: 'Bajo', rih: 0.25, pooh: +(0.25 * POOH_RATIO).toFixed(3) },
  std: { label: 'Estándar', rih: 0.3, pooh: +(0.3 * POOH_RATIO).toFixed(3) },
  cal: { label: 'Calibrado (B3A2 + C1A + B1B)', rih: 0.288, pooh: 0.259 },
  high: { label: 'Alto', rih: 0.35, pooh: +(0.35 * POOH_RATIO).toFixed(3) },
}

export const ERT_LEVELS = {
  none: { label: 'Sin ERT', value: 0 },
  low: { label: 'Baja intensidad — 500 lbf/bpm', value: 500 },
  medium: { label: 'Media intensidad — 1000 lbf/bpm', value: 1000 },
  high: { label: 'Alta intensidad — 1500 lbf/bpm', value: 1500 },
}
