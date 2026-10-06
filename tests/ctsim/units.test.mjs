import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeUnits, niceStep } from '../../src/ctsim/units.js'

test('conversions and round trip', () => {
  const u = makeUnits({ len: 'ft', force: 'kN', press: 'bar' })
  assert.ok(Math.abs(u.cv.len(1000) - 3280.84) < 0.01)
  assert.ok(Math.abs(u.cv.force(10000) - 44.482) < 0.001)
  assert.ok(Math.abs(u.cv.press(5000) - 344.738) < 0.001)
  assert.ok(Math.abs(u.cv.press(5000) - 344.738) < 0.001)
  for (const k of ['len', 'force', 'press', 'speed']) assert.ok(Math.abs(u.inv[k](u.cv[k](1234.5)) - 1234.5) < 1e-9)
  assert.equal(u.label.speed, 'ft/min')
  assert.equal(makeUnits().label.force, 'lb')
})

test('nice axis steps', () => {
  assert.equal(niceStep(7000, 7), 1000)
  assert.equal(niceStep(22000, 7), 5000)
  assert.equal(niceStep(300, 6), 50)
})
