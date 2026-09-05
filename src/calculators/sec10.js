import {
  duplexBblPerCycle,
  triplexDoubleActingBblPerCycle,
  triplexSingleActingBblPerStroke,
  quintuplexBblPerStroke,
  densityChangeWithTemp,
  pipeStretchInches,
  packerDifferentialPressure,
} from '../calc/miscCalc.js'
import { CACL2_TABLE, NACL_TABLE, KCL_TABLE, ppgFromPct, pctFromPpg } from '../data/salts.js'
import { PACKER_TUBING_WEIGHT_PSI } from '../data/misc.js'
import { bariteWaterMudAt, bariteOilMudAt } from '../data/misc.js'
import { PUMP_MODELS } from '../data/pumps.js'
import { density, densityResult, lengthFt, lengthIn, lengthInResult, pressureResult, volumeResult, weight, weightResult } from '../ui/fieldHelpers.js'

const saltSets = {
  cacl2: { table: CACL2_TABLE, pctKey: 'pctAnhydrous', label: 'Cloruro de Calcio (CaCl2)' },
  nacl: { table: NACL_TABLE, pctKey: 'pct', label: 'Cloruro de Sodio (NaCl)' },
  kcl: { table: KCL_TABLE, pctKey: 'pct', label: 'Cloruro de Potasio (KCl)' },
}

export const section10 = {
  id: 'misc',
  title: 'Misceláneos',
  icon: '🧰',
  summary: 'Salida de bombas, salmueras, estiramiento de tubería, presión en packers y tapones de barita.',
  formulaNote: 'Bbl/ciclo (duplex, doble efecto) = π·L·(2D² − d²) / 19404 (D=camisa, d=vástago, L=carrera, todo en pulgadas).',
  calculators: [
    {
      id: 'pump-output',
      title: 'Salida de Bomba (Duplex / Triplex)',
      inputs: [
        { type: 'select', id: 'pumpType', label: 'Tipo de bomba', options: [
          { value: 'duplex', label: 'Duplex, doble efecto' },
          { value: 'triplexDouble', label: 'Triplex, doble efecto' },
          { value: 'triplexSingle', label: 'Triplex, simple efecto' },
          { value: 'quintuplexSingle', label: 'Quintuplex, simple efecto' },
        ], default: 'duplex' },
        lengthIn('liner', 'Diámetro de camisa (liner)', { step: 0.01, default: 5.0 }),
        lengthIn('rod', 'Diámetro de vástago (rod)', { step: 0.01, default: 2.0 }),
        lengthIn('stroke', 'Carrera (stroke)', { step: 0.1, default: 12 }),
        { type: 'number', id: 'efficiency', label: 'Eficiencia', unit: '%', step: 1, default: 90 },
        { type: 'number', id: 'spm', label: 'Emboladas / min (SPM)', step: 1, default: 60 },
      ],
      compute(v) {
        if (!v.liner || !v.stroke) throw new Error('Completá camisa y carrera.')
        const eff = (v.efficiency ?? 100) / 100
        let bblPerCycle
        if (v.pumpType === 'triplexDouble') bblPerCycle = triplexDoubleActingBblPerCycle(v.liner, v.rod || 0, v.stroke, eff)
        else if (v.pumpType === 'triplexSingle') bblPerCycle = triplexSingleActingBblPerStroke(v.liner, v.stroke, eff)
        else if (v.pumpType === 'quintuplexSingle') bblPerCycle = quintuplexBblPerStroke(v.liner, v.stroke, eff)
        else bblPerCycle = duplexBblPerCycle(v.liner, v.rod || 0, v.stroke, eff)
        const results = [
          volumeResult('Barriles por ciclo/embolada', bblPerCycle, { digits: 5 }),
          { label: 'Pies³ por ciclo/embolada', value: bblPerCycle * 5.6146, unit: 'ft³', digits: 4 },
        ]
        if (v.spm) {
          results.push(
            { label: 'Caudal', value: bblPerCycle * v.spm, unit: 'bbl/min', digits: 3 },
            { label: 'Caudal', value: bblPerCycle * v.spm * 42, unit: 'gal/min', digits: 1 }
          )
        }
        return { results }
      },
    },
    {
      id: 'pump-performance-chart',
      title: 'Curva de Bomba — Datos de Fabricante',
      description:
        'Presión y caudal máximos según la tabla de rendimiento publicada por el fabricante (no son fórmulas estimadas). La presión mostrada es la real de la bomba: la menor entre el límite por carga de vástago (rod load) y el límite por potencia disponible a esa velocidad.',
      diagram: { kind: 'pipeCrossSection', labels: { od: 'PD (diámetro de plunger)', id: null } },
      inputs: [
        {
          type: 'select',
          id: 'model',
          label: 'Modelo de bomba',
          options: PUMP_MODELS.map((m) => ({ value: m.id, label: m.label })),
          default: PUMP_MODELS[0].id,
          rerenderForm: true,
        },
        (values) => {
          const model = PUMP_MODELS.find((m) => m.id === values.model) || PUMP_MODELS[0]
          return {
            type: 'select',
            id: 'plungerIdx',
            label: 'Diámetro de plunger (PD)',
            options: model.plungerRows.map((r, i) => ({ value: String(i), label: `${r.plungerIn}" (${r.gpr} gal/rev)` })),
            default: '0',
          }
        },
        (values) => {
          const model = PUMP_MODELS.find((m) => m.id === values.model) || PUMP_MODELS[0]
          return {
            type: 'select',
            id: 'speedIdx',
            label: 'Velocidad (SPM / RPM piñón)',
            options: model.speedColumns.map((c, i) => ({ value: String(i), label: `${c.spm} SPM / ${c.rpm} RPM` })),
            default: '0',
          }
        },
      ],
      compute(v) {
        const model = PUMP_MODELS.find((m) => m.id === v.model) || PUMP_MODELS[0]
        const row = model.plungerRows[Number(v.plungerIdx ?? 0)]
        const col = model.speedColumns[Number(v.speedIdx ?? 0)]
        const i = Number(v.speedIdx ?? 0)
        const gpm = row.gpm[i]
        const psi = row.psi[i]
        const bpm = gpm / 42
        const hhp = (gpm * psi) / 1714
        const plungerAreaIn2 = (Math.PI / 4) * row.plungerIn * row.plungerIn
        const rodLoadLbf = psi * plungerAreaIn2
        return {
          results: [
            { label: 'Caudal máximo', value: gpm, unit: 'gpm', digits: 0 },
            { label: 'Caudal máximo', value: bpm, unit: 'bpm', digits: 3 },
            pressureResult('Presión máxima', psi, { digits: 0 }),
            { label: 'Potencia hidráulica (HHP)', value: hhp, unit: 'hp', digits: 0 },
            { label: 'Potencia de entrada requerida (BHP)', value: col.bhp, unit: 'hp', digits: 0 },
            { label: 'Carga de vástago a esta presión', value: rodLoadLbf, unit: 'lbf', digits: 0 },
            { label: '% de la carga máxima de vástago', value: (rodLoadLbf / model.maxRodLoadLbf) * 100, unit: '%', digits: 1 },
          ],
        }
      },
    },
    {
      id: 'brine-density',
      title: 'Densidad de Salmuera (CaCl2 / NaCl / KCl)',
      inputs: [
        { type: 'select', id: 'salt', label: 'Sal', options: [
          { value: 'cacl2', label: saltSets.cacl2.label },
          { value: 'nacl', label: saltSets.nacl.label },
          { value: 'kcl', label: saltSets.kcl.label },
        ], default: 'nacl' },
        { type: 'select', id: 'mode', label: 'Convertir', options: [
          { value: 'pctToPpg', label: '% en peso → lb/gal' },
          { value: 'ppgToPct', label: 'lb/gal → % en peso' },
        ], default: 'pctToPpg' },
        { type: 'number', id: 'value', label: 'Valor', step: 0.01, default: 10 },
      ],
      compute(v) {
        const s = saltSets[v.salt]
        if (v.value == null) throw new Error('Ingresá un valor.')
        if (v.mode === 'pctToPpg') {
          return { results: [{ label: `${s.label} — densidad`, value: ppgFromPct(s.table, s.pctKey, v.value), unit: 'lb/gal', digits: 3 }] }
        }
        return { results: [{ label: `${s.label} — concentración`, value: pctFromPpg(s.table, s.pctKey, v.value), unit: '% en peso', digits: 2 }] }
      },
    },
    {
      id: 'brine-temp-correction',
      title: 'Corrección de Densidad de Salmuera por Temperatura',
      inputs: [
        { type: 'number', id: 'wellTemp', label: 'Temperatura de pozo (T1)', unit: '°F', step: 1, default: 200 },
        { type: 'number', id: 'surfaceTemp', label: 'Temperatura de referencia (T2)', unit: '°F', step: 1, default: 80 },
        density('targetDensity', 'Densidad requerida a T1', { step: 0.01, default: 10 }),
      ],
      compute(v) {
        if (v.wellTemp == null || v.surfaceTemp == null || !v.targetDensity) throw new Error('Completá todos los campos.')
        const change = densityChangeWithTemp(v.wellTemp, v.surfaceTemp)
        return {
          results: [
            densityResult('Cambio de densidad', change, { digits: 3 }),
            { label: `Densidad requerida a ${v.surfaceTemp}°F`, value: v.targetDensity + change, unit: 'lb/gal', digits: 3 },
          ],
        }
      },
    },
    {
      id: 'pipe-stretch',
      title: 'Estiramiento/Contracción de Tubería',
      inputs: [
        { type: 'number', id: 'bht', label: 'Temperatura de fondo (BHT)', unit: '°F', step: 1, default: 220 },
        { type: 'number', id: 'surfaceT', label: 'Temperatura de superficie', unit: '°F', step: 1, default: 80 },
        lengthFt('length', 'Longitud de tubería', { step: 1, default: 8000 }),
      ],
      compute(v) {
        if (v.bht == null || v.surfaceT == null || !v.length) throw new Error('Completá todos los campos.')
        const out = pipeStretchInches(v.bht, v.surfaceT, v.length)
        return {
          results: [
            { label: 'ΔT', value: out.deltaT, unit: '°F', digits: 2 },
            { label: 'Cambio por cada 1000 ft', value: out.cPer1000Ft, unit: 'in/1000ft', digits: 3 },
            lengthInResult('Cambio total de longitud', out.totalStretchIn, { digits: 2 }),
          ],
          notes: [out.totalStretchIn >= 0 ? 'Valor positivo = elongación.' : 'Valor negativo = contracción.'],
        }
      },
    },
    {
      id: 'packer-pressure',
      title: 'Presión Diferencial en Packer',
      inputs: [
        { type: 'select', id: 'casing', label: 'Casing / Tubing EUE', options: PACKER_TUBING_WEIGHT_PSI.map((r, i) => ({ value: String(i), label: `${r.casingOD}"` })), default: '2' },
        { type: 'select', id: 'eue', label: 'Conexión de tubing', options: [{ value: 'eue2', label: '2" EUE' }, { value: 'eue25', label: '2 1/2" EUE' }], default: 'eue2' },
        weight('tubingWeight', 'Peso de tubing en el packer', { step: 100, default: 10000 }),
        lengthFt('depth', 'Profundidad del packer', { step: 1, default: 7000 }),
        { type: 'number', id: 'annulusGrad', label: 'Gradiente del fluido del anular', unit: 'psi/ft', step: 0.001, default: 0.519 },
        { type: 'number', id: 'tubingGrad', label: 'Gradiente del fluido de tubing', unit: 'psi/ft', step: 0.001, default: 0.438 },
      ],
      compute(v) {
        const row = PACKER_TUBING_WEIGHT_PSI[Number(v.casing)]
        const psiPer1000 = row[v.eue]
        const out = packerDifferentialPressure({
          tubingWeightLb: v.tubingWeight || 0,
          psiPer1000LbTubingWeight: psiPer1000,
          annulusGradPsiPerFt: v.annulusGrad || 0,
          packerDepthFt: v.depth || 0,
          tubingFluidGradPsiPerFt: v.tubingGrad || 0,
        })
        return {
          results: [
            pressureResult('psi por 1000 lb de peso', psiPer1000, { digits: 0 }),
            pressureResult('Por peso de tubing', out.fromTubingWeight, { digits: 1 }),
            pressureResult('Por fluido de anular', out.fromAnnulusFluid, { digits: 1 }),
            pressureResult('Presión total hacia abajo', out.downward, { digits: 1 }),
            pressureResult('Por fluido de tubing', out.fromTubingFluid, { digits: 1 }),
            pressureResult('Presión diferencial', out.differential, { digits: 1 }),
          ],
          notes: ['No aplica a retenedores tipo "upside down".'],
        }
      },
    },
    {
      id: 'barite-plug',
      title: 'Tapón de Barita (Barite Plug)',
      inputs: [
        { type: 'select', id: 'mudType', label: 'Base del lodo', options: [{ value: 'water', label: 'Base agua' }, { value: 'oil', label: 'Base aceite' }], default: 'water' },
        density('ppg', 'Densidad de slurry deseada', { step: 0.1, default: 18 }),
        { type: 'number', id: 'bbls', label: 'Barriles a preparar', step: 0.1, default: 10 },
      ],
      compute(v) {
        if (!v.ppg) throw new Error('Ingresá la densidad deseada.')
        const n = v.bbls || 1
        if (v.mudType === 'oil') {
          const out = bariteOilMudAt(v.ppg)
          return {
            results: [
              { label: 'Diesel', value: out.dieselGalPerBbl * n, unit: 'gal', digits: 1 },
              weightResult('MCS-A (humectante)', out.mcsaLbPerBbl * n, { digits: 2 }),
              weightResult('Barita', out.bariteLbPerBbl * n, { digits: 0 }),
            ],
          }
        }
        const out = bariteWaterMudAt(v.ppg)
        return {
          results: [
            { label: 'Agua', value: out.galWaterPerBbl * n, unit: 'gal', digits: 1 },
            weightResult('Fosfato / dispersante', out.phosphateLbPerBbl * n, { digits: 2 }),
            weightResult('Barita', out.bariteLbPerBbl * n, { digits: 0 }),
          ],
        }
      },
    },
  ],
}
