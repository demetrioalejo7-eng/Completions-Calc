// Section 9 — Formulas and Conversions.

// Standard oilfield buoyancy factor, using steel density ≈ 65.5 lb/gal.
// (The older "1 - 0.015·ppg" approximation is equivalent to 1/65.5≈0.01527
// rounded to 0.015; this form matches reference tools more closely.)
export function buoyancyFactor(mudWeightPpg) {
  return (65.5 - mudWeightPpg) / 65.5
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

// Terminal (settling/rising) velocity of a sphere in a fluid — used for
// proppant settling and ball-sealer velocity estimates. d in inches,
// densities in lb/gal, viscosity in cp.
//
// Pure Stokes' law (v = g·d²·Δρ/18μ) is only valid while the particle
// Reynolds number stays below ~1 (fine grains settling in a viscous
// fluid). Typical proppant (20/40 to 100 mesh, ~0.006-0.03 in) settling
// in low-viscosity fracturing fluids (slickwater/water, 1-5 cP) — and
// ball sealers, which are much larger still — routinely land at
// Re ≈ 10² to 10⁴, well into the "intermediate" or fully turbulent
// ("Newton's law") drag regime, where plain Stokes' law overstates the
// velocity several-fold. This picks the correct classical drag
// correlation (McCabe & Smith "Unit Operations of Chemical Engineering")
// based on the Reynolds number the answer actually produces:
//   Re < 1        Stokes' law:       v = g·d²·Δρ / (18·μ)
//   1 < Re < 1000  Intermediate law:  v = 0.153·g^0.71·d^1.14·Δρ^0.71 / (ρf^0.29·μ^0.43)
//   Re > 1000      Newton's law:      v = 1.74·√(g·d·Δρ/ρf)
// Returns { velocityFtPerMin, regime, reynolds } — velocityFtPerMin is
// signed: positive = the particle sinks, negative = it rises (it's less
// dense than the fluid).
export function settlingVelocity(dIn, particlePpg, fluidPpg, viscosityCp) {
  const dFt = dIn / 12
  const rhoParticle = particlePpg * 7.4805 // lb/ft3
  const rhoFluid = fluidPpg * 7.4805
  const muLbFtSec = viscosityCp * 0.000672
  const g = 32.17 // ft/s2
  const sign = rhoParticle >= rhoFluid ? 1 : -1
  const deltaRho = Math.abs(rhoParticle - rhoFluid)

  const reynolds = (vFtSec) => (rhoFluid * vFtSec * dFt) / muLbFtSec
  const toFtPerMin = (vFtSec) => sign * vFtSec * 60

  if (deltaRho === 0) return { velocityFtPerMin: 0, regime: 'Stokes (laminar)', reynolds: 0 }

  const vStokes = (g * dFt * dFt * deltaRho) / (18 * muLbFtSec)
  const reStokes = reynolds(vStokes)
  if (reStokes <= 1) {
    return { velocityFtPerMin: toFtPerMin(vStokes), regime: 'Stokes (laminar)', reynolds: reStokes }
  }

  const vIntermediate =
    (0.153 * Math.pow(g, 0.71) * Math.pow(dFt, 1.14) * Math.pow(deltaRho, 0.71)) /
    (Math.pow(rhoFluid, 0.29) * Math.pow(muLbFtSec, 0.43))
  const reIntermediate = reynolds(vIntermediate)
  if (reIntermediate <= 1000) {
    return { velocityFtPerMin: toFtPerMin(vIntermediate), regime: 'Intermedia (Allen)', reynolds: reIntermediate }
  }

  const vNewton = 1.74 * Math.sqrt((g * dFt * deltaRho) / rhoFluid)
  return { velocityFtPerMin: toFtPerMin(vNewton), regime: 'Newton (turbulenta)', reynolds: reynolds(vNewton) }
}
