import { CONTINGENCIES } from '../data/contingencies.js'
import { CONTINGENCIES_CT } from '../data/contingenciesCT.js'
import { mountContingencyWizard } from '../ui/flowchart.js'

function toCalculators(list, groupId) {
  return list.map((c) => ({
    id: c.id,
    title: `${c.order} — ${c.title}`,
    custom: true,
    mount: (container) => mountContingencyWizard(container, c, groupId),
  }))
}

const fractura = {
  id: 'fractura',
  title: 'Fractura',
  summary: 'Contingencias de Plug & Perf y tratamiento de fractura.',
  calculators: toCalculators(CONTINGENCIES, 'fractura'),
}

const coiledTubing = {
  id: 'coiled-tubing',
  title: 'Coiled Tubing',
  summary: 'Contingencias de limpieza y aprisionamiento con coiled tubing.',
  calculators: toCalculators(CONTINGENCIES_CT, 'coiled-tubing'),
}

export const section14 = {
  id: 'contingencias',
  title: 'Contingencias',
  summary: 'Diagramas de contingencia interactivos, organizados por Fractura y Coiled Tubing.',
  formulaNote:
    'Guía interactiva basada en los diagramas de flujo oficiales. Ante cualquier duda, consultá con ingeniería.',
  groups: [fractura, coiledTubing],
  calculators: [...fractura.calculators, ...coiledTubing.calculators],
}
