// Calibrates the empirical terms of src/calc/ctForces.js against field runs.
//
//   node tools/ct-calibration/calibrate.mjs --variant base --train B3A2,C1A [--test ...] [--iters 2000]
//
// Variants (free parameters):
//   base     µRIH, µPOOH, speed coefs, stripper & reel tension per pad
//   offsets  base + a weight-indicator offset per well (diagnostic only:
//            shows how much of the error is a constant per-run tare)
//   lateral  base + separate µ multipliers for the lateral (inc > 80°)
import fs from 'node:fs'
import path from 'node:path'
import { loadData, makePredictor, fit, errorTable, writePred, parseArgs, dataDir } from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
const variant = args.variant || 'base'
const trainPads = (args.train || 'B3A2,C1A').split(',')
const testPads = (args.test || '').split(',').filter(Boolean)
const { bins, paths } = loadData()
const predict = makePredictor(paths, { ert: Number(args.ert ?? 1000) })
const pads = [...new Set(bins.map((b) => b.pad))]
const trainPadsEarly = (args.train || 'B3A2,C1A').split(',')
const wells = [...new Set(bins.filter((b) => args.surface === 'pad' || trainPadsEarly.includes(b.pad) || (args.test || '').includes(b.pad)).map((b) => b.well))]

let spec = [
  { name: 'muRIH', x0: 0.3, step: 0.05 },
  { name: 'muPOOH', x0: 0.22, step: 0.05 },
  { name: 'speedCoefRIH', x0: 0, step: 0.05 },
  { name: 'speedCoefPOOH', x0: 0.1, step: 0.05 },
]
const surfUnits = args.surface === 'pad' ? pads : wells
spec.push(...surfUnits.flatMap((u) => [
  { name: `strip_${u}`, x0: 7000, step: 2000 },
  { name: `rbt_${u}`, x0: 2000, step: 1000 },
]))
if (variant === 'offsets') spec.push(...wells.map((w) => ({ name: `off_${w}`, x0: 0, step: 2000 })))
if (variant === 'speed' || variant === 'speedlat')
  spec.push(
    { name: 'speedDragRIH', x0: 0, step: 20 },
    { name: 'speedDragPOOH', x0: 0, step: 20 },
    { name: 'speedSurfRIH', x0: 0, step: 50 },
    { name: 'speedSurfPOOH', x0: 0, step: 50 },
  )
if (variant === 'lateral' || variant === 'speedlat')
  spec.push({ name: 'muLatRIH', x0: 1, step: 0.1 }, { name: 'muLatPOOH', x0: 1, step: 0.1 })
if (args.only) spec = spec.filter((s) => args.only.split(',').includes(s.name))
const fixed = Object.fromEntries((args.fix || '').split(',').filter(Boolean).map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]))
spec = spec.filter((s) => !(s.name in fixed))

const train = bins.filter((b) => trainPads.includes(b.pad))
const test = bins.filter((b) => testPads.includes(b.pad))
const t0 = Date.now()
const { P, loss } = fit(predict, spec, train, Number(args.iters || 1500), fixed)
console.log(`variant=${variant} train=${trainPads} (${train.length} bins) test=${testPads} (${test.length}) — ${((Date.now() - t0) / 1000).toFixed(0)} s, loss ${loss.toFixed(0)}`)
console.log(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, +v.toFixed(4)])))
console.log('TRAIN'); console.table(errorTable(predict, P, train))
if (test.length) { console.log('TEST (hold-out)'); console.table(errorTable(predict, P, test)) }
const tag = args.tag || `${variant}-${trainPads.join('+')}`
fs.writeFileSync(path.join(dataDir, `cal-${tag}.json`), JSON.stringify({ variant, P, trainPads, testPads }, null, 1))
writePred(predict, P, bins, `pred-${tag}.csv`)
