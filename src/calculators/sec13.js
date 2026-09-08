import { solveProppantSlurry, perforationFriction, hydraulicHorsepower, PROPPANT_MESH_PRESETS, GAL_PER_LB_WATER } from '../calc/fracturing.js'
import { settlingVelocity } from '../calc/generalCalc.js'
import { slurryProperties, sandFillUp } from '../calc/proppantCalc.js'
import { annulusFactors, capacityFactors } from '../calc/geometry.js'
import { PROPPANT_TRUE_DENSITY, SAND_BULK_DENSITY_PPG } from '../data/proppant.js'
import { ALL_PIPES } from '../data/pipes.js'
import { density, densityResult, flow, lengthIn, lengthInResult, pressure, pressureResult, volume, weightResult, weightPerLengthResult } from '../ui/fieldHelpers.js'

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
  title: 'Fractura',
  summary:
    'Relación slurry/proppant, propiedades de slurry, fill-up de arena, fricción de perforaciones, potencia hidráulica y velocidad de asentamiento.',
  formulaNote:
    'Proppant Ratio (psa) = Proppant Total(lb) / (Vol. limpio(bbl)·42). Fricción de perforación: ΔP=0.2369·Q²·ρ/(N²·D⁴·Cd²). HHP = STP·BPM/40.8. Slurry/fluido (gal/gal) = 1 + C/ρp, con C = concentración (lb prop/gal fluido) y ρp = densidad verdadera del proppant (lb/gal). #arena/ft = densidad aparente (lb/gal) × gal/ft. Velocidad de asentamiento: según Re, ley de Stokes (Re<1), intermedia/Allen (1<Re<1000) o Newton (Re>1000).',
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
        const volCategory = isRate
          ? { category: 'Caudal', canonicalUnit: 'Barriles/min (bpm)' }
          : { category: 'Volumen', canonicalUnit: 'Barriles (bbl)' }
        const propVolCategory = isRate
          ? { category: 'Caudal', canonicalUnit: 'Galones/min (gpm)' }
          : { category: 'Volumen', canonicalUnit: 'Galones US (gal)' }
        return {
          results: [
            { label: isRate ? 'Caudal de slurry' : 'Volumen de slurry', value: out.slurry, ...volCategory, unit: volUnit, digits: volDigits },
            { label: isRate ? 'Caudal de fluido limpio' : 'Volumen de fluido limpio', value: out.clean, ...volCategory, unit: volUnit, digits: volDigits },
            { label: 'Volumen de proppant', value: out.proppantVolGal, ...propVolCategory, unit: isRate ? 'gal/min' : 'gal', digits: 2 },
            { label: 'Proppant Total', value: out.proppantTotalLb, ...(isRate ? {} : { category: 'Peso / Masa', canonicalUnit: 'Libras (lb)' }), unit: isRate ? 'lb/min' : 'lb', digits: 1 },
            { label: 'Proppant Ratio', value: out.proppantRatioPsa, category: 'Densidad', canonicalUnit: 'Lb/galón (ppg)', unit: 'lb/gal (psa)', digits: 3 },
          ],
        }
      },
    },
    {
      id: 'ball-sealer-velocity',
      title: 'Velocidad de Bolas Selladoras (Ball Sealers)',
      description:
        'Velocidad terminal, con la ley de arrastre correcta según el régimen (laminar/intermedio/turbulento). Positiva = cae, negativa = sube/flota, según densidades relativas.',
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
        const out = settlingVelocity(v.diameter, ballPpg, fluidPpg, v.viscosity)
        return {
          results: [{ label: 'Velocidad', value: out.velocityFtPerMin, category: 'Velocidad', canonicalUnit: 'Pies/min (ft/min)', unit: 'ft/min', digits: 2 }],
          notes: [
            out.velocityFtPerMin >= 0 ? 'La bola cae (más densa que el fluido).' : 'La bola sube / flota (menos densa que el fluido).',
            `Régimen de arrastre: ${out.regime} (Re ≈ ${out.reynolds.toFixed(1)}).`,
          ],
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
        return { results: [{ label: 'Potencia hidráulica', value: hydraulicHorsepower(v.pressure, v.rate), category: 'Potencia', canonicalUnit: 'Caballos de fuerza (HP)', unit: 'hp', digits: 1 }] }
      },
    },
    {
      id: 'proppant-settling',
      title: 'Velocidad de Asentamiento de Proppant',
      description:
        'Velocidad terminal de caída del proppant en el fluido, con la ley de arrastre correcta según el régimen (laminar/intermedio/turbulento) en vez de asumir siempre Stokes.',
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
        const out = settlingVelocity(mesh.diameterIn, proppantPpg, fluidPpg, v.viscosity)
        return {
          results: [
            lengthInResult('Diámetro usado', mesh.diameterIn, { digits: 4 }),
            { label: 'Velocidad de asentamiento', value: Math.abs(out.velocityFtPerMin), category: 'Velocidad', canonicalUnit: 'Pies/min (ft/min)', unit: 'ft/min', digits: 3 },
          ],
          notes: [`Régimen de arrastre: ${out.regime} (Re ≈ ${out.reynolds.toFixed(1)}).`],
        }
      },
    },
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
