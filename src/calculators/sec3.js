import { multipleStringsFactors, mixedAnnulusFactors, totalsFromFactors } from '../calc/geometry.js'
import { ALL_PIPES } from '../data/pipes.js'
import { lengthFt } from '../ui/fieldHelpers.js'

export const section3 = {
  id: 'multiple-strings',
  title: 'Múltiples Sartas',
  summary: 'Volumen anular con varias sartas de tubing iguales dentro de un pozo o casing.',
  formulaNote: 'Bbl/ft = 0.0009714·(D² - n·d²)  |  D = ID pozo/casing, d = OD de cada sarta, n = cantidad de sartas',
  calculators: [
    {
      id: 'multi-string',
      title: 'Volumen entre Sartas de Tubing y Pozo/Casing',
      description:
        'Para pozo: elegí "Tamaño personalizado…" e ingresá el diámetro directamente. Para casing: elegí el tamaño y se usa su ID como diámetro exterior.',
      diagram: { kind: 'multiStringCrossSection', labels: { outer: 'D', inner: 'd' } },
      inputs: [
        {
          type: 'pipePreset',
          id: 'outer',
          label: 'Pozo o casing exterior (D = ID; para pozo abierto elegí "Tamaño personalizado…")',
          dataset: ALL_PIPES,
          odField: 'outerCasingOd',
          idField: 'outerD',
          idDefault: 8.5,
          odLabel: 'OD (referencia)',
          idLabel: 'D — diámetro exterior del anular',
        },
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
          { label: 'Barriles / pie lineal', value: f.bblPerFt, category: 'Capacidad lineal', canonicalUnit: 'Barriles/pie (bbl/ft)', unit: 'bbl/ft', digits: 5 },
          { label: 'Pie lineal / barril', value: f.ftPerBbl, unit: 'ft/bbl', digits: 1 },
          { label: 'Pies³ / pie lineal', value: f.cuftPerFt, category: 'Capacidad lineal', canonicalUnit: 'Pies³/pie (ft³/ft)', unit: 'ft³/ft', digits: 5 },
          { label: 'Galones / pie lineal', value: f.galPerFt, category: 'Capacidad lineal', canonicalUnit: 'Galones/pie (gal/ft)', unit: 'gal/ft', digits: 4 },
        ]
        if (v.length) {
          const t = totalsFromFactors(f, v.length)
          results.push(
            { label: `Volumen total (${v.length} ft)`, value: t.bbl, category: 'Volumen', canonicalUnit: 'Barriles (bbl)', unit: 'bbl', digits: 2 },
            { label: `Volumen total (${v.length} ft)`, value: t.gal, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 }
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
        {
          type: 'pipePreset',
          id: 'outer',
          label: 'Pozo o casing exterior (D = ID; para pozo abierto elegí "Tamaño personalizado…")',
          dataset: ALL_PIPES,
          odField: 'outerCasingOd',
          idField: 'outerD',
          idDefault: 8.5,
          odLabel: 'OD (referencia)',
          idLabel: 'D — diámetro exterior del anular',
        },
        {
          type: 'pipePreset',
          id: 'string1',
          label: 'Tubería interior 1 (d = OD)',
          dataset: ALL_PIPES,
          odField: 'od1',
          idField: 'od1Id',
          odDefault: 2.375,
        },
        {
          type: 'pipePreset',
          id: 'string2',
          label: 'Tubería interior 2 (d = OD)',
          dataset: ALL_PIPES,
          odField: 'od2',
          idField: 'od2Id',
          odDefault: 1.0,
        },
        {
          type: 'pipePreset',
          id: 'string3',
          label: 'Tubería interior 3 (d = OD, 0 = sin usar)',
          dataset: ALL_PIPES,
          odField: 'od3',
          idField: 'od3Id',
          odDefault: 0,
        },
        {
          type: 'pipePreset',
          id: 'string4',
          label: 'Tubería interior 4 (d = OD, 0 = sin usar)',
          dataset: ALL_PIPES,
          odField: 'od4',
          idField: 'od4Id',
          odDefault: 0,
        },
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
          { label: 'Barriles / pie lineal', value: f.bblPerFt, category: 'Capacidad lineal', canonicalUnit: 'Barriles/pie (bbl/ft)', unit: 'bbl/ft', digits: 5 },
          { label: 'Pies³ / pie lineal', value: f.cuftPerFt, category: 'Capacidad lineal', canonicalUnit: 'Pies³/pie (ft³/ft)', unit: 'ft³/ft', digits: 5 },
          { label: 'Galones / pie lineal', value: f.galPerFt, category: 'Capacidad lineal', canonicalUnit: 'Galones/pie (gal/ft)', unit: 'gal/ft', digits: 4 },
        ]
        if (v.length) {
          const t = totalsFromFactors(f, v.length)
          results.push(
            { label: `Volumen total (${v.length} ft)`, value: t.bbl, category: 'Volumen', canonicalUnit: 'Barriles (bbl)', unit: 'bbl', digits: 2 },
            { label: `Volumen total (${v.length} ft)`, value: t.gal, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 }
          )
        }
        return { results }
      },
    },
  ],
}
