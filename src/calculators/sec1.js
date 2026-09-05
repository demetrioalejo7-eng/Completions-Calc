import {
  capacityFactors,
  totalsFromFactors,
  metalDisplacementFactors,
  externalDisplacementFactors,
  steelWeightPerFt,
  idFromWeight,
  fluidVelocityFtPerMin,
  flowAreaTubular,
  flowAreaAnnular,
} from '../calc/geometry.js'
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
    {
      id: 'metal-displacement',
      title: 'Desplazamiento de Metal',
      description:
        'Volumen que desplaza la tubería. "Extremo abierto" usa solo el volumen de acero; "Extremo cerrado (capped)" usa el OD completo (p. ej. corrida con tapón o broca). Completá ID o Peso (el que tengas).',
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
        { type: 'number', id: 'weight', label: 'Peso (si no cargaste ID)', unit: 'lb/ft', step: 0.01 },
        { type: 'number', id: 'length', label: 'Longitud', unit: 'ft', step: 1, default: 1000 },
        {
          type: 'select',
          id: 'method',
          label: 'Método',
          options: [
            { value: 'open', label: 'Extremo abierto (solo acero)' },
            { value: 'capped', label: 'Extremo cerrado (capped, OD completo)' },
          ],
          default: 'open',
        },
      ],
      compute(v) {
        if (!v.od) throw new Error('Ingresá el OD.')
        let id = v.id
        if (!id && v.weight) id = idFromWeight(v.od, v.weight)
        if (!id) throw new Error('Ingresá el ID o el peso.')
        if (id >= v.od) throw new Error('El ID debe ser menor que el OD.')
        const wt = steelWeightPerFt(v.od, id)
        const length = v.length || 0
        const results = [
          { label: 'ID', value: id, unit: 'in', digits: 3 },
          { label: 'Peso de acero', value: wt, unit: 'lb/ft', digits: 2 },
          { label: 'Masa total', value: wt * length, unit: 'lb', digits: 1 },
        ]
        if (v.method === 'capped') {
          const f = externalDisplacementFactors(v.od)
          const t = totalsFromFactors(f, length)
          results.push(
            { label: 'Volumen desplazado (OD completo)', value: t.bbl, unit: 'bbl', digits: 4 },
            { label: 'Volumen desplazado (OD completo)', value: t.gal, unit: 'gal', digits: 2 }
          )
        } else {
          const f = metalDisplacementFactors(v.od, id)
          const t = totalsFromFactors(f, length)
          results.push(
            { label: 'Volumen de acero', value: t.bbl, unit: 'bbl', digits: 4 },
            { label: 'Volumen de acero', value: t.gal, unit: 'gal', digits: 2 }
          )
        }
        return { results }
      },
    },
    {
      id: 'fluid-velocity',
      title: 'Velocidad de Fluido',
      description: 'Velocidad del fluido dentro de la tubería (tubular) o en el anular, según el caudal.',
      inputs: [
        {
          type: 'select',
          id: 'kind',
          label: 'Área de flujo',
          options: [
            { value: 'tubular', label: 'Tubular (dentro de la tubería)' },
            { value: 'annular', label: 'Anular (entre tubería y pozo/casing)' },
          ],
          default: 'tubular',
        },
        {
          type: 'pipePreset',
          id: 'pipe',
          label: 'Tubería',
          dataset: ALL_PIPES,
          odField: 'od',
          idField: 'id',
        },
        { type: 'number', id: 'outerD', label: 'Diámetro exterior del anular (si aplica)', unit: 'in', step: 0.001, default: 8.5 },
        { type: 'number', id: 'rate', label: 'Caudal', unit: 'bbl/min', step: 0.1, default: 10 },
      ],
      compute(v) {
        if (!v.rate) throw new Error('Ingresá el caudal.')
        let area
        if (v.kind === 'annular') {
          if (!v.outerD || !v.od) throw new Error('Completá el diámetro exterior y el OD de la tubería.')
          area = flowAreaAnnular(v.outerD, v.od)
        } else {
          if (!v.id) throw new Error('Ingresá el ID de la tubería.')
          area = flowAreaTubular(v.id)
        }
        const vel = fluidVelocityFtPerMin(v.rate, area)
        return {
          results: [
            { label: 'Área de flujo', value: area, unit: 'in²', digits: 4 },
            { label: 'Velocidad del fluido', value: vel, unit: 'ft/min', digits: 2 },
          ],
        }
      },
    },
  ],
}
