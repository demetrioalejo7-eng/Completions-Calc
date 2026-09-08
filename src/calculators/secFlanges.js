import { FLANGE_6B_CLASSES, FLANGE_6BX_CLASSES } from '../data/flanges.js'

function classesForType(type) {
  return type === '6bx' ? FLANGE_6BX_CLASSES : FLANGE_6B_CLASSES
}

// Missing cells come from the manufacturer's own data sheet (not
// something we're estimating), so they're shown as "no publicado" rather
// than a blank or a guessed number — same convention used by the
// coiled-tubing strength table for un-published hydrotest pressures.
function mmResult(label, value) {
  if (value == null) return { label, value: 'No publicado en la hoja de datos', unit: '' }
  return { label, value, category: 'Longitud', canonicalUnit: 'Milímetros (mm)', unit: 'mm', digits: 2 }
}

export const secFlanges = {
  id: 'flanges',
  title: 'Bridas API 6A',
  summary: 'Dimensiones de bridas API 6A tipo 6B y 6BX (RTJ — Ring Type Joint), por clase de presión y tamaño.',
  formulaNote:
    'Valores tabulados de la hoja de datos dimensional API 6A del fabricante (no son fórmulas estimadas). Todas las medidas en mm.',
  calculators: [
    {
      id: 'flange-lookup',
      title: 'Dimensiones de Brida (6B / 6BX, RTJ)',
      description:
        'Elegí el tipo de brida, la clase de presión y el tamaño para ver todas las dimensiones publicadas (Blind y Welding Neck comparten las mismas OD/BC/N/H/Ring; T, B y las cotas del cuello sólo aplican a Welding Neck cuando corresponde).',
      diagram: { kind: 'flangeSection', labels: { od: 'OD', bc: 'BC', b: 'B', t: 'T', h: 'H' } },
      inputs: [
        {
          type: 'select',
          id: 'type',
          label: 'Tipo de brida',
          options: [
            { value: '6b', label: 'Tipo 6B' },
            { value: '6bx', label: 'Tipo 6BX' },
          ],
          default: '6b',
          rerenderForm: true,
        },
        (values) => {
          const classes = classesForType(values.type)
          return {
            type: 'select',
            id: 'psi',
            label: 'Clase de presión',
            options: classes.map((c) => ({ value: String(c.psi), label: c.label })),
            default: String(classes[0].psi),
            rerenderForm: true,
          }
        },
        (values) => {
          const classes = classesForType(values.type)
          const cls = classes.find((c) => String(c.psi) === values.psi) || classes[0]
          return {
            type: 'select',
            id: 'size',
            label: 'Tamaño',
            options: cls.rows.map((r, i) => ({ value: String(i), label: `${r.size}"` })),
            default: '0',
          }
        },
      ],
      compute(v) {
        const classes = classesForType(v.type)
        const cls = classes.find((c) => String(c.psi) === v.psi) || classes[0]
        const r = cls.rows[Number(v.size ?? 0)] || cls.rows[0]
        const results = []
        if (v.type === '6bx') {
          if (r.b != null) results.push(mmResult('B', r.b))
          results.push(mmResult('OD', r.od))
          results.push(mmResult('C (máx.)', r.c))
          if (r.e1 !== undefined) results.push(mmResult('E1', r.e1))
          if (r.q !== undefined) results.push(mmResult('Q (máx.)', r.q))
          results.push(mmResult('G', r.g))
          results.push(mmResult('K', r.k))
          results.push(mmResult('T', r.t))
          results.push(mmResult('J1', r.j1))
          if (r.j2 !== undefined) results.push(mmResult('J2', r.j2))
          if (r.j3 !== undefined) results.push(mmResult('J3', r.j3))
          results.push(mmResult('J4', r.j4))
          results.push(mmResult('R', r.r))
          results.push(mmResult('BC (círculo de bulones)', r.bc))
          results.push({ label: 'N (cantidad de bulones)', value: r.n, unit: '', digits: 0 })
          results.push(mmResult('H (altura de tuerca)', r.h))
          results.push({ label: 'Número de anillo (Ring)', value: r.ring, unit: '' })
        } else {
          results.push(mmResult('B', r.b))
          results.push(mmResult('OD', r.od))
          results.push(mmResult('C (máx.)', r.c))
          results.push(mmResult('K', r.k))
          results.push(mmResult('P', r.p))
          results.push(mmResult('E', r.e))
          results.push(mmResult('T', r.t))
          results.push(mmResult('Q', r.q))
          results.push(mmResult('X', r.x))
          results.push(mmResult('BC (círculo de bulones)', r.bc))
          results.push({ label: 'N (cantidad de bulones)', value: r.n, unit: '', digits: 0 })
          results.push(mmResult('H (altura de tuerca)', r.h))
          results.push(mmResult('LN', r.ln))
          results.push(mmResult('HL', r.hl))
          results.push(mmResult('JL', r.jl))
          results.push({ label: 'Número de anillo (Ring)', value: r.ring, unit: '' })
        }
        return {
          results,
          notes: [
            'B, K, P/G, T, Q y X (o J1-J3) corresponden a la vista Welding Neck RTJ; OD, BC, N, H y el número de anillo son comunes a Blind y Welding Neck. Los tamaños que el fabricante no publica en welding neck muestran "no publicado en la hoja de datos".',
          ],
        }
      },
    },
  ],
}
