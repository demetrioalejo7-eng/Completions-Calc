import {
  DRILL_PIPE_TORQUES,
  HEAVY_WEIGHT_TORQUES,
  DRILL_COLLAR_TORQUES,
  BIT_TORQUES,
  torqueMismatch,
  lbftToKgm,
} from '../data/torques.js'
import { pressureResult, weightPerLengthResult } from '../ui/fieldHelpers.js'

const nf = (x) => Math.round(x).toLocaleString('es-AR')

function torqueRows(r) {
  return [
    { label: 'Torque de enrosque (kg·m)', value: r.torqueKgm, unit: 'kg·m', digits: 0 },
    { label: 'Torque de enrosque (lb·ft)', value: r.torqueLbft, unit: 'lb·ft', digits: 0 },
  ]
}

function commonRows(r) {
  return [
    { label: 'Capacidad interior', value: r.capLm, category: 'Capacidad lineal', canonicalUnit: 'Litros/metro (L/m)', unit: 'L/m', digits: 2 },
    { label: 'Desplazamiento (acero)', value: r.despLm, category: 'Capacidad lineal', canonicalUnit: 'Litros/metro (L/m)', unit: 'L/m', digits: 2 },
    { label: 'Peso', value: r.kgPerM, category: 'Peso / Longitud', canonicalUnit: 'kg/m', unit: 'kg/m', digits: 2 },
  ]
}

function mismatchNote(r) {
  return torqueMismatch(r)
    ? [`En la planilla este torque no coincide entre las dos tablas: ${nf(r.torqueKgm)} kg·m equivale a ${nf(r.torqueKgm / 0.138255)} lb·ft, pero la tabla en lb·ft dice ${nf(r.torqueLbft)} lb·ft (= ${nf(lbftToKgm(r.torqueLbft))} kg·m). Verificar.`]
    : []
}

export const torqueCalculator = {
  id: 'dp-hw-dc-torques',
  title: 'Portamechas (DC), Heavy Weight y Drill Pipe — Torques',
  description: 'Torque de enrosque y datos de drill pipe, heavy weight (HW), portamechas (drill collars) y conexión de trépanos, según la planilla de torques.',
  inputs: [
    {
      type: 'select',
      id: 'tipo',
      label: 'Tipo',
      options: [
        { value: 'dc', label: 'Portamechas (DC)' },
        { value: 'hw', label: 'Heavy Weight (HW)' },
        { value: 'dp', label: 'Drill Pipe (DP)' },
        { value: 'bit', label: 'Trépanos (conexión REG)' },
      ],
      default: 'dc',
      rerenderForm: true,
    },
    (values) =>
      values.tipo === 'dc'
        ? {
            type: 'select',
            id: 'dcRow',
            label: 'Portamecha (OD × ID — conexión)',
            options: DRILL_COLLAR_TORQUES.map((r, i) => ({ value: String(i), label: `${r.odLabel}" × ${r.idLabel}" — ${r.connection}` })),
            default: '0',
          }
        : null,
    (values) =>
      values.tipo === 'hw'
        ? {
            type: 'select',
            id: 'hwRow',
            label: 'Heavy Weight (OD × ID)',
            options: HEAVY_WEIGHT_TORQUES.map((r, i) => ({ value: String(i), label: `${r.odLabel}" × ${r.idLabel}" — ${r.wt} lb/ft` })),
            default: '0',
          }
        : null,
    (values) =>
      values.tipo === 'dp'
        ? {
            type: 'select',
            id: 'dpRow',
            label: 'Drill Pipe (OD — peso — grado)',
            options: DRILL_PIPE_TORQUES.map((r, i) => ({ value: String(i), label: `${r.odLabel}" — ${r.wt} lb/ft — Grado ${r.grade}` })),
            default: '0',
          }
        : null,
    (values) =>
      values.tipo === 'bit'
        ? {
            type: 'select',
            id: 'bitRow',
            label: 'Trépano',
            options: BIT_TORQUES.map((r, i) => ({ value: String(i), label: `${r.bit}" — ${r.connection}` })),
            default: '0',
          }
        : null,
  ],
  compute(v) {
    if (v.tipo === 'dc') {
      const r = DRILL_COLLAR_TORQUES[Number(v.dcRow ?? 0)]
      return {
        results: [
          { label: 'Portamecha', value: `${r.odLabel}" × ${r.idLabel}"` },
          { label: 'Conexión', value: r.connection },
          ...torqueRows(r),
          ...commonRows(r),
        ],
        notes: mismatchNote(r),
      }
    }
    if (v.tipo === 'hw') {
      const r = HEAVY_WEIGHT_TORQUES[Number(v.hwRow ?? 0)]
      return {
        results: [
          { label: 'Heavy Weight', value: `${r.odLabel}" × ${r.idLabel}"` },
          weightPerLengthResult('Peso nominal', r.wt, { digits: 1 }),
          ...torqueRows(r),
          ...commonRows(r),
          { label: 'Tracción', value: r.tensileTn, unit: 'TN', digits: 0 },
          { label: 'TORC (columna de la planilla, sin unidad indicada)', value: r.torc, digits: 0 },
        ],
        notes: mismatchNote(r),
      }
    }
    if (v.tipo === 'dp') {
      const r = DRILL_PIPE_TORQUES[Number(v.dpRow ?? 0)]
      return {
        results: [
          { label: 'Drill Pipe', value: `${r.odLabel}" — Grado ${r.grade}` },
          weightPerLengthResult('Peso nominal', r.wt, { digits: 1 }),
          ...torqueRows(r),
          ...commonRows(r),
          { label: 'Tracción', value: r.tensileTn, unit: 'TN', digits: 0 },
          pressureResult('Colapso', r.collapsePsi, { digits: 0 }),
          pressureResult('Presión interna (burst)', r.burstPsi, { digits: 0 }),
        ],
        notes: mismatchNote(r),
      }
    }
    const r = BIT_TORQUES[Number(v.bitRow ?? 0)]
    return {
      results: [
        { label: 'Trépano', value: `${r.bit}"` },
        { label: 'Conexión', value: r.connection },
        { label: 'Torque de enrosque (kg·m)', value: r.torqueKgm, unit: 'kg·m', digits: 0 },
        { label: 'Torque de enrosque (lb·ft)', value: `${nf(r.torqueLbftMin)} – ${nf(r.torqueLbftMax)} lb·ft` },
      ],
      notes: ['La tabla en lb·ft da un rango; la tabla en kg·m da un solo valor, que coincide con uno de los extremos del rango.'],
    }
  },
}
