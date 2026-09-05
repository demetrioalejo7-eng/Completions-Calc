// Sections 1, 2 & 3 — Capacity, Volume & Height, Multiple Strings.
// All three share the same underlying formulas from the handbook:
//
//   Bbl per Lin Ft  = 0.0009714 * X
//   Lin Ft per Bbl  = 1029.4 / X
//   Cu Ft per Lin Ft = 0.005454 * X
//   Lin Ft per Cu Ft = 183.35 / X
//   Gal per Lin Ft  = 0.0408 * X
//   Lin Ft per Gal  = 24.51 / X
//
// where X = D²                (Section 1, capacity inside a single ID)
//       X = D² - d²            (Section 2, annulus between two diameters)
//       X = D² - n*d²          (Section 3, n identical strings in a hole/casing)
//
// D, d are diameters in inches; results are per linear foot.

export function factorsFromX(X) {
  const safeX = Math.max(X, 0)
  return {
    bblPerFt: 0.0009714 * safeX,
    ftPerBbl: safeX > 0 ? 1029.4 / safeX : Infinity,
    cuftPerFt: 0.005454 * safeX,
    ftPerCuft: safeX > 0 ? 183.35 / safeX : Infinity,
    galPerFt: 0.0408 * safeX,
    ftPerGal: safeX > 0 ? 24.51 / safeX : Infinity,
  }
}

export function capacityFactors(id) {
  return factorsFromX(id * id)
}

export function annulusFactors(outerD, innerD) {
  return factorsFromX(outerD * outerD - innerD * innerD)
}

export function multipleStringsFactors(outerD, stringD, nStrings) {
  return factorsFromX(outerD * outerD - nStrings * stringD * stringD)
}

// Multiple annulus with up to 4 different inner-pipe ODs (not necessarily
// identical), e.g. tubing + capillary string(s) run in the same hole/casing.
export function mixedAnnulusFactors(outerD, innerDs) {
  const sumSq = innerDs.reduce((acc, d) => acc + (d || 0) * (d || 0), 0)
  return factorsFromX(outerD * outerD - sumSq)
}

export function totalsFromFactors(factors, lengthFt) {
  return {
    bbl: factors.bblPerFt * lengthFt,
    cuft: factors.cuftPerFt * lengthFt,
    gal: factors.galPerFt * lengthFt,
  }
}

// Metal displacement (open-ended pipe): steel-only volume, same family of
// formulas as the annulus, using (OD² - ID²). Standard steel weight
// constant 2.673 lb/ft per in² of (OD²-ID²) (density 0.2836 lb/in³).
export const STEEL_WEIGHT_CONSTANT = 2.673

export function steelWeightPerFt(od, id) {
  return STEEL_WEIGHT_CONSTANT * (od * od - id * id)
}

export function idFromWeight(od, wtPerFt) {
  const val = od * od - wtPerFt / STEEL_WEIGHT_CONSTANT
  if (val < 0) throw new Error('El peso indicado es mayor al que admite ese OD (ID imaginario).')
  return Math.sqrt(val)
}

export function metalDisplacementFactors(od, id) {
  return annulusFactors(od, id)
}

// External (capped/closed-end) displacement: full-OD volume, i.e. the
// capacity formula applied to the OD instead of the ID.
export function externalDisplacementFactors(od) {
  return capacityFactors(od)
}

// Fluid velocity in a flow area given a pump/flow rate.
// 1 bbl/min = 5.6146 ft3/min = 5.6146*144 in2*ft/min per in2 of area.
export function fluidVelocityFtPerMin(rateBbl, areaSqIn) {
  return (rateBbl * 5.6146 * 144) / areaSqIn
}

export function flowAreaTubular(id) {
  return (Math.PI / 4) * id * id
}

export function flowAreaAnnular(outerD, innerD) {
  return (Math.PI / 4) * (outerD * outerD - innerD * innerD)
}
