import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRuns, autoAssign, pickRun, runsOf } from '../../src/ctsim/runs.js'
import { toProject, applyProject } from '../../src/ctsim/project.js'

const mk = (start, maxMd) => ({ start, end: start + 3600, maxMd, tMax: start + 1800, points: [], series: [] })
const wells = [
  { name: 'BdC-1028h', td: 6790 },
  { name: 'BdC-1029h', td: 6714 },
  { name: 'BdC-1030h', td: 6821 },
  { name: 'BdC-1031h', td: 6789 },
]

test('pad CSV: runs go to the wells in order; a short first attempt keeps its well', () => {
  // B1B: 1028, 1029, 1030 r1 (stopped at 5632 m), 1030 r2, 1031
  const runs = mergeRuns([], [mk(1000, 6689), mk(2000, 6631), mk(3000, 5632), mk(4000, 6745), mk(5000, 6706)], { file: 'pad.csv' })
  autoAssign(runs, wells)
  assert.deepEqual(runs.map((r) => r.well), ['BdC-1028h', 'BdC-1029h', 'BdC-1030h', 'BdC-1030h', 'BdC-1031h'])
  // the well with two runs uses the deepest unless another is picked
  assert.equal(pickRun(runs, {}, 'BdC-1030h').maxMd, 6745)
  assert.equal(pickRun(runs, { 'BdC-1030h': runs[2].uid }, 'BdC-1030h').maxMd, 5632)
  assert.equal(runsOf(runs, 'BdC-1030h').length, 2)
})

test('loading the same CSV twice does not duplicate runs; new ones keep earlier assignments', () => {
  let runs = mergeRuns([], [mk(1000, 6689), mk(2000, 6631)], { file: 'a.csv' })
  autoAssign(runs, wells)
  runs = mergeRuns(runs, [mk(1000, 6689), mk(2000, 6631), mk(3000, 6745)], { file: 'b.csv' })
  assert.equal(runs.length, 3)
  autoAssign(runs, wells)
  assert.deepEqual(runs.map((r) => r.well), ['BdC-1028h', 'BdC-1029h', 'BdC-1030h'])
})

test('project keeps all runs, their wells and the picked run', () => {
  const runs = autoAssign(mergeRuns([], [mk(1000, 6689), mk(3000, 5632), mk(4000, 6745)], { file: 'pad.csv' }), wells.slice(0, 2))
  const state = {
    active: 0,
    plugs: [],
    plugsText: '',
    surveys: [{ name: 'BdC-1028h', rows: [[0, 0, 0], [6790, 90, 0]], target: 6600 }, { name: 'BdC-1029h', rows: [[0, 0, 0], [6714, 90, 0]], target: null }],
    sens: { mus: [], erts: [] },
    runs,
    runSel: { 'BdC-1029h': runs[1].uid },
  }
  const p = JSON.parse(JSON.stringify(toProject(state)))
  const s2 = { sens: {} }
  applyProject(s2, p)
  assert.equal(s2.runs.length, 3)
  assert.deepEqual(s2.runs.map((r) => r.well), runs.map((r) => r.well))
  assert.equal(pickRun(s2.runs, s2.runSel, 'BdC-1029h').maxMd, runs[1].maxMd)
  assert.equal(s2.surveys[0].target, 6600)
})

test('version-1 project with a single run: assigned to its active well', () => {
  const v1 = { app: 'simulador-ct', version: 1, active: 1, surveys: [{ name: 'A', rows: [[0, 0, 0], [100, 0, 0]] }, { name: 'B', rows: [[0, 0, 0], [100, 0, 0]] }], run: { name: 'x.csv', hasTime: true, run: mk(1000, 90) } }
  const s = { sens: {} }
  applyProject(s, v1)
  assert.equal(s.runs.length, 1)
  assert.equal(s.runs[0].well, 'B')
})
