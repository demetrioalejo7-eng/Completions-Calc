import { ctDimensions, reelCapacityFt, goosenecRadius, snubbingForce, CT_OD_SIZES } from '../calc/coiledTubing.js'
import { externalDisplacementFactors, capacityFactors, totalsFromFactors, steelWeightPerFt } from '../calc/geometry.js'
import { crossSectionalArea } from '../calc/strength.js'
import { buoyancyFactor } from '../calc/generalCalc.js'
import { CT_GRADES, CT_DIMENSIONS, ctRowForGrade, CT_MANUFACTURERS } from '../data/ctStrength.js'
import { ALL_PIPES } from '../data/pipes.js'
import { density, lengthFt, lengthFtResult, lengthIn, lengthInResult, pressure, pressureResult, weight, weightPerLengthResult, weightResult } from '../ui/fieldHelpers.js'
import { wellboreNeutralPointDiagram } from '../ui/diagrams.js'

const STRING_PIPES = ALL_PIPES.filter((r) => r.kind === 'Tubing' || r.kind === 'Coiled Tbg')

function ctSizeLabel(row) {
  return `${row.od}" OD x ${row.wall}" pared (ID ${row.id}", ${row.weight} lb/ft)`
}

function ctOdLabel(row) {
  return `${row.label}" OD`
}

export const section12 = {
  id: 'coiled-tubing',
  title: 'Coiled Tubing',
  summary: 'Dimensiones, desplazamiento, capacidad de carrete, gooseneck, fuerza de snubbing y punto neutro.',
  formulaNote:
    'ID = OD − 2·espesor. Peso = 2.673·(OD²−ID²). Capacidad de carrete = (π/4)·(OD_efectivo²−Core²)·Ancho / (OD_CT²·12). Gooseneck: R=(C²+4h²)/(8h). Snubbing: F=WHTP·π/4·OD². Punto neutro: x = (F_fondo − Peso_BHA_flotado) / Peso_flotado_por_pie, medido desde el fondo.',
  calculators: [
    {
      id: 'ct-dimensions',
      title: 'Dimensiones de Coiled Tubing',
      diagram: { kind: 'wallThickness', labels: { od: 'OD', id: 'ID', t: 't' } },
      inputs: [
        {
          type: 'sizePreset',
          id: 'ctSize',
          label: 'Tamaño estándar (OD x espesor)',
          dataset: CT_DIMENSIONS,
          labelFn: ctSizeLabel,
          fields: [
            { target: 'od', source: 'od' },
            { target: 'wall', source: 'wall' },
          ],
        },
        lengthIn('od', 'OD', { step: 0.001, default: 1.75 }),
        lengthIn('wall', 'Espesor de pared', { step: 0.001, default: 0.109 }),
      ],
      compute(v) {
        if (!v.od || !v.wall) throw new Error('Completá OD y espesor de pared.')
        const out = ctDimensions(v.od, v.wall)
        return {
          results: [
            lengthInResult('ID calculado', out.id, { digits: 3 }),
            weightPerLengthResult('Peso calculado', out.weightPerFt, { digits: 3 }),
            { label: 'Área de tubing (acero)', value: out.tubingArea, category: 'Área', canonicalUnit: 'Pulgadas² (in²)', unit: 'in²', digits: 4 },
            { label: 'Área de flujo', value: out.flowArea, category: 'Área', canonicalUnit: 'Pulgadas² (in²)', unit: 'in²', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'ct-displacement',
      title: 'Desplazamiento de Coiled Tubing',
      diagram: { kind: 'wallThickness', labels: { od: 'OD', id: 'ID', t: 't' } },
      inputs: [
        {
          type: 'sizePreset',
          id: 'ctSize',
          label: 'Tamaño estándar (OD x espesor)',
          dataset: CT_DIMENSIONS,
          labelFn: ctSizeLabel,
          fields: [
            { target: 'od', source: 'od' },
            { target: 'wall', source: 'wall' },
          ],
        },
        lengthIn('od', 'OD', { step: 0.001, default: 1.75 }),
        lengthIn('wall', 'Espesor de pared', { step: 0.001, default: 0.109 }),
      ],
      compute(v) {
        if (!v.od || !v.wall) throw new Error('Completá OD y espesor de pared.')
        const out = ctDimensions(v.od, v.wall)
        const cap = capacityFactors(out.id)
        const ext = externalDisplacementFactors(v.od)
        return {
          results: [
            lengthInResult('ID calculado', out.id, { digits: 3 }),
            weightPerLengthResult('Peso calculado', out.weightPerFt, { digits: 3 }),
            { label: 'Capacidad interior', value: cap.bblPerFt, category: 'Capacidad lineal', canonicalUnit: 'Barriles/pie (bbl/ft)', unit: 'bbl/ft', digits: 5 },
            { label: 'Fill-Up interior', value: cap.ftPerBbl, unit: 'ft/bbl', digits: 1 },
            { label: 'Desplazamiento externo (OD completo)', value: ext.bblPerFt, category: 'Capacidad lineal', canonicalUnit: 'Barriles/pie (bbl/ft)', unit: 'bbl/ft', digits: 5 },
          ],
        }
      },
    },
    {
      id: 'reel-length',
      title: 'Longitud de Carrete',
      description: 'Longitud de CT que entra en un carrete según su geometría.',
      diagram: { kind: 'reelSide', labels: { spool: 'OD carrete', core: 'Core', width: 'Ancho' } },
      inputs: [
        lengthIn('spoolOD', 'OD del carrete (bridas)', { step: 0.1, default: 90 }),
        lengthIn('coreDia', 'Diámetro del núcleo (core)', { step: 0.1, default: 48 }),
        lengthIn('width', 'Ancho interior útil', { step: 0.1, default: 48 }),
        {
          type: 'sizePreset',
          id: 'ctSize',
          label: 'OD estándar de coiled tubing',
          dataset: CT_OD_SIZES,
          labelFn: ctOdLabel,
          fields: [{ target: 'ctOD', source: 'od' }],
        },
        lengthIn('ctOD', 'OD del coiled tubing', { step: 0.001, default: 1 }),
        lengthIn('freeboard', 'Freeboard (holgura de brida)', { step: 0.1, default: 2 }),
      ],
      compute(v) {
        if (!v.spoolOD || !v.coreDia || !v.width || !v.ctOD) throw new Error('Completá todos los campos.')
        const length = reelCapacityFt(v.spoolOD, v.coreDia, v.width, v.ctOD, v.freeboard || 0)
        return { results: [lengthFtResult('Longitud de CT en el carrete', length, { digits: 0 })] }
      },
    },
    {
      id: 'reel-weight',
      title: 'Peso de Carrete Cargado',
      description: 'Peso total estimado del carrete con el coiled tubing enrollado.',
      diagram: { kind: 'reelSide', labels: { spool: 'OD carrete', core: 'Core', width: 'Ancho' } },
      inputs: [
        lengthIn('spoolOD', 'OD del carrete (bridas)', { step: 0.1, default: 90 }),
        lengthIn('coreDia', 'Diámetro del núcleo (core)', { step: 0.1, default: 48 }),
        lengthIn('width', 'Ancho interior útil', { step: 0.1, default: 48 }),
        {
          type: 'sizePreset',
          id: 'ctSize',
          label: 'Tamaño estándar de coiled tubing (OD x espesor)',
          dataset: CT_DIMENSIONS,
          labelFn: ctSizeLabel,
          fields: [
            { target: 'ctOD', source: 'od' },
            { target: 'ctWall', source: 'wall' },
          ],
        },
        lengthIn('ctOD', 'OD del coiled tubing', { step: 0.001, default: 1.75 }),
        lengthIn('ctWall', 'Espesor de pared del CT', { step: 0.001, default: 0.109 }),
        lengthIn('freeboard', 'Freeboard', { step: 0.1, default: 2 }),
        weight('emptyWeight', 'Peso del carrete vacío', { step: 10, default: 0 }),
      ],
      compute(v) {
        if (!v.spoolOD || !v.coreDia || !v.width || !v.ctOD || !v.ctWall) throw new Error('Completá todos los campos.')
        const length = reelCapacityFt(v.spoolOD, v.coreDia, v.width, v.ctOD, v.freeboard || 0)
        const dims = ctDimensions(v.ctOD, v.ctWall)
        const ctWeight = length * dims.weightPerFt
        return {
          results: [
            lengthFtResult('Longitud de CT', length, { digits: 0 }),
            weightResult('Peso del CT enrollado', ctWeight, { digits: 0 }),
            weightResult('Peso total (con carrete)', ctWeight + (v.emptyWeight || 0), { digits: 0 }),
          ],
        }
      },
    },
    {
      id: 'gooseneck-radius',
      title: 'Radio de Gooseneck',
      diagram: { kind: 'goosenecArc', labels: { c: 'C', h: 'h', r: 'R' } },
      inputs: [
        lengthIn('arcWidth', 'Ancho del arco, C', { step: 0.1, default: 114 }),
        lengthIn('arcHeight', 'Altura del arco, h', { step: 0.1, default: 50 }),
      ],
      compute(v) {
        if (!v.arcWidth || !v.arcHeight) throw new Error('Completá ancho y altura del arco.')
        return { results: [lengthInResult('Radio, R', goosenecRadius(v.arcWidth, v.arcHeight), { digits: 2 })] }
      },
    },
    {
      id: 'snubbing-force',
      title: 'Fuerza de Snubbing',
      diagram: { kind: 'pipeCrossSection', labels: { od: 'OD', id: null } },
      inputs: [
        pressure('whtp', 'Presión en cabeza de pozo (WHTP)', { step: 10, default: 8000 }),
        {
          type: 'sizePreset',
          id: 'ctSize',
          label: 'OD estándar de coiled tubing',
          dataset: CT_OD_SIZES,
          labelFn: ctOdLabel,
          fields: [{ target: 'od', source: 'od' }],
        },
        lengthIn('od', 'OD del coiled tubing', { step: 0.001, default: 2.375 }),
      ],
      compute(v) {
        if (!v.whtp || !v.od) throw new Error('Completá presión y OD.')
        return { results: [{ label: 'Fuerza de snubbing', value: snubbingForce(v.whtp, v.od), category: 'Peso / Masa', canonicalUnit: 'Libras (lb)', unit: 'lbf', digits: 1 }] }
      },
    },
    {
      id: 'ct-strength-table',
      title: 'Resistencia de Coiled Tubing — Tabla de Fabricante',
      description:
        'Tamaños y grados según hoja de datos publicada por el fabricante seleccionado (FET Global DuraCoil o Tenaris BlueCoil).',
      diagram: { kind: 'wallThickness', labels: { od: 'OD', id: 'ID', t: 't' } },
      inputs: [
        {
          type: 'select',
          id: 'manufacturer',
          label: 'Fabricante',
          options: CT_MANUFACTURERS.map((m) => ({ value: m.id, label: m.label })),
          default: 'fet',
          rerenderForm: true,
        },
        (values) => {
          const mfr = CT_MANUFACTURERS.find((m) => m.id === values.manufacturer) || CT_MANUFACTURERS[0]
          return {
            type: 'select',
            id: 'row',
            label: 'Tamaño (OD x espesor)',
            options: mfr.sizeRows.map((r, i) => ({ value: String(i), label: ctSizeLabel(r) })),
            default: '0',
          }
        },
        (values) => {
          const mfr = CT_MANUFACTURERS.find((m) => m.id === values.manufacturer) || CT_MANUFACTURERS[0]
          return {
            type: 'select',
            id: 'grade',
            label: 'Grado',
            options: mfr.grades.map((g) => ({ value: g.id, label: g.label })),
            default: mfr.grades[0].id,
            rerenderForm: true,
          }
        },
      ],
      compute(v) {
        const mfr = CT_MANUFACTURERS.find((m) => m.id === v.manufacturer) || CT_MANUFACTURERS[0]
        const grade = mfr.grades.find((g) => g.id === v.grade) || mfr.grades[0]
        const r = grade.rows[Number(v.row ?? 0)] || grade.rows[0]
        const results = [
          lengthInResult('OD', r.od, { digits: 3 }),
          lengthInResult('Espesor de pared', r.wall, { digits: 3 }),
          lengthInResult('ID', r.id, { digits: 3 }),
          weightPerLengthResult('Peso nominal', r.weight, { digits: 2 }),
          weightResult('Carga de fluencia axial (Yield Load)', r.yieldLoad, { digits: 0 }),
          weightResult('Carga de rotura (Tensile Load)', r.tensileLoad, { digits: 0 }),
          pressureResult('Presión de fluencia interna (Yield Pressure)', r.yieldPressure, { digits: 0 }),
        ]
        if (r.hydrotestPressure !== undefined) {
          results.push(pressureResult('Presión de prueba (Hydrotest, 90% Yp)', r.hydrotestPressure, { digits: 0 }))
        } else {
          results.push({ label: 'Presión de prueba (Hydrotest)', value: 'No publicado por el fabricante', unit: '', digits: 0, isText: true })
        }
        results.push(
          { label: 'Resistencia torsional — fluencia', value: r.torsionalYield, category: 'Torque', canonicalUnit: 'Pie-libra (ft-lb)', unit: 'ft-lb', digits: 0 },
          { label: 'Resistencia torsional — última', value: r.torsionalUltimate, category: 'Torque', canonicalUnit: 'Pie-libra (ft-lb)', unit: 'ft-lb', digits: 0 },
          { label: 'Desplazamiento externo', value: r.extBbl, category: 'Capacidad lineal', canonicalUnit: 'Barriles/1000 pies (bbl/1000ft)', unit: 'bbl/1000ft', digits: 2 },
          { label: 'Capacidad interna', value: r.intBbl, category: 'Capacidad lineal', canonicalUnit: 'Barriles/1000 pies (bbl/1000ft)', unit: 'bbl/1000ft', digits: 2 }
        )
        return { results }
      },
    },
    {
      id: 'string-weight-neutral-point',
      title: 'Peso de Sarta y Punto Neutro (CT / Tubing)',
      description:
        'Peso de la tubería (CT o tubing) al aire y flotada en un fluido, sumando el peso del BHA, y punto neutro (tensión/compresión) según la presión de reservorio. El BHA se flota con el mismo factor que el acero (se asume densidad similar al acero).',
      inputs: [
        {
          type: 'pipePreset',
          id: 'pipe',
          label: 'Tubería (CT o Tubing)',
          dataset: STRING_PIPES,
          odField: 'od',
          idField: 'id',
          wtField: 'wt',
        },
        lengthFt('length', 'Profundidad en el pozo (= longitud de tubería desplegada, hasta el BHA)', { step: 10, default: 10000 }),
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
        if (!v.od || !v.length) throw new Error('Elegí la tubería y la profundidad.')
        const id = v.id
        if (!id) throw new Error('Ingresá el ID de la tubería (o elegí un tamaño de la lista).')
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
            lengthFtResult('Punto neutro (profundidad desde superficie)', neutralDepth, { digits: 0 }),
            { label: 'Condición de la sarta', value: 'Neutra — tensión arriba del punto neutro, compresión (riesgo de pandeo) debajo' }
          )
        }
        return {
          results,
          diagramHtml: wellboreNeutralPointDiagram({ totalDepthFt: v.length, neutralDepthFt: neutralDepth, regime }),
          notes: [
            'Punto neutro: profundidad donde la fuerza axial pasa de tensión (arriba) a compresión (abajo). Por debajo de ese punto la sarta puede pandear si es coiled tubing.',
            'La fuerza de empuje en el fondo usa la presión de reservorio como aproximación de la presión de fondo actuando contra el extremo de la sarta — para un cálculo más preciso usá la presión de fondo real (BHP) si la conocés en lugar de la de reservorio estático.',
          ],
        }
      },
    },
  ],
}
