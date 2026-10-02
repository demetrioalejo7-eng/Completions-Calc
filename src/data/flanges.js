// API 6A flanges — RTJ (Ring Type Joint), tipos 6B y 6BX. Datos tomados
// de la hoja dimensional API 6A publicada por el fabricante (S.T. ENG
// Co., Ltd.), transcriptos tal cual figuran ahí. Todas las medidas en mm
// salvo la clase de presión (psi). Un par de celdas vienen en blanco en
// la propia hoja de datos del fabricante (no publicadas) — se marcan acá
// como `null` en vez de inventar un valor.
//
// Tipo 6B: brida "Blind RTJ" y "Welding Neck RTJ" — columnas B, OD, C
// (máx.), K, P, E, T, Q, X, BC, N, H, LN, HL, JL (LN/HL/JL solo se
// publican para los tamaños con welding neck tabulado).
// Tipo 6BX: mismo par Blind/Welding Neck; columnas OD, C, E1, G, K, T,
// J1, J4, R, BC, N, H para las clases 2000/3000/5000 psi (solo se
// publica la vista "Blind"), y agrega B, Q, J2, J3 para 10000/15000/
// 20000 psi (se publican ambas vistas).

export const FLANGE_6B_CLASSES = [
  {
    psi: 2000,
    label: '13.8 MPa (2000 psi)',
    rows: [
      { size: '2 1/16', b: 53.2, od: 165, c: 3, k: 108, p: 82.55, e: 7.9, t: 33.4, q: 25.4, x: 84, bc: 127, n: 8, h: 20, ln: 81, hl: 60.3, jl: 53.3, ring: 'R23' },
      { size: '2 9/16', b: 65.9, od: 190, c: 3, k: 127, p: 101.60, e: 7.9, t: 36.6, q: 28.6, x: 100, bc: 149.2, n: 8, h: 23, ln: 88, hl: 73.0, jl: 63.5, ring: 'R26' },
      { size: '3 1/8', b: 81.8, od: 210, c: 3, k: 146, p: 123.83, e: 7.9, t: 39.7, q: 31.8, x: 117, bc: 168.3, n: 8, h: 23, ln: 91, hl: 88.9, jl: 78.7, ring: 'R31' },
      { size: '4 1/16', b: 108.7, od: 275, c: 3, k: 175, p: 149.23, e: 7.9, t: 46.1, q: 38.1, x: 152, bc: 215.9, n: 8, h: 26, ln: 110, hl: 114.3, jl: 103.1, ring: 'R37' },
      { size: '5 1/8', b: 131.0, od: 330, c: 3, k: 210, p: 180.98, e: 7.9, t: 52.4, q: 44.5, x: 189, bc: 266.7, n: 8, h: 29, ln: 122, hl: 141.3, jl: 122.9, ring: 'R41' },
      { size: '7 1/16', b: 181.8, od: 355, c: 6, k: 241, p: 211.15, e: 7.9, t: 55.6, q: 47.6, x: 222, bc: 292.1, n: 12, h: 29, ln: 126, hl: 168.3, jl: 147.1, ring: 'R45' },
      { size: '9', b: 229.4, od: 420, c: 6, k: 302, p: 269.88, e: 7.9, t: 63.5, q: 55.6, x: 273, bc: 349.3, n: 12, h: 32, ln: 141, hl: 219.1, jl: 199.1, ring: 'R49' },
      { size: '11', b: 280.2, od: 510, c: 6, k: 356, p: 323.85, e: 7.9, t: 71.5, q: 63.5, x: 343, bc: 431.8, n: 16, h: 35, ln: 160, hl: 273.0, jl: 248.4, ring: 'R53' },
      { size: '13 5/8', b: 346.9, od: 560, c: 6, k: 381, p: 381.00, e: 7.9, t: 74.7, q: 66.7, x: 400, bc: 489, n: 20, h: 35, ln: null, hl: null, jl: null, ring: 'R57' },
      { size: '16 3/4', b: 426.2, od: 685, c: 6, k: 508, p: 469.90, e: 7.9, t: 84.2, q: 76.2, x: 495, bc: 603.2, n: 20, h: 42, ln: null, hl: null, jl: null, ring: 'R65' },
      { size: '21 1/4', b: 540.5, od: 815, c: 6, k: 635, p: 584.20, e: 9.7, t: 98.5, q: 88.9, x: 610, bc: 723.9, n: 24, h: 45, ln: null, hl: null, jl: null, ring: 'R73' },
    ],
  },
  {
    psi: 3000,
    label: '20.7 MPa (3000 psi)',
    rows: [
      { size: '2 1/16', b: 53.2, od: 215, c: 3, k: 124, p: 95.25, e: 7.9, t: 46.1, q: 38.1, x: 104.8, bc: 165.1, n: 8, h: 26, ln: 109.6, hl: 60.3, jl: 50.0, ring: 'R24' },
      { size: '2 9/16', b: 65.9, od: 245, c: 3, k: 137, p: 107.95, e: 7.9, t: 49.3, q: 41.3, x: 123.8, bc: 190.5, n: 8, h: 29, ln: 112.7, hl: 73.0, jl: 59.7, ring: 'R27' },
      { size: '3 1/8', b: 81.8, od: 240, c: 3, k: 156, p: 123.83, e: 7.9, t: 46.1, q: 38.1, x: 127.0, bc: 190.5, n: 8, h: 26, ln: 109.5, hl: 88.9, jl: 74.4, ring: 'R31' },
      { size: '4 1/16', b: 108.7, od: 290, c: 3, k: 181, p: 149.23, e: 7.9, t: 52.4, q: 44.4, x: 158.8, bc: 235.0, n: 8, h: 32, ln: 122.2, hl: 114.3, jl: 98.0, ring: 'R37' },
      { size: '5 1/8', b: 131.0, od: 350, c: 3, k: 216, p: 180.98, e: 7.9, t: 58.8, q: 50.8, x: 190.5, bc: 279.4, n: 8, h: 35, ln: 134.9, hl: 141.3, jl: 122.9, ring: 'R41' },
      { size: '7 1/16', b: 181.8, od: 380, c: 6, k: 241, p: 211.15, e: 7.9, t: 63.5, q: 55.6, x: 235.0, bc: 317.5, n: 12, h: 32, ln: 147.6, hl: 168.3, jl: 147.1, ring: 'R45' },
      { size: '9', b: 229.4, od: 470, c: 6, k: 308, p: 269.88, e: 7.9, t: 71.5, q: 63.5, x: 298.5, bc: 393.7, n: 12, h: 39, ln: 169.9, hl: 219.1, jl: 189.7, ring: 'R49' },
      { size: '11', b: 280.2, od: 545, c: 6, k: 362, p: 323.85, e: 7.9, t: 77.8, q: 69.9, x: 368.3, bc: 469.9, n: 16, h: 39, ln: 192.1, hl: 273, jl: 237.2, ring: 'R53' },
      { size: '13 5/8', b: 346.9, od: 610, c: 6, k: 419, p: 381.00, e: 7.9, t: 87.4, q: 79.4, x: 419.1, bc: 533.4, n: 20, h: 39, ln: null, hl: null, jl: null, ring: 'R57' },
      { size: '16 3/4', b: 426.2, od: 705, c: 6, k: 524, p: 469.90, e: 11.2, t: 100.1, q: 88.9, x: 508.0, bc: 616.0, n: 20, h: 45, ln: null, hl: null, jl: null, ring: 'R66' },
      { size: '20 3/4', b: 527.8, od: 855, c: 6, k: 648, p: 584.20, e: 12.7, t: 120.7, q: 108, x: 622.3, bc: 749.3, n: 20, h: 54, ln: null, hl: null, jl: null, ring: 'R74' },
    ],
  },
  {
    psi: 5000,
    label: '34.5 MPa (5000 psi)',
    rows: [
      { size: '2 1/16', b: 53.2, od: 215, c: 3, k: 124, p: 95.25, e: 7.9, t: 46.1, q: 38.1, x: 104.8, bc: 165.1, n: 8, h: 26, ln: 109.5, hl: 60.3, jl: 43.7, ring: 'R24' },
      { size: '2 9/16', b: 65.9, od: 245, c: 3, k: 137, p: 107.95, e: 7.9, t: 49.3, q: 41.3, x: 123.8, bc: 190.5, n: 8, h: 29, ln: 112.7, hl: 73.0, jl: 54.9, ring: 'R27' },
      { size: '3 1/8', b: 81.8, od: 265, c: 3, k: 168, p: 136.53, e: 7.9, t: 55.6, q: 47.7, x: 133.3, bc: 203.2, n: 8, h: 32, ln: 125.4, hl: 88.9, jl: 67.5, ring: 'R35' },
      { size: '4 1/16', b: 108.7, od: 310, c: 3, k: 194, p: 161.93, e: 7.9, t: 62, q: 54, x: 161.9, bc: 241.3, n: 8, h: 35, ln: 131.8, hl: 114.3, jl: 88.1, ring: 'R39' },
      { size: '5 1/8', b: 131.0, od: 375, c: 3, k: 229, p: 193.68, e: 7.9, t: 81, q: 73.1, x: 196.8, bc: 292.1, n: 8, h: 42, ln: 163.5, hl: 141.3, jl: 110.3, ring: 'R44' },
      { size: '7 1/16', b: 181.8, od: 395, c: 6, k: 248, p: 211.15, e: 7.9, t: 92.1, q: 82.6, x: 228.6, bc: 317.5, n: 12, h: 39, ln: 181, hl: 168.3, jl: 132.6, ring: 'R46' },
      { size: '9', b: 229.4, od: 485, c: 6, k: 318, p: 269.88, e: 11.2, t: 103.2, q: 92.1, x: 292.1, bc: 393.7, n: 12, h: 45, ln: 223.8, hl: 219.1, jl: 173.8, ring: 'R50' },
      { size: '11', b: 280.2, od: 585, c: 6, k: 371, p: 323.85, e: 11.2, t: 119.1, q: 108, x: 368.3, bc: 482.6, n: 12, h: 51, ln: 265.1, hl: 273.1, jl: 216.7, ring: 'R54' },
    ],
  },
]

// Legacy API nominal flange designation / ANSI class -> current API 6A
// nominal flange size + pressure class ("2M" = 13.8 MPa/2000 psi, "3M" =
// 20.7 MPa/3000 psi, "5M" = 34.5 MPa/5000 psi), for cross-referencing old
// equipment and drawings against the current size/class naming.
export const API_ANSI_REFERENCE = [
  { legacy: '2" Series / ANSI Class 600', current: '2 1/16" 2M' },
  { legacy: '2" Series / ANSI Class 900', current: '2 1/16" 3M' },
  { legacy: '2" Series / ANSI Class 1500', current: '2 1/16" 5M' },
  { legacy: '2" Series 2900 / No ANSI', current: 'No corresponde a ninguna brida actual' },
  { legacy: '2 1/2" Series / ANSI Class 600', current: '2 9/16" 2M' },
  { legacy: '2 1/2" Series / ANSI Class 900', current: '2 9/16" 3M' },
  { legacy: '2 1/2" Series / ANSI Class 1500', current: '2 9/16" 5M' },
  { legacy: '2 1/2" Series 2900 / No ANSI', current: 'No corresponde a ninguna brida actual' },
  { legacy: '3" Series / ANSI Class 600', current: '3 1/8" 2M' },
  { legacy: '3" Series / ANSI Class 900', current: '3 1/8" 3M' },
  { legacy: '3" Series / ANSI Class 1500', current: '3 1/8" 5M' },
  { legacy: '3" Series 2900 / No ANSI', current: 'No corresponde a ninguna brida actual' },
  { legacy: '3 1/2" Series 2900 / No ANSI', current: 'No corresponde a ninguna brida actual' },
  { legacy: '4" Series / ANSI Class 600', current: '4 1/16" 2M' },
  { legacy: '4" Series / ANSI Class 900', current: '4 1/16" 3M' },
  { legacy: '4" Series / ANSI Class 1500', current: '4 1/16" 5M' },
  { legacy: '4" Series 2900 / No ANSI', current: 'No corresponde a ninguna brida actual' },
  { legacy: '5" Series / ANSI Class 600', current: '5 1/8" 2M' },
  { legacy: '5" Series / ANSI Class 900', current: '5 1/8" 3M' },
  { legacy: '5" Series / ANSI Class 1500', current: '5 1/8" 5M' },
  { legacy: '5" Series 2900 / No ANSI', current: 'No corresponde a ninguna brida actual' },
  { legacy: '6" Series / ANSI Class 600', current: '7 1/16" 2M' },
  { legacy: '6" Series / ANSI Class 900', current: '7 1/16" 3M' },
  { legacy: '6" Series / ANSI Class 1500', current: '7 1/16" 5M' },
  { legacy: '6" Series 2900 / No ANSI', current: 'No corresponde a ninguna brida actual' },
  { legacy: '8" Series / ANSI Class 600', current: '9" 2M' },
  { legacy: '8" Series / ANSI Class 900', current: '9" 3M' },
  { legacy: '8" Series / ANSI Class 1500', current: '9" 5M' },
]

// Ficha técnica dimensional ampliada (API 6A, tipos 6B y 6BX, tamaños
// 1-13/16" a 9") — transcripta directamente de la hoja de datos del
// fabricante que el usuario compartió (un dibujo + ficha por tamaño +
// clase de presión). Complementa las filas de arriba con los campos
// que esas tablas no traían: largo cara a cara, ancho/profundidad de
// ranura, O.D./I.D./P.D. del propio anillo, radio, "max"/"min", tap
// end stud, stud bolt, tuerca hex, diámetro de agujero de bulón y
// círculo de bulones en pulgadas. Todas las medidas en pulgadas, tal
// cual figuran en la hoja (fracciones o decimales, según cómo las
// publica el fabricante) para no introducir error de redondeo al
// convertir. `null` = la propia hoja la deja en blanco (no publicada
// para ese tamaño/tipo de brida). Esta es la ÚNICA fuente de datos
// para la app: solo se listan las bridas cubiertas por esta ficha.
const DIMENSIONAL_SPECS = [
  // --- 6BX, 1 13/16" (BX-151) ---
  { type: '6bx', size: '1 13/16', psi: 10000, ringStd: null, ringPE: 'BX-151', face: '18 1/4', od: '7 3/8', ringOD: '3.062', ringID: '2.130', grooveDepth: '7/32', max: '7/32', dia2: '3 1/2', refDia: '4 1/8', pd: '2.596', grooveWidth: '.466', min: '1 21/32', radius: '3/8', tapStud: { dia: '3/4', len: '3 3/4' }, studBolt: { dia: '3/4', len: '5 1/2' }, hexNut: '1 1/4', boltHoleSize: '7/8', boltCircle: '5 3/4' },
  { type: '6bx', size: '1 13/16', psi: 15000, ringStd: null, ringPE: 'BX-151', face: '18', od: '8 3/16', ringOD: '3.062', ringID: '2.130', grooveDepth: '7/32', max: '7/32', dia2: '3 27/32', refDia: '4 3/16', pd: '2.596', grooveWidth: '.466', min: '1 25/32', radius: '3/8', tapStud: { dia: '7/8', len: '4 1/8' }, studBolt: { dia: '7/8', len: '6' }, hexNut: '1 7/16', boltHoleSize: '1', boltCircle: '6 5/16' },
  { type: '6bx', size: '1 13/16', psi: 20000, ringStd: null, ringPE: 'BX-151', face: '21', od: '10 1/8', ringOD: '3.062', ringID: '2.130', grooveDepth: '7/32', max: '7/32', dia2: '5 1/4', refDia: '4 5/8', pd: '2.596', grooveWidth: '.466', min: '2 1/2', radius: '3/8', tapStud: { dia: '1', len: '5 1/8' }, studBolt: { dia: '1', len: '7 3/4' }, hexNut: '1 5/8', boltHoleSize: '1 1/8', boltCircle: '8' },

  // --- 6B, 2 1/16" (R-23/RX-23 @2M; R-24/RX-24 @3M y 5M) ---
  { type: '6b', size: '2 1/16', psi: 2000, ringStd: 'R-23', ringPE: 'RX-23', face: '11 5/8', od: '6 1/2', ringOD: '3 23/32', ringID: '2 25/32', grooveDepth: '5/16', max: null, dia2: '3 5/16', refDia: null, pd: '3 1/4', grooveWidth: '15/32', min: '1 5/16', radius: '1/8', tapStud: { dia: '5/8', len: '3 5/8' }, studBolt: { dia: '5/8', len: '5' }, hexNut: '1 1/16', boltHoleSize: '3/4', boltCircle: '5' },
  { type: '6b', size: '2 1/16', psi: 3000, ringStd: 'R-24', ringPE: 'RX-24', face: '14 5/8', od: '8 1/2', ringOD: '4 7/32', ringID: '3 9/32', grooveDepth: '5/16', max: null, dia2: '4 1/8', refDia: null, pd: '3 3/4', grooveWidth: '15/32', min: '1 13/16', radius: '1/8', tapStud: { dia: '7/8', len: '4 5/8' }, studBolt: { dia: '7/8', len: '6 1/2' }, hexNut: '1 7/16', boltHoleSize: '1', boltCircle: '6 1/2' },
  { type: '6b', size: '2 1/16', psi: 5000, ringStd: 'R-24', ringPE: 'RX-24', face: '14 5/8', od: '8 1/2', ringOD: '4 7/32', ringID: '3 9/32', grooveDepth: '5/16', max: null, dia2: '4 1/8', refDia: null, pd: '3 3/4', grooveWidth: '15/32', min: '1 13/16', radius: '1/8', tapStud: { dia: '7/8', len: '4 5/8' }, studBolt: { dia: '7/8', len: '6 1/2' }, hexNut: '1 7/16', boltHoleSize: '1', boltCircle: '6 1/2' },

  // --- 6BX, 2 1/16" (BX-152) ---
  { type: '6bx', size: '2 1/16', psi: 10000, ringStd: null, ringPE: 'BX-152', face: '20 1/2', od: '7 7/8', ringOD: '3.395', ringID: '2.399', grooveDepth: '15/64', max: '15/64', dia2: '3 15/16', refDia: '4 3/8', pd: '2.897', grooveWidth: '.498', min: '1 47/64', radius: '3/8', tapStud: { dia: '3/4', len: '3 7/8' }, studBolt: { dia: '3/4', len: '5 1/2' }, hexNut: '1 1/4', boltHoleSize: '7/8', boltCircle: '6 1/4' },
  { type: '6bx', size: '2 1/16', psi: 15000, ringStd: null, ringPE: 'BX-152', face: '19', od: '8 3/4', ringOD: '3.395', ringID: '2.399', grooveDepth: '15/64', max: '15/64', dia2: '4 3/8', refDia: '4 1/2', pd: '2.897', grooveWidth: '.498', min: '2', radius: '3/8', tapStud: { dia: '7/8', len: '4 3/8' }, studBolt: { dia: '7/8', len: '6 1/2' }, hexNut: '1 7/16', boltHoleSize: '1', boltCircle: '6 7/8' },
  { type: '6bx', size: '2 1/16', psi: 20000, ringStd: null, ringPE: 'BX-152', face: '23', od: '11 5/16', ringOD: '3.395', ringID: '2.399', grooveDepth: '15/64', max: '15/64', dia2: '6 1/16', refDia: '5 3/16', pd: '2.897', grooveWidth: '.498', min: '2 13/16', radius: '3/8', tapStud: { dia: '1 1/8', len: '5 3/4' }, studBolt: { dia: '1 1/8', len: '8 1/2' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '9 1/16' },

  // --- 6B, 2 9/16" (R-26/RX-26 @2M; R-27/RX-27 @3M y 5M) ---
  { type: '6b', size: '2 9/16', psi: 2000, ringStd: 'R-26', ringPE: 'RX-26', face: '13 1/8', od: '7 1/2', ringOD: '4 15/32', ringID: '3 17/32', grooveDepth: '5/16', max: null, dia2: '3 15/16', refDia: null, pd: '4', grooveWidth: '15/32', min: '1 7/16', radius: '1/8', tapStud: { dia: '3/4', len: '4' }, studBolt: { dia: '3/4', len: '5 1/2' }, hexNut: '1 1/4', boltHoleSize: '7/8', boltCircle: '5 7/8' },
  { type: '6b', size: '2 9/16', psi: 3000, ringStd: 'R-27', ringPE: 'RX-27', face: '16 5/8', od: '9 5/8', ringOD: '4 23/32', ringID: '3 25/32', grooveDepth: '5/16', max: null, dia2: '4 7/8', refDia: null, pd: '4 1/4', grooveWidth: '15/32', min: '1 15/16', radius: '1/8', tapStud: { dia: '1', len: '5 1/8' }, studBolt: { dia: '1', len: '7' }, hexNut: '1 5/8', boltHoleSize: '1 1/8', boltCircle: '7 1/2' },
  { type: '6b', size: '2 9/16', psi: 5000, ringStd: 'R-27', ringPE: 'RX-27', face: '16 5/8', od: '9 5/8', ringOD: '4 23/32', ringID: '3 25/32', grooveDepth: '5/16', max: null, dia2: '4 7/8', refDia: null, pd: '4 1/4', grooveWidth: '15/32', min: '1 15/16', radius: '1/8', tapStud: { dia: '1', len: '5 1/8' }, studBolt: { dia: '1', len: '7' }, hexNut: '1 5/8', boltHoleSize: '1 1/8', boltCircle: '7 1/2' },

  // --- 6BX, 2 9/16" (BX-153) ---
  { type: '6bx', size: '2 9/16', psi: 10000, ringStd: null, ringPE: 'BX-153', face: '22 1/4', od: '9 1/8', ringOD: '4.046', ringID: '2.938', grooveDepth: '17/64', max: '17/64', dia2: '4 3/4', refDia: '5 3/16', pd: '3.492', grooveWidth: '.554', min: '2 1/64', radius: '3/8', tapStud: { dia: '7/8', len: '4 3/8' }, studBolt: { dia: '7/8', len: '6 1/2' }, hexNut: '1 7/16', boltHoleSize: '1', boltCircle: '7 1/4' },
  { type: '6bx', size: '2 9/16', psi: 15000, ringStd: null, ringPE: 'BX-153', face: '21', od: '10', ringOD: '4.046', ringID: '2.938', grooveDepth: '17/64', max: '17/64', dia2: '5 1/16', refDia: '5 1/4', pd: '3.492', grooveWidth: '.554', min: '2 1/4', radius: '3/8', tapStud: { dia: '1', len: '4 7/8' }, studBolt: { dia: '1', len: '7 1/4' }, hexNut: '1 5/8', boltHoleSize: '1 1/8', boltCircle: '7 7/8' },
  { type: '6bx', size: '2 9/16', psi: 20000, ringStd: null, ringPE: 'BX-153', face: '26 1/2', od: '12 13/16', ringOD: '4.046', ringID: '2.938', grooveDepth: '17/64', max: '17/64', dia2: '6 13/16', refDia: '5 15/16', pd: '3.492', grooveWidth: '.554', min: '3 1/8', radius: '3/8', tapStud: { dia: '1 1/4', len: '6 1/4' }, studBolt: { dia: '1 1/4', len: '9 1/2' }, hexNut: '2', boltHoleSize: '1 3/8', boltCircle: '10 5/16' },

  // --- 6B, 3 1/8" (R-31/RX-31 @2M y 3M; R-35/RX-35 @5M) ---
  { type: '6b', size: '3 1/8', psi: 2000, ringStd: 'R-31', ringPE: 'RX-31', face: '14 1/8', od: '8 1/4', ringOD: '5 11/32', ringID: '4 13/32', grooveDepth: '5/16', max: null, dia2: '4 5/8', refDia: null, pd: '4 7/8', grooveWidth: '15/32', min: '1 9/16', radius: '1/8', tapStud: { dia: '3/4', len: '4 1/8' }, studBolt: { dia: '3/4', len: '5 3/4' }, hexNut: '1 1/4', boltHoleSize: '7/8', boltCircle: '6 5/8' },
  { type: '6b', size: '3 1/8', psi: 3000, ringStd: 'R-31', ringPE: 'RX-31', face: '17 1/8', od: '9 1/2', ringOD: '5 11/32', ringID: '4 13/32', grooveDepth: '5/16', max: null, dia2: '5', refDia: null, pd: '4 7/8', grooveWidth: '15/32', min: '1 13/16', radius: '1/8', tapStud: { dia: '7/8', len: '4 5/8' }, studBolt: { dia: '7/8', len: '6 1/2' }, hexNut: '1 7/16', boltHoleSize: '1', boltCircle: '7 1/2' },
  { type: '6b', size: '3 1/8', psi: 5000, ringStd: 'R-35', ringPE: 'RX-35', face: '18 5/8', od: '10 1/2', ringOD: '5 27/32', ringID: '4 29/32', grooveDepth: '5/16', max: null, dia2: '5 1/4', refDia: null, pd: '5 3/8', grooveWidth: '15/32', min: '2 3/16', radius: '1/8', tapStud: { dia: '1 1/8', len: '5 5/8' }, studBolt: { dia: '1 1/8', len: '7 3/4' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '8' },

  // --- 6BX, 3 1/16" (BX-154) ---
  { type: '6bx', size: '3 1/16', psi: 10000, ringStd: null, ringPE: 'BX-154', face: '24 3/8', od: '10 5/8', ringOD: '4.685', ringID: '3.473', grooveDepth: '19/64', max: '19/64', dia2: '5 19/32', refDia: '6', pd: '4.079', grooveWidth: '.606', min: '2 19/64', radius: '3/8', tapStud: { dia: '1', len: '5' }, studBolt: { dia: '1', len: '7 1/4' }, hexNut: '1 5/8', boltHoleSize: '1 1/8', boltCircle: '8 1/2' },
  { type: '6bx', size: '3 1/16', psi: 15000, ringStd: null, ringPE: 'BX-154', face: '23 9/16', od: '11 5/16', ringOD: '4.685', ringID: '3.473', grooveDepth: '19/64', max: '19/64', dia2: '6 1/16', refDia: '6 1/16', pd: '4.079', grooveWidth: '.606', min: '2 17/32', radius: '3/8', tapStud: { dia: '1 1/8', len: '5 1/2' }, studBolt: { dia: '1 1/8', len: '8' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '9 1/16' },
  { type: '6bx', size: '3 1/16', psi: 20000, ringStd: null, ringPE: 'BX-154', face: '30 1/2', od: '14 1/16', ringOD: '4.685', ringID: '3.473', grooveDepth: '19/64', max: '19/64', dia2: '7 9/16', refDia: '6 3/4', pd: '4.079', grooveWidth: '.606', min: '3 3/8', radius: '3/8', tapStud: { dia: '1 3/8', len: '6 3/4' }, studBolt: { dia: '1 3/8', len: '10 1/4' }, hexNut: '2 3/16', boltHoleSize: '1 1/2', boltCircle: '11 5/16' },

  // --- 6B, 4 1/16" (R-37/RX-37 @2M y 3M; R-39/RX-39 @5M) ---
  { type: '6b', size: '4 1/16', psi: 2000, ringStd: 'R-37', ringPE: 'RX-37', face: '17 1/8', od: '10 3/4', ringOD: '6 11/32', ringID: '5 13/32', grooveDepth: '5/16', max: null, dia2: '6', refDia: null, pd: '5 7/8', grooveWidth: '15/32', min: '1 13/16', radius: '1/8', tapStud: { dia: '7/8', len: '4 5/8' }, studBolt: { dia: '7/8', len: '6 1/2' }, hexNut: '1 7/16', boltHoleSize: '1', boltCircle: '8 1/2' },
  { type: '6b', size: '4 1/16', psi: 3000, ringStd: 'R-37', ringPE: 'RX-37', face: '20 1/8', od: '11 1/2', ringOD: '6 11/32', ringID: '5 13/32', grooveDepth: '5/16', max: null, dia2: '6 1/4', refDia: null, pd: '5 7/8', grooveWidth: '15/32', min: '2 1/16', radius: '1/8', tapStud: { dia: '1 1/8', len: '5 1/2' }, studBolt: { dia: '1 1/8', len: '7 1/2' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '9 1/4' },
  { type: '6b', size: '4 1/16', psi: 5000, ringStd: 'R-39', ringPE: 'RX-39', face: '21 5/8', od: '12 1/4', ringOD: '6 27/32', ringID: '5 29/32', grooveDepth: '5/16', max: null, dia2: '6 3/8', refDia: null, pd: '6 3/8', grooveWidth: '15/32', min: '2 7/16', radius: '1/8', tapStud: { dia: '1 1/4', len: '6 1/8' }, studBolt: { dia: '1 1/4', len: '8 1/2' }, hexNut: '2', boltHoleSize: '1 3/8', boltCircle: '9 1/2' },

  // --- 6BX, 4 1/16" (BX-155) ---
  { type: '6bx', size: '4 1/16', psi: 10000, ringStd: null, ringPE: 'BX-155', face: '26 3/8', od: '12 7/16', ringOD: '5.930', ringID: '4.534', grooveDepth: '21/64', max: '21/64', dia2: '7 3/16', refDia: '7 9/32', pd: '5.232', grooveWidth: '.698', min: '2 49/64', radius: '3/8', tapStud: { dia: '1 1/8', len: '5 3/4' }, studBolt: { dia: '1 1/8', len: '8 1/2' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '10 3/16' },
  { type: '6bx', size: '4 1/16', psi: 15000, ringStd: null, ringPE: 'BX-155', face: '29', od: '14 3/16', ringOD: '5.930', ringID: '4.534', grooveDepth: '21/64', max: '21/64', dia2: '7 11/16', refDia: '7 5/8', pd: '5.232', grooveWidth: '.698', min: '3 3/32', radius: '3/8', tapStud: { dia: '1 3/8', len: '6 1/2' }, studBolt: { dia: '1 3/8', len: '9 3/4' }, hexNut: '2 3/16', boltHoleSize: '1 1/2', boltCircle: '11 7/16' },
  { type: '6bx', size: '4 1/16', psi: 20000, ringStd: null, ringPE: 'BX-155', face: null, od: '17 9/16', ringOD: '5.930', ringID: '4.534', grooveDepth: '21/64', max: '21/64', dia2: '9 9/16', refDia: '8 5/8', pd: '5.232', grooveWidth: '.698', min: '4 3/16', radius: '3/8', tapStud: { dia: '1 3/4', len: '8 3/8' }, studBolt: { dia: '1 3/4', len: '12 1/2' }, hexNut: '2 3/4', boltHoleSize: '1 7/8', boltCircle: '14 1/16' },

  // --- 6B, 5 1/8" (R-41/RX-41 @2M y 3M; R-44/RX-44 @5M) ---
  { type: '6b', size: '5 1/8', psi: 2000, ringStd: 'R-41', ringPE: 'RX-41', face: '22 1/8', od: '13', ringOD: '7 19/32', ringID: '6 21/32', grooveDepth: '5/16', max: null, dia2: '7 7/16', refDia: null, pd: '7 1/8', grooveWidth: '15/32', min: '2 1/16', radius: '1/8', tapStud: { dia: '1', len: '5 1/4' }, studBolt: { dia: '1', len: '7 1/4' }, hexNut: '1 5/8', boltHoleSize: '1 1/8', boltCircle: '10 1/2' },
  { type: '6b', size: '5 1/8', psi: 3000, ringStd: 'R-41', ringPE: 'RX-41', face: '24 1/8', od: '13 3/4', ringOD: '7 19/32', ringID: '6 21/32', grooveDepth: '5/16', max: null, dia2: '7 1/2', refDia: null, pd: '7 1/8', grooveWidth: '15/32', min: '2 5/16', radius: '1/8', tapStud: { dia: '1 1/4', len: '6' }, studBolt: { dia: '1 1/4', len: '8 1/4' }, hexNut: '2', boltHoleSize: '1 3/8', boltCircle: '11' },
  { type: '6b', size: '5 1/8', psi: 5000, ringStd: 'R-44', ringPE: 'RX-44', face: '28 5/8', od: '14 3/4', ringOD: '8 3/32', ringID: '7 5/32', grooveDepth: '5/16', max: null, dia2: '7 3/4', refDia: null, pd: '7 5/8', grooveWidth: '15/32', min: '3 3/16', radius: '1/8', tapStud: { dia: '1 1/2', len: '7 3/8' }, studBolt: { dia: '1 1/2', len: '10 1/2' }, hexNut: '2 3/8', boltHoleSize: '1 5/8', boltCircle: '11 1/2' },

  // --- 6BX, 5 1/8" (BX-169 @10M y 15M; no se publica @20M) ---
  { type: '6bx', size: '5 1/8', psi: 10000, ringStd: null, ringPE: 'BX-169', face: '29', od: '14 1/16', ringOD: '6.955', ringID: '5.623', grooveDepth: '3/8', max: '3/8', dia2: '8 13/16', refDia: '8 11/16', pd: '6.289', grooveWidth: '.666', min: '3 1/8', radius: '3/8', tapStud: { dia: '1 1/8', len: '6' }, studBolt: { dia: '1 1/8', len: '9 1/4' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '11 13/16' },
  { type: '6bx', size: '5 1/8', psi: 15000, ringStd: null, ringPE: 'BX-169', face: '35', od: '16 1/2', ringOD: '6.955', ringID: '5.623', grooveDepth: '3/8', max: '3/8', dia2: '9 5/8', refDia: '8 7/8', pd: '6.289', grooveWidth: '.666', min: '3 7/8', radius: '5/8', tapStud: { dia: '1 1/2', len: '7 5/8' }, studBolt: { dia: '1 1/2', len: '11 1/2' }, hexNut: '2 3/8', boltHoleSize: '1 5/8', boltCircle: '13 1/2' },

  // --- 6B, 7 1/16" (R-45/RX-45 @2M y 3M; R-46/RX-46 @5M) ---
  { type: '6b', size: '7 1/16', psi: 2000, ringStd: 'R-45', ringPE: 'RX-45', face: '26 1/8', od: '14', ringOD: '8 25/32', ringID: '7 27/32', grooveDepth: '5/16', max: null, dia2: '8 3/4', refDia: null, pd: '8 5/16', grooveWidth: '15/32', min: '2 3/16', radius: '1/8', tapStud: { dia: '1', len: '5 3/8' }, studBolt: { dia: '1', len: '7 1/2' }, hexNut: '1 5/8', boltHoleSize: '1 1/8', boltCircle: '11 1/2' },
  { type: '6b', size: '7 1/16', psi: 3000, ringStd: 'R-45', ringPE: 'RX-45', face: '28 1/8', od: '15', ringOD: '8 25/32', ringID: '7 27/32', grooveDepth: '5/16', max: null, dia2: '9 1/4', refDia: null, pd: '8 5/16', grooveWidth: '15/32', min: '2 1/2', radius: '1/8', tapStud: { dia: '1 1/8', len: '5 7/8' }, studBolt: { dia: '1 1/8', len: '8 1/2' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '12 1/2' },
  { type: '6b', size: '7 1/16', psi: 5000, ringStd: 'R-46', ringPE: 'RX-46', face: '32', od: '15 1/2', ringOD: '8 27/32', ringID: '7 25/32', grooveDepth: '3/8', max: null, dia2: '9', refDia: null, pd: '8 5/16', grooveWidth: '17/32', min: '3 5/8', radius: '1/8', tapStud: { dia: '1 3/8', len: '7 1/2' }, studBolt: { dia: '1 3/8', len: '11 1/4' }, hexNut: '2 3/16', boltHoleSize: '1 1/2', boltCircle: '12 1/2' },

  // --- 6BX, 7 1/16" (BX-156) ---
  { type: '6bx', size: '7 1/16', psi: 10000, ringStd: null, ringPE: 'BX-156', face: '35', od: '18 7/8', ringOD: '9.521', ringID: '7.679', grooveDepth: '7/16', max: '7/16', dia2: '11 7/8', refDia: '11 7/8', pd: '8.600', grooveWidth: '.921', min: '4 1/16', radius: '5/8', tapStud: { dia: '1 1/2', len: '7 3/4' }, studBolt: { dia: '1 1/2', len: '11 3/4' }, hexNut: '2 3/8', boltHoleSize: '1 5/8', boltCircle: '15 7/8' },
  { type: '6bx', size: '7 1/16', psi: 15000, ringStd: null, ringPE: 'BX-156', face: null, od: '19 7/8', ringOD: '9.521', ringID: '7.679', grooveDepth: '7/16', max: '7/16', dia2: '12 13/16', refDia: '12', pd: '8.600', grooveWidth: '.921', min: '4 11/16', radius: '5/8', tapStud: { dia: '1 1/2', len: '8 3/8' }, studBolt: { dia: '1 1/2', len: '13' }, hexNut: '2 3/8', boltHoleSize: '1 5/8', boltCircle: '16 7/8' },
  { type: '6bx', size: '7 1/16', psi: 20000, ringStd: null, ringPE: 'BX-156', face: null, od: '25 13/16', ringOD: '9.521', ringID: '7.679', grooveDepth: '7/16', max: '7/16', dia2: '15 3/16', refDia: '13 7/8', pd: '8.600', grooveWidth: '.921', min: '6 1/2', radius: '5/8', tapStud: { dia: '2', len: '11 1/8' }, studBolt: { dia: '2', len: '17 3/4' }, hexNut: '3 1/8', boltHoleSize: '2 1/8', boltCircle: '21 13/16' },

  // --- 6B, 9" (R-49/RX-49 @2M y 3M; R-50/RX-50 @5M) ---
  { type: '6b', size: '9', psi: 2000, ringStd: 'R-49', ringPE: 'RX-49', face: '16 1/2', od: '16 1/2', ringOD: '11 3/32', ringID: '10 5/32', grooveDepth: '5/16', max: null, dia2: '10 3/4', refDia: null, pd: '10 5/8', grooveWidth: '15/32', min: '2 1/2', radius: '1/8', tapStud: { dia: '1 1/8', len: '5 7/8' }, studBolt: { dia: '1 1/8', len: '8 1/2' }, hexNut: '1 13/16', boltHoleSize: '1 1/4', boltCircle: '13 3/4' },
  { type: '6b', size: '9', psi: 3000, ringStd: 'R-49', ringPE: 'RX-49', face: '18 1/2', od: '18 1/2', ringOD: '11 3/32', ringID: '10 5/32', grooveDepth: '5/16', max: null, dia2: '11 3/4', refDia: null, pd: '10 5/8', grooveWidth: '15/32', min: '2 13/16', radius: '1/8', tapStud: { dia: '1 3/8', len: '6 3/4' }, studBolt: { dia: '1 3/8', len: '9 1/2' }, hexNut: '2 3/16', boltHoleSize: '1 1/2', boltCircle: '15 1/2' },
  { type: '6b', size: '9', psi: 5000, ringStd: 'R-50', ringPE: 'RX-50', face: '19', od: '19', ringOD: '11 9/32', ringID: '9 31/32', grooveDepth: '7/16', max: null, dia2: '11 1/2', refDia: null, pd: '10 5/8', grooveWidth: '21/32', min: '4 1/16', radius: '1/8', tapStud: { dia: '1 5/8', len: '8 1/2' }, studBolt: { dia: '1 5/8', len: '12 1/2' }, hexNut: '2 9/16', boltHoleSize: '1 3/4', boltCircle: '15 1/2' },

  // --- 6BX, 9" (BX-157) ---
  { type: '6bx', size: '9', psi: 10000, ringStd: null, ringPE: 'BX-157', face: null, od: '21 3/4', ringOD: '11.774', ringID: '9.696', grooveDepth: '1/2', max: '1/2', dia2: '14 3/4', refDia: '14 1/8', pd: '10.735', grooveWidth: '1.039', min: '4 7/8', radius: '5/8', tapStud: { dia: '1 1/2', len: '8 1/2' }, studBolt: { dia: '1 1/2', len: '13 1/2' }, hexNut: '2 3/8', boltHoleSize: '1 5/8', boltCircle: '18 3/4' },
  { type: '6bx', size: '9', psi: 15000, ringStd: null, ringPE: 'BX-157', face: null, od: '25 1/2', ringOD: '11.774', ringID: '9.696', grooveDepth: '1/2', max: '1/2', dia2: '17', refDia: '15', pd: '10.735', grooveWidth: '1.039', min: '5 3/4', radius: '5/8', tapStud: { dia: '1 7/8', len: '10 1/8' }, studBolt: { dia: '1 7/8', len: '16' }, hexNut: '2 15/16', boltHoleSize: '2', boltCircle: '21 3/4' },
  { type: '6bx', size: '9', psi: 20000, ringStd: null, ringPE: 'BX-157', face: null, od: '31 11/16', ringOD: '11.774', ringID: '9.696', grooveDepth: '1/2', max: '1/2', dia2: '18 15/16', refDia: '17 3/8', pd: '10.735', grooveWidth: '1.039', min: '8 1/16', radius: '1', tapStud: { dia: '2 1/2', len: '13 3/4' }, studBolt: { dia: '2 1/2', len: '21 3/4' }, hexNut: '3 7/8', boltHoleSize: '2 5/8', boltCircle: '27' },
]

function findDimensionalSpec(type, size, psiList) {
  return DIMENSIONAL_SPECS.find((s) => s.type === type && s.size === size && psiList.includes(s.psi))
}

function parseSizeToIn(size) {
  const parts = size.trim().split(' ')
  if (parts.length === 2 && parts[1].includes('/')) {
    const [num, den] = parts[1].split('/').map(Number)
    return Number(parts[0]) + num / den
  }
  return Number(parts[0])
}

function psiShort(psi) {
  return String(psi / 1000)
}

// Fields compared to decide whether two adjacent pressure classes for the
// same size/type are dimensionally identical — the manufacturer's own
// tool lists those as a single combined row (e.g. "2-1/16 - 3/5M").
// LN/HL/JL are excluded: they vary slightly even when the ring number and
// every other dimension match.
const SIG_FIELDS_6B = ['b', 'od', 'c', 'k', 'p', 'e', 't', 'q', 'x', 'bc', 'n', 'h', 'ring']
const SIG_FIELDS_6BX = ['b', 'od', 'c', 'e1', 'q', 'g', 'k', 't', 'j1', 'j2', 'j3', 'j4', 'r', 'bc', 'n', 'h', 'ring']

function signature(row, fields) {
  return fields.map((f) => String(row[f])).join('|')
}

// Flattens both tables into one browsable list (sorted by size, then by
// pressure class), merging adjacent pressure classes that share identical
// dimensions for the same size/type into a single entry with a combined
// pressure label — the same "Flange Size - Pressure Rating" list a
// physical slide-rule / the vendor's own lookup tool presents.
export function buildFlangeBrowseList() {
  const entries = []
  for (const cls of FLANGE_6B_CLASSES) {
    for (const row of cls.rows) entries.push({ type: '6b', psi: cls.psi, size: row.size, row })
  }
  for (const cls of FLANGE_6BX_CLASSES) {
    for (const row of cls.rows) entries.push({ type: '6bx', psi: cls.psi, size: row.size, row })
  }
  entries.sort((a, b) => parseSizeToIn(a.size) - parseSizeToIn(b.size) || a.psi - b.psi)

  const groups = []
  for (const entry of entries) {
    const fields = entry.type === '6b' ? SIG_FIELDS_6B : SIG_FIELDS_6BX
    const sig = signature(entry.row, fields)
    const last = groups[groups.length - 1]
    if (last && last.type === entry.type && last.size === entry.size && last.sig === sig) {
      last.psiList.push(entry.psi)
    } else {
      groups.push({ type: entry.type, size: entry.size, psiList: [entry.psi], row: entry.row, sig })
    }
  }
  return groups
    .map((g) => ({
      type: g.type,
      size: g.size,
      psiList: g.psiList,
      pressureLabel: g.psiList.map(psiShort).join('/') + 'M',
      row: g.row,
      spec: findDimensionalSpec(g.type, g.size, g.psiList),
    }))
    .filter((g) => g.spec) // solo las bridas con ficha dimensional completa (1-13/16" a 9")
}

export const FLANGE_6BX_CLASSES = [
  {
    psi: 2000,
    label: '13.8 MPa (2000 psi)',
    rows: [
      { size: '26 3/4', od: 1040, c: 6, e1: 21.4, g: 768.33, k: 805, t: 126.3, j1: 835.8, j4: 9.7, r: 16, bc: 952.5, n: 20, h: 48, ring: 'BX167' },
      { size: '30', od: 1120, c: 6, e1: 23, g: 862.3, k: 908, t: 134.2, j1: 931.9, j4: 17.5, r: 16, bc: 1039.80, n: 32, h: 45, ring: 'BX303' },
    ],
  },
  {
    psi: 3000,
    label: '20.7 MPa (3000 psi)',
    rows: [
      { size: '26 3/4', od: 1100, c: 6, e1: 21.4, g: 774.22, k: 832, t: 161.2, j1: 870, j4: 0, r: 16, bc: 1000.10, n: 24, h: 54, ring: 'BX168' },
      { size: '30', od: 1185, c: 6, e1: 23, g: 862.30, k: 922, t: 167.1, j1: 970, j4: 12.7, r: 16, bc: 1090.60, n: 32, h: 51, ring: 'BX303' },
    ],
  },
  {
    psi: 5000,
    label: '34.5 MPa (5000 psi)',
    rows: [
      { size: '13 5/8', od: 675, c: 6, e1: 14.3, g: 408.00, k: 457, t: 112.8, j1: 481.0, j4: 23.9, r: 16, bc: 590.60, n: 16, h: 45, ring: 'BX160' },
      { size: '16 3/4', od: 770, c: 6, e1: 8.3, g: 478.33, k: 535, t: 130.2, j1: 555.6, j4: 17.5, r: 19, bc: 676.30, n: 16, h: 51, ring: 'BX162' },
      { size: '18 3/4', od: 905, c: 6, e1: 18.3, g: 563.50, k: 627, t: 165.9, j1: 674.7, j4: 19.1, r: 16, bc: 803.30, n: 20, h: 54, ring: 'BX163' },
      { size: '21 1/4', od: 990, c: 6, e1: 19.1, g: 632.56, k: 702, t: 181.0, j1: 758.8, j4: 22.4, r: 18, bc: 885.80, n: 24, h: 54, ring: 'BX165' },
    ],
  },
  {
    psi: 10000,
    label: '69.0 MPa (10000 psi)',
    rows: [
      { size: '1 13/16', b: 46.8, od: 185, c: 3, e1: null, q: 5.56, g: 77.77, k: 105, t: 42.1, j1: 88.9, j2: 65.1, j3: 48.5, j4: null, r: 10, bc: 146.10, n: 8, h: 23, ring: 'BX151' },
      { size: '2 1/16', b: 53.2, od: 200, c: 3, e1: null, q: 5.95, g: 86.23, k: 111, t: 44.1, j1: 100.0, j2: 74.7, j3: 51.6, j4: null, r: 10, bc: 158.80, n: 8, h: 23, ring: 'BX152' },
      { size: '2 9/16', b: 65.9, od: 230, c: 3, e1: null, q: 6.75, g: 102.77, k: 132, t: 51.2, j1: 120.7, j2: 92.1, j3: 57.2, j4: null, r: 10, bc: 184.20, n: 8, h: 26, ring: 'BX153' },
      { size: '3 1/16', b: 78.6, od: 270, c: 3, e1: null, q: 7.54, g: 119.00, k: 152, t: 58.4, j1: 142.1, j2: 110.2, j3: 63.5, j4: null, r: 10, bc: 215.90, n: 8, h: 29, ring: 'BX154' },
      { size: '4 1/16', b: 104.0, od: 315, c: 3, e1: null, q: 8.33, g: 150.62, k: 185, t: 70.3, j1: 182.6, j2: 146.1, j3: 73.1, j4: null, r: 10, bc: 258.80, n: 8, h: 32, ring: 'BX155' },
      { size: '5 1/8', b: 131.0, od: 360, c: 3, e1: 9.5, q: 9.53, g: 176.66, k: 221, t: 79.4, j1: 223.8, j2: 182.6, j3: 81.0, j4: 6.4, r: 10, bc: 300.00, n: 12, h: 32, ring: 'BX169' },
      { size: '7 1/16', b: 180.2, od: 480, c: 6, e1: 11.1, q: 11.11, g: 241.83, k: 302, t: 103.2, j1: 301.6, j2: 254.0, j3: 95.3, j4: 9.7, r: 16, bc: 403.20, n: 12, h: 42, ring: 'BX156' },
      { size: '9', b: 229.4, od: 550, c: 6, e1: 12.7, q: 12.70, g: 299.06, k: 359, t: 123.9, j1: 374.7, j2: 327.1, j3: 93.7, j4: 9.7, r: 16, bc: 476.30, n: 16, h: 42, ring: 'BX157' },
      { size: '11', b: 280.2, od: 655, c: 6, e1: 14.3, q: 14.29, g: 357.23, k: 429, t: 141.3, j1: 450.9, j2: 400.1, j3: 103.2, j4: 14.2, r: 16, bc: 565.20, n: 16, h: 48, ring: 'BX158' },
      { size: '13 5/8', b: 346.9, od: 770, c: 6, e1: 15.9, q: 15.88, g: 432.64, k: 518, t: 168.3, j1: 552.5, j2: 495.3, j3: 114.3, j4: 17.5, r: 16, bc: 673.10, n: 20, h: 51, ring: 'BX159' },
      { size: '16 3/4', b: 426.9, od: 870, c: 6, e1: 8.3, q: 8.33, g: 478.33, k: 576, t: 168.3, j1: 655.6, j2: 601.7, j3: 76.2, j4: 30.2, r: 19, bc: 776.30, n: 24, h: 51, ring: 'BX162' },
      { size: '18 3/4', b: 477.0, od: 1040, c: 6, e1: 18.3, q: 18.26, g: 577.90, k: 697, t: 223.1, j1: 752.5, j2: 674.7, j3: 155.6, j4: 25.4, r: 16, bc: 925.50, n: 24, h: 61, ring: 'BX164' },
      { size: '21 1/4', b: 540.5, od: 1145, c: 6, e1: 19.1, q: 19.05, g: 647.88, k: 781, t: 241.3, j1: 847.7, j2: 762.0, j3: 165.1, j4: 31.8, r: 21, bc: 1022.40, n: 24, h: 67, ring: 'BX166' },
    ],
  },
  {
    psi: 15000,
    label: '103.5 MPa (15000 psi)',
    rows: [
      { size: '1 13/16', b: 46.8, od: 210, c: 3, e1: null, q: 5.56, g: 77.77, k: 106, t: 45.3, j1: 97.6, j2: 71.4, j3: 47.6, j4: null, r: 10, bc: 160.3, n: 8, h: 26, ring: 'BX151' },
      { size: '2 1/16', b: 53.2, od: 220, c: 3, e1: null, q: 5.95, g: 86.23, k: 114, t: 50.8, j1: 111.1, j2: 82.5, j3: 54.0, j4: null, r: 10, bc: 174.60, n: 8, h: 26, ring: 'BX152' },
      { size: '2 9/16', b: 65.9, od: 255, c: 3, e1: null, q: 6.75, g: 102.77, k: 133, t: 57.2, j1: 128.6, j2: 100.0, j3: 57.1, j4: null, r: 10, bc: 200.00, n: 8, h: 29, ring: 'BX153' },
      { size: '3 1/16', b: 78.6, od: 290, c: 3, e1: null, q: 7.54, g: 119.00, k: 154, t: 64.3, j1: 154.0, j2: 122.2, j3: 63.5, j4: null, r: 10, bc: 230.20, n: 8, h: 39, ring: 'BX154' },
      { size: '4 1/16', b: 104.0, od: 360, c: 3, e1: null, q: 8.33, g: 150.62, k: 185, t: 78.6, j1: 158.7, j2: null, j3: 73.0, j4: null, r: 10, bc: 290.50, n: 8, h: 39, ring: 'BX155' },
      { size: '5 1/8', b: 131.0, od: 420, c: 3, e1: 9.5, q: 9.53, g: 176.66, k: 225, t: 98.5, j1: 244.5, j2: 200.0, j3: 81.8, j4: 6.4, r: 16, bc: 342.90, n: 12, h: 42, ring: 'BX169' },
      { size: '7 1/16', b: 180.2, od: 505, c: 6, e1: 11.1, q: 11.11, g: 241.83, k: 305, t: 119.1, j1: 325.4, j2: 276.2, j3: 92.1, j4: 7.9, r: 16, bc: 428.60, n: 16, h: 42, ring: 'BX156' },
      { size: '9', b: 229.4, od: 650, c: 6, e1: 12.7, q: 12.70, g: 299.06, k: 381, t: 146.1, j1: 431.8, j2: 349.2, j3: 123.8, j4: 12.7, r: 16, bc: 552.40, n: 16, h: 51, ring: 'BX157' },
      { size: '11', b: 280.2, od: 815, c: 6, e1: 14.3, q: 14.29, g: 357.23, k: 454, t: 187.4, j1: 584.2, j2: 427.0, j3: null, j4: 12.7, r: 16, bc: 711.20, n: 20, h: 54, ring: 'BX158' },
      { size: '13 5/8', b: 346.9, od: 885, c: 6, e1: 15.9, q: 15.88, g: 432.64, k: 541, t: 204.8, j1: 595.3, j2: 528.6, j3: 114.3, j4: 17.5, r: 25, bc: 771.50, n: 20, h: 61, ring: 'BX159' },
      { size: '18 3/4', b: 477.0, od: 1160, c: 6, e1: 18.3, q: 18.26, g: 577.90, k: 722, t: 255.6, j1: 812.8, j2: 730.2, j3: 155.6, j4: 35.1, r: 25, bc: 1016.00, n: 20, h: 80, ring: 'BX164' },
    ],
  },
  {
    psi: 20000,
    label: '138.0 MPa (20000 psi)',
    rows: [
      { size: '1 13/16', b: 46.8, od: 255, c: 3, e1: null, q: 5.56, g: 77.77, k: 117, t: 63.5, j1: 133.4, j2: 109.5, j3: 49.2, j4: null, r: 10, bc: 203.20, n: 8, h: 29, ring: 'BX151' },
      { size: '2 1/16', b: 53.2, od: 285, c: 3, e1: null, q: 5.95, g: 86.23, k: 132, t: 71.5, j1: 154.0, j2: 127.0, j3: 52.4, j4: null, r: 10, bc: 230.20, n: 8, h: 32, ring: 'BX152' },
      { size: '2 9/16', b: 65.9, od: 325, c: 3, e1: null, q: 6.75, g: 102.77, k: 151, t: 79.4, j1: 173.0, j2: 144.5, j3: 58.7, j4: null, r: 10, bc: 261.90, n: 8, h: 35, ring: 'BX153' },
      { size: '3 1/16', b: 78.6, od: 355, c: 3, e1: null, q: 7.54, g: 119.00, k: 171, t: 85.8, j1: 192.1, j2: 160.3, j3: 63.5, j4: null, r: 10, bc: 287.30, n: 8, h: 39, ring: 'BX154' },
      { size: '4 1/16', b: 104.0, od: 445, c: 3, e1: null, q: 8.33, g: 150.62, k: 219, t: 106.4, j1: 242.9, j2: 206.4, j3: 73.0, j4: null, r: 10, bc: 357.20, n: 8, h: 48, ring: 'BX155' },
      { size: '7 1/16', b: 180.2, od: 655, c: 6, e1: 11.1, q: 11.11, g: 241.83, k: 352, t: 165.1, j1: 385.8, j2: 338.1, j3: 96.8, j4: 7.9, r: 16, bc: 554.00, n: 16, h: 54, ring: 'BX156' },
      { size: '9', b: 229.4, od: 805, c: 6, e1: 12.7, q: 12.70, g: 299.06, k: 441, t: 204.8, j1: 428.6, j2: null, j3: 107.9, j4: 6.4, r: 25, bc: 685.80, n: 16, h: 67, ring: 'BX157' },
      { size: '11', b: 280.2, od: 885, c: 6, e1: 14.3, q: 14.29, g: 357.23, k: 505, t: 223.9, j1: 566.7, j2: 508.0, j3: 103.2, j4: 12.7, r: 25, bc: 749.30, n: 16, h: 74, ring: 'BX158' },
      { size: '13 5/8', b: 346.9, od: 1160, c: 6, e1: 15.9, q: 15.88, g: 432.64, k: 614, t: 291.2, j1: 693.7, j2: 628.6, j3: 133.3, j4: 14.2, r: 25, bc: 1016.00, n: 20, h: 80, ring: 'BX159' },
    ],
  },
]
