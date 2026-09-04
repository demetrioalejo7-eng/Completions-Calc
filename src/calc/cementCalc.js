// Section 5 — Cement. Absolute-volume slurry design: given a cement blend,
// additives (as % by weight of cement) and a desired slurry density, solve
// for the mix-water requirement and resulting yield. Matches the handbook's
// "Slurry Calculation Work Sheet" worked examples exactly.
import { GAL_PER_CUFT } from '../data/cement.js'

// additives: [{ pctByWtCement, avfGalLb }]
export function slurryDesign({
  cementLbPerSack,
  cementAvfGalLb,
  additives = [],
  desiredDensityPpg,
  waterAvfGalLb,
  saltPctByWtWater = 0,
  saltAvfGalLb = 0,
}) {
  let solidsLb = cementLbPerSack
  let solidsGal = cementLbPerSack * cementAvfGalLb
  for (const a of additives) {
    const lb = (a.pctByWtCement / 100) * cementLbPerSack
    solidsLb += lb
    solidsGal += lb * a.avfGalLb
  }

  const salt = saltPctByWtWater / 100
  const denom = desiredDensityPpg * (waterAvfGalLb + salt * saltAvfGalLb) - 1 - salt
  const waterLb = (solidsLb - desiredDensityPpg * solidsGal) / denom
  const saltLb = salt * waterLb
  const waterGal = waterLb * waterAvfGalLb
  const saltGal = saltLb * saltAvfGalLb

  const yieldGal = solidsGal + waterGal + saltGal
  const yieldCuft = yieldGal / GAL_PER_CUFT
  const totalLb = solidsLb + waterLb + saltLb
  const checkDensityPpg = totalLb / yieldGal

  return {
    solidsLb,
    solidsGal,
    waterLb,
    waterGal,
    saltLb,
    saltGal,
    yieldGal,
    yieldCuft,
    totalLb,
    checkDensityPpg,
  }
}

export function sacksNeeded(totalCuFtNeeded, yieldCuftPerSack) {
  return totalCuFtNeeded / yieldCuftPerSack
}
