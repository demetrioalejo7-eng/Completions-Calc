// The run fit recovers the friction and surface offsets of a synthetic run
// generated with the model itself.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildContext, forcesAtDepth, surfaceWeight, DEFAULT_MODEL } from '../../src/ctsim/forces.js'
import { matchRun } from '../../src/ctsim/runMatch.js'
import { STANDARD_STRING_2375, DEFAULT_BHA } from '../../src/ctsim/defaults.js'
import { CT_CALIBRATION } from '../../src/ctsim/calibration.js'

const hz = [[0, 0, 0], [2500, 0, 0]]
for (let md = 2530; md <= 3400; md += 30) hz.push([md, Math.min(90, ((md - 2500) / 900) * 90), 0])
hz.push([5500, 90, 0])
const model = { ...DEFAULT_MODEL, ...CT_CALIBRATION.model }
const params = {
  survey: hz,
  string: STANDARD_STRING_2375,
  casing: [{ top: 0, bottom: 1e9, id: 4.126 }],
  fluidPpg: 8.4,
  whp: 4000,
  rateBpm: 4,
  muRIH: 0.3,
  muPOOH: 0.27,
  speedRIH: 3,
  speedPOOH: 10,
  ertLbfPerBpm: 1500,
  stripperLbf: 0,
  reelTensionRIH: 0,
  reelTensionPOOH: 0,
  reelTared: true,
  ertInPooh: false,
  bha: DEFAULT_BHA,
}

test('matchRun recovers µ and the surface offsets', () => {
  const truth = { mu: 0.33, strip: 5000, zero: 1500 }
  const p = { ...params, muRIH: truth.mu, muPOOH: truth.mu * 0.9, stripperLbf: truth.strip, indicatorOffset: truth.zero }
  const ctx = buildContext(p, model)
  const pts = []
  for (let md = 300; md <= 5400; md += 100)
    for (const dir of ['RIH', 'POOH']) {
      const r = forcesAtDepth(ctx, md, dir)
      if (!r.lockup) pts.push({ dir, md, w: surfaceWeight(r.surfaceForce, dir, ctx.p, ctx.string, model), v: dir === 'RIH' ? 3 : 10, whp: 4000, q: 4 })
    }
  const m = matchRun(params, model, pts)
  assert.ok(Math.abs(m.muRIH - truth.mu) <= 0.006, `µ ${m.muRIH}`)
  assert.ok(Math.abs(m.stripperLbf - truth.strip) < 300, `stripper ${m.stripperLbf}`)
  assert.ok(Math.abs(m.reelTension - truth.zero) < 300, `zero ${m.reelTension}`)
})
