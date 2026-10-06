import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCoordinate, parseWellHead, parseRunCsv, parseDepthList, parseSurveyTable, splitTable } from '../../src/ctsim/parsers.js'

test('coordinates with thousands separators and units', () => {
  assert.equal(parseCoordinate('5,826,574.00m'), 5826574)
  assert.equal(parseCoordinate('5.826.574,00'), 5826574)
  assert.equal(parseCoordinate('2 487 407 m'), 2487407)
  assert.equal(parseCoordinate('650,5'), 650.5)
})

test('WELL INFO line fills X and Y', () => {
  assert.deepEqual(parseWellHead('X:: 5,826,574.00m      Y::  2,487,407.00m'), { x: 5826574, y: 2487407, z: null })
  assert.deepEqual(parseWellHead('X: 5826574 Y: 2487407 Z: 640.5'), { x: 5826574, y: 2487407, z: 640.5 })
})

test('plug depth list', () => {
  assert.deepEqual(parseDepthList('3587\n3659,5\n3731'), [3587, 3659.5, 3731])
})

test('survey table from pasted columns', () => {
  const rows = parseSurveyTable(splitTable('MD\tInc\tAz\n0\t0\t0\n1000\t5\t10\n2000\t45\t12\n'))
  assert.equal(rows.length, 3)
  assert.deepEqual(rows[2], [2000, 45, 12])
})

// synthetic acquisition export: 1 s rows, RIH 18 m/min to 1200 m, 30 min
// at bottom, POOH to surface; then a data gap with the CT in the hole (no
// split) and a second run after > 30 min at surface (split)
function synthCsv() {
  const out = ['"DateTime","CT - Peso (lb) [Last]","CT - Profundidad (m) [Last]","CT - Velocidad (m/min) [Last]"']
  let t = Date.UTC(2026, 7, 1, 0, 0, 0) / 1000
  const iso = (x) => new Date(x * 1000).toISOString().replace('T', ' ').slice(0, 19)
  const row = (md, w) => out.push(`"${iso(t)}","${w}","${md.toFixed(2)}","0"`)
  let md = 0
  const trip = (to, v, w) => {
    const dir = Math.sign(to - md)
    while ((to - md) * dir > 0) {
      md = dir > 0 ? Math.min(to, md + v / 60) : Math.max(to, md - v / 60)
      row(md, w(md))
      t += 1
    }
  }
  const stay = (s) => {
    for (let i = 0; i < s; i++) (row(md, 5000), (t += 1))
  }
  trip(1200, 18, (d) => 10000 - d)
  stay(1800)
  trip(600, 18, (d) => 20000 + d)
  t += 3600 // data gap in the hole: same run
  trip(0, 18, (d) => 20000 + d)
  stay(2400) // > 30 min at surface
  trip(800, 18, (d) => 10000 - d)
  trip(0, 18, (d) => 20000 + d)
  return out.join('\n')
}

test('run CSV: runs split only after time at surface; deepest run picked', () => {
  const r = parseRunCsv(synthCsv())
  assert.equal(r.runs.length, 2)
  assert.equal(Math.round(r.runs[0].maxMd), 1200)
  assert.equal(Math.round(r.runs[1].maxMd), 800)
  assert.equal(r.points, r.runs[0].points)
  assert.ok(r.hasTime)
  const rihBin = r.points.find((p) => p.dir === 'RIH' && p.md > 500 && p.md < 525)
  assert.ok(rihBin && Math.abs(rihBin.w - (10000 - rihBin.md)) < 20, 'RIH weight median')
  assert.ok(Math.abs(rihBin.v - 18) < 0.5, 'RIH speed')
})

test('run CSV: negative weights near surface are real readings; -999.25 is no data', () => {
  const out = ['"DateTime","CT - Peso (lb) [Last]","CT - Profundidad (m) [Last]"']
  let t = Date.UTC(2026, 7, 1, 0, 0, 0) / 1000
  const iso = (x) => new Date(x * 1000).toISOString().replace('T', ' ').slice(0, 19)
  for (let md = 0, i = 0; md < 1000; md += 0.3, i++, t++) {
    const w = i % 10 === 0 ? -999.25 : -30000 + 20 * md
    out.push(`"${iso(t)}","${w}","${md.toFixed(2)}"`)
  }
  const r = parseRunCsv(out.join('\n'))
  const first = r.points.find((p) => p.dir === 'RIH')
  assert.ok(first.md < 100, `first RIH bin at ${first.md} m`)
  assert.ok(Math.abs(first.w - (-30000 + 20 * first.md)) < 300, 'weight median, no-data codes skipped')
})
