// Section 7 — Proppants: slurry properties from concentration + true
// density, and sand fill-up from bulk density + linear capacity (gal/ft).

export function slurryProperties(concPpaLbPerGal, trueDensityPpg) {
  const slurryGalPerFluidGal = 1 + concPpaLbPerGal / trueDensityPpg
  const fluidFraction = 1 / slurryGalPerFluidGal
  const proppantFraction = 1 - fluidFraction
  const proppantLbPerGalSlurry = concPpaLbPerGal / slurryGalPerFluidGal
  const proppantLbPerBblSlurry = proppantLbPerGalSlurry * 42
  return {
    slurryGalPerFluidGal,
    fluidFraction,
    proppantFraction,
    proppantLbPerGalSlurry,
    proppantLbPerBblSlurry,
  }
}

// # sand per linear foot = bulkDensityPpg * gallons per linear foot (from
// the capacity/annulus calculators). linFtPerLbSand is its reciprocal.
export function sandFillUp(galPerLinFt, bulkDensityPpg) {
  const lbPerLinFt = bulkDensityPpg * galPerLinFt
  return {
    lbPerLinFt,
    linFtPerLb: lbPerLinFt > 0 ? 1 / lbPerLinFt : Infinity,
  }
}
