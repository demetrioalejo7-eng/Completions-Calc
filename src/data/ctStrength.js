// Coiled Tubing dimensions & strength — from FET Global Tubing's DuraCoil
// datasheet (DC-95 through DC-140). Values for grades other than DC-95 are
// obtained by scaling the DC-95 reference row: yield-based fields scale
// with SMYS/95000, tensile-based fields with SMTS/105000 — verified
// against the datasheet's own DC-100 table (matches to <0.1%).
// Physically equivalent to the industry-standard grades sold as Tenaris
// BlueCoil HT-95 / HT-110 / HT-125 (dimensions and strength values for the
// common grades match this table within rounding).

export const CT_GRADES = [
  { id: 'DC-95', label: 'DuraCoil / HT-95 (95 ksi)', smys: 95000, smts: 105000 },
  { id: 'DC-100', label: 'DuraCoil 100 (100 ksi)', smys: 100000, smts: 108000 },
  { id: 'DC-110', label: 'DuraCoil / HT-110 (110 ksi)', smys: 110000, smts: 118000 },
  { id: 'DC-120', label: 'DuraCoil 120 (120 ksi)', smys: 120000, smts: 128000 },
  { id: 'DC-130', label: 'DuraCoil 130 (130 ksi)', smys: 130000, smts: 138000 },
  { id: 'DC-140', label: 'DuraCoil 140 (140 ksi)', smys: 140000, smts: 145000 },
]

const REF_SMYS = 95000
const REF_SMTS = 105000

// Reference values at DC-95. Columns:
// od, wall, id, weight(lb/ft), yieldLoad(lb), tensileLoad(lb),
// yieldPressure(psi), hydrotestPressure(psi), torsionalYield(ft-lb),
// torsionalUltimate(ft-lb), extGalPer1000ft, extBblPer1000ft,
// intGalPer1000ft, intBblPer1000ft
export const CT_DIMENSIONS = [
  { od: 1.25, wall: 0.109, id: 1.032, weight: 1.33, yieldLoad: 37120, tensileLoad: 41030, yieldPressure: 15810, hydrotestPressure: 14230, torsionalYield: 906, torsionalUltimate: 1002, extGal: 63.75, extBbl: 1.52, intGal: 43.45, intBbl: 1.03 },
  { od: 1.25, wall: 0.116, id: 1.018, weight: 1.41, yieldLoad: 39260, tensileLoad: 43390, yieldPressure: 16870, hydrotestPressure: 15000, torsionalYield: 951, torsionalUltimate: 1051, extGal: 63.75, extBbl: 1.52, intGal: 42.28, intBbl: 1.01 },
  { od: 1.25, wall: 0.125, id: 1.0, weight: 1.51, yieldLoad: 41970, tensileLoad: 46390, yieldPressure: 17940, hydrotestPressure: 15000, torsionalYield: 994, torsionalUltimate: 1098, extGal: 63.75, extBbl: 1.52, intGal: 40.8, intBbl: 0.97 },
  { od: 1.25, wall: 0.134, id: 0.982, weight: 1.6, yieldLoad: 44630, tensileLoad: 49330, yieldPressure: 19300, hydrotestPressure: 15000, torsionalYield: 1046, torsionalUltimate: 1156, extGal: 63.75, extBbl: 1.52, intGal: 39.34, intBbl: 0.94 },
  { od: 1.25, wall: 0.145, id: 0.96, weight: 1.72, yieldLoad: 47820, tensileLoad: 52850, yieldPressure: 20980, hydrotestPressure: 15000, torsionalYield: 1107, torsionalUltimate: 1223, extGal: 63.75, extBbl: 1.52, intGal: 37.6, intBbl: 0.9 },
  { od: 1.25, wall: 0.156, id: 0.938, weight: 1.83, yieldLoad: 50940, tensileLoad: 56300, yieldPressure: 22650, hydrotestPressure: 15000, torsionalYield: 1163, torsionalUltimate: 1285, extGal: 63.75, extBbl: 1.52, intGal: 35.9, intBbl: 0.85 },
  { od: 1.25, wall: 0.175, id: 0.9, weight: 2.01, yieldLoad: 56150, tensileLoad: 62060, yieldPressure: 25540, hydrotestPressure: 15000, torsionalYield: 1252, torsionalUltimate: 1383, extGal: 63.75, extBbl: 1.52, intGal: 33.05, intBbl: 0.79 },
  { od: 1.25, wall: 0.19, id: 0.87, weight: 2.16, yieldLoad: 60110, tensileLoad: 66440, yieldPressure: 27360, hydrotestPressure: 15000, torsionalYield: 1302, torsionalUltimate: 1439, extGal: 63.75, extBbl: 1.52, intGal: 30.88, intBbl: 0.74 },
  { od: 1.25, wall: 0.204, id: 0.842, weight: 2.28, yieldLoad: 63680, tensileLoad: 70390, yieldPressure: 29490, hydrotestPressure: 15000, torsionalYield: 1356, torsionalUltimate: 1499, extGal: 63.75, extBbl: 1.52, intGal: 28.93, intBbl: 0.69 },

  { od: 1.5, wall: 0.109, id: 1.282, weight: 1.62, yieldLoad: 45250, tensileLoad: 50010, yieldPressure: 13170, hydrotestPressure: 11850, torsionalYield: 1362, torsionalUltimate: 1505, extGal: 91.8, extBbl: 2.19, intGal: 67.06, intBbl: 1.6 },
  { od: 1.5, wall: 0.116, id: 1.268, weight: 1.72, yieldLoad: 47910, tensileLoad: 52960, yieldPressure: 14060, hydrotestPressure: 12650, torsionalYield: 1433, torsionalUltimate: 1584, extGal: 91.8, extBbl: 2.19, intGal: 65.6, intBbl: 1.56 },
  { od: 1.5, wall: 0.125, id: 1.25, weight: 1.84, yieldLoad: 51300, tensileLoad: 56700, yieldPressure: 14950, hydrotestPressure: 13460, torsionalYield: 1502, torsionalUltimate: 1660, extGal: 91.8, extBbl: 2.19, intGal: 63.75, intBbl: 1.52 },
  { od: 1.5, wall: 0.134, id: 1.232, weight: 1.96, yieldLoad: 54630, tensileLoad: 60380, yieldPressure: 16090, hydrotestPressure: 14480, torsionalYield: 1587, torsionalUltimate: 1754, extGal: 91.8, extBbl: 2.19, intGal: 61.93, intBbl: 1.47 },
  { od: 1.5, wall: 0.145, id: 1.21, weight: 2.1, yieldLoad: 58640, tensileLoad: 64810, yieldPressure: 17480, hydrotestPressure: 15000, torsionalYield: 1686, torsionalUltimate: 1863, extGal: 91.8, extBbl: 2.19, intGal: 59.74, intBbl: 1.42 },
  { od: 1.5, wall: 0.156, id: 1.188, weight: 2.24, yieldLoad: 62570, tensileLoad: 69160, yieldPressure: 18870, hydrotestPressure: 15000, torsionalYield: 1780, torsionalUltimate: 1967, extGal: 91.8, extBbl: 2.19, intGal: 57.58, intBbl: 1.37 },
  { od: 1.5, wall: 0.175, id: 1.15, weight: 2.48, yieldLoad: 69200, tensileLoad: 76490, yieldPressure: 21280, hydrotestPressure: 15000, torsionalYield: 1930, torsionalUltimate: 2134, extGal: 91.8, extBbl: 2.19, intGal: 53.96, intBbl: 1.28 },
  { od: 1.5, wall: 0.19, id: 1.12, weight: 2.66, yieldLoad: 74280, tensileLoad: 82100, yieldPressure: 22800, hydrotestPressure: 15000, torsionalYield: 2018, torsionalUltimate: 2231, extGal: 91.8, extBbl: 2.19, intGal: 51.18, intBbl: 1.22 },
  { od: 1.5, wall: 0.204, id: 1.092, weight: 2.83, yieldLoad: 78910, tensileLoad: 87210, yieldPressure: 24570, hydrotestPressure: 15000, torsionalYield: 2114, torsionalUltimate: 2337, extGal: 91.8, extBbl: 2.19, intGal: 48.65, intBbl: 1.16 },
  { od: 1.5, wall: 0.224, id: 1.052, weight: 3.06, yieldLoad: 85300, tensileLoad: 94280, yieldPressure: 27110, hydrotestPressure: 15000, torsionalYield: 2239, torsionalUltimate: 2474, extGal: 91.8, extBbl: 2.19, intGal: 45.15, intBbl: 1.08 },

  { od: 1.75, wall: 0.109, id: 1.532, weight: 1.91, yieldLoad: 53380, tensileLoad: 59000, yieldPressure: 11290, hydrotestPressure: 10160, torsionalYield: 1910, torsionalUltimate: 2111, extGal: 124.95, extBbl: 2.97, intGal: 95.76, intBbl: 2.28 },
  { od: 1.75, wall: 0.116, id: 1.518, weight: 2.03, yieldLoad: 56570, tensileLoad: 62520, yieldPressure: 12050, hydrotestPressure: 10850, torsionalYield: 2014, torsionalUltimate: 2226, extGal: 124.95, extBbl: 2.97, intGal: 94.02, intBbl: 2.24 },
  { od: 1.75, wall: 0.125, id: 1.5, weight: 2.17, yieldLoad: 60620, tensileLoad: 67000, yieldPressure: 12810, hydrotestPressure: 11530, torsionalYield: 2115, torsionalUltimate: 2338, extGal: 124.95, extBbl: 2.97, intGal: 91.8, intBbl: 2.19 },
  { od: 1.75, wall: 0.134, id: 1.482, weight: 2.32, yieldLoad: 64630, tensileLoad: 71430, yieldPressure: 13790, hydrotestPressure: 12410, torsionalYield: 2241, torsionalUltimate: 2477, extGal: 124.95, extBbl: 2.97, intGal: 89.61, intBbl: 2.13 },
  { od: 1.75, wall: 0.145, id: 1.46, weight: 2.49, yieldLoad: 69460, tensileLoad: 76770, yieldPressure: 14980, hydrotestPressure: 13480, torsionalYield: 2389, torsionalUltimate: 2640, extGal: 124.95, extBbl: 2.97, intGal: 86.97, intBbl: 2.07 },
  { od: 1.75, wall: 0.156, id: 1.438, weight: 2.66, yieldLoad: 74210, tensileLoad: 82030, yieldPressure: 16180, hydrotestPressure: 14560, torsionalYield: 2530, torsionalUltimate: 2797, extGal: 124.95, extBbl: 2.97, intGal: 84.37, intBbl: 2.01 },
  { od: 1.75, wall: 0.175, id: 1.4, weight: 2.95, yieldLoad: 82260, tensileLoad: 90920, yieldPressure: 18240, hydrotestPressure: 15000, torsionalYield: 2760, torsionalUltimate: 3050, extGal: 124.95, extBbl: 2.97, intGal: 79.97, intBbl: 1.9 },
  { od: 1.75, wall: 0.19, id: 1.37, weight: 3.17, yieldLoad: 88460, tensileLoad: 97770, yieldPressure: 19540, hydrotestPressure: 15000, torsionalYield: 2895, torsionalUltimate: 3200, extGal: 124.95, extBbl: 2.97, intGal: 76.58, intBbl: 1.82 },
  { od: 1.75, wall: 0.204, id: 1.342, weight: 3.38, yieldLoad: 94130, tensileLoad: 104040, yieldPressure: 21060, hydrotestPressure: 15000, torsionalYield: 3045, torsionalUltimate: 3365, extGal: 124.95, extBbl: 2.97, intGal: 73.48, intBbl: 1.75 },
  { od: 1.75, wall: 0.224, id: 1.302, weight: 3.66, yieldLoad: 102020, tensileLoad: 112760, yieldPressure: 23230, hydrotestPressure: 15000, torsionalYield: 3243, torsionalUltimate: 3585, extGal: 124.95, extBbl: 2.97, intGal: 69.16, intBbl: 1.65 },
  { od: 1.75, wall: 0.236, id: 1.278, weight: 3.83, yieldLoad: 106640, tensileLoad: 117860, yieldPressure: 24540, hydrotestPressure: 15000, torsionalYield: 3354, torsionalUltimate: 3707, extGal: 124.95, extBbl: 2.97, intGal: 66.64, intBbl: 1.59 },
  { od: 1.75, wall: 0.25, id: 1.25, weight: 4.01, yieldLoad: 111920, tensileLoad: 123700, yieldPressure: 26060, hydrotestPressure: 15000, torsionalYield: 3476, torsionalUltimate: 3841, extGal: 124.95, extBbl: 2.97, intGal: 63.75, intBbl: 1.52 },

  { od: 2.0, wall: 0.109, id: 1.782, weight: 2.21, yieldLoad: 61520, tensileLoad: 67990, yieldPressure: 9880, hydrotestPressure: 8890, torsionalYield: 2552, torsionalUltimate: 2821, extGal: 163.2, extBbl: 3.89, intGal: 129.56, intBbl: 3.08 },
  { od: 2.0, wall: 0.116, id: 1.768, weight: 2.34, yieldLoad: 65220, tensileLoad: 72090, yieldPressure: 10550, hydrotestPressure: 9500, torsionalYield: 2695, torsionalUltimate: 2979, extGal: 163.2, extBbl: 3.89, intGal: 127.53, intBbl: 3.04 },
  { od: 2.0, wall: 0.125, id: 1.75, weight: 2.51, yieldLoad: 69950, tensileLoad: 77310, yieldPressure: 11210, hydrotestPressure: 10090, torsionalYield: 2835, torsionalUltimate: 3133, extGal: 163.2, extBbl: 3.89, intGal: 124.95, intBbl: 2.97 },
  { od: 2.0, wall: 0.134, id: 1.732, weight: 2.68, yieldLoad: 74630, tensileLoad: 82480, yieldPressure: 12070, hydrotestPressure: 10860, torsionalYield: 3009, torsionalUltimate: 3326, extGal: 163.2, extBbl: 3.89, intGal: 122.39, intBbl: 2.91 },
  { od: 2.0, wall: 0.145, id: 1.71, weight: 2.88, yieldLoad: 80280, tensileLoad: 88730, yieldPressure: 13110, hydrotestPressure: 11800, torsionalYield: 3216, torsionalUltimate: 3554, extGal: 163.2, extBbl: 3.89, intGal: 119.3, intBbl: 2.84 },
  { od: 2.0, wall: 0.156, id: 1.688, weight: 3.08, yieldLoad: 85850, tensileLoad: 94890, yieldPressure: 14160, hydrotestPressure: 12740, torsionalYield: 3414, torsionalUltimate: 3773, extGal: 163.2, extBbl: 3.89, intGal: 116.25, intBbl: 2.77 },
  { od: 2.0, wall: 0.175, id: 1.65, weight: 3.42, yieldLoad: 95320, tensileLoad: 105350, yieldPressure: 15960, hydrotestPressure: 14360, torsionalYield: 3739, torsionalUltimate: 4133, extGal: 163.2, extBbl: 3.89, intGal: 111.08, intBbl: 2.64 },
  { od: 2.0, wall: 0.19, id: 1.62, weight: 3.68, yieldLoad: 102640, tensileLoad: 113440, yieldPressure: 17100, hydrotestPressure: 15000, torsionalYield: 3933, torsionalUltimate: 4347, extGal: 163.2, extBbl: 3.89, intGal: 107.08, intBbl: 2.55 },
  { od: 2.0, wall: 0.204, id: 1.592, weight: 3.92, yieldLoad: 109350, tensileLoad: 120860, yieldPressure: 18430, hydrotestPressure: 15000, torsionalYield: 4149, torsionalUltimate: 4586, extGal: 163.2, extBbl: 3.89, intGal: 103.41, intBbl: 2.46 },
  { od: 2.0, wall: 0.224, id: 1.552, weight: 4.26, yieldLoad: 118730, tensileLoad: 131230, yieldPressure: 20330, hydrotestPressure: 15000, torsionalYield: 4439, torsionalUltimate: 4906, extGal: 163.2, extBbl: 3.89, intGal: 98.27, intBbl: 2.34 },
  { od: 2.0, wall: 0.236, id: 1.528, weight: 4.46, yieldLoad: 124250, tensileLoad: 137330, yieldPressure: 21470, hydrotestPressure: 15000, torsionalYield: 4603, torsionalUltimate: 5087, extGal: 163.2, extBbl: 3.89, intGal: 95.26, intBbl: 2.27 },
  { od: 2.0, wall: 0.25, id: 1.5, weight: 4.68, yieldLoad: 130570, tensileLoad: 144320, yieldPressure: 22800, hydrotestPressure: 15000, torsionalYield: 4784, torsionalUltimate: 5288, extGal: 163.2, extBbl: 3.89, intGal: 91.8, intBbl: 2.19 },
  { od: 2.0, wall: 0.276, id: 1.448, weight: 5.09, yieldLoad: 142010, tensileLoad: 156960, yieldPressure: 25270, hydrotestPressure: 15000, torsionalYield: 5095, torsionalUltimate: 5632, extGal: 163.2, extBbl: 3.89, intGal: 85.55, intBbl: 2.04 },

  { od: 2.375, wall: 0.125, id: 2.125, weight: 3.01, yieldLoad: 83940, tensileLoad: 92780, yieldPressure: 9440, hydrotestPressure: 8500, torsionalYield: 4112, torsionalUltimate: 4545, extGal: 230.14, extBbl: 5.48, intGal: 184.24, intBbl: 4.39 },
  { od: 2.375, wall: 0.134, id: 2.107, weight: 3.21, yieldLoad: 89620, tensileLoad: 99060, yieldPressure: 10160, hydrotestPressure: 9140, torsionalYield: 4375, torsionalUltimate: 4836, extGal: 230.14, extBbl: 5.48, intGal: 181.13, intBbl: 4.31 },
  { od: 2.375, wall: 0.145, id: 2.085, weight: 3.46, yieldLoad: 96500, tensileLoad: 106660, yieldPressure: 11040, hydrotestPressure: 9940, torsionalYield: 4688, torsionalUltimate: 5181, extGal: 230.14, extBbl: 5.48, intGal: 177.37, intBbl: 4.22 },
  { od: 2.375, wall: 0.156, id: 2.063, weight: 3.71, yieldLoad: 103310, tensileLoad: 114190, yieldPressure: 11920, hydrotestPressure: 10730, torsionalYield: 4990, torsionalUltimate: 5516, extGal: 230.14, extBbl: 5.48, intGal: 173.64, intBbl: 4.13 },
  { od: 2.375, wall: 0.175, id: 2.025, weight: 4.12, yieldLoad: 114900, tensileLoad: 127000, yieldPressure: 13440, hydrotestPressure: 12100, torsionalYield: 5491, torsionalUltimate: 6069, extGal: 230.14, extBbl: 5.48, intGal: 167.3, intBbl: 3.98 },
  { od: 2.375, wall: 0.19, id: 1.995, weight: 4.44, yieldLoad: 123900, tensileLoad: 136940, yieldPressure: 14400, hydrotestPressure: 12960, torsionalYield: 5793, torsionalUltimate: 6403, extGal: 230.14, extBbl: 5.48, intGal: 162.38, intBbl: 3.87 },
  { od: 2.375, wall: 0.204, id: 1.967, weight: 4.74, yieldLoad: 132180, tensileLoad: 146090, yieldPressure: 15520, hydrotestPressure: 13970, torsionalYield: 6132, torsionalUltimate: 6778, extGal: 230.14, extBbl: 5.48, intGal: 157.86, intBbl: 3.76 },
  { od: 2.375, wall: 0.224, id: 1.927, weight: 5.16, yieldLoad: 143800, tensileLoad: 158940, yieldPressure: 17120, hydrotestPressure: 15000, torsionalYield: 6592, torsionalUltimate: 7286, extGal: 230.14, extBbl: 5.48, intGal: 151.5, intBbl: 3.61 },
  { od: 2.375, wall: 0.236, id: 1.903, weight: 5.4, yieldLoad: 150660, tensileLoad: 166520, yieldPressure: 18080, hydrotestPressure: 15000, torsionalYield: 6855, torsionalUltimate: 7577, extGal: 230.14, extBbl: 5.48, intGal: 147.75, intBbl: 3.52 },
  { od: 2.375, wall: 0.25, id: 1.875, weight: 5.69, yieldLoad: 158550, tensileLoad: 175240, yieldPressure: 19200, hydrotestPressure: 15000, torsionalYield: 7150, torsionalUltimate: 7902, extGal: 230.14, extBbl: 5.48, intGal: 143.44, intBbl: 3.42 },
  { od: 2.375, wall: 0.276, id: 1.823, weight: 6.2, yieldLoad: 172900, tensileLoad: 191100, yieldPressure: 21280, hydrotestPressure: 15000, torsionalYield: 7663, torsionalUltimate: 8469, extGal: 230.14, extBbl: 5.48, intGal: 135.59, intBbl: 3.23 },

  { od: 2.625, wall: 0.134, id: 2.357, weight: 3.57, yieldLoad: 99620, tensileLoad: 110110, yieldPressure: 9190, hydrotestPressure: 8270, torsionalYield: 5428, torsionalUltimate: 6000, extGal: 281.14, extBbl: 6.69, intGal: 226.66, intBbl: 5.4 },
  { od: 2.625, wall: 0.145, id: 2.335, weight: 3.85, yieldLoad: 107320, tensileLoad: 118620, yieldPressure: 9990, hydrotestPressure: 8990, torsionalYield: 5824, torsionalUltimate: 6437, extGal: 281.14, extBbl: 6.69, intGal: 222.45, intBbl: 5.3 },
  { od: 2.625, wall: 0.156, id: 2.313, weight: 4.12, yieldLoad: 114950, tensileLoad: 127050, yieldPressure: 10780, hydrotestPressure: 9700, torsionalYield: 6208, torsionalUltimate: 6862, extGal: 281.14, extBbl: 6.69, intGal: 218.28, intBbl: 5.2 },
  { od: 2.625, wall: 0.175, id: 2.275, weight: 4.59, yieldLoad: 127960, tensileLoad: 141430, yieldPressure: 12160, hydrotestPressure: 10940, torsionalYield: 6847, torsionalUltimate: 7568, extGal: 281.14, extBbl: 6.69, intGal: 211.16, intBbl: 5.03 },
  { od: 2.625, wall: 0.19, id: 2.245, weight: 4.95, yieldLoad: 138080, tensileLoad: 152610, yieldPressure: 13030, hydrotestPressure: 11730, torsionalYield: 7235, torsionalUltimate: 7996, extGal: 281.14, extBbl: 6.69, intGal: 205.63, intBbl: 4.9 },
  { od: 2.625, wall: 0.204, id: 2.217, weight: 5.29, yieldLoad: 147400, tensileLoad: 162920, yieldPressure: 14040, hydrotestPressure: 12640, torsionalYield: 7671, torsionalUltimate: 8479, extGal: 281.14, extBbl: 6.69, intGal: 200.53, intBbl: 4.77 },
  { od: 2.625, wall: 0.224, id: 2.177, weight: 5.76, yieldLoad: 160510, tensileLoad: 177410, yieldPressure: 15490, hydrotestPressure: 13940, torsionalYield: 8267, torsionalUltimate: 9138, extGal: 281.14, extBbl: 6.69, intGal: 193.36, intBbl: 4.6 },
  { od: 2.625, wall: 0.236, id: 2.153, weight: 6.04, yieldLoad: 168270, tensileLoad: 185980, yieldPressure: 16360, hydrotestPressure: 14720, torsionalYield: 8610, torsionalUltimate: 9516, extGal: 281.14, extBbl: 6.69, intGal: 189.12, intBbl: 4.5 },
  { od: 2.625, wall: 0.25, id: 2.125, weight: 6.36, yieldLoad: 177210, tensileLoad: 195860, yieldPressure: 17370, hydrotestPressure: 15000, torsionalYield: 8995, torsionalUltimate: 9942, extGal: 281.14, extBbl: 6.69, intGal: 184.24, intBbl: 4.39 },
  { od: 2.625, wall: 0.276, id: 2.073, weight: 6.94, yieldLoad: 193490, tensileLoad: 213860, yieldPressure: 19250, hydrotestPressure: 15000, torsionalYield: 9672, torsionalUltimate: 10690, extGal: 281.14, extBbl: 6.69, intGal: 175.33, intBbl: 4.17 },

  { od: 2.875, wall: 0.145, id: 2.585, weight: 4.24, yieldLoad: 118140, tensileLoad: 130580, yieldPressure: 9120, hydrotestPressure: 8210, torsionalYield: 7084, torsionalUltimate: 7829, extGal: 337.24, extBbl: 8.03, intGal: 272.63, intBbl: 6.49 },
  { od: 2.875, wall: 0.156, id: 2.563, weight: 4.54, yieldLoad: 126590, tensileLoad: 139920, yieldPressure: 9850, hydrotestPressure: 8870, torsionalYield: 7560, torsionalUltimate: 8355, extGal: 337.24, extBbl: 8.03, intGal: 268.01, intBbl: 6.38 },
  { od: 2.875, wall: 0.175, id: 2.525, weight: 5.06, yieldLoad: 141020, tensileLoad: 155860, yieldPressure: 11100, hydrotestPressure: 9990, torsionalYield: 8354, torsionalUltimate: 9233, extGal: 337.24, extBbl: 8.03, intGal: 260.12, intBbl: 6.19 },
  { od: 2.875, wall: 0.19, id: 2.495, weight: 5.46, yieldLoad: 152260, tensileLoad: 168280, yieldPressure: 11900, hydrotestPressure: 10710, torsionalYield: 8837, torsionalUltimate: 9768, extGal: 337.24, extBbl: 8.03, intGal: 253.98, intBbl: 6.05 },
  { od: 2.875, wall: 0.204, id: 2.467, weight: 5.83, yieldLoad: 162620, tensileLoad: 179740, yieldPressure: 12820, hydrotestPressure: 11540, torsionalYield: 9384, torsionalUltimate: 10372, extGal: 337.24, extBbl: 8.03, intGal: 248.31, intBbl: 5.91 },
  { od: 2.875, wall: 0.224, id: 2.427, weight: 6.36, yieldLoad: 177230, tensileLoad: 195880, yieldPressure: 14140, hydrotestPressure: 12730, torsionalYield: 10134, torsionalUltimate: 11201, extGal: 337.24, extBbl: 8.03, intGal: 240.32, intBbl: 5.72 },
  { od: 2.875, wall: 0.236, id: 2.403, weight: 6.67, yieldLoad: 185880, tensileLoad: 205440, yieldPressure: 14940, hydrotestPressure: 13450, torsionalYield: 10567, torsionalUltimate: 11679, extGal: 337.24, extBbl: 8.03, intGal: 235.6, intBbl: 5.61 },
  { od: 2.875, wall: 0.25, id: 2.375, weight: 7.03, yieldLoad: 195860, tensileLoad: 216480, yieldPressure: 15860, hydrotestPressure: 14270, torsionalYield: 11056, torsionalUltimate: 12219, extGal: 337.24, extBbl: 8.03, intGal: 230.14, intBbl: 5.48 },
  { od: 2.875, wall: 0.276, id: 2.323, weight: 7.68, yieldLoad: 214090, tensileLoad: 236620, yieldPressure: 17580, hydrotestPressure: 15000, torsionalYield: 11919, torsionalUltimate: 13174, extGal: 337.24, extBbl: 8.03, intGal: 220.17, intBbl: 5.24 },
]

export function ctRowForGrade(row, grade) {
  const yFactor = grade.smys / REF_SMYS
  const tFactor = grade.smts / REF_SMTS
  return {
    od: row.od,
    wall: row.wall,
    id: row.id,
    weight: row.weight,
    yieldLoad: row.yieldLoad * yFactor,
    tensileLoad: row.tensileLoad * tFactor,
    yieldPressure: row.yieldPressure * yFactor,
    hydrotestPressure: Math.min(row.hydrotestPressure * yFactor, 15000 * yFactor),
    torsionalYield: row.torsionalYield * yFactor,
    torsionalUltimate: row.torsionalUltimate * tFactor,
    extGal: row.extGal,
    extBbl: row.extBbl,
    intGal: row.intGal,
    intBbl: row.intBbl,
  }
}
