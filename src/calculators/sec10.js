import {
  duplexBblPerCycle,
  triplexDoubleActingBblPerCycle,
  triplexSingleActingBblPerStroke,
  densityChangeWithTemp,
  pipeStretchInches,
  packerDifferentialPressure,
} from '../calc/miscCalc.js'
import { CACL2_TABLE, NACL_TABLE, KCL_TABLE, ppgFromPct, pctFromPpg } from '../data/salts.js'
import { PACKER_TUBING_WEIGHT_PSI } from '../data/misc.js'
import { bariteWaterMudAt, bariteOilMudAt } from '../data/misc.js'

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
        ], default: 'duplex' },
        { type: 'number', id: 'liner', label: 'Diámetro de camisa (liner)', unit: 'in', step: 0.01, default: 5.0 },
        { type: 'number', id: 'rod', label: 'Diámetro de vástago (rod)', unit: 'in', step: 0.01, default: 2.0 },
        { type: 'number', id: 'stroke', label: 'Carrera (stroke)', unit: 'in', step: 0.1, default: 12 },
        { type: 'number', id: 'efficiency', label: 'Eficiencia', unit: '%', step: 1, default: 90 },
        { type: 'number', id: 'spm', label: 'Emboladas / min (SPM)', step: 1, default: 60 },
      ],
      compute(v) {
        if (!v.liner || !v.stroke) throw new Error('Completá camisa y carrera.')
        const eff = (v.efficiency ?? 100) / 100
        let bblPerCycle
        if (v.pumpType === 'triplexDouble') bblPerCycle = triplexDoubleActingBblPerCycle(v.liner, v.rod || 0, v.stroke, eff)
        else if (v.pumpType === 'triplexSingle') bblPerCycle = triplexSingleActingBblPerStroke(v.liner, v.stroke, eff)
        else bblPerCycle = duplexBblPerCycle(v.liner, v.rod || 0, v.stroke, eff)
        const results = [
          { label: 'Barriles por ciclo/embolada', value: bblPerCycle, unit: 'bbl', digits: 5 },
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
        { type: 'number', id: 'targetDensity', label: 'Densidad requerida a T1', unit: 'lb/gal', step: 0.01, default: 10 },
      ],
      compute(v) {
        if (v.wellTemp == null || v.surfaceTemp == null || !v.targetDensity) throw new Error('Completá todos los campos.')
        const change = densityChangeWithTemp(v.wellTemp, v.surfaceTemp)
        return {
          results: [
            { label: 'Cambio de densidad', value: change, unit: 'lb/gal', digits: 3 },
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
        { type: 'number', id: 'length', label: 'Longitud de tubería', unit: 'ft', step: 1, default: 8000 },
      ],
      compute(v) {
        if (v.bht == null || v.surfaceT == null || !v.length) throw new Error('Completá todos los campos.')
        const out = pipeStretchInches(v.bht, v.surfaceT, v.length)
        return {
          results: [
            { label: 'ΔT', value: out.deltaT, unit: '°F', digits: 2 },
            { label: 'Cambio por cada 1000 ft', value: out.cPer1000Ft, unit: 'in/1000ft', digits: 3 },
            { label: 'Cambio total de longitud', value: out.totalStretchIn, unit: 'in', digits: 2 },
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
        { type: 'number', id: 'tubingWeight', label: 'Peso de tubing en el packer', unit: 'lb', step: 100, default: 10000 },
        { type: 'number', id: 'depth', label: 'Profundidad del packer', unit: 'ft', step: 1, default: 7000 },
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
            { label: 'psi por 1000 lb de peso', value: psiPer1000, unit: 'psi', digits: 0 },
            { label: 'Por peso de tubing', value: out.fromTubingWeight, unit: 'psi', digits: 1 },
            { label: 'Por fluido de anular', value: out.fromAnnulusFluid, unit: 'psi', digits: 1 },
            { label: 'Presión total hacia abajo', value: out.downward, unit: 'psi', digits: 1 },
            { label: 'Por fluido de tubing', value: out.fromTubingFluid, unit: 'psi', digits: 1 },
            { label: 'Presión diferencial', value: out.differential, unit: 'psi', digits: 1 },
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
        { type: 'number', id: 'ppg', label: 'Densidad de slurry deseada', unit: 'lb/gal', step: 0.1, default: 18 },
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
              { label: 'MCS-A (humectante)', value: out.mcsaLbPerBbl * n, unit: 'lb', digits: 2 },
              { label: 'Barita', value: out.bariteLbPerBbl * n, unit: 'lb', digits: 0 },
            ],
          }
        }
        const out = bariteWaterMudAt(v.ppg)
        return {
          results: [
            { label: 'Agua', value: out.galWaterPerBbl * n, unit: 'gal', digits: 1 },
            { label: 'Fosfato / dispersante', value: out.phosphateLbPerBbl * n, unit: 'lb', digits: 2 },
            { label: 'Barita', value: out.bariteLbPerBbl * n, unit: 'lb', digits: 0 },
          ],
        }
      },
    },
  ],
}
