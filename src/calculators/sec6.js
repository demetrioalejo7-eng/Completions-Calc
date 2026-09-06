import {
  volumeStrongFromDilute,
  volumeDiluteFromStrong,
  waterToDilute,
  strongToIncreaseConcentration,
} from '../calc/acidCalc.js'
import { HCL_STANDARD, sgFromPctHCl } from '../data/acid.js'

const pctOptions = HCL_STANDARD.map((h) => ({ value: String(h.pct), label: `${h.pct}% (SG ${h.sg})` }))

function sgHelperNote() {
  return 'La gravedad específica se ajusta automáticamente para % estándar de HCl (7.5/15/20/25/28/31.45%); para otros valores se interpola.'
}

export const section6 = {
  id: 'acid',
  title: 'Ácido',
  summary: 'Dilución y mezcla de ácido clorhídrico (HCl).',
  formulaNote: 'Vol. fuerte = (Vol dil.)(%dil.)(SG dil.) / [(%fuerte)(SG fuerte)]',
  calculators: [
    {
      id: 'strong-from-dilute',
      title: 'Ácido fuerte necesario para diluir',
      description: 'Volumen de ácido concentrado necesario para preparar un volumen de ácido diluido.',
      inputs: [
        { type: 'number', id: 'volDilute', label: 'Volumen deseado (diluido)', unit: 'gal', step: 1, default: 1000 },
        { type: 'number', id: 'pctDilute', label: '% Ácido diluido', step: 0.1, default: 15 },
        { type: 'number', id: 'sgDilute', label: 'SG del diluido', step: 0.001, default: 1.075 },
        { type: 'number', id: 'pctStrong', label: '% Ácido concentrado (fuerte)', step: 0.1, default: 31.45 },
        { type: 'number', id: 'sgStrong', label: 'SG del concentrado', step: 0.001, default: 1.16 },
      ],
      compute(v) {
        const val = volumeStrongFromDilute(v.volDilute, v.pctDilute, v.sgDilute, v.pctStrong, v.sgStrong)
        return {
          results: [
            { label: 'Volumen de ácido fuerte necesario', value: val, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 },
            { label: 'Agua necesaria (aprox.)', value: v.volDilute - val, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 },
          ],
          notes: [sgHelperNote()],
        }
      },
    },
    {
      id: 'dilute-from-strong',
      title: 'Volumen de ácido diluido obtenible',
      description: 'Volumen de ácido diluido que se puede preparar a partir de un volumen de ácido fuerte.',
      inputs: [
        { type: 'number', id: 'volStrong', label: 'Volumen de ácido fuerte', unit: 'gal', step: 1, default: 500 },
        { type: 'number', id: 'pctStrong', label: '% Ácido fuerte', step: 0.1, default: 31.45 },
        { type: 'number', id: 'sgStrong', label: 'SG del fuerte', step: 0.001, default: 1.16 },
        { type: 'number', id: 'pctDilute', label: '% Ácido diluido deseado', step: 0.1, default: 15 },
        { type: 'number', id: 'sgDilute', label: 'SG del diluido', step: 0.001, default: 1.075 },
      ],
      compute(v) {
        const val = volumeDiluteFromStrong(v.volStrong, v.pctStrong, v.sgStrong, v.pctDilute, v.sgDilute)
        return {
          results: [
            { label: 'Volumen de ácido diluido obtenible', value: val, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 },
            { label: 'Agua a agregar', value: val - v.volStrong, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 },
          ],
        }
      },
    },
    {
      id: 'water-to-dilute',
      title: 'Agua necesaria para diluir',
      description: 'Volumen de agua para llevar un ácido de mayor concentración a una menor, hasta un volumen final dado.',
      inputs: [
        { type: 'number', id: 'volDesired', label: 'Volumen final deseado', unit: 'gal', step: 1, default: 1000 },
        { type: 'number', id: 'desiredPct', label: '% Ácido deseado', step: 0.1, default: 15 },
        { type: 'number', id: 'sgDesired', label: 'SG deseado', step: 0.001, default: 1.075 },
        { type: 'number', id: 'origPct', label: '% Ácido original', step: 0.1, default: 31.45 },
        { type: 'number', id: 'sgOrig', label: 'SG original', step: 0.001, default: 1.16 },
      ],
      compute(v) {
        const water = waterToDilute(v.volDesired, v.desiredPct, v.sgDesired, v.origPct, v.sgOrig)
        return {
          results: [
            { label: 'Agua necesaria', value: water, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 },
            { label: 'Ácido original necesario', value: v.volDesired - water, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 },
          ],
        }
      },
    },
    {
      id: 'strong-to-increase',
      title: 'Ácido fuerte para aumentar concentración',
      description: 'Volumen de ácido concentrado a agregar a un volumen de ácido existente para subir su concentración.',
      inputs: [
        { type: 'number', id: 'volDesired', label: 'Volumen final deseado', unit: 'gal', step: 1, default: 1000 },
        { type: 'number', id: 'desiredPct', label: '% deseado', step: 0.1, default: 20 },
        { type: 'number', id: 'sgDesired', label: 'SG deseado', step: 0.001, default: 1.1 },
        { type: 'number', id: 'volOrig', label: 'Volumen original', unit: 'gal', step: 1, default: 800 },
        { type: 'number', id: 'origPct', label: '% original', step: 0.1, default: 15 },
        { type: 'number', id: 'sgOrig', label: 'SG original', step: 0.001, default: 1.075 },
        { type: 'number', id: 'strongPct', label: '% ácido fuerte a agregar', step: 0.1, default: 31.45 },
        { type: 'number', id: 'sgStrong', label: 'SG del fuerte', step: 0.001, default: 1.16 },
      ],
      compute(v) {
        const val = strongToIncreaseConcentration(
          v.volDesired, v.desiredPct, v.sgDesired,
          v.volOrig, v.origPct, v.sgOrig,
          v.strongPct, v.sgStrong
        )
        return { results: [{ label: 'Ácido fuerte a agregar', value: val, category: 'Volumen', canonicalUnit: 'Galones US (gal)', unit: 'gal', digits: 1 }] }
      },
    },
    {
      id: 'hcl-sg-reference',
      title: 'Referencia: % HCl vs Gravedad Específica',
      description: 'Tabla estándar de concentraciones de ácido clorhídrico.',
      inputs: [
        { type: 'number', id: 'pct', label: '% HCl a consultar', step: 0.1, default: 15 },
      ],
      compute(v) {
        const sg = sgFromPctHCl(v.pct)
        return {
          results: [
            { label: 'Gravedad específica interpolada', value: sg, unit: '', digits: 4 },
            { label: 'Peso', value: sg * 8.3453, category: 'Densidad', canonicalUnit: 'Lb/galón (ppg)', unit: 'lb/gal', digits: 3 },
          ],
          notes: HCL_STANDARD.map((h) => `${h.pct}% → SG ${h.sg} (${h.ppg} lb/gal)`),
        }
      },
    },
  ],
}
