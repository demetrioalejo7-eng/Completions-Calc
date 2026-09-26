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
export function parseRunCsv(text, { binM = 25 } = {}) {
  const lines = text.replace(/^﻿/, '').replace(/\r/g, '').split('\n')
  const hdr = splitLine(lines[0], ',').map((h) => h.replace(/"/g, '').trim())
  const pick = (re) => {
    const cands = hdr.map((h, i) => [h, i]).filter(([h]) => re.test(h))
    const last = cands.find(([h]) => /\[last\]/i.test(h))
    return (last || cands[0] || [null, -1])[1]
  }
  const iW = pick(/peso|weight/i)
  const iMD = pick(/profundidad|depth/i)
  const iV = pick(/velocidad|speed/i)
  const iWHP = pick(/presi[oó]n en cabeza|whp/i)
  const iQ = pick(/caudal linea|caudal de bombeo|pump rate/i)
  if (iW < 0 || iMD < 0) throw new Error('El CSV no tiene columnas de peso y profundidad reconocibles.')
  const md = []
  const w = []
  const v = []
  const whp = []
  const q = []
  for (let k = 1; k < lines.length; k++) {
    if (!lines[k]) continue
    const c = splitLine(lines[k], ',')
    const val = (i) => {
      if (i < 0) return null
      const n = toNumber(c[i])
      return n === null || n === -999.25 ? null : n
    }
    md.push(val(iMD))
    w.push(val(iW))
    v.push(iV >= 0 ? val(iV) : null)
    whp.push(val(iWHP))
    q.push(val(iQ))
  }
  // direction from the depth trend over ±15 s, speed from the channel (or depth)
  const pts = []
  for (let i = 15; i < md.length - 15; i++) {
    const a = md[i - 15]
    const b = md[i + 15]
    if (a === null || b === null || md[i] === null || w[i] === null) continue
    const dv = ((b - a) / 30) * 60 // m/min
    if (Math.abs(dv) < 1.5) continue
    pts.push({ md: md[i], w: w[i], v: v[i] !== null ? Math.abs(v[i]) : Math.abs(dv), dir: dv > 0 ? 'RIH' : 'POOH', whp: whp[i], q: q[i] })
  }
  // bin medians
  const bins = new Map()
  for (const p of pts) {
    const key = `${p.dir}|${Math.floor(p.md / binM)}`
    if (!bins.has(key)) bins.set(key, [])
    bins.get(key).push(p)
  }
  const med = (arr) => {
    const s = [...arr].sort((x, y) => x - y)
    return s[Math.floor(s.length / 2)]
  }
  const out = []
  for (const [key, arr] of bins) {
    if (arr.length < 8) continue
    const [dir, b] = key.split('|')
    const opt = (k) => {
      const vals = arr.map((p) => p[k]).filter((x) => x !== null && x !== undefined)
      return vals.length ? med(vals) : null
    }
    out.push({ dir, md: (Number(b) + 0.5) * binM, w: med(arr.map((p) => p.w)), v: med(arr.map((p) => p.v)), whp: opt('whp'), q: opt('q'), n: arr.length })
  }
  return { points: out.sort((a, b) => a.md - b.md), rawCount: pts.length, hasWHP: iWHP >= 0, hasQ: iQ >= 0 }
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
