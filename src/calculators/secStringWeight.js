import { snubbingForce } from '../calc/coiledTubing.js'
import { steelWeightPerFt } from '../calc/geometry.js'
import { crossSectionalArea } from '../calc/strength.js'
import { buoyancyFactor } from '../calc/generalCalc.js'
import { ALL_PIPES } from '../data/pipes.js'
import { density, pressure, weight, weightResult, depth, depthResult } from '../ui/fieldHelpers.js'
import { wellboreNeutralPointDiagram } from '../ui/diagrams.js'

const TUBING = ALL_PIPES.filter((r) => r.kind === 'Tubing')

export const stringWeightCalculator = {
  id: 'string-weight-neutral-point',
  title: 'Peso de Sarta y Punto Neutro (Tubing)',
  description:
    'Peso de la sarta de tubing al aire y flotada en un fluido, sumando el peso del BHA, y punto neutro (tensión/compresión) según la presión de reservorio. El BHA se flota con el mismo factor que el acero (se asume densidad similar al acero).',
  inputs: [
    {
      type: 'pipePreset',
      id: 'pipe',
      label: 'Tubing',
      dataset: TUBING,
      odField: 'od',
      idField: 'id',
      wtField: 'wt',
    },
    depth('length', 'Profundidad en el pozo (= longitud de tubing bajado, hasta el BHA)', { step: 10, defaultM: 3000 }),
    weight('bhaWeight', 'Peso del BHA (al aire)', { step: 10, default: 500 }),
    density('fluidDensity', 'Densidad del fluido (adentro y afuera de la tubería)', { step: 0.01, default: 8.33 }),
    pressure('reservoirPressure', 'Presión de reservorio (BHP)', { step: 10, default: 3000 }),
    {
      type: 'select',
      id: 'method',
      label: 'Extremo de la sarta',
      options: [
        { value: 'closed', label: 'Cerrado (BHA sólido / obturador) — usa OD completo' },
        { value: 'open', label: 'Abierto (circulación) — usa área neta OD²−ID²' },
      ],
      default: 'closed',
    },
  ],
  compute(v) {
    if (!v.od || !v.length) throw new Error('Elegí el tubing y la profundidad.')
    const id = v.id
    if (!id) throw new Error('Ingresá el ID del tubing (o elegí un tamaño de la lista).')
    if (id >= v.od) throw new Error('El ID debe ser menor que el OD.')
    const wtAir = v.wt || steelWeightPerFt(v.od, id)
    const bf = buoyancyFactor(v.fluidDensity || 8.33)
    const wtBuoyed = wtAir * bf
    const bhaAir = v.bhaWeight || 0
    const bhaBuoyed = bhaAir * bf

    const pipeWeightAir = wtAir * v.length
    const pipeWeightBuoyed = wtBuoyed * v.length
    const totalAir = pipeWeightAir + bhaAir
    const totalBuoyed = pipeWeightBuoyed + bhaBuoyed

    const reservoirP = v.reservoirPressure || 0
    const fBottom = v.method === 'open' ? reservoirP * crossSectionalArea(v.od, id) : snubbingForce(reservoirP, v.od)

    const xNeutral = wtBuoyed > 0 ? (fBottom - bhaBuoyed) / wtBuoyed : Infinity
    let regime
    let neutralDepth = null
    if (xNeutral <= 0) {
      regime = 'heavy'
    } else if (xNeutral >= v.length) {
      regime = 'light'
    } else {
      regime = 'neutral'
      neutralDepth = v.length - xNeutral
    }

    const results = [
      weightResult('Peso de tubería al aire (total)', pipeWeightAir, { digits: 0 }),
      weightResult('Peso de tubería flotada (en el fluido)', pipeWeightBuoyed, { digits: 0 }),
      weightResult('Peso del BHA al aire', bhaAir, { digits: 0 }),
      weightResult('Peso del BHA flotado (en el fluido)', bhaBuoyed, { digits: 0 }),
      weightResult('Peso total al aire (tubería + BHA)', totalAir, { digits: 0 }),
      weightResult('Peso total flotado (tubería + BHA)', totalBuoyed, { digits: 0 }),
      { label: 'Factor de flotabilidad usado', value: bf, unit: '', digits: 4 },
      weightResult('Fuerza de empuje en el fondo (presión de reservorio)', fBottom, { digits: 0 }),
    ]
    if (regime === 'heavy') {
      results.push({ label: 'Condición de la sarta', value: 'Pesada — tensión en toda su longitud (entra por gravedad, sin snubbing)' })
    } else if (regime === 'light') {
      results.push({ label: 'Condición de la sarta', value: 'Liviana — compresión en toda su longitud (necesita snubbing en toda la corrida)' })
    } else {
      results.push(
        depthResult('Punto neutro (profundidad desde superficie)', neutralDepth, { digits: 0 }),
        { label: 'Condición de la sarta', value: 'Neutra — tensión arriba del punto neutro, compresión (riesgo de pandeo) debajo' }
      )
    }
    return {
      results,
      diagramHtml: wellboreNeutralPointDiagram({ totalDepthFt: v.length, neutralDepthFt: neutralDepth, regime }),
      notes: [
        'Punto neutro: profundidad donde la fuerza axial pasa de tensión (arriba) a compresión (abajo). Por debajo de ese punto la sarta trabaja en compresión y puede pandear.',
        'La fuerza de empuje en el fondo usa la presión de reservorio como aproximación de la presión de fondo actuando contra el extremo de la sarta — para un cálculo más preciso usá la presión de fondo real (BHP) si la conocés en lugar de la de reservorio estático.',
      ],
    }
  },
}
