// Section 6 — Acid formulas (dilution / blending of HCl).

export function volumeStrongFromDilute(volDilute, pctDilute, sgDilute, pctStrong, sgStrong) {
  return (volDilute * pctDilute * sgDilute) / (pctStrong * sgStrong)
}

export function volumeDiluteFromStrong(volStrong, pctStrong, sgStrong, pctDilute, sgDilute) {
  return (volStrong * pctStrong * sgStrong) / (pctDilute * sgDilute)
}

export function waterToDilute(volDesired, desiredPct, sgDesired, origPct, sgOrig) {
  return volDesired - (volDesired * desiredPct * sgDesired) / (origPct * sgOrig)
}

export function strongToIncreaseConcentration(
  volDesired,
  desiredPct,
  sgDesired,
  volOrig,
  origPct,
  sgOrig,
  strongPct,
  sgStrong
) {
  return (
    (volDesired * desiredPct * sgDesired - volOrig * origPct * sgOrig) /
    (strongPct * sgStrong)
  )
}
