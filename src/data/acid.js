// Section 6 — Acid. Standard HCl solution strengths and specific gravity.

export const HCL_STANDARD = [
  { pct: 7.5, sg: 1.037, ppg: 8.64 },
  { pct: 15, sg: 1.075, ppg: 8.96 },
  { pct: 20, sg: 1.1, ppg: 9.17 },
  { pct: 25, sg: 1.127, ppg: 9.38 },
  { pct: 28, sg: 1.14, ppg: 9.5 },
  { pct: 31.45, sg: 1.16, ppg: 9.7 }, // concentrated / "muriatic"
]

export function sgFromPctHCl(pct) {
  const rows = HCL_STANDARD
  if (pct <= rows[0].pct) return rows[0].sg
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]
    const b = rows[i + 1]
    if (pct >= a.pct && pct <= b.pct) {
      const t = (pct - a.pct) / (b.pct - a.pct)
      return a.sg + t * (b.sg - a.sg)
    }
  }
  return rows[rows.length - 1].sg
}
