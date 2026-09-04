// Section 7 — Proppants. True density presets (used for slurry property
// calculations) and bulk density presets (used for fill-up calculations).

export const PROPPANT_TRUE_DENSITY = [
  { id: 'sand', label: 'Arena (SG 2.65)', sg: 2.65, ppg: 22.1 },
  { id: 'sand20_40', label: 'Arena 20-40 (SG 2.65)', sg: 2.65, ppg: 22.1 },
  { id: 'iclw', label: 'Cerámico liviano (ILWP, SG ~2.71)', sg: 2.71, ppg: 22.6 },
  { id: 'icmw', label: 'Cerámico medio (SG ~3.15)', sg: 3.15, ppg: 26.3 },
  { id: 'bauxite', label: 'Bauxita sinterizada (SG ~3.65)', sg: 3.65, ppg: 30.4 },
]

// Bulk density of 20-40 mesh sand used for fill-up calcs (lb/gal, in place).
export const SAND_BULK_DENSITY_PPG = 14.3
