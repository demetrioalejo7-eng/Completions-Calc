// Section 9 — bidirectional unit converter. Each category has a base unit;
// every other unit stores its factor-to-base (value_in_unit * factor =
// value_in_base). Converting unit A -> B: value * factorA / factorB.

export const UNIT_CATEGORIES = {
  Longitud: {
    'Pies (ft)': 1,
    'Pulgadas (in)': 1 / 12,
    'Metros (m)': 3.28084,
    'Centímetros (cm)': 0.0328084,
    'Milímetros (mm)': 0.00328084,
    'Millas (mi)': 5280,
    'Yardas (yd)': 3,
    'Kilómetros (km)': 3280.84,
  },
  Volumen: {
    'Barriles (bbl)': 1,
    'Galones US (gal)': 1 / 42,
    'Pies cúbicos (ft³)': 5.6146,
    'Pulgadas cúbicas (in³)': 5.6146 / 1728,
    'Litros (L)': 1 / 158.987,
    'Metros cúbicos (m³)': 6.28981,
    'Acre-pie (acre-ft)': 7758,
  },
  Presión: {
    'PSI': 1,
    'Atmósferas (atm)': 14.696,
    'Pies de agua @ 60°F': 0.4331,
    'Pulgadas de mercurio (inHg)': 0.4912,
    'kg/cm²': 14.2233,
    'kPa': 0.145038,
    'Bar': 14.5038,
  },
  'Peso / Masa': {
    'Libras (lb)': 1,
    'Kilogramos (kg)': 2.20462,
    'Gramos (g)': 0.00220462,
    'Toneladas cortas (short ton)': 2000,
    'Toneladas largas (long ton)': 2240,
    'Toneladas métricas (t)': 2204.62,
  },
  Potencia: {
    'Caballos de fuerza (HP)': 1,
    'Kilowatts (kW)': 1.34102,
    'Ft-lb/min': 1 / 33000,
    'Ft-lb/seg': 1 / 550,
  },
  Caudal: {
    'Barriles/min (bpm)': 1,
    'Barriles/hora': 1 / 60,
    'Galones/min (gpm)': 1 / 42,
    'Pies³/min': 1 / 5.6146,
    'Pies³/seg': 60 / 5.6146,
    'Litros/min': 1 / 158.987,
  },
  Densidad: {
    'Lb/galón (ppg)': 1,
    'Lb/pie³': 1 / 7.4805,
    'g/cm³ (SG)': 8.34540,
    'kg/m³': 8.34540 / 1000,
  },
  Área: {
    'Pies² (ft²)': 1,
    'Pulgadas² (in²)': 1 / 144,
    'Metros² (m²)': 10.7639,
    'Acres': 43560,
  },
  Velocidad: {
    'Pies/min (ft/min)': 1,
    'Pies/seg (ft/s)': 60,
    'Metros/seg (m/s)': 196.85,
    'Millas/hora (mph)': 88,
    'km/hora': 54.6807,
  },
}

// Temperature needs offsets, handled separately from the linear categories.
export function convertTemperature(value, from, to) {
  let celsius
  if (from === 'F') celsius = ((value - 32) * 5) / 9
  else if (from === 'K') celsius = value - 273.15
  else celsius = value
  if (to === 'F') return (celsius * 9) / 5 + 32
  if (to === 'K') return celsius + 273.15
  return celsius
}

// Viscosity: Saybolt Universal Seconds vs Centipoise (relative viscosity) &
// Engler degrees, Section 9.
export const VISCOSITY_TABLE = [
  { sus: 32, engler: 1.08, cp: 1.41 },
  { sus: 40, engler: 1.31, cp: 4.30 },
  { sus: 50, engler: 1.58, cp: 7.40 },
  { sus: 60, engler: 1.88, cp: 10.20 },
  { sus: 70, engler: 2.17, cp: 12.83 },
  { sus: 80, engler: 2.46, cp: 15.35 },
  { sus: 90, engler: 2.74, cp: 17.80 },
  { sus: 100, engler: 3.02, cp: 20.20 },
  { sus: 120, engler: 3.60, cp: 24.90 },
  { sus: 140, engler: 4.19, cp: 29.51 },
  { sus: 160, engler: 4.77, cp: 34.07 },
  { sus: 180, engler: 5.35, cp: 38.60 },
  { sus: 200, engler: 5.92, cp: 43.10 },
  { sus: 250, engler: 7.35, cp: 54.28 },
  { sus: 300, engler: 8.79, cp: 65.40 },
  { sus: 400, engler: 11.68, cp: 87.55 },
  { sus: 500, engler: 14.00, cp: 109.6 },
  { sus: 700, engler: 20.00, cp: 153.7 },
  { sus: 1000, engler: 29.00, cp: 219.8 },
  { sus: 2000, engler: 58.00, cp: 439.9 },
  { sus: 3000, engler: 87.00, cp: 659.9 },
]

// Hydrostatic head vs API gravity / specific gravity (Section 9).
export const HYDROSTATIC_TABLE = [
  { apiGravity: 50, sg: 0.780, ppg: 6.50, psiPerFt: 0.338 },
  { apiGravity: 40, sg: 0.825, ppg: 6.88, psiPerFt: 0.358 },
  { apiGravity: 30, sg: 0.876, ppg: 7.31, psiPerFt: 0.380 },
  { apiGravity: 20, sg: 0.934, ppg: 7.79, psiPerFt: 0.405 },
  { apiGravity: 10, sg: 1.000, ppg: 8.34, psiPerFt: 0.434 },
]

export function decimalEquivalents() {
  const rows = []
  for (let n = 1; n <= 64; n++) {
    rows.push({ fraction: `${n}/64`, decimal: n / 64 })
  }
  return rows
}
