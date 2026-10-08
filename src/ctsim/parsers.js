// Parsers for the CT weight simulator: well surveys (xlsx / csv / pasted
// from Excel) and acquisition-system run exports (CSV, one row per second).

// Number parser tolerant to "1,234.56", "1234,56", "1.234,56" and plain numbers.
export function toNumber(x) {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null
  if (x === null || x === undefined) return null
  let s = String(x).trim().replace(/^"|"$/g, '')
  if (s === '') return null
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  if (hasDot && hasComma) {
    // the right-most separator is the decimal one
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (hasComma) s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Split delimited text into rows of cells (auto-detects tab / ; / ,).
export function splitTable(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  if (!lines.length) return []
  const sample = lines.slice(0, 20).join('\n')
  const delim = sample.includes('\t') ? '\t' : (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length / 2 ? ';' : ','
  return lines.map((l) => splitLine(l, delim))
}

function splitLine(line, delim) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') q = !q
    else if (c === delim && !q) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

// Survey from a 2-D table. Finds the header row (a cell starting with "MD"
// plus Inc / Az columns); without a header, takes the first three numeric
// columns as MD, Inc, Az.
export function parseSurveyTable(rows) {
  let cols = null
  let start = 0
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const labs = rows[r].map((c) => String(c ?? '').trim().toLowerCase())
    const md = labs.findIndex((l) => /^md\b|^md\(|^md \(|^prof/.test(l) || l === 'md')
    const inc = labs.findIndex((l) => l.startsWith('inc'))
    const az = labs.findIndex((l) => l.startsWith('az') || l.startsWith('azi'))
    if (md >= 0 && inc >= 0 && az >= 0) {
      cols = [md, inc, az]
      start = r + 1
      break
    }
  }
  const out = []
  for (let r = start; r < rows.length; r++) {
    const row = rows[r]
    let v
    if (cols) v = cols.map((i) => toNumber(row[i]))
    else {
      const nums = row.map(toNumber).filter((n) => n !== null)
      v = nums.length >= 3 ? nums.slice(0, 3) : [null]
    }
    if (v.every((n) => n !== null) && v[1] >= 0 && v[1] <= 180) out.push(v)
  }
  if (out.length < 2) throw new Error('No se encontraron estaciones de survey (columnas MD, Inc, Az).')
  return out.sort((a, b) => a[0] - b[0])
}

export async function readSurveyFile(file) {
  if (/\.xlsx$/i.test(file.name)) {
    const mod = await import('read-excel-file/universal')
    const res = await mod.default(await file.arrayBuffer())
    // read-excel-file ≥ 8 returns [{ sheet, data }] for all sheets
    const sheets = Array.isArray(res) && res.length && res[0] && res[0].data ? res.map((s) => s.data) : [res]
    let lastErr
    for (const data of sheets) {
      try {
        return parseSurveyTable(data)
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr || new Error('El archivo no tiene hojas con survey.')
  }
  return parseSurveyTable(splitTable(await file.text()))
}

// Acquisition CSV (Orion-style export: "DateTime","CT - Peso (lb) [Last]",
// "CT - Profundidad (m) [Last]", "CT - Velocidad (m/min) [Last]", ...).
// Returns 1-per-bin medians of steady motion, split by direction.
// Acquisition-system export (one row per second or so): DateTime, Peso,
// Profundidad, Velocidad, Presión en cabeza, Caudal… The reader works line
// by line (big pad files can be streamed) and returns, for every run found
// in the file (in-hole periods separated by ≥ 30 min at surface):
//   points: medians every `binM` m of the steady-motion samples, per direction
//   series: [t (s), md] every ~10 s, for operation times
const SURFACE_M = 50
const RUN_GAP_S = 1800

// "No data" codes of the acquisition systems (-999.25 LAS style, -999,
// -9999). Only these exact values: a weight of -30 000 lb near surface
// (well pressure pushing the CT out) is a real reading.
const isNullCode = (n) => Math.abs(n + 999.25) < 1e-6 || n === -999 || n === -9999

function parseTime(s) {
  if (!s) return null
  const t = String(s).trim().replace(/^"|"$/g, '')
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?/)
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) / 1000
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?/)
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)) / 1000
  return null
}

export function createRunReader({ binM = 25 } = {}) {
  let cols = null
  let rowNo = 0
  const ring = [] // last 31 samples for the ±15-sample direction / speed
  const bins = new Map() // `${run}|${dir}|${bin}` → { w: [], v: [], whp, nwhp, q, nq }
  const runs = []
  let run = null
  let lastInHole = -Infinity
  let atSurface = true // CT seen at surface since the last in-hole sample
  const dts = [] // sample intervals (s), to size the bins' minimum count

  function header(line) {
    const hdr = splitLine(line.replace(/^\uFEFF/, ''), ',').map((h) => h.replace(/"/g, '').trim())
    const pick = (re) => {
      const cands = hdr.map((h, i) => [h, i]).filter(([h]) => re.test(h))
      const last = cands.find(([h]) => /\[last\]/i.test(h))
      return (last || cands[0] || [null, -1])[1]
    }
    cols = {
      t: pick(/date|fecha|time|hora/i),
      w: pick(/peso|weight/i),
      md: pick(/profundidad|depth/i),
      v: pick(/velocidad|speed/i),
      whp: pick(/presi[oó]n en cabeza|whp/i),
      q: pick(/caudal linea|caudal de bombeo|caudal total|pump rate/i),
    }
    if (cols.w < 0 || cols.md < 0) throw new Error('El CSV no tiene columnas de peso y profundidad reconocibles.')
  }

  function process(c) {
    // c = centre sample of the ring: direction and speed from up to 15
    // samples each side, within 3 min (1 s logs use ±15 s, 1 min logs the
    // neighbouring samples)
    if (c.md === null || c.w === null || c.run === null) return
    let k = 15
    while (k > 1 && ring[15 + k].t - ring[15 - k].t > 180) k--
    const a = ring[15 - k]
    const b = ring[15 + k]
    if (a.md === null || b.md === null) return
    const dt = b.t - a.t
    if (!(dt > 0) || dt > 180) return
    const dv = ((b.md - a.md) / dt) * 60 // m/min, + = RIH
    // stopped, or a depth-counter jump / reset (no CT runs at 120 m/min)
    if (Math.abs(dv) < 1.5 || Math.abs(dv) > 120) return
    const dir = dv > 0 ? 'RIH' : 'POOH'
    const key = `${c.run}|${dir}|${Math.floor(c.md / binM)}`
    let g = bins.get(key)
    if (!g) bins.set(key, (g = { w: [], v: [], whp: 0, nwhp: 0, q: 0, nq: 0, t: c.t }))
    if (dts.length < 200) dts.push(ring[16].t - ring[15].t)
    g.w.push(c.w)
    // speed channel when it agrees with the depth trend (some exports log it
    // scaled, e.g. ×0.1, or as 0), otherwise the speed from depth
    const vc = c.v !== null ? Math.abs(c.v) : null
    g.v.push(vc !== null && vc > Math.abs(dv) / 2 && vc < Math.abs(dv) * 2 ? vc : Math.abs(dv))
    if (c.whp !== null) (g.whp += c.whp), g.nwhp++
    if (c.q !== null) (g.q += c.q), g.nq++
  }

  function row(line) {
    if (!line) return
    if (!cols) return header(line)
    const c = splitLine(line, ',')
    const val = (i) => {
      if (i < 0) return null
      const n = toNumber(c[i])
      return n === null || isNullCode(n) || Math.abs(n) > 1e6 ? null : n
    }
    rowNo++
    const t = cols.t >= 0 ? (parseTime(c[cols.t]) ?? rowNo) : rowNo
    const md = val(cols.md)
    // runs: in-hole periods separated by ≥ 30 min at surface (a data gap
    // with the CT still in the hole does not split a run)
    let runId = null
    if (md !== null && md <= SURFACE_M) atSurface = true
    if (md !== null && md > SURFACE_M) {
      if (!run || (atSurface && t - lastInHole > RUN_GAP_S)) {
        run = { id: runs.length, start: t, end: t, maxMd: md, tMax: t, series: [] }
        runs.push(run)
      }
      lastInHole = t
      atSurface = false
      runId = run.id
    }
    if (run && md !== null && (!atSurface || t - lastInHole <= RUN_GAP_S)) {
      run.end = t
      if (md > run.maxMd) (run.maxMd = md), (run.tMax = t)
      const last = run.series[run.series.length - 1]
      if (!last || t - last[0] >= 10) run.series.push([t, md])
    }
    ring.push({ t, md, w: val(cols.w), v: cols.v >= 0 ? val(cols.v) : null, whp: val(cols.whp), q: val(cols.q), run: runId })
    if (ring.length > 31) ring.shift()
    if (ring.length === 31) process(ring[15])
  }

  function finish() {
    if (!cols) throw new Error('El CSV está vacío.')
    const med = (arr) => {
      const s = [...arr].sort((x, y) => x - y)
      return s[Math.floor(s.length / 2)]
    }
    const pointsOf = new Map(runs.map((r) => [r.id, []]))
    // at least ~8 s of steady motion per bin: 8 samples in a 1 s log, one
    // sample in a 1 min log
    const dtTyp = dts.length ? med(dts.filter((d) => d > 0)) || 1 : 1
    const minN = Math.max(1, Math.min(8, Math.round(8 / dtTyp)))
    for (const [key, g] of bins) {
      if (g.w.length < minN) continue
      const [id, dir, b] = key.split('|')
      pointsOf.get(Number(id))?.push({ dir, md: (Number(b) + 0.5) * binM, w: med(g.w), v: med(g.v), whp: g.nwhp ? g.whp / g.nwhp : null, q: g.nq ? g.q / g.nq : null, n: g.w.length, t: g.t })
    }
    const out = runs
      .map((r) => ({ ...r, points: pointsOf.get(r.id).sort((a, b) => a.md - b.md) }))
      .filter((r) => r.maxMd > 300 && r.series.length > 5 && r.points.length > 0)
    return { runs: out, hasTime: cols.t >= 0, hasWHP: cols.whp >= 0, hasQ: cols.q >= 0 }
  }

  return { row, finish }
}

// Whole text at once (small files, tests). Keeps the old shape too:
// `points` of the deepest run.
export function parseRunCsv(text, opts) {
  const rd = createRunReader(opts)
  for (const line of text.replace(/\r/g, '').split('\n')) rd.row(line)
  return withDeepest(rd.finish())
}

function withDeepest(res) {
  if (!res.runs.length) throw new Error('No se encontró ninguna carrera en el CSV (profundidad > 300 m).')
  const deepest = res.runs.reduce((a, r) => (r.maxMd > a.maxMd ? r : a), res.runs[0])
  return { ...res, points: deepest.points, rawCount: deepest.points.length }
}

// Streams a File (pad exports can be hundreds of MB) line by line.
export async function readRunFile(file, opts, onProgress) {
  const rd = createRunReader(opts)
  if (!file.stream) return parseRunCsv(await file.text(), opts)
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader()
  let rest = ''
  let done = 0
  for (;;) {
    const { value, done: end } = await reader.read()
    if (end) break
    done += value.length
    const parts = (rest + value).replace(/\r/g, '').split('\n')
    rest = parts.pop()
    for (const line of parts) rd.row(line)
    onProgress?.(Math.min(1, done / (file.size || 1)))
  }
  if (rest) rd.row(rest)
  return withDeepest(rd.finish())
}

// List of depths (plugs) pasted as a column, one per line, or separated by
// ; / tabs / spaces. "3587,5" is a decimal comma; "3587,3659" (3+ digits on
// both sides) is read as two depths.
export function parseDepthList(text) {
  // table pasted from Excel (several columns): keep the column of depths,
  // i.e. the numeric column with the largest median value
  const lines = String(text).replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (lines.some((l) => l.includes('\t'))) {
    const rows = lines.map((l) => l.split('\t'))
    const nCol = Math.max(...rows.map((r) => r.length))
    let best = null
    for (let c = 0; c < nCol; c++) {
      const vals = rows.map((r) => toNumber(r[c])).filter((v) => v !== null && v > 0)
      if (vals.length < Math.max(1, rows.length * 0.5)) continue
      const med = [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)]
      if (!best || med > best.med) best = { vals, med }
    }
    if (best) return [...new Set(best.vals.map((d) => Math.round(d * 100) / 100))].sort((a, b) => a - b)
  }
  const out = []
  for (const tok of String(text).split(/[\n\r\t; ]+/)) {
    if (!tok.trim()) continue
    const parts = /^\d{3,},\d{3,}(,\d{3,})*$/.test(tok.trim()) ? tok.split(',') : [tok]
    for (const p of parts) {
      const n = toNumber(p)
      if (n !== null && n > 0) out.push(n)
    }
  }
  if (!out.length) throw new Error('No se encontraron profundidades de tapones válidas.')
  return [...new Set(out.map((d) => Math.round(d * 100) / 100))].sort((a, b) => a - b)
}

// Map coordinate (m) tolerant to thousands separators and units:
// "5,826,574.00m", "5.826.574,00", "5826574", "2 487 407 m".
export function parseCoordinate(x) {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null
  let s = String(x ?? '').trim().replace(/\s|m$/gi, '')
  if (!s) return null
  const commas = (s.match(/,/g) || []).length
  const dots = (s.match(/\./g) || []).length
  if (commas && dots) return toNumber(s)
  // a single separator followed by exactly three digits is a thousands one
  // (coordinates are large numbers); several of the same kind always are
  if (commas > 1 || (commas === 1 && /,\d{3}$/.test(s))) s = s.replace(/,/g, '')
  else if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(s) && s.indexOf('.') > 3)) s = s.replace(/\./g, '')
  return toNumber(s)
}

// Wellhead from a pasted "WELL INFO" line such as
// "X:: 5,826,574.00m  Y:: 2,487,407.00m" (optionally "Z: 650 m").
// Returns { x, y, z } with nulls for what is missing.
export function parseWellHead(text) {
  const t = String(text ?? '')
  const grab = (k) => {
    const m = t.match(new RegExp(`\\b${k}\\s*:*\\s*(-?[\\d.,\\s]+?)\\s*m?(?=\\s+[A-Za-z]|\\s*$|\\s*[;|])`, 'i'))
    return m ? parseCoordinate(m[1]) : null
  }
  return { x: grab('X'), y: grab('Y'), z: grab('Z') }
}
