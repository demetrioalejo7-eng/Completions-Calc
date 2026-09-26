// Checks src/ctsim/forces.js against the worked examples of the CTES Tech
// Note "Basic Tubing Forces Model (TFM) Calculation" (1.5" x 0.109" CT,
// 5000 ft, W_B = 1.413 lb/ft, µ = 0.25, RIH).
//   node tools/ct-calibration/verify_technote.mjs
import { buildWellPath, buildString, makeCasing, forcesAtDepth, DEFAULT_MODEL } from '../../src/ctsim/forces.js'

const FT = 0.3048
const L = 5000 * FT
const string = buildString({ od: 1.5, sections: [{ length: 20000, wallStart: 0.109, wallEnd: 0.109 }] })
const casing = makeCasing([{ top: 0, bottom: 1e6, id: 4.0 }])
const p = { muRIH: 0.25, muPOOH: 0.25, fluidPpg: 8.476, bha: { length: 0 }, annularGradient: 0 }
const run = (survey) => forcesAtDepth({ path: buildWellPath(survey, 5), string, casing, p, model: DEFAULT_MODEL }, L, 'RIH').surfaceForce

// Constant-radius curve (R = 10,000 ft): the Tech Note prints 6807 lbf, which
// exceeds the frictionless weight (6774) and cannot be right for RIH; the
// direct integration of its own ODE gives 6356 lbf.
const W = 1.413
let Fode = 0
for (let s = 0; s < 5000; s += 0.5) {
  const th = (5000 - s - 0.25) / 10000
  Fode += (W * Math.cos(th) - 0.25 * Math.abs(W * Math.sin(th) - Fode / 10000)) * 0.5
}
const curve = []
for (let s = 0; s <= 5000; s += 50) curve.push([s * FT, ((s / 10000) * 180) / Math.PI, 0])

const cases = [
  ['Pozo vertical', run([[0, 0, 0], [L, 0, 0]]), 7064],
  ['Inclinado 30°', run([[0, 30, 0], [L, 30, 0]]), 5235],
  ['Curva R=10.000 ft (ODE)', run(curve), Fode],
]
let ok = true
for (const [name, got, ref] of cases) {
  const err = Math.abs(got - ref) / ref
  ok &&= err < 0.01
  console.log(`${name.padEnd(26)} modelo ${got.toFixed(0).padStart(6)} lbf   referencia ${ref.toFixed(0).padStart(6)} lbf   ${(err * 100).toFixed(2)} %`)
}
process.exit(ok ? 0 : 1)
