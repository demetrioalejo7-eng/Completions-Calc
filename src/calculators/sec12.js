import { ctDimensions, reelCapacityFt, goosenecRadius, snubbingForce } from '../calc/coiledTubing.js'
import { externalDisplacementFactors, capacityFactors, totalsFromFactors } from '../calc/geometry.js'
import { CT_GRADES, CT_DIMENSIONS, ctRowForGrade } from '../data/ctStrength.js'
import { lengthFtResult, lengthIn, lengthInResult, pressure, pressureResult, weight, weightPerLengthResult, weightResult } from '../ui/fieldHelpers.js'

function ctSizeLabel(row) {
  return `${row.od}" OD x ${row.wall}" pared (ID ${row.id}", ${row.weight} lb/ft)`
}

export const section12 = {
  id: 'coiled-tubing',
  title: 'Coiled Tubing',
  icon: '🌀',
  summary: 'Dimensiones, desplazamiento, capacidad de carrete, gooseneck y fuerza de snubbing.',
  formulaNote:
    'ID = OD − 2·espesor. Peso = 2.673·(OD²−ID²). Capacidad de carrete = (π/4)·(OD_efectivo²−Core²)·Ancho / (OD_CT²·12). Gooseneck: R=(C²+4h²)/(8h). Snubbing: F=WHTP·π/4·OD².',
  calculators: [
    {
      id: 'ct-dimensions',
      title: 'Dimensiones de Coiled Tubing',
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
            { label: 'Área de tubing (acero)', value: out.tubingArea, unit: 'in²', digits: 4 },
            { label: 'Área de flujo', value: out.flowArea, unit: 'in²', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'ct-displacement',
      title: 'Desplazamiento de Coiled Tubing',
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
            { label: 'Capacidad interior', value: cap.bblPerFt, unit: 'bbl/ft', digits: 5 },
            { label: 'Fill-Up interior', value: cap.ftPerBbl, unit: 'ft/bbl', digits: 1 },
            { label: 'Desplazamiento externo (OD completo)', value: ext.bblPerFt, unit: 'bbl/ft', digits: 5 },
          ],
        }
      },
    },
    {
      id: 'reel-length',
      title: 'Longitud de Carrete',
      description: 'Longitud de CT que entra en un carrete según su geometría.',
      inputs: [
        lengthIn('spoolOD', 'OD del carrete (bridas)', { step: 0.1, default: 90 }),
        lengthIn('coreDia', 'Diámetro del núcleo (core)', { step: 0.1, default: 48 }),
        lengthIn('width', 'Ancho interior útil', { step: 0.1, default: 48 }),
        {
          type: 'sizePreset',
          id: 'ctSize',
          label: 'OD estándar de coiled tubing',
          dataset: CT_DIMENSIONS,
          labelFn: ctSizeLabel,
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
      inputs: [
        pressure('whtp', 'Presión en cabeza de pozo (WHTP)', { step: 10, default: 8000 }),
        lengthIn('od', 'OD del coiled tubing', { step: 0.001, default: 2.375 }),
      ],
      compute(v) {
        if (!v.whtp || !v.od) throw new Error('Completá presión y OD.')
        return { results: [{ label: 'Fuerza de snubbing', value: snubbingForce(v.whtp, v.od), unit: 'lbf', digits: 1 }] }
      },
    },
    {
      id: 'ct-strength-table',
      title: 'Resistencia de Coiled Tubing — Tabla de Fabricante',
      description:
        'Tamaños y grados estándar (datasheet FET DuraCoil; físicamente equivalente a los grados Tenaris BlueCoil HT-95/110/125 usuales en la industria).',
      inputs: [
        {
          type: 'select',
          id: 'row',
          label: 'Tamaño (OD x espesor)',
          options: CT_DIMENSIONS.map((r, i) => ({ value: String(i), label: ctSizeLabel(r) })),
          default: '0',
        },
        {
          type: 'select',
          id: 'grade',
          label: 'Grado',
          options: CT_GRADES.map((g) => ({ value: g.id, label: g.label })),
          default: 'DC-95',
        },
      ],
      compute(v) {
        const row = CT_DIMENSIONS[Number(v.row ?? 0)]
        const grade = CT_GRADES.find((g) => g.id === v.grade) || CT_GRADES[0]
        const r = ctRowForGrade(row, grade)
        return {
          results: [
            lengthInResult('OD', r.od, { digits: 3 }),
            lengthInResult('Espesor de pared', r.wall, { digits: 3 }),
            lengthInResult('ID', r.id, { digits: 3 }),
            weightPerLengthResult('Peso nominal', r.weight, { digits: 2 }),
            weightResult('Carga de fluencia axial (Yield Load)', r.yieldLoad, { digits: 0 }),
            weightResult('Carga de rotura (Tensile Load)', r.tensileLoad, { digits: 0 }),
            pressureResult('Presión de fluencia interna (Yield Pressure)', r.yieldPressure, { digits: 0 }),
            pressureResult('Presión de prueba (Hydrotest, 90% Yp)', r.hydrotestPressure, { digits: 0 }),
            { label: 'Resistencia torsional — fluencia', value: r.torsionalYield, unit: 'ft-lb', digits: 0 },
            { label: 'Resistencia torsional — última', value: r.torsionalUltimate, unit: 'ft-lb', digits: 0 },
            { label: 'Desplazamiento externo', value: r.extBbl, unit: 'bbl/1000ft', digits: 2 },
            { label: 'Capacidad interna', value: r.intBbl, unit: 'bbl/1000ft', digits: 2 },
          ],
        }
      },
    },
  ],
}
