// Section 9 — common unit conversion factors (MULTIPLY value BY factor).
// A curated subset of the handbook's conversion table, grouped by category.

export const CONVERSIONS = [
  { category: 'Volumen', from: 'Barriles', factor: 5.6146, to: 'Pies cúbicos' },
  { category: 'Volumen', from: 'Barriles', factor: 42.0, to: 'Galones' },
  { category: 'Volumen', from: 'Pies cúbicos', factor: 0.1781, to: 'Barriles' },
  { category: 'Volumen', from: 'Pies cúbicos', factor: 7.4805, to: 'Galones (US)' },
  { category: 'Volumen', from: 'Galones (US)', factor: 0.02381, to: 'Barriles' },
  { category: 'Volumen', from: 'Galones (US)', factor: 0.1337, to: 'Pies cúbicos' },
  { category: 'Volumen', from: 'Galones (US)', factor: 231.0, to: 'Pulgadas cúbicas' },
  { category: 'Volumen', from: 'Acre-pie', factor: 7758, to: 'Barriles' },
  { category: 'Volumen', from: 'Litros', factor: 0.2642, to: 'Galones (US)' },

  { category: 'Presión', from: 'Atmósferas', factor: 14.70, to: 'PSI' },
  { category: 'Presión', from: 'Atmósferas', factor: 33.94, to: 'Pies de agua' },
  { category: 'Presión', from: 'Atmósferas', factor: 29.92, to: 'Pulgadas de mercurio' },
  { category: 'Presión', from: 'PSI', factor: 2.309, to: 'Pies de agua @ 60°F' },
  { category: 'Presión', from: 'PSI', factor: 2.0353, to: 'Pulgadas de mercurio' },
  { category: 'Presión', from: 'PSI', factor: 0.06804, to: 'Atmósferas' },
  { category: 'Presión', from: 'PSI', factor: 703.1, to: 'kg/m²' },
  { category: 'Presión', from: 'Lb/galón', factor: 0.052, to: 'PSI por ft de profundidad' },
  { category: 'Presión', from: 'Pies de agua @ 60°F', factor: 0.4331, to: 'PSI' },

  { category: 'Longitud', from: 'Pies', factor: 0.3048, to: 'Metros' },
  { category: 'Longitud', from: 'Metros', factor: 3.281, to: 'Pies' },
  { category: 'Longitud', from: 'Pulgadas', factor: 2.54, to: 'Centímetros' },
  { category: 'Longitud', from: 'Millas', factor: 5280, to: 'Pies' },

  { category: 'Peso', from: 'Libras', factor: 453.6, to: 'Gramos' },
  { category: 'Peso', from: 'Kilogramos', factor: 2.205, to: 'Libras' },
  { category: 'Peso', from: 'Toneladas cortas', factor: 2000, to: 'Libras' },
  { category: 'Peso', from: 'Toneladas largas', factor: 2240, to: 'Libras' },

  { category: 'Potencia', from: 'Caballos de fuerza (HP)', factor: 33000, to: 'Ft-lb/min' },
  { category: 'Potencia', from: 'Caballos de fuerza (HP)', factor: 550, to: 'Ft-lb/seg' },
  { category: 'Potencia', from: 'Caballos de fuerza (HP)', factor: 0.7457, to: 'Kilowatts' },
  { category: 'Potencia', from: 'Kilowatts', factor: 1.341, to: 'Caballos de fuerza (HP)' },

  { category: 'Caudal', from: 'Barriles/hora', factor: 0.700, to: 'Galones/min' },
  { category: 'Caudal', from: 'Galones/min', factor: 1.429, to: 'Barriles/hora' },
  { category: 'Caudal', from: 'Pies³/min', factor: 0.1247, to: 'Galones/seg' },
  { category: 'Caudal', from: 'Pies³/seg', factor: 448.83, to: 'Galones/min' },

  { category: 'Densidad', from: 'Lb/galón', factor: 0.1198, to: 'g/cm³' },
  { category: 'Densidad', from: 'Lb/pie³', factor: 0.01602, to: 'g/cm³' },
  { category: 'Densidad', from: 'Lb/pie³', factor: 16.03, to: 'kg/m³' },
]

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
