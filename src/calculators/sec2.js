import { annulusFactors, totalsFromFactors } from '../calc/geometry.js'
import { ALL_PIPES } from '../data/pipes.js'

function annulusResults(outerD, innerD, lengthFt) {
  if (!outerD || !innerD) throw new Error('Completá ambos diámetros.')
  if (innerD >= outerD) throw new Error('El diámetro interior debe ser menor que el exterior.')
  const f = annulusFactors(outerD, innerD)
  const results = [
    { label: 'Barriles / pie lineal', value: f.bblPerFt, unit: 'bbl/ft', digits: 5 },
    { label: 'Pie lineal / barril', value: f.ftPerBbl, unit: 'ft/bbl', digits: 1 },
    { label: 'Pies³ / pie lineal', value: f.cuftPerFt, unit: 'ft³/ft', digits: 5 },
    { label: 'Pie lineal / pie³', value: f.ftPerCuft, unit: 'ft/ft³', digits: 1 },
    { label: 'Galones / pie lineal', value: f.galPerFt, unit: 'gal/ft', digits: 4 },
    { label: 'Pie lineal / galón', value: f.ftPerGal, unit: 'ft/gal', digits: 1 },
  ]
  if (lengthFt) {
    const t = totalsFromFactors(f, lengthFt)
    results.push(
      { label: `Volumen anular total (${lengthFt} ft)`, value: t.bbl, unit: 'bbl', digits: 2 },
      { label: `Volumen anular total (${lengthFt} ft)`, value: t.gal, unit: 'gal', digits: 1 }
    )
  }
  return results
}

export const section2 = {
  id: 'volume-height',
  title: 'Volumen y Altura',
  icon: '⭕',
  summary: 'Volumen del espacio anular entre tubería y pozo, o entre dos tuberías.',
  formulaNote: 'Bbl/ft = 0.0009714·(D²-d²)  |  D = diámetro exterior del anular, d = diámetro interior',
  calculators: [
    {
      id: 'pipe-hole-annulus',
      title: 'Anular: Tubería dentro de Pozo (Hole)',
      description: 'D = diámetro del pozo. d = OD de la tubería.',
      inputs: [
        { type: 'number', id: 'holeD', label: 'Diámetro de pozo (D)', unit: 'in', step: 0.001, default: 8.5 },
        {
          type: 'pipePreset',
          id: 'pipe',
          label: 'Tubería (d = OD)',
          dataset: ALL_PIPES,
          odField: 'pipeOd',
          idField: 'pipeId',
        },
        { type: 'number', id: 'length', label: 'Longitud', unit: 'ft', step: 1, default: 1000 },
      ],
      compute(v) {
        return { results: annulusResults(v.holeD, v.pipeOd, v.length) }
      },
    },
    {
      id: 'pipe-pipe-annulus',
      title: 'Anular: Tubería dentro de Tubería/Casing',
      description: 'D = ID de la tubería exterior. d = OD de la tubería interior.',
      inputs: [
        {
          type: 'pipePreset',
          id: 'outer',
          label: 'Tubería exterior (D = ID)',
          dataset: ALL_PIPES,
          odField: 'outerOd',
          idField: 'outerId',
        },
        {
          type: 'pipePreset',
          id: 'inner',
          label: 'Tubería interior (d = OD)',
          dataset: ALL_PIPES,
          odField: 'innerOd',
          idField: 'innerId',
        },
        { type: 'number', id: 'length', label: 'Longitud', unit: 'ft', step: 1, default: 1000 },
      ],
      compute(v) {
        return { results: annulusResults(v.outerId, v.innerOd, v.length) }
      },
    },
  ],
}
