import { section1 } from './sec1.js'
import { section2 } from './sec2.js'
import { section3 } from './sec3.js'
import { section4 } from './sec4.js'
import { section5 } from './sec5.js'
import { section6 } from './sec6.js'
import { section8 } from './sec8.js'
import { secFlanges } from './secFlanges.js'
import { section9 } from './sec9.js'
import { section11 } from './sec11.js'
import { section12 } from './sec12.js'
import { section13 } from './sec13.js'
import { section14 } from './sec14.js'

// Capacidad, Volumen y Altura, Múltiples Sartas y Dimensiones y Resistencias
// viven en distintos archivos por comodidad de desarrollo, pero se muestran
// como una única sección en la app.
const tubulares = {
  id: 'tubulares',
  title: 'Tubulares — Capacidades y Resistencias',
  summary: 'Capacidad interior, volumen anular, múltiples sartas y resistencias API de tubing, casing, drill pipe y coiled tubing.',
  calculators: [
    ...section1.calculators,
    ...section2.calculators,
    ...section3.calculators,
    ...section4.calculators,
  ],
}

export const SECTIONS = [
  tubulares,
  secFlanges,
  section5,
  section6,
  section8,
  section9,
  section11,
  section12,
  section13,
  section14,
]

export function findSection(sectionId) {
  return SECTIONS.find((s) => s.id === sectionId)
}

export function findCalculator(sectionId, calcId) {
  const section = findSection(sectionId)
  if (!section) return null
  const calc = section.calculators.find((c) => c.id === calcId)
  return calc ? { section, calc } : null
}

export function findGroup(sectionId, groupId) {
  const section = findSection(sectionId)
  if (!section || !section.groups) return null
  const group = section.groups.find((g) => g.id === groupId)
  return group ? { section, group } : null
}

// For a calculator that lives inside one of a section's groups, returns that
// group's id; otherwise null (section has no groups, or the calc is loose).
export function findCalculatorGroupId(section, calcId) {
  if (!section.groups) return null
  const group = section.groups.find((g) => g.calculators.some((c) => c.id === calcId))
  return group ? group.id : null
}
