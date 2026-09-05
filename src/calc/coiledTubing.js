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
