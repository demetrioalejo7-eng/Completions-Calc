// Drill pipe, Heavy Weight (HW) and portamechas (drill collars, DC) — torque
// sheet supplied by the user (TORQUES.xls, "Hoja1"). Values transcribed
// as published. The sheet repeats the table twice, once with torque in
// kg·m and once in lb·ft; both are kept because a few DC rows don't agree
// between the two blocks (see `torqueMismatch`).
//
// Units as printed on the sheet: capacity and displacement in L/m, weight
// in kg/m, nominal weight in lb/ft, tensile in "TN", collapse and internal
// yield (burst) in psi.

export const DRILL_PIPE_TORQUES = [
  { od: 3.5, odLabel: '3 1/2', grade: 'E', wt: 13.3, capLm: 3.86, despLm: 2.64, kgPerM: 24.65, torqueKgm: 1383, torqueLbft: 10000, tensileTn: 96, collapsePsi: 12015, burstPsi: 12617 },
  { od: 3.5, odLabel: '3 1/2', grade: 'G', wt: 13.3, capLm: 3.82, despLm: 2.79, kgPerM: 25.37, torqueKgm: 1521, torqueLbft: 11000, tensileTn: 134, collapsePsi: 16820, burstPsi: 17664 },
  { od: 3.5, odLabel: '3 1/2', grade: 'S', wt: 13.3, capLm: 3.78, despLm: 2.83, kgPerM: 26.46, torqueKgm: 1797, torqueLbft: 13000, tensileTn: 173, collapsePsi: 21626, burstPsi: 22711 },
  { od: 5, odLabel: '5', grade: 'E', wt: 19.5, capLm: 9.15, despLm: 3.96, kgPerM: 31.06, torqueKgm: 3097, torqueLbft: 22400, tensileTn: 141, collapsePsi: 7041, burstPsi: 8688 },
  { od: 5, odLabel: '5', grade: 'G', wt: 19.5, capLm: 9.05, despLm: 4.15, kgPerM: 32.55, torqueKgm: 3568, torqueLbft: 25800, tensileTn: 197, collapsePsi: 8756, burstPsi: 12163 },
  { od: 5, odLabel: '5', grade: 'S', wt: 19.5, capLm: 8.97, despLm: 4.28, kgPerM: 33.57, torqueKgm: 3955, torqueLbft: 28600, tensileTn: 254, collapsePsi: 10029, burstPsi: 15638 },
]

// `torc`: column headed "TORC" on the sheet, no unit given.
export const HEAVY_WEIGHT_TORQUES = [
  { od: 3.5, odLabel: '3 1/2', id: 2.0625, idLabel: '2 1/16', wt: 25.3, capLm: 2.19, despLm: 4.81, kgPerM: 38.7, torqueKgm: 1369, torqueLbft: 9900, tensileTn: 153, torc: 7660 },
  { od: 5, odLabel: '5', id: 3, idLabel: '3', wt: 49.3, capLm: 4.61, despLm: 9.36, kgPerM: 74.4, torqueKgm: 4066, torqueLbft: 29400, tensileTn: 307, torc: 2654 },
]

export const DRILL_COLLAR_TORQUES = [
  { od: 4.75, odLabel: '4 3/4', id: 2, idLabel: '2', connection: 'NC-38', capLm: 2.03, despLm: 9.4, kgPerM: 74, torqueKgm: 1369, torqueLbft: 9900 },
  { od: 4.75, odLabel: '4 3/4', id: 2.25, idLabel: '2 1/4', connection: 'NC-38', capLm: 2.56, despLm: 8.87, kgPerM: 70, torqueKgm: 1147, torqueLbft: 9900 },
  { od: 6.5, odLabel: '6 1/2', id: 2.25, idLabel: '2 1/4', connection: 'NC-46', capLm: 2.56, despLm: 18.85, kgPerM: 148, torqueKgm: 3872, torqueLbft: 28000 },
  { od: 6.5, odLabel: '6 1/2', id: 2.8125, idLabel: '2 13/16', connection: 'NC-46', capLm: 4, despLm: 17.41, kgPerM: 136, torqueKgm: 3042, torqueLbft: 22000 },
  { od: 6.75, odLabel: '6 3/4', id: 2.5, idLabel: '2 1/2', connection: 'NC-50', capLm: 3.17, despLm: 19.92, kgPerM: 156, torqueKgm: 4978, torqueLbft: 36000 },
  { od: 6.75, odLabel: '6 3/4', id: 2.8125, idLabel: '2 13/16', connection: 'NC-50', capLm: 4, despLm: 19.09, kgPerM: 150, torqueKgm: 4425, torqueLbft: 32000 },
  { od: 8, odLabel: '8', id: 2.875, idLabel: '2 7/8', connection: '6 5/8 REG', capLm: 4.19, despLm: 28.24, kgPerM: 221, torqueKgm: 7450, torqueLbft: 57000 },
  { od: 8, odLabel: '8', id: 3, idLabel: '3', connection: '6 5/8 REG', capLm: 4.56, despLm: 27.87, kgPerM: 218, torqueKgm: 7100, torqueLbft: 50000 },
  { od: 9, odLabel: '9', id: 3, idLabel: '3', connection: '7 5/8 REG', capLm: 4.56, despLm: 36.48, kgPerM: 286, torqueKgm: 11478, torqueLbft: 83000 },
  { od: 9, odLabel: '9', id: 3.25, idLabel: '3 1/4', connection: '7 5/8 REG', capLm: 5.35, despLm: 35.69, kgPerM: 280, torqueKgm: 11478, torqueLbft: 83000 },
  { od: 9.5, odLabel: '9 1/2', id: 3, idLabel: '3', connection: '7 5/8 REG', capLm: 4.56, despLm: 41.17, kgPerM: 323, torqueKgm: 12170, torqueLbft: 88000 },
  { od: 9.5, odLabel: '9 1/2', id: 3.25, idLabel: '3 1/4', connection: '7 5/8 REG', capLm: 5.35, despLm: 40.38, kgPerM: 317, torqueKgm: 11478, torqueLbft: 83000 },
]

// Bit (trépano) pin connection make-up torque. The kg·m block gives one
// value per bit; the lb·ft block gives two (a range).
export const BIT_TORQUES = [
  { bit: '4 7/8', connection: '2 7/8 REG', torqueKgm: 968, torqueLbftMin: 6000, torqueLbftMax: 7000 },
  { bit: '6', connection: '3 1/2 REG', torqueKgm: 1244, torqueLbftMin: 7000, torqueLbftMax: 9000 },
  { bit: '8 1/2', connection: '4 1/2 REG', torqueKgm: 1659, torqueLbftMin: 12000, torqueLbftMax: 16000 },
  { bit: '12 1/4', connection: '6 5/8 REG', torqueKgm: 4425, torqueLbftMin: 28000, torqueLbftMax: 32000 },
  { bit: '17 1/2', connection: '7 5/8 REG', torqueKgm: 4702, torqueLbftMin: 34000, torqueLbftMax: 40000 },
  { bit: '26', connection: '7 5/8 REG', torqueKgm: 5532, torqueLbftMin: 34000, torqueLbftMax: 40000 },
]

const KGM_PER_LBFT = 0.138255

// True when the sheet's kg·m and lb·ft torques for the same row differ by
// more than rounding (1 %).
export function torqueMismatch(row) {
  const fromLb = row.torqueLbft * KGM_PER_LBFT
  return Math.abs(row.torqueKgm - fromLb) / fromLb > 0.01
}

export function lbftToKgm(lbft) {
  return lbft * KGM_PER_LBFT
}
