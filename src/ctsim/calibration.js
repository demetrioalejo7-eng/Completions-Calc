// Field calibration of the CT weight simulator (src/ctsim/forces.js).
//
// Fitted with tools/ct-calibration/fit_profile.mjs on 15 post-frac clean-out
// runs, 4 pads: B3A2, C1A, B1B (standard 2 3/8" tapered string, Terrapulse
// high-intensity ERT = 1500 lbf/bpm) and C1B (SPI string 41571, medium
// intensity ERT = 1000 lbf/bpm, 1-minute log). 5" 21.4# casing, slickwater,
// 3.7-4.6 bpm, WHP 3200-5500 psi, laterals ~3300-3600 m, TD 6700-7020 m MD.
// Each point carries its measured pump rate: no pumping above the KOP in
// RIH, so no ERT there.
//
// Lock-up constraints: BdC-1030h run 1 (B1B, ERT jammed) milled to 5632 m
// and was pulled for incipient lock-up → the model without ERT locks up
// between 5632 and 5800 m. Every other run reached its depth, so the model
// may not lock up above it. C1B (medium ERT, laterals to 7020 m) pins the
// ERT size: the previous set (48 % over 2350 m) locked C1B up at
// 6560-6810 m; now ~50 % over the last ~3200 m at 1500 lbf/bpm x 4.2 bpm
// (~32 % for medium intensity at 4 bpm).
// BdC-1037h run 1 (C1B, stuck with overpull, excess friction) is kept out.
//
// Surface terms: the weight indicator is zeroed with the CT stabbed and the
// reel under tension (reelTared), so the reel is not in the reading. The
// per-job surface offset still varies about +-5 klb.
//
// µRIH 0.278 vs µPOOH 0.286, with a residual-bend contact of 0.09 lbf/ft
// (it adds friction in RIH and POOH; before it fitted ~0 and µRIH carried
// it). The final trip out is pumped through the multicycle valve with the
// ERT bypassed.
// Cross-validation by pad (physics from 3 pads, the 4th unseen): median
// |error| 1.3-2.6 klb; trained without C1B the model still locks C1B up
// (the reach with medium ERT needed C1B's own data).
export const CT_CALIBRATION = {
  model: {
    // friction vs pipe speed (rate-and-state-like, log law)
    speedRef: 5,
    speedCoefRIH: 0.0362,
    speedCoefPOOH: -0.0808,
    // surface equipment term vs speed, relative to 20 m/min (lbf per m/min,
    // + opposes motion): ≈ 470 lb heavier per m/min (injector / stripper)
    speedSurfRIH: -363,
    speedSurfPOOH: 579,
    speedSurfRef: 20,
    speedDragRIH: 0,
    speedDragPOOH: 0,
    lateralMuFactorRIH: 1,
    lateralMuFactorPOOH: 1,
    lateralIncDeg: 80,
    // ERT as a friction-factor reduction in the zone above the tool, scaled
    // by k_ERT·Q relative to the reference tool (1500 lbf/bpm at 4.2 bpm)
    ertMode: 'mu',
    ertMuReductionRef: 0.5,
    ertRefLbfPerBpm: 1500,
    ertRefRateBpm: 4.2,
    ertZoneM: 3200,
    // only when the ERT is kept working in POOH (p.ertInPooh); by default
    // it is bypassed through the multicycle valve
    ertPoohEfficiency: 0.5,
    // residual-bend wall contact (lbf/ft)
    residualContact: 0.0902,
    frDragReduction: 0.5,
    lockupForce: 150000,
  },
  // Surface defaults: with the tared indicator, a 4000 lbf stripper leaves
  // the vertical RIH / POOH medians within 1 klb on the 15 runs.
  stripperLbf: 4000,
  reelTensionLbf: 6000,
  reelTared: true,
  ertDefault: 'high',
  note: 'Calibrado con 15 carreras de 4 pads (B3A2, C1A, B1B y C1B; incluye BdC-1030h con el ERT fallado y el C1B con sarta SPI y ERT de media intensidad). El offset de superficie (stripper + reel) varía ±5 klb entre trabajos: usá "Ajuste con lecturas de campo" o una carrera previa para corregirlo.',
}

// Field error bands (lbf, measured − model, p5 / p95 = 90 % of the points)
// per direction and section, from the 15 runs with the calibrated model and
// the default surface terms:
//  plan: before the job (the per-job surface offset is unknown, ±5 klb)
//  live: with the offset re-estimated during the run from the readings of
//        the previous ~1000 m (LIVE below): what a reading should do next
export const FIELD_BANDS = {
  plan: {
    RIH: { vert: [-10700, 6000], curve: [-12400, 7500], lat: [-12100, 8500] },
    POOH: { vert: [-10200, 11800], curve: [-11300, 11800], lat: [-11000, 8000] },
  },
  live: {
    RIH: { vert: [-4300, 4000], curve: [-5700, 3700], lat: [-7100, 4900] },
    POOH: { vert: [-5300, 8600], curve: [-5700, 10300], lat: [-7500, 5900] },
  },
}

// Live tracking of a run: the surface offset is the median deviation of the
// previous `windowBins` readings of the same direction (25 m bins), leaving
// out the last `gapBins` so a developing problem is not absorbed. Alarms
// (tuned on the 15 runs plus BdC-1037h r1, stuck with overpull, and
// BdC-1030h r1, pulled for incipient lock-up), below the KOP only: RIH
// 15 klb or more lighter than expected (set-down / excess friction: 1037h r1
// at 5337 m, 18 min before the 70 klb overpull; 1030h r1 at 5462 m), POOH
// 15 klb or more heavier (overpull). In the vertical a large deviation is a
// caution (tag / restriction / surface effects). False alarms on the pads
// B1B and C1B with the app's CSV reader: 2 in 8 normal runs, a single bin
// each (milling near TD in 1039h; 1028h, whose log has transmission errors).
export const LIVE = { windowBins: 40, gapBins: 8, minBins: 16, alarmSetDownLbf: 15000, alarmOverpullLbf: 15000 }

// Friction presets: the RIH value is the user's CT–casing coefficient; the
// POOH value keeps the calibrated POOH/RIH ratio (0.286 / 0.278).
const POOH_RATIO = 1.03
export const MU_LEVELS = {
  low: { label: 'Bajo', rih: 0.25, pooh: +(0.25 * POOH_RATIO).toFixed(3) },
  std: { label: 'Estándar', rih: 0.3, pooh: +(0.3 * POOH_RATIO).toFixed(3) },
  cal: { label: 'Calibrado (B3A2 + C1A + B1B + C1B)', rih: 0.278, pooh: 0.286 },
  high: { label: 'Alto', rih: 0.35, pooh: +(0.35 * POOH_RATIO).toFixed(3) },
}

export const ERT_LEVELS = {
  none: { label: 'Sin ERT', value: 0 },
  low: { label: 'Baja intensidad — 500 lbf/bpm', value: 500 },
  medium: { label: 'Media intensidad — 1000 lbf/bpm', value: 1000 },
  high: { label: 'Alta intensidad — 1500 lbf/bpm', value: 1500 },
}
