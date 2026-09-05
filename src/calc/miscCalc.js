// Section 10 — Miscellaneous.

// Duplex, double-acting pump output per cycle (one crankshaft revolution).
// D = liner ID (in), d = rod diameter (in), L = stroke length (in).
export function duplexBblPerCycle(linerIn, rodIn, strokeIn, efficiency = 1) {
  const bbl = (Math.PI * strokeIn * (2 * linerIn * linerIn - rodIn * rodIn)) / 19404
  return bbl * efficiency
}

export function duplexCuFtPerCycle(linerIn, rodIn, strokeIn, efficiency = 1) {
  return duplexBblPerCycle(linerIn, rodIn, strokeIn, efficiency) * 5.6146
}

// Triplex, double-acting: the handbook gives this as 1.5x the duplex value.
export function triplexDoubleActingBblPerCycle(linerIn, rodIn, strokeIn, efficiency = 1) {
  return duplexBblPerCycle(linerIn, rodIn, strokeIn, efficiency) * 1.5
}

// Triplex, single-acting (typical rig/frac pump — 3 cylinders, one side each).
export function triplexSingleActingBblPerStroke(linerIn, strokeIn, efficiency = 1) {
  const bbl = (3 * (Math.PI / 4) * linerIn * linerIn * strokeIn) / 9702
  return bbl * efficiency
}

// Quintuplex, single-acting (5 cylinders, one side each — common frac pump layout).
export function quintuplexBblPerStroke(linerIn, strokeIn, efficiency = 1) {
  const bbl = (5 * (Math.PI / 4) * linerIn * linerIn * strokeIn) / 9702
  return bbl * efficiency
}

export function pumpOutputBblPerMin(bblPerCycle, strokesPerMin) {
  return bblPerCycle * strokesPerMin
}

// Effect of temperature on brine density.
export function densityChangeWithTemp(t1F, t2F) {
  return 0.003 * (t1F - t2F)
}

// Pipe stretch/contraction due to temperature.
export function pipeStretchInches(bottomHoleTempF, surfaceTempF, lengthFt) {
  const deltaT = (bottomHoleTempF - surfaceTempF) / 2
  const cPer1000Ft = 0.0829 * deltaT
  return { deltaT, cPer1000Ft, totalStretchIn: cPer1000Ft * (lengthFt / 1000) }
}

// Differential pressure across a packer.
export function packerDifferentialPressure({
  tubingWeightLb,
  psiPer1000LbTubingWeight,
  annulusGradPsiPerFt,
  packerDepthFt,
  tubingFluidGradPsiPerFt,
}) {
  const fromTubingWeight = (tubingWeightLb / 1000) * psiPer1000LbTubingWeight
  const fromAnnulusFluid = annulusGradPsiPerFt * packerDepthFt
  const fromTubingFluid = tubingFluidGradPsiPerFt * packerDepthFt
  const downward = fromTubingWeight + fromAnnulusFluid
  const differential = downward - fromTubingFluid
  return { fromTubingWeight, fromAnnulusFluid, fromTubingFluid, downward, differential }
}
