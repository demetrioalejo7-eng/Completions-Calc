import { slurryProperties, sandFillUp } from '../calc/proppantCalc.js'
import { annulusFactors, capacityFactors } from '../calc/geometry.js'
import { PROPPANT_TRUE_DENSITY, SAND_BULK_DENSITY_PPG } from '../data/proppant.js'
import { ALL_PIPES } from '../data/pipes.js'
import { densityResult, lengthIn, weightPerLengthResult } from '../ui/fieldHelpers.js'

export const section7 = {
  id: 'proppant',
  title: 'Proppant / Arena',
  summary: 'Propiedades de slurry de fractura y cálculo de fill-up de arena.',
  formulaNote:
    'Slurry/fluido (gal/gal) = 1 + C/ρp, con C = concentración (lb prop/gal fluido) y ρp = densidad verdadera del proppant (lb/gal). #arena/ft = densidad aparente (lb/gal) × gal/ft.',
  calculators: [
    {
      id: 'slurry-properties',
      title: 'Propiedades del Slurry (Fluido + Proppant)',
      description: 'A partir de la concentración de proppant (PPA) y su densidad verdadera.',
      inputs: [
        { type: 'number', id: 'conc', label: 'Concentración (PPA)', unit: 'lb prop/gal fluido', step: 0.1, default: 2.0 },
        {
          type: 'select',
          id: 'densityPreset',
          label: 'Proppant',
          options: PROPPANT_TRUE_DENSITY.map((p) => ({ value: p.id, label: `${p.label} — ${p.ppg} lb/gal` })),
          default: 'sand',
        },
      ],
      compute(v) {
        const preset = PROPPANT_TRUE_DENSITY.find((p) => p.id === v.densityPreset)
        const out = slurryProperties(Number(v.conc), preset.ppg)
        return {
          results: [
            { label: 'Gal slurry / gal fluido limpio', value: out.slurryGalPerFluidGal, unit: '', digits: 4 },
            { label: 'Fracción de fluido', value: out.fluidFraction * 100, unit: '%', digits: 2 },
            { label: 'Fracción de proppant', value: out.proppantFraction * 100, unit: '%', digits: 2 },
            densityResult('Proppant por galón de slurry', out.proppantLbPerGalSlurry, { digits: 3 }),
            { label: 'Proppant por barril de slurry', value: out.proppantLbPerBblSlurry, unit: 'lb/bbl', digits: 1 },
          ],
        }
      },
    },
    {
      id: 'sand-fillup-hole',
      title: 'Fill-Up de Arena en Pozo (Hole)',
      description: 'Cantidad de arena (20-40 mesh) para llenar un tramo de pozo vacío o el anular pozo-tubería.',
      diagram: { kind: 'annulusCrossSection', labels: { outer: 'D', inner: 'd (0 = pozo vacío)' } },
      inputs: [
        lengthIn('holeD', 'Diámetro de pozo', { step: 0.001, default: 8.5 }),
        {
          type: 'pipePreset',
          id: 'pipe',
          label: 'Tubería dentro del pozo (opcional, 0 = pozo vacío)',
          dataset: ALL_PIPES,
          odField: 'pipeOd',
          idField: 'pipeId',
        },
        { type: 'number', id: 'bulkDensity', label: 'Densidad aparente de la arena', unit: 'lb/gal', step: 0.1, default: SAND_BULK_DENSITY_PPG },
      ],
      compute(v) {
        if (!v.holeD) throw new Error('Ingresá el diámetro de pozo.')
        const f = v.pipeOd && v.pipeOd > 0 ? annulusFactors(v.holeD, v.pipeOd) : capacityFactors(v.holeD)
        const out = sandFillUp(f.galPerFt, v.bulkDensity || SAND_BULK_DENSITY_PPG)
        return {
          results: [
            weightPerLengthResult('# Arena / pie lineal', out.lbPerLinFt, { digits: 3 }),
            { label: 'Pie lineal / # arena', value: out.linFtPerLb, unit: 'ft/lb', digits: 4 },
          ],
        }
      },
    },
  ],
}
