import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planSegments, actualTimes, plannedCurve, fmtDuration, HIST_SPEEDS } from '../../src/ctsim/times.js'

const plan = { rih: { vert: 20, curve: 10, lat: [4, 3, 2] }, pooh: { lat: 10, curve: 12, vert: 20 }, bottomH: 1, blockM: 500 }

test('RIH segments: vertical, curve and 500 m lateral blocks to the target', () => {
  const p = planSegments({ kop: 2000, lp: 2600, target: 4300, plan })
  assert.deepEqual(p.rih.map((s) => [s.from, s.to]), [[0, 2000], [2000, 2600], [2600, 3100], [3100, 3600], [3600, 4100], [4100, 4300]])
  assert.deepEqual(p.rih.map((s) => s.v), [20, 10, 4, 3, 2, 2]) // beyond the list: last speed
  assert.equal(Math.round(p.rihMin), Math.round(2000 / 20 + 600 / 10 + 500 / 4 + 500 / 3 + 500 / 2 + 200 / 2))
  assert.deepEqual(p.pooh.map((s) => s.key), ['plat', 'pcurve', 'pvert'])
  assert.equal(p.bottomMin, 60)
})

test('target above the LP: no lateral', () => {
  const p = planSegments({ kop: 2000, lp: 2600, target: 2300, plan })
  assert.deepEqual(p.rih.map((s) => s.key), ['vert', 'curve'])
})

test('actual times from a synthetic run at known speeds', () => {
  const p = planSegments({ kop: 2000, lp: 2600, target: 3600, plan })
  const series = []
  let t = 0
  const go = (from, to, v) => {
    const n = Math.round(Math.abs(to - from) / (v / 6)) // 10 s samples
    for (let i = 1; i <= n; i++) series.push([(t += 10), from + ((to - from) * i) / n])
  }
  series.push([0, 0])
  go(0, 2000, 20)
  go(2000, 2600, 10)
  go(2600, 3600, 5)
  for (let i = 0; i < 360; i++) series.push([(t += 10), 3600]) // 1 h at bottom
  go(3600, 0, 15)
  const a = actualTimes(series, p)
  const v = Object.fromEntries([...a.rih, ...a.pooh].map((s) => [s.key, s.realV]))
  assert.ok(Math.abs(v.curve - 10) < 0.3, `curve ${v.curve}`)
  assert.ok(Math.abs(v.lat0 - 5) < 0.2 && Math.abs(v.lat1 - 5) < 0.2)
  assert.ok(Math.abs(v.plat - 15) < 0.5 && Math.abs(v.pvert - 15) < 0.5)
  // bottom time includes the last 30 m of travel (bottom tolerance)
  assert.ok(Math.abs(a.bottomMin - 60) < 3, `bottom ${a.bottomMin}`)
  assert.ok(a.reachedTarget)
})

test('planned depth-time curve ends at surface', () => {
  const c = plannedCurve(planSegments({ kop: 2000, lp: 2600, target: 3600, plan: HIST_SPEEDS }))
  assert.equal(c[0].md, 0)
  assert.equal(c[c.length - 1].md, 0)
  assert.ok(c.every((x, i) => i === 0 || x.h >= c[i - 1].h))
})

test('duration format', () => {
  assert.equal(fmtDuration(125), '2:05 h')
  assert.equal(fmtDuration(null), '—')
})
