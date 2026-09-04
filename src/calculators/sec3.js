import { multipleStringsFactors, totalsFromFactors } from '../calc/geometry.js'
import { ALL_PIPES } from '../data/pipes.js'

export const section3 = {
  id: 'multiple-strings',
  title: 'Múltiples Sartas',
  icon: '🧬',
  summary: 'Volumen anular con varias sartas de tubing iguales dentro de un pozo o casing.',
  formulaNote: 'Bbl/ft = 0.0009714·(D² - n·d²)  |  D = ID pozo/casing, d = OD de cada sarta, n = cantidad de sartas',
  calculators: [
    {
      id: 'multi-string',
      title: 'Volumen entre Sartas de Tubing y Pozo/Casing',
      description:
        'Para pozo: ingresá el diámetro directamente. Para casing: usá el ID como diámetro exterior.',
      inputs: [
        { type: 'number', id: 'outerD', label: 'Diámetro exterior (pozo o ID de casing)', unit: 'in', step: 0.001, default: 8.5 },
        {
          type: 'pipePreset',
          id: 'string',
          label: 'Tubing (cada sarta, d = OD)',
          dataset: ALL_PIPES,
          odField: 'stringOd',
          idField: 'stringId',
        },
        { type: 'number', id: 'n', label: 'Cantidad de sartas (n)', step: 1, default: 2 },
        { type: 'number', id: 'length', label: 'Longitud', unit: 'ft', step: 1, default: 1000 },
      ],
      compute(v) {
        if (!v.outerD || !v.stringOd || !v.n) throw new Error('Completá todos los campos.')
        if (v.n * v.stringOd * v.stringOd >= v.outerD * v.outerD) {
          throw new Error('Las sartas no entran dentro del diámetro exterior indicado.')
        }
        const f = multipleStringsFactors(v.outerD, v.stringOd, v.n)
        const results = [
          { label: 'Barriles / pie lineal', value: f.bblPerFt, unit: 'bbl/ft', digits: 5 },
          { label: 'Pie lineal / barril', value: f.ftPerBbl, unit: 'ft/bbl', digits: 1 },
          { label: 'Pies³ / pie lineal', value: f.cuftPerFt, unit: 'ft³/ft', digits: 5 },
          { label: 'Galones / pie lineal', value: f.galPerFt, unit: 'gal/ft', digits: 4 },
        ]
        if (v.length) {
          const t = totalsFromFactors(f, v.length)
          results.push(
            { label: `Volumen total (${v.length} ft)`, value: t.bbl, unit: 'bbl', digits: 2 },
            { label: `Volumen total (${v.length} ft)`, value: t.gal, unit: 'gal', digits: 1 }
          )
        }
        return { results }
      },
    },
  ],
}
