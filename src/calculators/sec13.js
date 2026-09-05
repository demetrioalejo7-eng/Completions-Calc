import { proppantRatioFromVolumes, perforationFriction, hydraulicHorsepower, PROPPANT_MESH_PRESETS, GAL_PER_LB_WATER } from '../calc/fracturing.js'
import { stokesSettlingVelocityFtPerMin } from '../calc/generalCalc.js'
import { PROPPANT_TRUE_DENSITY } from '../data/proppant.js'

export const section13 = {
  id: 'fracturing',
  title: 'Fracturing',
  icon: '💥',
  summary: 'Relación slurry/proppant, fricción de perforaciones, potencia hidráulica y velocidad de asentamiento.',
  formulaNote:
    'Proppant Ratio (psa) = Proppant Total(lb) / (Vol. limpio(bbl)·42). Fricción de perforación: ΔP=0.2369·Q²·ρ/(N²·D⁴·Cd²). HHP = STP·BPM/40.8.',
  calculators: [
    {
      id: 'proppant-ratio',
      title: 'Relación de Proppant (Slurry / Limpio)',
      description: 'A partir del volumen de slurry y de fluido limpio, calcula la concentración de proppant y el total agregado.',
      inputs: [
        {
          type: 'select',
          id: 'sgPreset',
          label: 'Proppant',
          options: PROPPANT_TRUE_DENSITY.map((p) => ({ value: p.id, label: `${p.label} (SG ${p.sg})` })),
          default: 'sand',
        },
        { type: 'number', id: 'slurryVol', label: 'Volumen de slurry', unit: 'bbl', step: 0.1, default: 15 },
        { type: 'number', id: 'cleanVol', label: 'Volumen de fluido limpio', unit: 'bbl', step: 0.1, default: 10 },
      ],
      compute(v) {
        if (!v.slurryVol || !v.cleanVol) throw new Error('Completá ambos volúmenes.')
        const preset = PROPPANT_TRUE_DENSITY.find((p) => p.id === v.sgPreset) || PROPPANT_TRUE_DENSITY[0]
        const out = proppantRatioFromVolumes(v.slurryVol, v.cleanVol, preset.sg)
        return {
          results: [
            { label: 'Volumen de proppant', value: out.proppantVolGal, unit: 'gal', digits: 2 },
            { label: 'Proppant total', value: out.proppantTotalLb, unit: 'lb', digits: 1 },
            { label: 'Proppant Ratio', value: out.proppantRatioPsa, unit: 'lb/gal (psa)', digits: 3 },
          ],
        }
      },
    },
    {
      id: 'ball-sealer-velocity',
      title: 'Velocidad de Bolas Selladoras (Ball Sealers)',
      description: 'Velocidad terminal (Ley de Stokes). Positiva = sube, negativa = cae, según densidades relativas.',
      inputs: [
        { type: 'number', id: 'diameter', label: 'Diámetro de la bola', unit: 'in', step: 0.01, default: 0.875 },
        { type: 'number', id: 'ballSg', label: 'Gravedad específica de la bola', step: 0.01, default: 1.2 },
        { type: 'number', id: 'fluidSg', label: 'Gravedad específica del fluido', step: 0.01, default: 1.0 },
        { type: 'number', id: 'viscosity', label: 'Viscosidad del fluido', unit: 'cP', step: 0.1, default: 1 },
      ],
      compute(v) {
        if (!v.diameter || !v.ballSg || !v.fluidSg || !v.viscosity) throw new Error('Completá todos los campos.')
        const ballPpg = v.ballSg * GAL_PER_LB_WATER
        const fluidPpg = v.fluidSg * GAL_PER_LB_WATER
        const vel = stokesSettlingVelocityFtPerMin(v.diameter, ballPpg, fluidPpg, v.viscosity)
        return {
          results: [{ label: 'Velocidad', value: vel, unit: 'ft/min', digits: 2 }],
          notes: [vel >= 0 ? 'La bola cae (más densa que el fluido).' : 'La bola sube / flota (menos densa que el fluido).'],
        }
      },
    },
    {
      id: 'perforation-friction',
      title: 'Fricción de Perforaciones',
      inputs: [
        { type: 'number', id: 'rate', label: 'Caudal', unit: 'bbl/min', step: 0.1, default: 10 },
        { type: 'number', id: 'density', label: 'Densidad del fluido', unit: 'lb/gal', step: 0.01, default: 8.3454 },
        { type: 'number', id: 'n', label: 'Perforaciones abiertas', step: 1, default: 20 },
        { type: 'number', id: 'diameter', label: 'Diámetro de perforación', unit: 'in', step: 0.01, default: 0.5 },
        { type: 'number', id: 'cd', label: 'Coeficiente de descarga (Cd)', step: 0.01, default: 0.85 },
      ],
      compute(v) {
        if (!v.rate || !v.density || !v.n || !v.diameter || !v.cd) throw new Error('Completá todos los campos.')
        const dp = perforationFriction(v.rate, v.density, v.n, v.diameter, v.cd)
        return { results: [{ label: 'Presión de fricción', value: dp, unit: 'psi', digits: 2 }] }
      },
    },
    {
      id: 'hydraulic-power',
      title: 'Potencia Hidráulica (HHP)',
      inputs: [
        { type: 'number', id: 'pressure', label: 'Presión de tratamiento (STP)', unit: 'psi', step: 10, default: 5000 },
        { type: 'number', id: 'rate', label: 'Caudal', unit: 'bbl/min', step: 0.1, default: 40 },
      ],
      compute(v) {
        if (!v.pressure || !v.rate) throw new Error('Completá presión y caudal.')
        return { results: [{ label: 'Potencia hidráulica', value: hydraulicHorsepower(v.pressure, v.rate), unit: 'hp', digits: 1 }] }
      },
    },
    {
      id: 'proppant-settling',
      title: 'Velocidad de Asentamiento de Proppant',
      description: 'Velocidad terminal de caída del proppant en el fluido (Ley de Stokes).',
      inputs: [
        {
          type: 'select',
          id: 'meshPreset',
          label: 'Malla (tamaño)',
          options: PROPPANT_MESH_PRESETS.map((m) => ({ value: m.id, label: m.label })),
          default: '20-40',
        },
        {
          type: 'select',
          id: 'sgPreset',
          label: 'Proppant',
          options: PROPPANT_TRUE_DENSITY.map((p) => ({ value: p.id, label: `${p.label} (SG ${p.sg})` })),
          default: 'sand',
        },
        { type: 'number', id: 'fluidSg', label: 'Gravedad específica del fluido', step: 0.01, default: 1.0 },
        { type: 'number', id: 'viscosity', label: 'Viscosidad del fluido', unit: 'cP', step: 0.1, default: 1 },
      ],
      compute(v) {
        if (!v.fluidSg || !v.viscosity) throw new Error('Completá densidad y viscosidad del fluido.')
        const mesh = PROPPANT_MESH_PRESETS.find((m) => m.id === v.meshPreset) || PROPPANT_MESH_PRESETS[2]
        const proppant = PROPPANT_TRUE_DENSITY.find((p) => p.id === v.sgPreset) || PROPPANT_TRUE_DENSITY[0]
        const proppantPpg = proppant.sg * GAL_PER_LB_WATER
        const fluidPpg = v.fluidSg * GAL_PER_LB_WATER
        const vel = stokesSettlingVelocityFtPerMin(mesh.diameterIn, proppantPpg, fluidPpg, v.viscosity)
        return {
          results: [
            { label: 'Diámetro usado', value: mesh.diameterIn, unit: 'in', digits: 4 },
            { label: 'Velocidad de asentamiento', value: Math.abs(vel), unit: 'ft/min', digits: 3 },
          ],
        }
      },
    },
  ],
}
