import {
  verticalCylinderTotal,
  horizontalFlatHeadsTotal,
  horizontalDishedHeadsTotal,
  sphericalTankTotal,
  rectangularTankGal,
  horizontalPartialFillGal,
  slopedPitCuFt,
  slopedPitPartialCuFt,
  slopedCylinderCuFt,
  slopedCylinderPartialCuFt,
} from '../calc/tankCalc.js'

const CUFT_PER_BBL = 5.6146

export const section8 = {
  id: 'tanks',
  title: 'Tanques y Pits',
  icon: '🛢',
  summary: 'Capacidad de tanques verticales, horizontales, esféricos, rectangulares y llenado parcial.',
  formulaNote: 'Vertical: CG = 23.501·R²·H. Horizontal (cabezas planas): CG = 5.875·D²·L. Esférico: CG = 3.9168·D³ (D, L, H en pies).',
  calculators: [
    {
      id: 'vertical-tank',
      title: 'Tanque Vertical Cilíndrico',
      inputs: [
        { type: 'number', id: 'diameter', label: 'Diámetro interior', unit: 'ft', step: 0.01, default: 10 },
        { type: 'number', id: 'height', label: 'Altura de líquido', unit: 'ft', step: 0.01, default: 8 },
      ],
      compute(v) {
        if (!v.diameter) throw new Error('Ingresá el diámetro.')
        const t = verticalCylinderTotal(v.diameter, v.height || 1)
        return {
          results: [
            { label: 'Capacidad por pie de altura', value: 23.501 * (v.diameter / 2) ** 2, unit: 'gal/ft', digits: 2 },
            { label: `Capacidad total (${v.height || 1} ft)`, value: t.gal, unit: 'gal', digits: 1 },
            { label: `Capacidad total (${v.height || 1} ft)`, value: t.bbl, unit: 'bbl', digits: 2 },
          ],
        }
      },
    },
    {
      id: 'horizontal-tank',
      title: 'Tanque Horizontal Cilíndrico',
      inputs: [
        { type: 'number', id: 'diameter', label: 'Diámetro interior', unit: 'ft', step: 0.01, default: 8 },
        { type: 'number', id: 'length', label: 'Longitud', unit: 'ft', step: 0.01, default: 20 },
        { type: 'select', id: 'heads', label: 'Cabezas', options: [{ value: 'flat', label: 'Planas' }, { value: 'dished', label: 'Dished (radio = diámetro)' }], default: 'flat' },
      ],
      compute(v) {
        if (!v.diameter || !v.length) throw new Error('Completá diámetro y longitud.')
        const t = v.heads === 'dished' ? horizontalDishedHeadsTotal(v.diameter, v.length) : horizontalFlatHeadsTotal(v.diameter, v.length)
        return {
          results: [
            { label: 'Capacidad total', value: t.gal, unit: 'gal', digits: 1 },
            { label: 'Capacidad total', value: t.bbl, unit: 'bbl', digits: 2 },
          ],
        }
      },
    },
    {
      id: 'horizontal-partial',
      title: 'Tanque Horizontal — Llenado Parcial',
      description: 'Cabezas planas. Válido hasta la mitad del tanque; para más de la mitad, calculá el vacío y restá del total.',
      inputs: [
        { type: 'number', id: 'diameterIn', label: 'Diámetro interior', unit: 'in', step: 0.1, default: 144 },
        { type: 'number', id: 'lengthIn', label: 'Longitud', unit: 'in', step: 0.1, default: 96 },
        { type: 'number', id: 'depthIn', label: 'Profundidad de líquido', unit: 'in', step: 0.1, default: 20 },
      ],
      compute(v) {
        if (!v.diameterIn || !v.lengthIn || v.depthIn == null) throw new Error('Completá todos los campos.')
        const half = v.diameterIn / 2
        let gal, note
        if (v.depthIn <= half) {
          gal = horizontalPartialFillGal(v.diameterIn, v.lengthIn, v.depthIn)
        } else {
          const empty = horizontalPartialFillGal(v.diameterIn, v.lengthIn, v.diameterIn - v.depthIn)
          const full = horizontalFlatHeadsTotal(v.diameterIn / 12, v.lengthIn / 12).gal
          gal = full - empty
          note = 'Calculado como capacidad total menos la porción vacía (tanque más de la mitad lleno).'
        }
        return {
          results: [
            { label: 'Volumen de líquido', value: gal, unit: 'gal', digits: 1 },
            { label: 'Volumen de líquido', value: gal / 42, unit: 'bbl', digits: 2 },
          ],
          notes: note ? [note] : [],
        }
      },
    },
    {
      id: 'spherical-tank',
      title: 'Tanque Esférico',
      inputs: [{ type: 'number', id: 'diameter', label: 'Diámetro', unit: 'ft', step: 0.01, default: 20 }],
      compute(v) {
        if (!v.diameter) throw new Error('Ingresá el diámetro.')
        const t = sphericalTankTotal(v.diameter)
        return { results: [{ label: 'Capacidad', value: t.gal, unit: 'gal', digits: 1 }, { label: 'Capacidad', value: t.bbl, unit: 'bbl', digits: 2 }] }
      },
    },
    {
      id: 'rectangular-tank',
      title: 'Tanque / Pit Rectangular',
      inputs: [
        { type: 'number', id: 'length', label: 'Largo', unit: 'ft', step: 0.01, default: 20 },
        { type: 'number', id: 'width', label: 'Ancho', unit: 'ft', step: 0.01, default: 10 },
        { type: 'number', id: 'height', label: 'Altura de líquido', unit: 'ft', step: 0.01, default: 4 },
      ],
      compute(v) {
        if (!v.length || !v.width) throw new Error('Completá largo y ancho.')
        const gal = rectangularTankGal(v.length, v.width, v.height || 1)
        return {
          results: [
            { label: `Capacidad (${v.height || 1} ft)`, value: gal, unit: 'gal', digits: 1 },
            { label: `Capacidad (${v.height || 1} ft)`, value: gal / 42, unit: 'bbl', digits: 2 },
            { label: 'Barriles por pulgada de profundidad', value: 0.0148 * v.length * v.width, unit: 'bbl/in', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'sloped-pit',
      title: 'Pit con Taludes (Sloped Pit)',
      description: 'Pileta con paredes inclinadas, distinta medida arriba y abajo.',
      inputs: [
        { type: 'number', id: 'topL', label: 'Largo arriba', unit: 'ft', step: 0.1, default: 30 },
        { type: 'number', id: 'topW', label: 'Ancho arriba', unit: 'ft', step: 0.1, default: 20 },
        { type: 'number', id: 'bottomL', label: 'Largo abajo', unit: 'ft', step: 0.1, default: 26 },
        { type: 'number', id: 'bottomW', label: 'Ancho abajo', unit: 'ft', step: 0.1, default: 16 },
        { type: 'number', id: 'height', label: 'Altura total', unit: 'ft', step: 0.1, default: 6 },
        { type: 'number', id: 'fluidHeight', label: 'Altura de líquido (desde el fondo)', unit: 'ft', step: 0.1, default: 4 },
      ],
      compute(v) {
        if (!v.topL || !v.topW || !v.bottomL || !v.bottomW || !v.height) throw new Error('Completá todos los campos.')
        const totalCuFt = slopedPitCuFt(v.topL, v.topW, v.bottomL, v.bottomW, v.height)
        const results = [
          { label: 'Volumen total', value: totalCuFt, unit: 'ft³', digits: 1 },
          { label: 'Volumen total', value: totalCuFt / CUFT_PER_BBL, unit: 'bbl', digits: 2 },
        ]
        if (v.fluidHeight) {
          const fluidCuFt = slopedPitPartialCuFt(v.topL, v.topW, v.bottomL, v.bottomW, v.height, v.fluidHeight)
          results.push(
            { label: 'Volumen de líquido', value: fluidCuFt, unit: 'ft³', digits: 1 },
            { label: 'Volumen de líquido', value: fluidCuFt / CUFT_PER_BBL, unit: 'bbl', digits: 2 }
          )
        }
        return { results }
      },
    },
    {
      id: 'sloped-cylinder',
      title: 'Tanque Cónico (Sloped Cylinder)',
      description: 'Tanque cilíndrico con distinto diámetro arriba y abajo (tronco de cono).',
      inputs: [
        { type: 'number', id: 'topDia', label: 'Diámetro arriba', unit: 'ft', step: 0.1, default: 20 },
        { type: 'number', id: 'bottomDia', label: 'Diámetro abajo', unit: 'ft', step: 0.1, default: 15 },
        { type: 'number', id: 'height', label: 'Altura total', unit: 'ft', step: 0.1, default: 30 },
        { type: 'number', id: 'fluidHeight', label: 'Altura de líquido (desde el fondo)', unit: 'ft', step: 0.1, default: 10 },
      ],
      compute(v) {
        if (!v.topDia || !v.bottomDia || !v.height) throw new Error('Completá todos los campos.')
        const totalCuFt = slopedCylinderCuFt(v.topDia, v.bottomDia, v.height)
        const results = [
          { label: 'Volumen total', value: totalCuFt, unit: 'ft³', digits: 1 },
          { label: 'Volumen total', value: totalCuFt / CUFT_PER_BBL, unit: 'bbl', digits: 2 },
        ]
        if (v.fluidHeight) {
          const fluidCuFt = slopedCylinderPartialCuFt(v.topDia, v.bottomDia, v.height, v.fluidHeight)
          results.push(
            { label: 'Volumen de líquido', value: fluidCuFt, unit: 'ft³', digits: 1 },
            { label: 'Volumen de líquido', value: fluidCuFt / CUFT_PER_BBL, unit: 'bbl', digits: 2 }
          )
        }
        return { results }
      },
    },
  ],
}
