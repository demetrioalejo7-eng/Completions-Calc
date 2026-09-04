import { el, clear } from './ui/dom.js'
import { renderCalculatorForm } from './ui/form.js'
import { SECTIONS, findSection, findCalculator } from './calculators/index.js'

function header({ title, backHref, subtitle }) {
  return el('header', { class: 'app-header' }, [
    backHref
      ? el('a', { href: backHref, class: 'back-link', 'aria-label': 'Volver' }, '←')
      : el('span', { class: 'back-spacer' }),
    el('div', { class: 'header-titles' }, [
      el('h1', {}, title),
      subtitle ? el('p', { class: 'header-subtitle' }, subtitle) : null,
    ]),
  ])
}

export function renderHome(root) {
  clear(root)
  root.appendChild(
    header({ title: 'Completions Calc', subtitle: 'Calculadora de ingeniería de completions' })
  )
  const grid = el(
    'div',
    { class: 'grid' },
    SECTIONS.map((s) =>
      el('a', { href: `#/s/${s.id}`, class: 'grid-card' }, [
        el('span', { class: 'grid-icon' }, s.icon),
        el('span', { class: 'grid-title' }, s.title),
        el('span', { class: 'grid-summary' }, s.summary),
      ])
    )
  )
  root.appendChild(grid)
  root.appendChild(
    el('footer', { class: 'app-footer' }, 'Basado en el handbook de completions — 11 secciones, cálculos por fórmula.')
  )
}

export function renderSection(root, sectionId) {
  const section = findSection(sectionId)
  clear(root)
  if (!section) {
    root.appendChild(header({ title: 'No encontrado', backHref: '#/' }))
    return
  }
  root.appendChild(
    header({ title: `${section.icon} ${section.title}`, subtitle: section.summary, backHref: '#/' })
  )
  const list = el(
    'div',
    { class: 'list' },
    section.calculators.map((c) =>
      el('a', { href: `#/s/${section.id}/${c.id}`, class: 'list-item' }, [
        el('span', { class: 'list-item-title' }, c.title),
        c.description ? el('span', { class: 'list-item-desc' }, c.description) : null,
        el('span', { class: 'list-item-arrow' }, '›'),
      ])
    )
  )
  root.appendChild(list)
  if (section.formulaNote) {
    root.appendChild(el('p', { class: 'formula-note' }, section.formulaNote))
  }
}

export function renderCalculator(root, sectionId, calcId) {
  const found = findCalculator(sectionId, calcId)
  clear(root)
  if (!found) {
    root.appendChild(header({ title: 'No encontrado', backHref: '#/' }))
    return
  }
  const { section, calc } = found
  root.appendChild(
    header({ title: calc.title, backHref: `#/s/${section.id}` })
  )
  const body = el('div', { class: 'calc-body' })
  root.appendChild(body)
  if (calc.custom) {
    calc.mount(body)
  } else {
    renderCalculatorForm(body, calc)
  }
}
