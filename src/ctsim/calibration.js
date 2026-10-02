// Field calibration of the CT weight simulator (src/ctsim/forces.js).
//
// Fitted with tools/ct-calibration/fit_profile.mjs on 11 post-frac clean-out
// runs (pads B3A2, C1A and B1B: 2 3/8" tapered string, 5" 21.4# casing,
// slickwater, 3.7–4.6 bpm, WHP 3200–5500 psi, laterals ~3300 m, TD
// 6700–6900 m MD, Terrapulse high-intensity ERT = 1500 lbf/bpm).
//
// B1B with 1 s data. BdC-1030h was run twice: run 1 (ERT jammed) milled to
// 5632 m and was pulled because the speed dropped while the set-down grew
// (incipient lock-up); run 2 with the ERT working reached TD (6745 m). The
// fit is constrained to lock run 1 up between 5632 and 5800 m without ERT.
// Free-running weights show no measurable ERT effect (r2 reads ~3.5 klb
// lighter in BOTH directions: a surface offset, not drag); the ERT size
// (~30 % µ reduction over the last ~4250 m) comes from that lock-up and is
// uncertain (see the cross-validation spread in the README).
// Cross-validation by pad: median |error| 1.0-4.7 klb.
//
// Surface terms: near surface (60-400 m, negligible friction) the readings
// give stripper ≈ 4.7-11 klb and a reel term ≈ 0 (−6..+5 klb) although the
// real reel back tension is ≥ 4000 lbf: the weight indicator is zeroed with
// the CT stabbed and the reel under tension, so the reel is not subtracted
// (reelTared). Forcing RBT ≥ 4000 lbf in the reading made the fit 50 % worse.
//
// µRIH vs µPOOH: with a free surface offset per run the data barely tell
// them apart (free fit 0.254 / 0.263; tying µPOOH = 0.85·µRIH costs +1.1 %
// error, 0.75 costs +3.7 %), so the ratio is set by physics: CTES documents
// µRIH > µPOOH from the residual bend of the CT. The steep POOH weight in the
// lateral (~12 lb/m) comes from tension in the curve and lateral doglegs,
// which the model reproduces.
export const CT_CALIBRATION = {
  model: {
    // friction vs pipe speed (rate-and-state-like, log law): weak once the
    // surface term below is included
    speedRef: 5,
    speedCoefRIH: 0.074,
    speedCoefPOOH: -0.016,
    // surface equipment term vs speed, relative to 20 m/min (lbf per m/min,
    // + opposes motion): the indicator reads ≈ 320 lb heavier per m/min in
    // both directions (injector / stripper dynamics). Previously it was
    // referenced to 0 m/min, which made the vertical RIH (run at 20–27
    // m/min) ~8–11 klb too heavy with the default stripper / reel values.
    speedSurfRIH: -277,
    speedSurfPOOH: 366,
    speedSurfRef: 20,
    speedDragRIH: 0,
    speedDragPOOH: 0,
    lateralMuFactorRIH: 1,
    lateralMuFactorPOOH: 1,
    lateralIncDeg: 80,
    // ERT as a friction-factor reduction in the zone above the tool, scaled
    // by k_ERT·Q relative to the reference tool (1500 lbf/bpm at 4.2 bpm)
    ertMode: 'mu',
    ertMuReductionRef: 0.3,
    ertRefLbfPerBpm: 1500,
    ertRefRateBpm: 4.2,
    ertZoneM: 4250,
    ertPoohEfficiency: 0.5,
    // residual-bend wall contact (lbf/ft): small (the vertical slopes
    // already match with the soft-string model)
    residualContact: 0.01,
    frDragReduction: 0.5,
    lockupForce: 150000,
  },
  // Surface defaults that make the model unbiased on the 11 runs (vertical
  // RIH median ≈ 0). Reel = real setting (1000 psi), not seen by the tared
  // indicator; the per-run offset still varies ±5 klb between jobs.
  stripperLbf: 4500,
  reelTensionLbf: 6000,
  reelTared: true,
  ertDefault: 'high',
  note: 'Calibrado con 11 carreras (pads B3A2, C1A y B1B, incluida la carrera de BdC-1030h con el ERT fallado). El offset de superficie (stripper + reel) varía ±5 klb entre trabajos: usá "Ajuste con lecturas de campo" o una carrera previa para corregirlo.',
}

// Friction presets: the RIH value is the user's CT–casing coefficient; the
// POOH value keeps the calibrated POOH/RIH ratio (0.263 / 0.309 = 0.85).
const POOH_RATIO = 0.85
export const MU_LEVELS = {
  low: { label: 'Bajo', rih: 0.25, pooh: +(0.25 * POOH_RATIO).toFixed(3) },
  std: { label: 'Estándar', rih: 0.3, pooh: +(0.3 * POOH_RATIO).toFixed(3) },
  cal: { label: 'Calibrado (B3A2 + C1A + B1B)', rih: 0.309, pooh: 0.263 },
  high: { label: 'Alto', rih: 0.35, pooh: +(0.35 * POOH_RATIO).toFixed(3) },
}

export const ERT_LEVELS = {
  none: { label: 'Sin ERT', value: 0 },
  low: { label: 'Baja intensidad — 500 lbf/bpm', value: 500 },
  medium: { label: 'Media intensidad — 1000 lbf/bpm', value: 1000 },
  high: { label: 'Alta intensidad — 1500 lbf/bpm', value: 1500 },
}
