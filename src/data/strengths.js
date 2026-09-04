// Section 4 — Dimensions and Strengths. Standard API minimum yield
// strengths by grade (psi), used with Barlow's formula and API elastic
// collapse approximation for a general burst/collapse/tension estimator
// that works for any OD/ID, not just the sizes tabulated in the handbook.

export const PIPE_GRADES = [
  { id: 'H-40', label: 'H-40', yieldPsi: 40000 },
  { id: 'J-55', label: 'J-55 / K-55', yieldPsi: 55000 },
  { id: 'N-80', label: 'N-80', yieldPsi: 80000 },
  { id: 'L-80', label: 'L-80', yieldPsi: 80000 },
  { id: 'C-75', label: 'C-75', yieldPsi: 75000 },
  { id: 'C-90', label: 'C-90', yieldPsi: 90000 },
  { id: 'C-95', label: 'C-95 / T-95', yieldPsi: 95000 },
  { id: 'P-105', label: 'P-105', yieldPsi: 105000 },
  { id: 'P-110', label: 'P-110', yieldPsi: 110000 },
  { id: 'Q-125', label: 'Q-125', yieldPsi: 125000 },
]
