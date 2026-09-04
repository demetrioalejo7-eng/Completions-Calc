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

export function totalsFromFactors(factors, lengthFt) {
  return {
    bbl: factors.bblPerFt * lengthFt,
    cuft: factors.cuftPerFt * lengthFt,
    gal: factors.galPerFt * lengthFt,
  }
}
