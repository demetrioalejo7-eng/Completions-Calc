import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toProject, applyProject, validateProject, projectFileName } from '../../src/ctsim/project.js'

const mkState = () => ({
  projectName: 'Pad B1B',
  active: 1,
  plugs: [4000, 4500],
  plugsText: '4000\n4500',
  surveys: [
    { name: 'BdC-1028h', rows: [[0, 0, 0], [3000, 90, 0]], plugs: [3500], plugsText: '3500', head: { x: 5826574, y: 2487407, z: null }, target: null },
    { name: 'BdC-1030h', rows: [[0, 0, 0], [3200, 90, 0]], plugs: [], plugsText: '', head: { x: null, y: null, z: null }, target: 3100 },
  ],
  stripper: 4500,
  units: { len: 'ft', force: 'kN', press: 'bar' },
  timePlan: { rih: { vert: 20 } },
  sens: { mus: [0.3], erts: [0, 1500], required: 2000, wells: null, result: { big: true } },
  run: null,
})

test('project round trip keeps wells, active plugs, target and settings', () => {
  const p = JSON.parse(JSON.stringify(toProject(mkState())))
  assert.equal(p.surveys[1].plugs.length, 2) // active well's plugs written back
  assert.equal(p.sens.result, undefined) // results are not saved
  const s = { sens: {}, units: null }
  const a = applyProject(s, p)
  assert.equal(a, 1)
  assert.equal(s.surveys[1].target, 3100)
  assert.equal(s.surveys[0].head.x, 5826574)
  assert.equal(s.stripper, 4500)
  assert.deepEqual(s.units, { len: 'ft', force: 'kN', press: 'bar' })
  assert.equal(s.projectName, 'Pad B1B')
})

test('invalid files are rejected with a readable message', () => {
  assert.throws(() => validateProject({ foo: 1 }), /no es un proyecto/)
  assert.throws(() => validateProject({ app: 'simulador-ct', version: 99, surveys: [] }), /versión más nueva/)
})

test('file name from the project name', () => {
  assert.equal(projectFileName({ projectName: 'Pad B1B — lavado', surveys: [] }), 'pad-b1b-lavado.ctsim.json')
})
