// Section 9 — Formulas and Conversions.

export function buoyancyFactor(mudWeightPpg) {
  return 1 - 0.015 * mudWeightPpg
}

export function apparentWeightInFluid(airWeightLb, mudWeightPpg) {
  return airWeightLb * buoyancyFactor(mudWeightPpg)
}

export function hydrostaticPressure(fluidWeightPpg, heightFt) {
  return fluidWeightPpg * 0.052 * heightFt
}

export function psiPerFtFromPpg(ppg) {
  return 0.052 * ppg
}

export function apiGravity(specificGravity) {
  return 141.5 / specificGravity - 131.5
}

export function specificGravityFromApi(apiGrav) {
  return 141.5 / (apiGrav + 131.5)
}

// Treatment hydraulics
export function bottomHoleFracPressure(isip, hydrostaticPh) {
  return isip + hydrostaticPh
}

export function surfaceTreatingPressure(isip, pipeFriction, perfFriction) {
  return isip + pipeFriction + perfFriction
}

export function fractureGradient(isip, hydrostaticPh, depthFt) {
  return (isip + hydrostaticPh) / depthFt
}

// Friction pressure of a weighted brine/acid relative to fresh water.
export function brineFrictionPressure(freshWaterFrictionPsi, brineWeightPpg) {
  const n = brineWeightPpg - 8.33
  return freshWaterFrictionPsi * (1 + 0.15 * n)
}

// Balanced cement plug — height of slurry column with work string still in.
export function balancedPlugHeight(totalCuFtSlurry, cuftPerFtWorkString, cuftPerFtAnnulus) {
  return totalCuFtSlurry / (cuftPerFtWorkString + cuftPerFtAnnulus)
}

// Darcy's radial flow, steady-state, oilfield units (standard formula).
export function darcyOilRateBblDay(kMd, hFt, peMinusPwfPsi, viscosityCp, boRbBbl, reFt, rwFt) {
  return (
    (7.08e-3 * kMd * hFt * peMinusPwfPsi) /
    (viscosityCp * boRbBbl * Math.log(reFt / rwFt))
  )
}

export function darcyGasRateMscfDay(kMd, hFt, pe2MinusPwf2Psi2, viscosityCp, zFactor, tempR, reFt, rwFt) {
  return (
    (kMd * hFt * pe2MinusPwf2Psi2) /
    (1424 * tempR * zFactor * viscosityCp * Math.log(reFt / rwFt))
  )
}

// Mud pit / rectangular cross-section
export function cuftPerInchDepth(lengthFt, widthFt) {
  return 0.0833 * lengthFt * widthFt
}

export function bblPerInchDepth(lengthFt, widthFt) {
  return 0.0148 * lengthFt * widthFt
}

// Pipe displacement (metal only, with couplings)
export function pipeDisplacementCuFt(wtPerFtWithCplgs, depthFt) {
  return 0.002 * wtPerFtWithCplgs * depthFt
}

export function pipeDisplacementBbl(wtPerFtWithCplgs, depthFt) {
  return 0.000367 * wtPerFtWithCplgs * depthFt
}

// Terminal (settling) velocity via Stokes' law — used for proppant/ball
// sealer settling & rising velocity estimates. d in inches, densities in
// lb/gal, viscosity in cp. Returns ft/min.
export function stokesSettlingVelocityFtPerMin(dIn, particlePpg, fluidPpg, viscosityCp) {
  const dFt = dIn / 12
  const rhoParticle = particlePpg * 7.4805 // lb/ft3
  const rhoFluid = fluidPpg * 7.4805
  const muLbFtSec = viscosityCp * 0.000672
  const g = 32.17 // ft/s2
  const vFtSec = (g * dFt * dFt * (rhoParticle - rhoFluid)) / (18 * muLbFtSec)
  return vFtSec * 60
}
