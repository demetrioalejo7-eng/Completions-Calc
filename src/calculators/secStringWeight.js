import { steelWeightPerFt } from '../calc/geometry.js'
import { buoyancyFactor } from '../calc/generalCalc.js'
import { ALL_PIPES } from '../data/pipes.js'
import { density, depth, depthResult, pressure, pressureResult, weight, weightResult } from '../ui/fieldHelpers.js'
import { wellboreNeutralPointDiagram } from '../ui/diagrams.js'

const TUBING = ALL_PIPES.filter((r) => r.kind === 'Tubing')
const PSI_PER_FT_PER_PPG = 0.052

export const stringWeightCalculator = {
  id: 'string-weight-neutral-point',
  title: 'Tubería Pesada o Liviana y Punto Neutro (Tubing)',
  description:
    'Bajando tubing con el packer fijado y la formación aislada (p. ej. disco de ruptura): si el packer pierde y la formación se comunica con el pozo cerrado, ¿la sarta queda pesada (si la soltás cae) o el pozo la expulsa? La presión que llega a superficie es la de reservorio menos toda la columna hidrostática, y empuja la tubería con el área en el BOP.',
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
    depth('length', 'Tubing bajado (profundidad del extremo)', { step: 10, defaultM: 2400 }),
    weight('bhaWeight', 'Peso del BHA / accesorios (al aire)', { step: 10, default: 0 }),
    depth('packerDepth', 'Profundidad del packer', { step: 10, defaultM: 2500 }),
    depth('reservoirDepth', 'Profundidad del reservorio (TVD)', { step: 10, defaultM: 3000 }),
    pressure('reservoirPressure', 'Presión de reservorio', { step: 10, default: 9000 }),
    density('densityAbove', 'Fluido por encima del packer (donde está el tubing)', { step: 0.01, default: 8.33 }),
    density('densityBelow', 'Fluido entre el packer y el reservorio', { step: 0.01, default: 8.33 }),
    {
      type: 'select',
      id: 'method',
      label: 'Extremo del tubing',
      options: [
        { value: 'closed', label: 'Cerrado (TIW / válvula / tapón) — empuja sobre el OD completo' },
        { value: 'open', label: 'Abierto — empuja solo sobre el área de acero' },
      ],
      default: 'closed',
    },
  ],
  compute(v) {
    if (!v.od || !v.length) throw new Error('Elegí el tubing y cuánto hay bajado.')
    const id = v.id
    if (!id) throw new Error('Ingresá el ID del tubing (o elegí un tamaño de la lista).')
    if (id >= v.od) throw new Error('El ID debe ser menor que el OD.')
    if (!v.packerDepth || !v.reservoirDepth || v.reservoirPressure == null) {
      throw new Error('Completá profundidad del packer, del reservorio y la presión de reservorio.')
    }
    if (v.packerDepth > v.reservoirDepth) throw new Error('El packer tiene que estar por encima del reservorio.')
    if (v.length > v.packerDepth) throw new Error('El extremo del tubing tiene que estar por encima del packer.')

    const rhoAbove = v.densityAbove || 8.33
    const rhoBelow = v.densityBelow || 8.33
    const pBelowPacker = v.reservoirPressure - PSI_PER_FT_PER_PPG * rhoBelow * (v.reservoirDepth - v.packerDepth)
    const hydroAbove = PSI_PER_FT_PER_PPG * rhoAbove * v.packerDepth
    const whp = pBelowPacker - hydroAbove

    const closedArea = (Math.PI / 4) * v.od * v.od
    const steelArea = (Math.PI / 4) * (v.od * v.od - id * id)
    const area = v.method === 'open' ? steelArea : closedArea
    const fUp = Math.max(0, whp) * area

    const bf = buoyancyFactor(rhoAbove)
    const wtAir = v.wt || steelWeightPerFt(v.od, id)
    const wtBuoyed = wtAir * bf
    const bhaBuoyed = (v.bhaWeight || 0) * bf
    const stringBuoyed = wtBuoyed * v.length + bhaBuoyed
    const net = stringBuoyed - fUp

    // Tubing length below which the string is pushed out (light), and the
    // neutral point measured up from the bottom of the string.
    const balanceLen = wtBuoyed > 0 ? Math.max(0, (fUp - bhaBuoyed) / wtBuoyed) : Infinity
    let regime
    let neutralDepth = null
    if (fUp <= bhaBuoyed) regime = 'heavy'
    else if (net <= 0) regime = 'light'
    else {
      regime = 'neutral'
      neutralDepth = v.length - balanceLen
    }

    const worstUp = v.reservoirPressure * area
    const worstBalance = wtBuoyed > 0 ? Math.max(0, (worstUp - bhaBuoyed) / wtBuoyed) : Infinity

    const results = [
      pressureResult('Presión debajo del packer (reservorio − hidrostática hasta el packer)', pBelowPacker, { digits: 0 }),
      pressureResult('Hidrostática por encima del packer', hydroAbove, { digits: 0 }),
      pressureResult('Presión en boca de pozo si se comunica (pozo cerrado)', Math.max(0, whp), { digits: 0 }),
      weightResult(`Empuje hacia arriba (${v.method === 'open' ? 'área de acero' : 'OD completo'})`, fUp, { digits: 0 }),
      weightResult('Peso flotado de la sarta bajada (tubing + BHA)', stringBuoyed, { digits: 0 }),
      weightResult('Peso neto con la formación comunicada (indicador)', net, { digits: 0 }),
    ]
    if (regime === 'light') {
      results.push({ label: 'Condición', value: 'LIVIANA' })
    } else {
      results.push({ label: 'Condición', value: 'PESADA' })
    }
    results.push(depthResult('Tubing mínimo bajado para que quede pesada (punto de balance)', balanceLen, { digits: 0 }))
    if (regime === 'neutral') {
      results.push(depthResult('Punto neutro (desde superficie)', neutralDepth, { digits: 0 }))
    }
    results.push(
      weightResult('Peor caso: empuje sin columna hidrostática (pozo lleno de gas)', worstUp, { digits: 0 }),
      depthResult('Peor caso: tubing mínimo para quedar pesada', worstBalance, { digits: 0 })
    )

    const notes = [
      'Presión en boca de pozo = presión de reservorio − hidrostática entre packer y reservorio − hidrostática por encima del packer. Esa presión, actuando sobre el área de la tubería en el BOP, es la que la empuja hacia arriba; la hidrostática ya está contemplada en el peso flotado.',
      'Si la tubería es más corta que el punto de balance, el pozo la expulsa; si es más larga, queda pesada. Se asume pozo cerrado (BOP cerrado) y tubing cerrado arriba (TIW), que es el caso más desfavorable.',
      'Si entra gas de formación y migra, la columna hidrostática se aliviana y la presión en superficie sube hacia la de reservorio: por eso se muestra el peor caso sin hidrostática.',
    ]
    if (worstBalance > v.packerDepth) {
      notes.unshift('Atención: en el peor caso (gas, sin hidrostática) el punto de balance queda por debajo del packer, así que por encima del packer la sarta nunca llegaría a quedar pesada.')
    }
    if (whp <= 0) {
      notes.unshift('La hidrostática supera la presión de formación: si se comunica, no llega presión a superficie (el pozo admite fluido) y la sarta no es empujada.')
    }

    return {
      results,
      diagramHtml: wellboreNeutralPointDiagram({
        totalDepthFt: v.length,
        neutralDepthFt: neutralDepth,
        regime,
        packerFt: v.packerDepth,
        reservoirFt: v.reservoirDepth,
        balanceFt: balanceLen,
      }),
      notes,
    }
  },
}
