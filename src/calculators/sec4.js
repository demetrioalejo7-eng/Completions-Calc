import {
  burstPressure,
  collapsePressureElastic,
  collapsePressureYield,
  pipeBodyYieldStrength,
  crossSectionalArea,
} from '../calc/strength.js'
import { ALL_PIPES } from '../data/pipes.js'
import { PIPE_GRADES } from '../data/strengths.js'

export const section4 = {
  id: 'strength',
  title: 'Dimensiones y Resistencias',
  icon: '📐',
  summary: 'Estimación de presión de estallido, colapso y resistencia a la tensión por grado de acero.',
  formulaNote:
    'Estallido (Barlow, API): Pi = 0.875·2·Y·t/OD. Colapso elástico (API 5C3, aprox.): Pc = 46.95×10⁶ / [(OD/t)·(OD/t−1)²]. Son estimaciones de referencia — para diseño usá tablas API 5C3 certificadas.',
  calculators: [
    {
      id: 'pipe-strength',
      title: 'Estallido, Colapso y Tensión de Tubing/Casing',
      description: 'Elegí un tamaño y grado. El cálculo usa OD, ID y la resistencia de fluencia mínima del grado.',
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
            { label: 'Presión interna de estallido (Barlow)', value: burst, unit: 'psi', digits: 0 },
            { label: 'Colapso — estimación elástica', value: collapseElastic, unit: 'psi', digits: 0 },
            { label: 'Colapso — límite de fluencia (pared gruesa)', value: collapseYield, unit: 'psi', digits: 0 },
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
