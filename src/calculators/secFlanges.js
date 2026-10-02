import { el, clear, fmt } from '../ui/dom.js'
import { buildFlangeBrowseList, API_ANSI_REFERENCE } from '../data/flanges.js'
import { flangeDetailDiagram } from '../ui/diagrams.js'

function fmtMm(v) {
  if (v == null) return 'No publicado en la hoja de datos'
  return fmt(v, 2) + ' mm'
}

// Field order mirrors the manufacturer's own drawing (outer dimensions
// first, then the welding-neck/hub cotas, then the secondary ones).
// Fields absent on a given row (e.g. B/J2/J3 on the low-pressure 6BX
// classes, which only publish the Blind RTJ view) are skipped rather
// than shown as missing.
const FIELD_LABELS_6B = [
  ['od', 'OD — diámetro exterior'],
  ['bc', 'BC — círculo de bulones'],
  ['b', 'B — diámetro de paso (bore)'],
  ['k', 'K'],
  ['p', 'P'],
  ['e', 'E'],
  ['t', 'T — espesor'],
  ['q', 'Q'],
  ['x', 'X'],
  ['c', 'C (máx.)'],
  ['ln', 'LN'],
  ['hl', 'HL'],
  ['jl', 'JL'],
]

const FIELD_LABELS_6BX = [
  ['od', 'OD — diámetro exterior'],
  ['bc', 'BC — círculo de bulones'],
  ['b', 'B — diámetro de paso (bore)'],
  ['g', 'G'],
  ['k', 'K'],
  ['e1', 'E1'],
  ['t', 'T — espesor'],
  ['q', 'Q (máx.)'],
  ['j1', 'J1'],
  ['j2', 'J2'],
  ['j3', 'J3'],
  ['j4', 'J4'],
  ['r', 'R'],
  ['c', 'C (máx.)'],
]

const COUNT_LABELS = [
  ['n', 'N — cantidad de bulones'],
  ['h', 'H — altura de tuerca'],
]

function mountFlangeBrowser(container) {
  clear(container)
  const list = buildFlangeBrowseList()
  const state = { filter: '', selectedIdx: null }
  const root = el('div', {})
  container.appendChild(root)

  function render() {
    clear(root)
    if (state.selectedIdx == null) renderList()
    else renderDetail(list[state.selectedIdx])
  }

  function renderList() {
    const listEl = el('div', { class: 'flange-list' })

    function renderItems() {
      clear(listEl)
      const q = state.filter.trim().toLowerCase()
      const filtered = list
        .map((entry, idx) => ({ entry, idx }))
        .filter(({ entry }) => !q || `${entry.size} ${entry.pressureLabel} ${entry.type}`.toLowerCase().includes(q))
      if (!filtered.length) {
        listEl.appendChild(el('p', { class: 'note' }, 'No se encontraron bridas con ese filtro.'))
        return
      }
      for (const { entry, idx } of filtered) {
        listEl.appendChild(
          el(
            'div',
            {
              class: 'list-item',
              style: 'cursor:pointer',
              onClick: () => {
                state.selectedIdx = idx
                render()
              },
            },
            [
              el('span', { class: 'list-item-title' }, `${entry.size}" — ${entry.pressureLabel}`),
              el('span', { class: 'list-item-desc' }, entry.type === '6bx' ? 'Tipo 6BX' : 'Tipo 6B'),
              el('span', { class: 'list-item-arrow' }, '›'),
            ]
          )
        )
      }
    }

    const filterInput = el('input', {
      type: 'text',
      placeholder: 'Filtrar por tamaño o presión (ej. 2 1/16, 10M)…',
      value: state.filter,
      onInput: (e) => {
        state.filter = e.target.value
        renderItems()
      },
    })
    root.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Tamaño — Clase de presión'), filterInput]))
    root.appendChild(listEl)
    renderItems()
  }

  function renderDetail(entry) {
    const { row, type } = entry
    root.appendChild(
      el('div', { class: 'flange-back', style: 'cursor:pointer', onClick: () => { state.selectedIdx = null; render() } }, '← Volver a la lista')
    )
    root.appendChild(el('h3', { class: 'flange-detail-title' }, `${entry.size}" — ${entry.pressureLabel} (Tipo ${type === '6bx' ? '6BX' : '6B'})`))
    root.appendChild(el('p', { class: 'calc-description' }, `Número de anillo (ring): ${row.ring}`))
    root.appendChild(el('div', { html: flangeDetailDiagram(row) }))

    const fieldLabels = type === '6bx' ? FIELD_LABELS_6BX : FIELD_LABELS_6B
    const card = el('div', { class: 'result-card' })
    for (const [key, label] of fieldLabels) {
      if (row[key] === undefined) continue
      card.appendChild(
        el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, label), el('span', { class: 'result-value result-value-text' }, fmtMm(row[key]))])
      )
    }
    for (const [key, label] of COUNT_LABELS) {
      card.appendChild(
        el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, label), el('span', { class: 'result-value' }, row[key] != null ? String(row[key]) : '—')])
      )
    }
    card.appendChild(
      el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, 'Número de anillo (Ring)'), el('span', { class: 'result-value' }, row.ring)])
    )
    root.appendChild(card)
    root.appendChild(
      el('p', { class: 'note' }, 'OD, BC, N, H y el número de anillo son comunes a Blind y Welding Neck. B, K, P/G, T, Q, X (o J1-J3) corresponden a la vista Welding Neck RTJ; los tamaños que el fabricante no publica en esa vista muestran "no publicado en la hoja de datos".')
    )
  }

  render()
}

function mountAnsiReference(container) {
  clear(container)
  container.appendChild(
    el(
      'p',
      { class: 'calc-description' },
      'Equivalencia entre la designación API antigua / clase ANSI y el tamaño + clase de presión API 6A actual (2M = 13.8 MPa/2000 psi, 3M = 20.7 MPa/3000 psi, 5M = 34.5 MPa/5000 psi).'
    )
  )
  const card = el('div', { class: 'result-card' })
  for (const row of API_ANSI_REFERENCE) {
    card.appendChild(
      el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, row.legacy), el('span', { class: 'result-value result-value-text' }, row.current)])
    )
  }
  container.appendChild(card)
}

export const secFlanges = {
  id: 'flanges',
  title: 'Bridas API 6A',
  summary: 'Bridas API 6A tipo 6B y 6BX (RTJ) — buscador por tamaño y clase de presión, y referencia API antiguo / ANSI.',
  formulaNote: 'Valores tabulados de la hoja de datos dimensional API 6A del fabricante (no son fórmulas estimadas). Todas las medidas en mm.',
  calculators: [
    {
      id: 'flange-lookup',
      title: 'Bridas — Tamaño y Clase de Presión',
      description: 'Elegí una brida de la lista (o filtrá por tamaño/presión) para ver su dimensional completo.',
      custom: true,
      mount: mountFlangeBrowser,
    },
    {
      id: 'flange-ansi-reference',
      title: 'Referencia API Antiguo / ANSI',
      description: 'Tabla de equivalencia entre designaciones API/ANSI antiguas y los tamaños API 6A actuales.',
      custom: true,
      mount: mountAnsiReference,
    },
  ],
}
