import { section1 } from './sec1.js'
import { section2 } from './sec2.js'
import { section3 } from './sec3.js'
import { section4 } from './sec4.js'
import { section5 } from './sec5.js'
import { section6 } from './sec6.js'
import { section7 } from './sec7.js'
import { section8 } from './sec8.js'
import { section9 } from './sec9.js'
import { section10 } from './sec10.js'
import { section11 } from './sec11.js'
import { section12 } from './sec12.js'
import { section13 } from './sec13.js'

export const SECTIONS = [
  section1,
  section2,
  section3,
  section4,
  section5,
  section6,
  section7,
  section8,
  section9,
  section10,
  section11,
  section12,
  section13,
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
