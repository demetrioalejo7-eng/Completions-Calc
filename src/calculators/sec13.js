import { solveProppantSlurry, perforationFriction, hydraulicHorsepower, PROPPANT_MESH_PRESETS, GAL_PER_LB_WATER } from '../calc/fracturing.js'
import { stokesSettlingVelocityFtPerMin } from '../calc/generalCalc.js'
import { PROPPANT_TRUE_DENSITY } from '../data/proppant.js'
import { density, flow, lengthIn, lengthInResult, pressure, pressureResult, volume, weightResult } from '../ui/fieldHelpers.js'

const SOLVE_FIELD_IDS = {
  ratio: ['aVal', 'bVal'],
  slurry: ['bVal', 'ratioVal'],
  clean: ['aVal', 'ratioVal'],
}

function proppantFieldSpec(id, isRate) {
  if (id === 'aVal') {
    return isRate
      ? flow('aVal', 'Caudal de slurry', { step: 0.1, default: 15 })
      : volume('aVal', 'Volumen de slurry', { step: 0.1, default: 15 })
  }
  if (id === 'bVal') {
    return isRate
      ? flow('bVal', 'Caudal de fluido limpio', { step: 0.1, default: 10 })
      : volume('bVal', 'Volumen de fluido limpio', { step: 0.1, default: 10 })
  }
  return { type: 'number', id: 'ratioVal', label: 'Proppant Ratio', unit: 'lb/gal (psa)', step: 0.01, default: 5 }
}

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
      description:
        'Elegí el método (por volúmenes o por caudal) y qué variable calcular; completá las otras dos. SG del proppant y densidad del agua (8.345404 lb/gal) fijan la conversión volumen ↔ peso.',
      inputs: [
        {
          type: 'select',
          id: 'sgPreset',
          label: 'Proppant',
          options: PROPPANT_TRUE_DENSITY.map((p) => ({ value: p.id, label: p.label })),
          default: 'sand',
        },
        {
          type: 'select',
          id: 'method',
          label: 'Método',
          options: [
            { value: 'volumes', label: 'Volúmenes' },
            { value: 'flowrate', label: 'Caudal' },
          ],
          default: 'volumes',
          rerenderForm: true,
        },
        (values) => ({
          type: 'select',
          id: 'solveFor',
          label: 'Calcular',
          options:
            values.method === 'flowrate'
              ? [
                  { value: 'slurry', label: 'Caudal de slurry' },
                  { value: 'clean', label: 'Caudal de fluido limpio' },
                  { value: 'ratio', label: 'Proppant Ratio' },
                ]
              : [
                  { value: 'slurry', label: 'Volumen de slurry' },
                  { value: 'clean', label: 'Volumen de fluido limpio' },
                  { value: 'ratio', label: 'Proppant Ratio' },
                ],
          default: 'ratio',
          rerenderForm: true,
        }),
        (values) => proppantFieldSpec(SOLVE_FIELD_IDS[values.solveFor || 'ratio'][0], values.method === 'flowrate'),
        (values) => proppantFieldSpec(SOLVE_FIELD_IDS[values.solveFor || 'ratio'][1], values.method === 'flowrate'),
      ],
      compute(v) {
        const preset = PROPPANT_TRUE_DENSITY.find((p) => p.id === v.sgPreset) || PROPPANT_TRUE_DENSITY[0]
        const isRate = v.method === 'flowrate'
        const solveFor = v.solveFor || 'ratio'
        const knowns = { slurry: v.aVal ?? null, clean: v.bVal ?? null, ratio: v.ratioVal ?? null }
        knowns[solveFor] = null
        const knownCount = (knowns.slurry != null) + (knowns.clean != null) + (knowns.ratio != null)
        if (knownCount !== 2) throw new Error('Completá los dos valores conocidos.')
        const out = solveProppantSlurry({ ...knowns, sg: preset.sg })
        const volUnit = isRate ? 'bpm' : 'bbl'
        const volDigits = isRate ? 3 : 2
        return {
          results: [
            { label: isRate ? 'Caudal de slurry' : 'Volumen de slurry', value: out.slurry, unit: volUnit, digits: volDigits },
            { label: isRate ? 'Caudal de fluido limpio' : 'Volumen de fluido limpio', value: out.clean, unit: volUnit, digits: volDigits },
            { label: 'Volumen de proppant', value: out.proppantVolGal, unit: isRate ? 'gal/min' : 'gal', digits: 2 },
            { label: 'Proppant Total', value: out.proppantTotalLb, unit: isRate ? 'lb/min' : 'lb', digits: 1 },
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
        lengthIn('diameter', 'Diámetro de la bola', { step: 0.01, default: 0.875 }),
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
      diagram: { kind: 'pipeCrossSection', labels: { od: 'd', id: null } },
      inputs: [
        flow('rate', 'Caudal', { step: 0.1, default: 10 }),
        density('density', 'Densidad del fluido', { step: 0.01, default: 8.3454 }),
        { type: 'number', id: 'n', label: 'Perforaciones abiertas', step: 1, default: 20 },
        lengthIn('diameter', 'Diámetro de perforación', { step: 0.01, default: 0.5 }),
        { type: 'number', id: 'cd', label: 'Coeficiente de descarga (Cd)', step: 0.01, default: 0.85 },
      ],
      compute(v) {
        if (!v.rate || !v.density || !v.n || !v.diameter || !v.cd) throw new Error('Completá todos los campos.')
        const dp = perforationFriction(v.rate, v.density, v.n, v.diameter, v.cd)
        return { results: [pressureResult('Presión de fricción', dp, { digits: 2 })] }
      },
    },
    {
      id: 'hydraulic-power',
      title: 'Potencia Hidráulica (HHP)',
      inputs: [
        pressure('pressure', 'Presión de tratamiento (STP)', { step: 10, default: 5000 }),
        flow('rate', 'Caudal', { step: 0.1, default: 40 }),
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
          options: PROPPANT_TRUE_DENSITY.map((p) => ({ value: p.id, label: p.label })),
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
            lengthInResult('Diámetro usado', mesh.diameterIn, { digits: 4 }),
            { label: 'Velocidad de asentamiento', value: Math.abs(vel), unit: 'ft/min', digits: 3 },
          ],
        }
      },
    },
  ],
}
