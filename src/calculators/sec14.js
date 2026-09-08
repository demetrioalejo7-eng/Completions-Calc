import { CONTINGENCIES } from '../data/contingencies.js'
import { mountContingencyWizard } from '../ui/flowchart.js'

export const section14 = {
  id: 'contingencias',
  title: 'Contingencias P&P / Fractura',
  summary: 'Diagramas de contingencia interactivos de Pluspetrol para operaciones de Plug & Perf y fractura (Rev 14).',
  formulaNote:
    'Guía interactiva basada en los diagramas de flujo oficiales. Ante cualquier duda, verificá contra el diagrama original (disponible en cada paso) y consultá con ingeniería.',
  calculators: CONTINGENCIES.map((c) => ({
    id: c.id,
    title: `${c.order} — ${c.title}`,
    description: c.rev,
    custom: true,
    mount: (container) => mountContingencyWizard(container, c),
  })),
}
