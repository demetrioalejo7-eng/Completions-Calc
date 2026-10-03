import { el, clear } from './ui/dom.js'
import { renderCalculatorForm } from './ui/form.js'
import { SECTIONS, findSection, findCalculator, findGroup, findCalculatorGroupId } from './calculators/index.js'
import { sectionIconMarkup } from './ui/icons.js'

function header({ title, backHref, subtitle, icon }) {
  return el('header', { class: 'app-header' }, [
    backHref
      ? el('a', { href: backHref, class: 'back-link', 'aria-label': 'Volver' }, '←')
      : el('span', { class: 'back-spacer' }),
    icon ? el('span', { class: 'header-icon', html: icon }) : null,
    el('div', { class: 'header-titles' }, [
      el('h1', {}, title),
      subtitle ? el('p', { class: 'header-subtitle' }, subtitle) : null,
    ]),
  ])
}

// Derrick over a wellhead — the app mark shown in the home hero.
const APP_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 6.5 20M12 2.5 17.5 20"/><path d="M8.6 13.2h6.8M9.8 8.6h4.4M7.6 16.8h8.8"/><path d="M4 20.5h16"/><path d="M12 2.5v2"/></svg>`

export function renderHome(root) {
  clear(root)
  root.appendChild(
    el('header', { class: 'hero' }, [
      el('div', { class: 'hero-mark', html: APP_MARK }),
      el('h1', { class: 'hero-title' }, 'Completions Calc'),
      el('p', { class: 'hero-sub' }, 'Calculadora de ingeniería de completions y workover'),
    ])
  )
  const grid = el(
    'div',
    { class: 'grid grid--home' },
    SECTIONS.map((s) =>
      el('a', { href: `#/s/${s.id}`, class: 'grid-card' }, [
        el('span', { class: 'grid-icon', html: sectionIconMarkup(s.id) }),
        el('span', { class: 'grid-title' }, s.title),
        el('span', { class: 'grid-summary' }, s.summary),
      ])
    )
  )
  root.appendChild(grid)
  const [y, m, d] = __BUILD_DATE__.split('-')
  root.appendChild(
    el('footer', { class: 'app-footer' }, [
      el('span', { class: 'app-version' }, `Versión ${__APP_VERSION__} · ${d}/${m}/${y}`),
      el('span', { class: 'app-signature' }, 'ATD'),
    ])
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
    header({ title: section.title, subtitle: section.summary, backHref: '#/', icon: sectionIconMarkup(section.id) })
  )
  if (section.groups) {
    const grid = el(
      'div',
      { class: 'grid' },
      section.groups.map((g) =>
        el('a', { href: `#/s/${section.id}/${g.id}`, class: 'grid-card' }, [
          el('span', { class: 'grid-title' }, g.title),
          el('span', { class: 'grid-summary' }, g.summary),
        ])
      )
    )
    root.appendChild(grid)
    if (section.formulaNote) {
      root.appendChild(el('p', { class: 'formula-note' }, section.formulaNote))
    }
    return
  }
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

export function renderGroup(root, sectionId, groupId) {
  const found = findGroup(sectionId, groupId)
  clear(root)
  if (!found) {
    root.appendChild(header({ title: 'No encontrado', backHref: '#/' }))
    return
  }
  const { section, group } = found
  root.appendChild(
    header({ title: group.title, subtitle: group.summary, backHref: `#/s/${section.id}` })
  )
  const list = el(
    'div',
    { class: 'list' },
    group.calculators.map((c) =>
      el('a', { href: `#/s/${section.id}/${group.id}/${c.id}`, class: 'list-item' }, [
        el('span', { class: 'list-item-title' }, c.title),
        c.description ? el('span', { class: 'list-item-desc' }, c.description) : null,
        el('span', { class: 'list-item-arrow' }, '›'),
      ])
    )
  )
  root.appendChild(list)
}

export function renderCalculator(root, sectionId, calcId) {
  const found = findCalculator(sectionId, calcId)
  clear(root)
  if (!found) {
    root.appendChild(header({ title: 'No encontrado', backHref: '#/' }))
    return
  }
  const { section, calc } = found
  const groupId = findCalculatorGroupId(section, calc.id)
  const backHref = groupId ? `#/s/${section.id}/${groupId}` : `#/s/${section.id}`
  root.appendChild(
    header({ title: calc.title, backHref })
  )
  const body = el('div', { class: 'calc-body' })
  root.appendChild(body)
  if (calc.custom) {
    calc.mount(body)
  } else {
    renderCalculatorForm(body, calc)
  }
}
