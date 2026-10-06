// Carreras del CSV de un pad: se guardan todas y cada una se asigna a un
// pozo. Al elegir un pozo se usa su carrera (o la elegida, si tiene varias).

let seq = 0
export const runUid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`

// Adds the runs read from a CSV to the existing list (skips duplicates: same
// start within 2 min), sorted by start.
export function mergeRuns(existing, parsed, { file = '', hasTime = true, hasWHP = false, hasQ = false } = {}) {
  const out = [...existing]
  for (const r of parsed) {
    if (out.some((x) => Math.abs(x.start - r.start) < 120 && Math.abs(x.maxMd - r.maxMd) < 5)) continue
    out.push({ uid: runUid(), file, hasTime, hasWHP, hasQ, well: null, start: r.start, end: r.end, maxMd: r.maxMd, tMax: r.tMax, points: r.points, series: r.series })
  }
  return out.sort((a, b) => a.start - b.start)
}

// Assigns the unassigned runs to the wells in list order (the order the pad
// was drilled / cleaned). A run that stopped well short of the well's TD
// (> 500 m) while there are more runs than wells left is taken as a first
// attempt: the next run goes to the same well (e.g. BdC-1030h r1 / r2).
// wells: [{ name, td }]
export function autoAssign(runs, wells) {
  const free = runs.filter((r) => !r.well)
  if (!free.length || !wells.length) return runs
  const used = new Set(runs.filter((r) => r.well).map((r) => r.well))
  const order = wells.filter((w) => !used.has(w.name))
  let w = 0
  for (let i = 0; i < free.length && w < order.length; i++) {
    const r = free[i]
    r.well = order[w].name
    const runsLeft = free.length - i - 1
    const wellsLeft = order.length - w - 1
    const short = r.maxMd < order[w].td - 500
    if (!(short && runsLeft > wellsLeft)) w++
  }
  return runs
}

export const runsOf = (runs, well) => runs.filter((r) => r.well === well)

// Run used for a well: the one picked for it, else its deepest.
export function pickRun(runs, sel, well) {
  const mine = runsOf(runs, well)
  if (!mine.length) return null
  return mine.find((r) => r.uid === sel?.[well]) || mine.reduce((a, r) => (r.maxMd > a.maxMd ? r : a), mine[0])
}
