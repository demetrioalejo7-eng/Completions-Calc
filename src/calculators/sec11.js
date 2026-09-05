import { n2TotalVolumeScf, n2BottomHolePressure, co2LiquidRate } from '../calc/nitrogenCalc.js'
import { N2_PROPERTIES, CO2_PROPERTIES } from '../data/nitrogen.js'
import { flow, lengthFt, lengthIn, pressure, pressureResult, volumeResult, weightResult } from '../ui/fieldHelpers.js'

export const section11 = {
  id: 'nitrogen',
  title: 'Nitrógeno y CO2',
  icon: '💨',
  summary: 'Volumen de N2 para testeo/purga de líneas, presión de columna de gas y tasa de CO2 líquido.',
  formulaNote: 'Volumen del sistema (bbl) = 0.0009714·d²·Longitud. SCF de N2 total = VM × volumen (VM desde tabla P/T).',
  calculators: [
    {
      id: 'n2-pipeline',
      title: 'Volumen de N2 para Testeo/Purga de Línea',
      inputs: [
        lengthIn('id', 'Diámetro interior de línea', { step: 0.001, default: 4.0 }),
        lengthFt('length', 'Longitud', { step: 1, default: 5000 }),
        { type: 'number', id: 'pressure', label: 'Presión', unit: 'psia', step: 10, default: 1000 },
        { type: 'number', id: 'temp', label: 'Temperatura', unit: '°F', step: 1, default: 100 },
      ],
      compute(v) {
        if (!v.id || !v.length || !v.pressure) throw new Error('Completá todos los campos.')
        const out = n2TotalVolumeScf(v.id, v.length, v.pressure, v.temp ?? 60)
        return {
          results: [
            volumeResult('Volumen del sistema', out.volBbl, { digits: 3 }),
            { label: 'Multiplicador de volumen (VM)', value: out.vm, unit: 'SCF/bbl', digits: 1 },
            { label: 'Volumen total de N2', value: out.totalScf, unit: 'SCF', digits: 0 },
          ],
        }
      },
    },
    {
      id: 'n2-bhp',
      title: 'Presión de Fondo — Columna de N2',
      inputs: [
        pressure('whp', 'Presión en cabeza (WHP)', { step: 10, default: 2000 }),
        lengthFt('depth', 'Profundidad', { step: 10, default: 8000 }),
      ],
      compute(v) {
        if (!v.whp || !v.depth) throw new Error('Completá WHP y profundidad.')
        const out = n2BottomHolePressure(v.whp, v.depth)
        return {
          results: [
            { label: 'Relación de presión (PR)', value: out.pr, unit: '', digits: 3 },
            pressureResult('Presión de fondo (BHP)', out.bhp, { digits: 0 }),
          ],
        }
      },
    },
    {
      id: 'co2-rate',
      title: 'Tasa de CO2 Líquido',
      inputs: [
        { type: 'number', id: 'scfPerBbl', label: 'Relación de tratamiento', unit: 'SCF CO2/bbl', step: 1, default: 500 },
        flow('bpm', 'Caudal de bombeo', { step: 0.1, default: 10 }),
      ],
      compute(v) {
        if (!v.scfPerBbl || !v.bpm) throw new Error('Completá ambos campos.')
        const out = co2LiquidRate(v.scfPerBbl, v.bpm)
        return {
          results: [
            { label: 'Tasa de CO2 líquido', value: out.gpm, unit: 'gal/min', digits: 2 },
            { label: 'Tasa de CO2 líquido', value: out.bpm, unit: 'bbl/min', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'n2-volume-convert',
      title: 'N2 — Volumen Estándar ↔ Líquido',
      inputs: [
        {
          type: 'select',
          id: 'mode',
          label: 'Tengo',
          options: [
            { value: 'std', label: 'Volumen estándar (SCF)' },
            { value: 'liq', label: 'N2 líquido (gal)' },
          ],
          default: 'liq',
        },
        { type: 'number', id: 'value', label: 'Valor', step: 0.01, default: 1 },
      ],
      compute(v) {
        if (!v.value) throw new Error('Ingresá un valor.')
        if (v.mode === 'liq') {
          return {
            results: [
              { label: 'N2 líquido', value: v.value, unit: 'gal', digits: 3 },
              { label: 'Volumen estándar', value: v.value * N2_PROPERTIES.scfPerGalLiquid, unit: 'SCF', digits: 2 },
            ],
          }
        }
        return {
          results: [
            { label: 'Volumen estándar', value: v.value, unit: 'SCF', digits: 2 },
            { label: 'N2 líquido', value: v.value / N2_PROPERTIES.scfPerGalLiquid, unit: 'gal', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'co2-volume-convert',
      title: 'CO2 — Masa/Volumen Líquido ↔ Volumen Gaseoso',
      inputs: [
        {
          type: 'select',
          id: 'mode',
          label: 'Tengo',
          options: [
            { value: 'mass', label: 'Masa líquida (ton)' },
            { value: 'liq', label: 'Volumen líquido (gal)' },
            { value: 'gas', label: 'Volumen gaseoso estándar (SCF)' },
          ],
          default: 'mass',
        },
        { type: 'number', id: 'value', label: 'Valor', step: 0.01, default: 60 },
      ],
      compute(v) {
        if (!v.value) throw new Error('Ingresá un valor.')
        let liqGal
        if (v.mode === 'mass') liqGal = v.value * CO2_PROPERTIES.galPerTon
        else if (v.mode === 'gas') liqGal = v.value / CO2_PROPERTIES.scfPerGalLiquid
        else liqGal = v.value
        const massTon = liqGal / CO2_PROPERTIES.galPerTon
        const scf = liqGal * CO2_PROPERTIES.scfPerGalLiquid
        return {
          results: [
            { label: 'Masa líquida', value: massTon, unit: 'ton', digits: 3 },
            { label: 'Volumen líquido', value: liqGal, unit: 'gal', digits: 1 },
            { label: 'Volumen gaseoso estándar', value: scf, unit: 'SCF', digits: 0 },
          ],
        }
      },
    },
    {
      id: 'n2-co2-properties',
      title: 'Propiedades Físicas N2 / CO2',
      inputs: [],
      compute() {
        return {
          results: [
            { label: 'N2 — Peso molecular', value: N2_PROPERTIES.molecularWeight, unit: '', digits: 3 },
            { label: 'N2 — Punto de ebullición', value: N2_PROPERTIES.boilingPointF, unit: '°F', digits: 2 },
            { label: 'N2 — 1 lb líquido', value: N2_PROPERTIES.scfPerLbLiquid, unit: 'SCF', digits: 2 },
            { label: 'N2 — 1 galón líquido', value: N2_PROPERTIES.scfPerGalLiquid, unit: 'SCF', digits: 1 },
            { label: 'CO2 — Peso molecular', value: CO2_PROPERTIES.molecularWeight, unit: '', digits: 0 },
            { label: 'CO2 — Punto crítico', value: CO2_PROPERTIES.criticalTempF, unit: '°F', digits: 1 },
            weightResult('CO2 — 1 galón líquido', CO2_PROPERTIES.lbPerGal, { digits: 2 }),
            { label: 'CO2 — 1 barril líquido', value: CO2_PROPERTIES.scfPerBblLiquid, unit: 'SCF', digits: 0 },
          ],
        }
      },
    },
  ],
}
