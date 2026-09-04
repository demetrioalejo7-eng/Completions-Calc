// Section 10 — Miscellaneous: packer pressure table and API wellhead flanges.

// Pressure exerted on a packer per 1000 lb of tubing weight slacked off,
// by casing OD and tubing connection (EUE).
export const PACKER_TUBING_WEIGHT_PSI = [
  { casingOD: '4 1/2', eue2: 106, eue25: 127 },
  { casingOD: '5', eue2: 82, eue25: 94 },
  { casingOD: '5 1/2', eue2: 65, eue25: 72 },
  { casingOD: '6', eue2: 52, eue25: 57 },
  { casingOD: '6 5/8', eue2: 42, eue25: 45 },
  { casingOD: '7 (17#-26#)', eue2: 34, eue25: 36 },
  { casingOD: '7 (26#-38#)', eue2: 39, eue25: 42 },
  { casingOD: '7 5/8', eue2: 30, eue25: 31 },
  { casingOD: '8 5/8', eue2: 23, eue25: 23 },
  { casingOD: '9 5/8', eue2: 17, eue25: 18 },
  { casingOD: '10 3/4', eue2: 13, eue25: 14 },
  { casingOD: '11 3/4', eue2: 11, eue25: 11 },
  { casingOD: '13 3/8', eue2: 9, eue25: 9 },
]

// API wellhead flanges (Series 400 / 600 / 900 / 1500 / 2900), working pressure.
export const API_FLANGES = [
  { series: 400, wpPsi: 1000, testPsi: 2000 },
  { series: 600, wpPsi: 2000, testPsi: 4000 },
  { series: 900, wpPsi: 3000, testPsi: 6000 },
  { series: 1500, wpPsi: 5000, testPsi: 10000 },
  { series: 2900, wpPsi: 10000, testPsi: 15000 },
]

// Barite plug slurry recipes (Section 10) — per barrel of pumpable slurry.
export const BARITE_PLUG_WATER_MUD = [
  { ppg: 14, galWaterPerBbl: 33.2, phosphateLbPerBbl: 0.2, bariteLbPerBbl: 316 },
  { ppg: 15, galWaterPerBbl: 32.0, phosphateLbPerBbl: 0.35, bariteLbPerBbl: 360 },
  { ppg: 16, galWaterPerBbl: 30.7, phosphateLbPerBbl: 0.5, bariteLbPerBbl: 407 },
  { ppg: 17, galWaterPerBbl: 29.0, phosphateLbPerBbl: 0.65, bariteLbPerBbl: 469 },
  { ppg: 18, galWaterPerBbl: 27.2, phosphateLbPerBbl: 0.8, bariteLbPerBbl: 528 },
  { ppg: 19, galWaterPerBbl: 25.8, phosphateLbPerBbl: 0.95, bariteLbPerBbl: 581 },
  { ppg: 20, galWaterPerBbl: 24.2, phosphateLbPerBbl: 1.1, bariteLbPerBbl: 635 },
  { ppg: 21, galWaterPerBbl: 22.7, phosphateLbPerBbl: 1.25, bariteLbPerBbl: 690 },
  { ppg: 22, galWaterPerBbl: 21.2, phosphateLbPerBbl: 1.4, bariteLbPerBbl: 744 },
]

export const BARITE_PLUG_OIL_MUD = [
  { ppg: 18.0, dieselGalPerBbl: 25.2, mcsaLbPerBbl: 0.61, bariteLbPerBbl: 576 },
  { ppg: 18.5, dieselGalPerBbl: 24.4, mcsaLbPerBbl: 0.69, bariteLbPerBbl: 600 },
  { ppg: 19.0, dieselGalPerBbl: 23.6, mcsaLbPerBbl: 0.77, bariteLbPerBbl: 626 },
  { ppg: 19.5, dieselGalPerBbl: 22.8, mcsaLbPerBbl: 0.85, bariteLbPerBbl: 652 },
  { ppg: 20.0, dieselGalPerBbl: 22.0, mcsaLbPerBbl: 0.93, bariteLbPerBbl: 678 },
  { ppg: 20.5, dieselGalPerBbl: 21.0, mcsaLbPerBbl: 1.01, bariteLbPerBbl: 704 },
  { ppg: 21.0, dieselGalPerBbl: 20.3, mcsaLbPerBbl: 1.09, bariteLbPerBbl: 730 },
  { ppg: 21.5, dieselGalPerBbl: 19.5, mcsaLbPerBbl: 1.17, bariteLbPerBbl: 756 },
  { ppg: 22.0, dieselGalPerBbl: 18.7, mcsaLbPerBbl: 1.25, bariteLbPerBbl: 782 },
  { ppg: 22.5, dieselGalPerBbl: 17.9, mcsaLbPerBbl: 1.33, bariteLbPerBbl: 808 },
  { ppg: 23.0, dieselGalPerBbl: 17.0, mcsaLbPerBbl: 1.41, bariteLbPerBbl: 834 },
]

function interpBy(rows, key, target, fields) {
  const sorted = [...rows].sort((a, b) => a[key] - b[key])
  const t0 = Math.min(Math.max(target, sorted[0][key]), sorted[sorted.length - 1][key])
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (t0 >= a[key] && t0 <= b[key]) {
      const t = b[key] === a[key] ? 0 : (t0 - a[key]) / (b[key] - a[key])
      const out = {}
      for (const f of fields) out[f] = a[f] + t * (b[f] - a[f])
      return out
    }
  }
  const last = sorted[sorted.length - 1]
  const out = {}
  for (const f of fields) out[f] = last[f]
  return out
}

export function bariteWaterMudAt(ppg) {
  return interpBy(BARITE_PLUG_WATER_MUD, 'ppg', ppg, [
    'galWaterPerBbl',
    'phosphateLbPerBbl',
    'bariteLbPerBbl',
  ])
}

export function bariteOilMudAt(ppg) {
  return interpBy(BARITE_PLUG_OIL_MUD, 'ppg', ppg, [
    'dieselGalPerBbl',
    'mcsaLbPerBbl',
    'bariteLbPerBbl',
  ])
}
