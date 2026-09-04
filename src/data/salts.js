// Section 10 — brine/completion fluid density tables (CaCl2, NaCl, KCl).
// Used to look up % concentration or lb/gal from the other, by interpolation.

export const CACL2_TABLE = [
  { pctAnhydrous: 1, ppg: 8.4, lbPerCuFt: 62.84 },
  { pctAnhydrous: 3, ppg: 8.6, lbPerCuFt: 64.34 },
  { pctAnhydrous: 7, ppg: 8.8, lbPerCuFt: 65.83 },
  { pctAnhydrous: 9, ppg: 9.0, lbPerCuFt: 67.33 },
  { pctAnhydrous: 11, ppg: 9.2, lbPerCuFt: 68.82 },
  { pctAnhydrous: 14, ppg: 9.4, lbPerCuFt: 70.32 },
  { pctAnhydrous: 16, ppg: 9.6, lbPerCuFt: 71.82 },
  { pctAnhydrous: 19, ppg: 9.8, lbPerCuFt: 73.31 },
  { pctAnhydrous: 21, ppg: 10.0, lbPerCuFt: 74.81 },
  { pctAnhydrous: 23, ppg: 10.2, lbPerCuFt: 76.31 },
  { pctAnhydrous: 26, ppg: 10.4, lbPerCuFt: 77.80 },
  { pctAnhydrous: 28, ppg: 10.6, lbPerCuFt: 79.30 },
  { pctAnhydrous: 30, ppg: 10.8, lbPerCuFt: 80.79 },
  { pctAnhydrous: 32, ppg: 11.0, lbPerCuFt: 82.29 },
  { pctAnhydrous: 34, ppg: 11.2, lbPerCuFt: 83.79 },
  { pctAnhydrous: 36, ppg: 11.4, lbPerCuFt: 85.28 },
  { pctAnhydrous: 38, ppg: 11.6, lbPerCuFt: 86.78 },
  { pctAnhydrous: 40, ppg: 11.8, lbPerCuFt: 88.30 },
  { pctAnhydrous: 42, ppg: 12.0, lbPerCuFt: 89.79 },
]

export const NACL_TABLE = [
  { pct: 1, ppg: 8.4, lbPerCuFt: 62.84 },
  { pct: 3, ppg: 8.5, lbPerCuFt: 63.59 },
  { pct: 4, ppg: 8.6, lbPerCuFt: 64.34 },
  { pct: 6, ppg: 8.7, lbPerCuFt: 65.08 },
  { pct: 7, ppg: 8.8, lbPerCuFt: 65.83 },
  { pct: 9, ppg: 8.9, lbPerCuFt: 66.58 },
  { pct: 11, ppg: 9.0, lbPerCuFt: 67.33 },
  { pct: 12, ppg: 9.1, lbPerCuFt: 68.08 },
  { pct: 14, ppg: 9.2, lbPerCuFt: 68.82 },
  { pct: 15, ppg: 9.3, lbPerCuFt: 69.57 },
  { pct: 17, ppg: 9.4, lbPerCuFt: 70.32 },
  { pct: 18, ppg: 9.5, lbPerCuFt: 71.07 },
  { pct: 20, ppg: 9.6, lbPerCuFt: 71.82 },
  { pct: 21, ppg: 9.7, lbPerCuFt: 72.57 },
  { pct: 23, ppg: 9.8, lbPerCuFt: 73.31 },
  { pct: 24, ppg: 9.9, lbPerCuFt: 74.06 },
  { pct: 26, ppg: 10.0, lbPerCuFt: 74.81 },
]

export const KCL_TABLE = [
  { pct: 1, ppg: 8.37, lbPerCuFt: 62.79 },
  { pct: 2, ppg: 8.43, lbPerCuFt: 63.19 },
  { pct: 4, ppg: 8.53, lbPerCuFt: 63.99 },
  { pct: 6, ppg: 8.64, lbPerCuFt: 64.81 },
  { pct: 8, ppg: 8.75, lbPerCuFt: 65.63 },
  { pct: 10, ppg: 8.86, lbPerCuFt: 66.46 },
  { pct: 12, ppg: 8.97, lbPerCuFt: 67.30 },
  { pct: 14, ppg: 9.09, lbPerCuFt: 68.16 },
  { pct: 16, ppg: 9.20, lbPerCuFt: 69.02 },
  { pct: 18, ppg: 9.32, lbPerCuFt: 69.91 },
  { pct: 20, ppg: 9.44, lbPerCuFt: 70.80 },
  { pct: 22, ppg: 9.56, lbPerCuFt: 71.71 },
  { pct: 24, ppg: 9.69, lbPerCuFt: 72.64 },
]

function interp(table, key, target) {
  const sorted = [...table].sort((a, b) => a[key] - b[key])
  if (target <= sorted[0][key]) return sorted[0]
  if (target >= sorted[sorted.length - 1][key]) return sorted[sorted.length - 1]
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (target >= a[key] && target <= b[key]) {
      const t = (target - a[key]) / (b[key] - a[key])
      const out = {}
      for (const k of Object.keys(a)) out[k] = a[k] + t * (b[k] - a[k])
      return out
    }
  }
  return sorted[sorted.length - 1]
}

export function ppgFromPct(table, pctKey, pct) {
  return interp(table, pctKey, pct).ppg
}

export function pctFromPpg(table, pctKey, ppg) {
  return interp(table, 'ppg', ppg)[pctKey]
}
