import { capacityFactors, totalsFromFactors } from '../calc/geometry.js'
import { ALL_PIPES } from '../data/pipes.js'

function capacityResults(id, lengthFt) {
  if (!id || id <= 0) throw new Error('Ingresá un diámetro interior (ID) mayor a cero.')
  const f = capacityFactors(id)
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
      { label: `Volumen total (${lengthFt} ft)`, value: t.bbl, unit: 'bbl', digits: 2 },
      { label: `Volumen total (${lengthFt} ft)`, value: t.cuft, unit: 'ft³', digits: 2 },
      { label: `Volumen total (${lengthFt} ft)`, value: t.gal, unit: 'gal', digits: 1 }
    )
  }
  return results
}

export const section1 = {
  id: 'capacity',
  title: 'Capacidad',
  icon: '🛢️',
  summary: 'Capacidad interior de tubing, casing, drill pipe, coiled tubing y pozo.',
  formulaNote:
    'Bbl/ft = 0.0009714·D² · Cu Ft/ft = 0.005454·D² · Gal/ft = 0.0408·D² (D = diámetro interior, in)',
  calculators: [
    {
      id: 'pipe-capacity',
      title: 'Capacidad de Tubing / Casing / Drill Pipe / Coiled Tubing',
      description:
        'Elegí un tamaño estándar de la tabla o ingresá el OD/ID manualmente. La capacidad depende solo del ID.',
      inputs: [
        {
          type: 'pipePreset',
          id: 'pipe',
          label: 'Tamaño de tubería',
          dataset: ALL_PIPES,
          odField: 'od',
          idField: 'id',
          wtField: 'wt',
        },
        { type: 'number', id: 'length', label: 'Longitud', unit: 'ft', step: 1, default: 1000 },
      ],
      compute(v) {
        return { results: capacityResults(v.id, v.length) }
      },
    },
    {
      id: 'hole-capacity',
      title: 'Capacidad de Pozo (Hole)',
      description: 'Capacidad de un hoyo circular a partir de su diámetro.',
      inputs: [
        { type: 'number', id: 'diameter', label: 'Diámetro de pozo', unit: 'in', step: 0.001, default: 8.5 },
        { type: 'number', id: 'length', label: 'Longitud', unit: 'ft', step: 1, default: 1000 },
      ],
      compute(v) {
        return { results: capacityResults(v.diameter, v.length) }
      },
    },
  ],
}
