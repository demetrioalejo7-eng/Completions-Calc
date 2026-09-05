import { multipleStringsFactors, mixedAnnulusFactors, totalsFromFactors } from '../calc/geometry.js'
import { ALL_PIPES } from '../data/pipes.js'
import { lengthFt, lengthIn } from '../ui/fieldHelpers.js'

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
      diagram: { kind: 'multiStringCrossSection', labels: { outer: 'D', inner: 'd' } },
      inputs: [
        lengthIn('outerD', 'Diámetro exterior (pozo o ID de casing)', { step: 0.001, default: 8.5 }),
        {
          type: 'pipePreset',
          id: 'string',
          label: 'Tubing (cada sarta, d = OD)',
          dataset: ALL_PIPES,
          odField: 'stringOd',
          idField: 'stringId',
        },
        { type: 'number', id: 'n', label: 'Cantidad de sartas (n)', step: 1, default: 2 },
        lengthFt('length', 'Longitud', { step: 1, default: 1000 }),
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
    {
      id: 'multiple-annulus',
      title: 'Múltiple Anular (sartas de distinto tamaño)',
      description: 'Hasta 4 tuberías de OD distinto dentro del mismo pozo/casing (dejá en 0 las que no uses).',
      diagram: { kind: 'multiStringCrossSection', labels: { outer: 'D', inner: 'od1-4' } },
      inputs: [
        lengthIn('outerD', 'Diámetro exterior (pozo o ID de casing)', { step: 0.001, default: 8.5 }),
        lengthIn('od1', 'Tubería interior 1 — OD', { step: 0.001, default: 2.375 }),
        lengthIn('od2', 'Tubería interior 2 — OD', { step: 0.001, default: 1.0 }),
        lengthIn('od3', 'Tubería interior 3 — OD', { step: 0.001, default: 0 }),
        lengthIn('od4', 'Tubería interior 4 — OD', { step: 0.001, default: 0 }),
        lengthFt('length', 'Longitud', { step: 1, default: 1000 }),
      ],
      compute(v) {
        if (!v.outerD) throw new Error('Ingresá el diámetro exterior.')
        const innerDs = [v.od1, v.od2, v.od3, v.od4].map((x) => x || 0)
        const sumSq = innerDs.reduce((a, d) => a + d * d, 0)
        if (sumSq >= v.outerD * v.outerD) {
          throw new Error('Las tuberías interiores no entran dentro del diámetro exterior indicado.')
        }
        const f = mixedAnnulusFactors(v.outerD, innerDs)
        const results = [
          { label: 'Barriles / pie lineal', value: f.bblPerFt, unit: 'bbl/ft', digits: 5 },
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
