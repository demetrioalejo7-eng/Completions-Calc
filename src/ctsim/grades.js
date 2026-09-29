// Grados de coiled tubing por fabricante y espesor mínimo de pared.
//
// Fuentes (hojas técnicas provistas por el usuario):
//  - Tenaris, folleto "Tubería flexible" (HV/HS): tabla de especificaciones
//    de material y tablas técnicas (espesor especificado vs. mínimo).
//  - Tenaris, "BlueCoil® Technology" (HT-95 / HT-110 / HT-125).
//  - FET Global Tubing, datasheet DuraCoil 95 a 140. La hoja no publica el
//    espesor mínimo, pero su "Yield Pressure" (Barlow con t_min) se
//    reproduce exacto con t_min = t − 0,007" (t ≤ 0,175") y t − 0,010"
//    (t ≥ 0,190").
// SMYS / SMTS en psi.

export const CT_MANUFACTURERS = [
  {
    id: 'tenaris-hs',
    label: 'Tenaris — HS (convencional)',
    tol: 'tenaris',
    grades: [
      { id: 'HV-70', smys: 70000, smts: 80000 },
      { id: 'HS-70', smys: 70000, smts: 80000 },
      { id: 'HS-80', smys: 80000, smts: 88000 },
      { id: 'HS-90', smys: 90000, smts: 97000 },
      { id: 'HS-100', smys: 100000, smts: 108000 },
      { id: 'HS-110', smys: 110000, smts: 115000 },
      { id: 'HS-80 CRA', smys: 80000, smts: 100000 },
    ],
  },
  {
    id: 'tenaris-bluecoil',
    label: 'Tenaris — BlueCoil®',
    tol: 'tenaris',
    grades: [
      { id: 'HT-95', smys: 95000, smts: 105000 },
      { id: 'HT-110', smys: 110000, smts: 118000 },
      { id: 'HT-125', smys: 125000, smts: 132000 },
    ],
  },
  {
    id: 'global-duracoil',
    label: 'Global Tubing — DuraCoil',
    tol: 'global',
    grades: [
      { id: 'DC-95', smys: 95000, smts: 105000 },
      { id: 'DC-100', smys: 100000, smts: 108000 },
      { id: 'DC-110', smys: 110000, smts: 118000 },
      { id: 'DC-120', smys: 120000, smts: 128000 },
      { id: 'DC-130', smys: 130000, smts: 138000 },
      { id: 'DC-140', smys: 140000, smts: 145000 },
    ],
  },
]

// Flat list with a unique key "<manufacturer>|<grade>".
export const CT_GRADE_LIST = CT_MANUFACTURERS.flatMap((m) =>
  m.grades.map((g) => ({ ...g, key: `${m.id}|${g.id}`, manufacturer: m.id, manufacturerLabel: m.label, tol: m.tol }))
)

export function findGrade(key) {
  return CT_GRADE_LIST.find((g) => g.key === key) || CT_GRADE_LIST.find((g) => g.id === key) || CT_GRADE_LIST.find((g) => g.id === 'DC-120')
}

// Tenaris published specified → minimum wall (in).
const TENARIS_MIN_WALL = {
  0.095: 0.09, 0.109: 0.104, 0.116: 0.108, 0.125: 0.117, 0.134: 0.126, 0.145: 0.137, 0.156: 0.148,
  0.165: 0.157, 0.175: 0.167, 0.19: 0.178, 0.204: 0.192, 0.224: 0.212, 0.25: 0.238, 0.28: 0.265,
}

// Minimum wall for a nominal wall `t` (in); tapers use the nominal wall at
// the point, so intermediate values fall back to the manufacturer's rule.
export function minWall(t, tol) {
  const key = Math.round(t * 1000) / 1000
  if (tol === 'tenaris') {
    if (TENARIS_MIN_WALL[key] !== undefined) return TENARIS_MIN_WALL[key]
    return t - (t <= 0.11 ? 0.005 : t <= 0.18 ? 0.008 : t <= 0.26 ? 0.012 : 0.015)
  }
  return t - (t <= 0.18 ? 0.007 : 0.01)
}
