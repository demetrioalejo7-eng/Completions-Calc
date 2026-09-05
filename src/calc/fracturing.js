// Fracturing — slurry/proppant-ratio relationships, perforation friction,
// hydraulic power and settling velocity. Verified against the reference
// tool's worked example (proppant ratio / proppant total).
export const GAL_PER_LB_WATER = 8.345404

// General slurry/clean/proppant-ratio solver. Works for both "Volumes"
// (bbl) and "Flow Rate" (bpm) methods — the relationships are the same,
// only the units of `slurry`/`clean` change (and the resulting
// "proppantTotal" becomes a rate, lb/min, instead of a static lb amount).
// Pass exactly one of `slurry`, `clean`, `ratio` as null/undefined — it is
// solved for from the other two. Relations (with k = true density, ppg):
//   proppantVol(gal) = (slurry - clean) * 42
//   proppantTotal(lb) = proppantVol(gal) * k
//   ratio(psa, lb/gal) = proppantTotal(lb) / (clean * 42)
export function solveProppantSlurry({ slurry, clean, ratio, sg }) {
  const k = sg * GAL_PER_LB_WATER
  if (slurry == null) {
    if (clean == null || ratio == null) throw new Error('Completá dos de los tres valores.')
    slurry = clean * (1 + ratio / k)
  } else if (clean == null) {
    if (ratio == null) throw new Error('Completá dos de los tres valores.')
    clean = (k * slurry) / (ratio + k)
  } else {
    if (slurry <= clean) throw new Error('El volumen/caudal de slurry debe ser mayor al de fluido limpio.')
  }
  const proppantVolGal = (slurry - clean) * 42
  const proppantTotalLb = proppantVolGal * k
  const proppantRatioPsa = ratio ?? proppantTotalLb / (clean * 42)
  return { slurry, clean, proppantVolGal, proppantTotalLb, proppantRatioPsa }
}

// Standard oilfield perforation friction pressure formula.
export function perforationFriction(rateBpm, fluidPpg, nPerfs, diameterIn, dischargeCoeff) {
  return (
    (0.2369 * rateBpm * rateBpm * fluidPpg) /
    (nPerfs * nPerfs * Math.pow(diameterIn, 4) * dischargeCoeff * dischargeCoeff)
  )
}

export function hydraulicHorsepower(pressurePsi, rateBpm) {
  return (pressurePsi * rateBpm) / 40.8
}

// Standard US sieve mesh -> approximate opening diameter (inches).
export const MESH_SIZES = [
  { mesh: 8, diameterIn: 0.0937 },
  { mesh: 10, diameterIn: 0.0787 },
  { mesh: 12, diameterIn: 0.0661 },
  { mesh: 16, diameterIn: 0.0469 },
  { mesh: 18, diameterIn: 0.0394 },
  { mesh: 20, diameterIn: 0.0331 },
  { mesh: 25, diameterIn: 0.028 },
  { mesh: 30, diameterIn: 0.0234 },
  { mesh: 35, diameterIn: 0.0197 },
  { mesh: 40, diameterIn: 0.0165 },
  { mesh: 45, diameterIn: 0.0139 },
  { mesh: 50, diameterIn: 0.0117 },
  { mesh: 60, diameterIn: 0.0098 },
  { mesh: 70, diameterIn: 0.0083 },
  { mesh: 80, diameterIn: 0.007 },
  { mesh: 100, diameterIn: 0.0059 },
  { mesh: 120, diameterIn: 0.0049 },
  { mesh: 140, diameterIn: 0.0041 },
  { mesh: 170, diameterIn: 0.0035 },
  { mesh: 200, diameterIn: 0.0029 },
]

export const PROPPANT_MESH_PRESETS = [
  { id: '12-20', label: '12/20 mesh', diameterIn: (0.0661 + 0.0331) / 2 },
  { id: '16-30', label: '16/30 mesh', diameterIn: (0.0469 + 0.0234) / 2 },
  { id: '20-40', label: '20/40 mesh', diameterIn: (0.0331 + 0.0165) / 2 },
  { id: '30-50', label: '30/50 mesh', diameterIn: (0.0234 + 0.0117) / 2 },
  { id: '40-70', label: '40/70 mesh', diameterIn: (0.0165 + 0.0083) / 2 },
  { id: '70-140', label: '70/140 mesh', diameterIn: (0.0083 + 0.0041) / 2 },
  { id: '100', label: '100 mesh', diameterIn: 0.0059 },
]
