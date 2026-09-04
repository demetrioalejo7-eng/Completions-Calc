// Section 5 — Cement. Physical properties (absolute volume) of API cements
// and common additives, used by the absolute-volume slurry design calculator.
// avfGalLb = absolute volume factor, gallons of material per pound.

export const CEMENT_CLASSES = [
  { id: 'A', label: 'Clase A / B / C / G / H (API, 94 lb/sk)', lbPerSack: 94, avfGalLb: 0.0382 },
  { id: 'MD11', label: 'Multidense 1-1', lbPerSack: 94, avfGalLb: 0.0406 },
  { id: 'MD12', label: 'Multidense 1-2', lbPerSack: 94, avfGalLb: 0.0398 },
  { id: 'MD21', label: 'Multidense 2-1', lbPerSack: 94, avfGalLb: 0.0413 },
  { id: 'TLW', label: 'Trinity Lite-Wate (TLW)', lbPerSack: 75, avfGalLb: 0.0432 },
]

export const CEMENT_ADDITIVES = [
  { id: 'gel', label: 'Bentonita (Gel)', avfGalLb: 0.0453 },
  { id: 'flyash', label: 'Fly Ash', avfGalLb: 0.0487 },
  { id: 'cacl2dry', label: 'Cloruro de Calcio (seco)', avfGalLb: 0.0612 },
  { id: 'cacl2liq', label: 'Cloruro de Calcio (líquido)', avfGalLb: 0.0910 },
  { id: 'kcldry', label: 'Cloruro de Potasio (seco)', avfGalLb: 0.0604 },
  { id: 'nacldry', label: 'Cloruro de Sodio (seco)', avfGalLb: 0.0553 },
  { id: 'attapulgite', label: 'Attapulgita', avfGalLb: 0.0415 },
  { id: 'diacel', label: 'Diacel D', avfGalLb: 0.0572 },
  { id: 'silicaflour', label: 'Silica Flour', avfGalLb: 0.0456 },
  { id: 'sand', label: 'Arena (100 mesh)', avfGalLb: 0.0456 },
  { id: 'nametasilicate', label: 'Metasilicato de Sodio (seco)', avfGalLb: 0.0550 },
  { id: 'nasilicateliq', label: 'Silicato de Sodio (líquido)', avfGalLb: 0.0856 },
  { id: 'gilsonite', label: 'Gilsonite', avfGalLb: 0.1122 },
  { id: 'kolseal', label: 'Kol-Seal', avfGalLb: 0.0925 },
  { id: 'barite', label: 'Barita', avfGalLb: 0.0284 },
  { id: 'hematite', label: 'Hematita', avfGalLb: 0.0239 },
  { id: 'gypsum', label: 'Yeso', avfGalLb: 0.0444 },
  { id: 'perlite0', label: 'Perlita (0 PSI)', avfGalLb: 0.2274 },
  { id: 'diesel2', label: 'Diesel No. 2', avfGalLb: 0.1411 },
]

export const WATER_TYPES = [
  { id: 'fresh', label: 'Agua dulce', avfGalLb: 0.1199 },
  { id: 'sea', label: 'Agua de mar', avfGalLb: 0.1169 },
]

// Absolute volume of dissolved NaCl (salt), gal/lb, by % salt by weight of water.
export const NACL_DISSOLVED_AVF = [
  { pct: 2, avfGalLb: 0.0371 },
  { pct: 3, avfGalLb: 0.03745 },
  { pct: 4, avfGalLb: 0.0378 },
  { pct: 5, avfGalLb: 0.0381 },
  { pct: 6, avfGalLb: 0.0384 },
  { pct: 7, avfGalLb: 0.0387 },
  { pct: 8, avfGalLb: 0.0390 },
  { pct: 9, avfGalLb: 0.0392 },
  { pct: 10, avfGalLb: 0.0394 },
  { pct: 11, avfGalLb: 0.03965 },
  { pct: 12, avfGalLb: 0.0399 },
  { pct: 13, avfGalLb: 0.0401 },
  { pct: 14, avfGalLb: 0.0403 },
  { pct: 15, avfGalLb: 0.0405 },
  { pct: 16, avfGalLb: 0.0407 },
  { pct: 17, avfGalLb: 0.04095 },
  { pct: 18, avfGalLb: 0.0412 },
  { pct: 19, avfGalLb: 0.0414 },
  { pct: 20, avfGalLb: 0.0416 },
  { pct: 22, avfGalLb: 0.0420 },
  { pct: 24, avfGalLb: 0.0424 },
  { pct: 25, avfGalLb: 0.0426 },
  { pct: 28, avfGalLb: 0.0430 },
  { pct: 30, avfGalLb: 0.0433 },
  { pct: 32, avfGalLb: 0.0436 },
  { pct: 35, avfGalLb: 0.0440 },
  { pct: 37, avfGalLb: 0.0442 },
]

export const GAL_PER_CUFT = 7.4805

export function nacl_avf(pct) {
  if (pct <= 0) return 0
  const rows = NACL_DISSOLVED_AVF
  if (pct <= rows[0].pct) return rows[0].avfGalLb
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]
    const b = rows[i + 1]
    if (pct >= a.pct && pct <= b.pct) {
      const t = (pct - a.pct) / (b.pct - a.pct)
      return a.avfGalLb + t * (b.avfGalLb - a.avfGalLb)
    }
  }
  return rows[rows.length - 1].avfGalLb
}
