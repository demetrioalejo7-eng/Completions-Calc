// Motor de fuerzas: ejemplos resueltos de la Tech Note TFM de CTES y
// propiedades físicas básicas.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWellPath, buildString, makeCasing, forcesAtDepth, simulateTrip, maxSetDown, DEFAULT_MODEL, surfaceWeight } from '../../src/ctsim/forces.js'
import { STANDARD_STRING_2375, DEFAULT_BHA } from '../../src/ctsim/defaults.js'
import { CT_CALIBRATION } from '../../src/ctsim/calibration.js'

const FT = 0.3048
const L = 5000 * FT
const string = buildString({ od: 1.5, sections: [{ length: 20000, wallStart: 0.109, wallEnd: 0.109 }] })
const casing = makeCasing([{ top: 0, bottom: 1e6, id: 4.0 }])
const pTN = { muRIH: 0.25, muPOOH: 0.25, fluidPpg: 8.476, bha: { length: 0 }, annularGradient: 0 }
const rih = (survey) => forcesAtDepth({ path: buildWellPath(survey, 5), string, casing, p: pTN, model: DEFAULT_MODEL }, L, 'RIH').surfaceForce
const near = (got, ref, tol, msg) => assert.ok(Math.abs(got - ref) / Math.abs(ref) < tol, `${msg}: ${got.toFixed(1)} vs ${ref.toFixed(1)}`)

test('Tech Note TFM: vertical well (7064 lbf)', () => near(rih([[0, 0, 0], [L, 0, 0]]), 7064, 0.005, 'vertical'))
test('Tech Note TFM: 30° slant (5235 lbf)', () => near(rih([[0, 30, 0], [L, 30, 0]]), 5235, 0.005, '30°'))
test('Tech Note TFM: constant-radius curve vs its own ODE', () => {
  const W = 1.413
  let Fode = 0
  for (let s = 0; s < 5000; s += 0.5) {
    const th = (5000 - s - 0.25) / 10000
    Fode += (W * Math.cos(th) - 0.25 * Math.abs(W * Math.sin(th) - Fode / 10000)) * 0.5
  }
  const curve = []
  for (let s = 0; s <= 5000; s += 50) curve.push([s * FT, ((s / 10000) * 180) / Math.PI, 0])
  near(rih(curve), Fode, 0.005, 'curve')
})

// a simple horizontal well for the property checks
const hz = [[0, 0, 0], [2500, 0, 0]]
for (let md = 2530; md <= 3400; md += 30) hz.push([md, Math.min(90, ((md - 2500) / 900) * 90), 0])
hz.push([5500, 90, 0])
const base = {
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
  stripperLbf: 4500,
  reelTensionRIH: 6000,
  reelTensionPOOH: 6000,
  reelTared: true,
  bha: DEFAULT_BHA,
  outStepM: 100,
}
const model = { ...DEFAULT_MODEL, ...CT_CALIBRATION.model }

test('POOH reads heavier than RIH at every depth', () => {
  const t = simulateTrip(base, model)
  for (const r of t.rows) if (r.rih !== null && r.depth > 200) assert.ok(r.pooh > r.rih, `at ${r.depth} m`)
})

test('more friction: lighter RIH and heavier POOH in the lateral', () => {
  const at = [5000]
  const lo = simulateTrip({ ...base, muRIH: 0.25, muPOOH: 0.22 }, model, at).rows[0]
  const hi = simulateTrip({ ...base, muRIH: 0.35, muPOOH: 0.31 }, model, at).rows[0]
  assert.ok(hi.rih === null || hi.rih < lo.rih)
  assert.ok(hi.pooh > lo.pooh)
})

test('target depth stops the trip short of TD', () => {
  const t = simulateTrip({ ...base, targetM: 4800 }, model)
  assert.equal(t.rows[t.rows.length - 1].depth, 4800)
})

test('ERT increases the set-down available at depth', () => {
  const without = maxSetDown({ ...base, ertLbfPerBpm: 0 }, 5200, model).bottomForce
  const withErt = maxSetDown(base, 5200, model).bottomForce
  assert.ok(withErt >= without, `${withErt} vs ${without}`)
})

test('tared indicator: the reel tension is not subtracted from the reading', () => {
  const s = buildString(STANDARD_STRING_2375)
  const a = surfaceWeight(20000, 'RIH', { ...base, reelTared: true }, s, model)
  const b = surfaceWeight(20000, 'RIH', { ...base, reelTared: false }, s, model)
  assert.equal(Math.round(a - b), 6000)
})
