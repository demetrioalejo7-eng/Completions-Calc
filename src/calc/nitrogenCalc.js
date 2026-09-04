// Section 11 — Nitrogen and Carbon Dioxide.
import { n2VolumeMultiplier, n2PressureRatio } from '../data/nitrogen.js'

export function pipelineVolumeBbl(idIn, lengthFt) {
  return 0.0009714 * idIn * idIn * lengthFt
}

export function n2TotalVolumeScf(idIn, lengthFt, psia, tempF) {
  const volBbl = pipelineVolumeBbl(idIn, lengthFt)
  const vm = n2VolumeMultiplier(psia, tempF)
  return { volBbl, vm, totalScf: vm * volBbl }
}

export function n2BottomHolePressure(wellheadPsi, depthFt) {
  const pr = n2PressureRatio(depthFt)
  return { pr, bhp: wellheadPsi * pr }
}

// CO2 liquid rate needed to deliver a given SCF/bbl treating ratio at a
// pump rate (bpm). 1 gallon liquid CO2 = 73 SCF.
export function co2LiquidRate(scfPerBbl, bpm) {
  const gpm = (scfPerBbl * bpm) / 73
  return { gpm, bpm: gpm / 42 }
}
