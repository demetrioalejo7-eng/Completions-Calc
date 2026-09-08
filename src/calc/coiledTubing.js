// Coiled Tubing — dimensions and reel/handling formulas, verified against
// the reference tool's worked examples.
import { steelWeightPerFt } from './geometry.js'
import { crossSectionalArea } from './strength.js'

export function ctDimensions(od, wallThickness) {
  const id = od - 2 * wallThickness
  if (id <= 0) throw new Error('El espesor de pared es demasiado grande para ese OD.')
  return {
    id,
    weightPerFt: steelWeightPerFt(od, id),
    tubingArea: crossSectionalArea(od, id),
    flowArea: (Math.PI / 4) * id * id,
  }
}

// Reel capacity: length of CT (ft) that fits on a reel, assuming the
// wound coil packs the full annular winding volume.
// spoolOD/coreDia/width/ctOD in inches, freeboard = clearance from flange edge.
export function reelCapacityFt(spoolOD, coreDia, width, ctOD, freeboard = 0) {
  const effOD = spoolOD - 2 * freeboard
  if (effOD <= coreDia) throw new Error('El diámetro efectivo del carrete debe ser mayor al del núcleo (core).')
  return (Math.PI / 4) * (effOD * effOD - coreDia * coreDia) * width / (ctOD * ctOD * 12)
}

export function goosenecRadius(arcWidth, arcHeight) {
  return (arcWidth * arcWidth + 4 * arcHeight * arcHeight) / (8 * arcHeight)
}

export function snubbingForce(whtpPsi, odIn) {
  return whtpPsi * (Math.PI / 4) * odIn * odIn
}

// Standard coiled tubing OD sizes, deduplicated across wall thicknesses —
// used where only the OD matters (snubbing force, reel length) as opposed
// to CT_DIMENSIONS (src/data/ctStrength.js) which also carries a row per
// wall thickness.
export const CT_OD_SIZES = [
  { od: 1, label: '1' },
  { od: 1.25, label: '1 1/4' },
  { od: 1.5, label: '1 1/2' },
  { od: 1.75, label: '1 3/4' },
  { od: 2, label: '2' },
  { od: 2.375, label: '2 3/8' },
  { od: 2.625, label: '2 5/8' },
  { od: 2.875, label: '2 7/8' },
  { od: 3.5, label: '3 1/2' },
]
