import {
  burstPressure,
  collapsePressureElastic,
  collapsePressureYield,
  pipeBodyYieldStrength,
  crossSectionalArea,
} from '../calc/strength.js'
import { ALL_PIPES } from '../data/pipes.js'
import { PIPE_GRADES } from '../data/strengths.js'
import { TUBING_STRENGTH, CASING_STRENGTH, DRILLPIPE_STRENGTH } from '../data/strengthTables.js'
import { lengthInResult, pressureResult, weightResult } from '../ui/fieldHelpers.js'

function rowLabel(r) {
  return `${r.odLabel}" OD — ${r.grade} — ${r.wt} lb/ft`
}

function tableCalculator(id, title, dataset) {
  return {
    id,
    title,
    description: 'Valores tabulados del handbook API por tamaño y grado (no son fórmulas estimadas).',
    inputs: [
      {
        type: 'select',
        id: 'row',
        label: 'Tamaño / Grado / Peso',
        options: dataset.map((r, i) => ({ value: String(i), label: rowLabel(r) })),
        default: '0',
      },
    ],
    compute(v) {
      const r = dataset[Number(v.row ?? 0)]
      const results = [
        lengthInResult('OD', r.od, { digits: 3 }),
        lengthInResult('ID', r.id, { digits: 3 }),
      ]
      if (r.drift) results.push(lengthInResult('Diámetro de drift', r.drift, { digits: 3 }))
      if (r.couplingOd) results.push(lengthInResult('OD de coupling', r.couplingOd, { digits: 3 }))
      results.push(
        pressureResult('Colapso', r.collapse, { digits: 0 }),
        pressureResult('Presión interna de fluencia (burst)', r.internalYield, { digits: 0 })
      )
      if (r.jointShort) results.push(weightResult('Resistencia de junta (rosca corta)', r.jointShort, { digits: 0 }))
      if (r.jointLong) results.push(weightResult('Resistencia de junta (rosca larga)', r.jointLong, { digits: 0 }))
      if (r.jointStrength) results.push(weightResult('Resistencia de junta', r.jointStrength, { digits: 0 }))
      return { results }
    },
  }
}

function drillPipeCalculator() {
  return {
    id: 'drillpipe-strength',
    title: 'Drill Pipe — Tabla API (grados D/E/G/S-135)',
    description: 'Valores tabulados del handbook por tamaño, para cada grado de acero de drill pipe.',
    inputs: [
      {
        type: 'select',
        id: 'row',
        label: 'Tamaño',
        options: DRILLPIPE_STRENGTH.map((r, i) => ({ value: String(i), label: `${r.odLabel}" OD — ${r.wt} lb/ft (ID ${r.id}")` })),
        default: '0',
      },
    ],
    compute(v) {
      const r = DRILLPIPE_STRENGTH[Number(v.row ?? 0)]
      const grades = ['D', 'E', 'G', 'S135']
      const results = [
        lengthInResult('OD', r.od, { digits: 3 }),
        lengthInResult('ID', r.id, { digits: 3 }),
        lengthInResult('ID en el upset', r.idUpset, { digits: 3 }),
      ]
      for (const g of grades) {
        if (r.collapse[g] != null) results.push({ label: `Colapso, Grado ${g}`, value: r.collapse[g], unit: 'psi', digits: 0 })
      }
      for (const g of grades) {
        if (r.internalYield[g] != null) results.push({ label: `Presión interna de fluencia, Grado ${g}`, value: r.internalYield[g], unit: 'psi', digits: 0 })
      }
      for (const g of grades) {
        if (r.tensile[g] != null) results.push({ label: `Resistencia a la tensión, Grado ${g}`, value: r.tensile[g], unit: 'lb', digits: 0 })
      }
      return { results }
    },
  }
}

export const section4 = {
  id: 'strength',
  title: 'Dimensiones y Resistencias',
  icon: '📐',
  summary: 'Tablas API de colapso, estallido y resistencia por tamaño/grado, y estimador para tamaños personalizados.',
  formulaNote:
    'Las calculadoras "Tabla API" usan valores tabulados reales del handbook. El "Estimador" usa Barlow (estallido) y la fórmula elástica API 5C3 (colapso) para tamaños que no están en la tabla.',
  calculators: [
    tableCalculator('tubing-strength', 'Tubing — Tabla API', TUBING_STRENGTH),
    tableCalculator('casing-strength', 'Casing — Tabla API', CASING_STRENGTH),
    drillPipeCalculator(),
    {
      id: 'pipe-strength-estimate',
      title: 'Estimador para Tamaño Personalizado',
      description:
        'Para tamaños que no están en la tabla API. Usa OD, ID y la resistencia de fluencia mínima del grado (fórmulas de Barlow / API 5C3 elástica).',
      inputs: [
        {
          type: 'pipePreset',
          id: 'pipe',
          label: 'Tamaño de tubería',
          dataset: ALL_PIPES,
          odField: 'od',
          idField: 'id',
        },
        {
          type: 'select',
          id: 'grade',
          label: 'Grado de acero',
          options: PIPE_GRADES.map((g) => ({ value: g.id, label: g.label })),
          default: 'J-55',
        },
      ],
      compute(v) {
        if (!v.od || !v.id) throw new Error('Completá OD e ID.')
        if (v.id >= v.od) throw new Error('El ID debe ser menor que el OD.')
        const grade = PIPE_GRADES.find((g) => g.id === v.grade) || PIPE_GRADES[1]
        const burst = burstPressure(v.od, v.id, grade.yieldPsi)
        const collapseElastic = collapsePressureElastic(v.od, v.id)
        const collapseYield = collapsePressureYield(v.od, v.id, grade.yieldPsi)
        const bodyYield = pipeBodyYieldStrength(v.od, v.id, grade.yieldPsi)
        const area = crossSectionalArea(v.od, v.id)
        return {
          results: [
            pressureResult('Presión interna de estallido (Barlow)', burst, { digits: 0 }),
            pressureResult('Colapso — estimación elástica', collapseElastic, { digits: 0 }),
            pressureResult('Colapso — límite de fluencia (pared gruesa)', collapseYield, { digits: 0 }),
            { label: 'Área de sección de acero', value: area, unit: 'in²', digits: 3 },
            { label: 'Resistencia a la tensión del cuerpo', value: bodyYield / 1000, unit: 'klb', digits: 1 },
          ],
          notes: [
            'El colapso real API 5C3 usa 4 regímenes (fluencia, plástico, transición, elástico); acá se muestran las dos cotas (fluencia y elástica) — el valor de diseño real está entre ambas. Usá esto solo como referencia de campo.',
          ],
        }
      },
    },
  ],
}
