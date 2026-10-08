import { test } from 'node:test'
import assert from 'node:assert/strict'
import { liveTrack } from '../../src/ctsim/live.js'

// RIH readings every 25 m with a constant surface offset of +3000 lbf
const trip = (fn) => {
  const pts = []
  const pred = []
  for (let i = 0; i < 240; i++) {
    const md = 62.5 + 25 * i
    const model = 10000 - md
    pts.push({ dir: 'RIH', md, w: model + 3000 + fn(md), t: 1000 + 60 * i })
    pred.push(model)
  }
  return { pts, pred }
}
const geo = { kop: 2900, lp: 3500 }

test('live offset: a constant surface offset is learnt, no alarm', () => {
  const { pts, pred } = trip(() => 0)
  const L = liveTrack(pts, pred, geo)
  assert.ok(Math.abs(L.offset.RIH - 3000) < 1)
  assert.equal(L.alarms.length, 0)
  assert.ok(L.points.filter((p) => p.level).every((p) => p.level === 'ok'))
})

test('live alarm: growing set-down in the lateral, not in the vertical', () => {
  // 20 klb lighter over the last 75 m of the trip (lateral) and a single
  // 20 klb tag in the vertical
  const { pts, pred } = trip((md) => (md > 5900 ? -20000 : Math.abs(md - 1512.5) < 1 ? -20000 : 0))
  const L = liveTrack(pts, pred, geo)
  assert.ok(L.alarms.length >= 1)
  assert.ok(L.alarms[0].md > 5900, `alarm at ${L.alarms[0].md}`)
  const tag = L.points.find((p) => Math.abs(p.md - 1512.5) < 1)
  assert.equal(tag.level, 'caution', 'vertical tag is a caution, not an alarm')
})
