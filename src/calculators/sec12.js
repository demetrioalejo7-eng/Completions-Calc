import { ctDimensions, reelCapacityFt, goosenecRadius, snubbingForce } from '../calc/coiledTubing.js'
import { externalDisplacementFactors, capacityFactors, totalsFromFactors } from '../calc/geometry.js'

export const section12 = {
  id: 'coiled-tubing',
  title: 'Coiled Tubing',
  icon: '🌀',
  summary: 'Dimensiones, desplazamiento, capacidad de carrete, gooseneck y fuerza de snubbing.',
  formulaNote:
    'ID = OD − 2·espesor. Peso = 2.673·(OD²−ID²). Capacidad de carrete = (π/4)·(OD_efectivo²−Core²)·Ancho / (OD_CT²·12). Gooseneck: R=(C²+4h²)/(8h). Snubbing: F=WHTP·π/4·OD².',
  calculators: [
    {
      id: 'ct-dimensions',
      title: 'Dimensiones de Coiled Tubing',
      inputs: [
        { type: 'number', id: 'od', label: 'OD', unit: 'in', step: 0.001, default: 1.75 },
        { type: 'number', id: 'wall', label: 'Espesor de pared', unit: 'in', step: 0.001, default: 0.109 },
      ],
      compute(v) {
        if (!v.od || !v.wall) throw new Error('Completá OD y espesor de pared.')
        const out = ctDimensions(v.od, v.wall)
        return {
          results: [
            { label: 'ID calculado', value: out.id, unit: 'in', digits: 3 },
            { label: 'Peso calculado', value: out.weightPerFt, unit: 'lb/ft', digits: 3 },
            { label: 'Área de tubing (acero)', value: out.tubingArea, unit: 'in²', digits: 4 },
            { label: 'Área de flujo', value: out.flowArea, unit: 'in²', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'ct-displacement',
      title: 'Desplazamiento de Coiled Tubing',
      inputs: [
        { type: 'number', id: 'od', label: 'OD', unit: 'in', step: 0.001, default: 1.75 },
        { type: 'number', id: 'wall', label: 'Espesor de pared', unit: 'in', step: 0.001, default: 0.109 },
      ],
      compute(v) {
        if (!v.od || !v.wall) throw new Error('Completá OD y espesor de pared.')
        const out = ctDimensions(v.od, v.wall)
        const cap = capacityFactors(out.id)
        const ext = externalDisplacementFactors(v.od)
        return {
          results: [
            { label: 'ID calculado', value: out.id, unit: 'in', digits: 3 },
            { label: 'Peso calculado', value: out.weightPerFt, unit: 'lb/ft', digits: 3 },
            { label: 'Capacidad interior', value: cap.bblPerFt, unit: 'bbl/ft', digits: 5 },
            { label: 'Fill-Up interior', value: cap.ftPerBbl, unit: 'ft/bbl', digits: 1 },
            { label: 'Desplazamiento externo (OD completo)', value: ext.bblPerFt, unit: 'bbl/ft', digits: 5 },
          ],
        }
      },
    },
    {
      id: 'reel-length',
      title: 'Longitud de Carrete',
      description: 'Longitud de CT que entra en un carrete según su geometría.',
      inputs: [
        { type: 'number', id: 'spoolOD', label: 'OD del carrete (bridas)', unit: 'in', step: 0.1, default: 90 },
        { type: 'number', id: 'coreDia', label: 'Diámetro del núcleo (core)', unit: 'in', step: 0.1, default: 48 },
        { type: 'number', id: 'width', label: 'Ancho interior útil', unit: 'in', step: 0.1, default: 48 },
        { type: 'number', id: 'ctOD', label: 'OD del coiled tubing', unit: 'in', step: 0.001, default: 1 },
        { type: 'number', id: 'freeboard', label: 'Freeboard (holgura de brida)', unit: 'in', step: 0.1, default: 2 },
      ],
      compute(v) {
        if (!v.spoolOD || !v.coreDia || !v.width || !v.ctOD) throw new Error('Completá todos los campos.')
        const length = reelCapacityFt(v.spoolOD, v.coreDia, v.width, v.ctOD, v.freeboard || 0)
        return { results: [{ label: 'Longitud de CT en el carrete', value: length, unit: 'ft', digits: 0 }] }
      },
    },
    {
      id: 'reel-weight',
      title: 'Peso de Carrete Cargado',
      description: 'Peso total estimado del carrete con el coiled tubing enrollado.',
      inputs: [
        { type: 'number', id: 'spoolOD', label: 'OD del carrete (bridas)', unit: 'in', step: 0.1, default: 90 },
        { type: 'number', id: 'coreDia', label: 'Diámetro del núcleo (core)', unit: 'in', step: 0.1, default: 48 },
        { type: 'number', id: 'width', label: 'Ancho interior útil', unit: 'in', step: 0.1, default: 48 },
        { type: 'number', id: 'ctOD', label: 'OD del coiled tubing', unit: 'in', step: 0.001, default: 1.75 },
        { type: 'number', id: 'ctWall', label: 'Espesor de pared del CT', unit: 'in', step: 0.001, default: 0.109 },
        { type: 'number', id: 'freeboard', label: 'Freeboard', unit: 'in', step: 0.1, default: 2 },
        { type: 'number', id: 'emptyWeight', label: 'Peso del carrete vacío', unit: 'lb', step: 10, default: 0 },
      ],
      compute(v) {
        if (!v.spoolOD || !v.coreDia || !v.width || !v.ctOD || !v.ctWall) throw new Error('Completá todos los campos.')
        const length = reelCapacityFt(v.spoolOD, v.coreDia, v.width, v.ctOD, v.freeboard || 0)
        const dims = ctDimensions(v.ctOD, v.ctWall)
        const ctWeight = length * dims.weightPerFt
        return {
          results: [
            { label: 'Longitud de CT', value: length, unit: 'ft', digits: 0 },
            { label: 'Peso del CT enrollado', value: ctWeight, unit: 'lb', digits: 0 },
            { label: 'Peso total (con carrete)', value: ctWeight + (v.emptyWeight || 0), unit: 'lb', digits: 0 },
          ],
        }
      },
    },
    {
      id: 'gooseneck-radius',
      title: 'Radio de Gooseneck',
      inputs: [
        { type: 'number', id: 'arcWidth', label: 'Ancho del arco, C', unit: 'in', step: 0.1, default: 114 },
        { type: 'number', id: 'arcHeight', label: 'Altura del arco, h', unit: 'in', step: 0.1, default: 50 },
      ],
      compute(v) {
        if (!v.arcWidth || !v.arcHeight) throw new Error('Completá ancho y altura del arco.')
        return { results: [{ label: 'Radio, R', value: goosenecRadius(v.arcWidth, v.arcHeight), unit: 'in', digits: 2 }] }
      },
    },
    {
      id: 'snubbing-force',
      title: 'Fuerza de Snubbing',
      inputs: [
        { type: 'number', id: 'whtp', label: 'Presión en cabeza de pozo (WHTP)', unit: 'psi', step: 10, default: 8000 },
        { type: 'number', id: 'od', label: 'OD del coiled tubing', unit: 'in', step: 0.001, default: 2.375 },
      ],
      compute(v) {
        if (!v.whtp || !v.od) throw new Error('Completá presión y OD.')
        return { results: [{ label: 'Fuerza de snubbing', value: snubbingForce(v.whtp, v.od), unit: 'lbf', digits: 1 }] }
      },
    },
  ],
}
