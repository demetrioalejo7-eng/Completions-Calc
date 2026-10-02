import { el, clear } from '../ui/dom.js'
import { buildFlangeBrowseList, API_ANSI_REFERENCE } from '../data/flanges.js'
import { flangeSheetDiagram } from '../ui/diagrams.js'

function fmtIn(v) {
  if (v == null) return 'No publicado en la hoja de datos'
  return v + '"'
}

// Orden y etiquetas tal cual figuran en la hoja dimensional del
// fabricante (una ficha por tamaño + clase de presión): primero los
// datos de identificación, después las cotas de ranura/anillo que no
// están ya dibujadas, y por último los herrajes de unión.
const SPEC_FIELD_LABELS = [
  ['max', 'Max.'],
  ['min', 'Min.'],
  ['dia2', 'Diámetro de referencia (hub)'],
  ['refDia', 'Diámetro de referencia (contorno)'],
  ['hexNut', 'Tuerca hexagonal — entre caras'],
  ['boltHoleSize', 'Diámetro de agujero de bulón'],
  ['boltCircle', 'Círculo de bulones'],
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
    const { row, type, spec: s } = entry
    root.appendChild(
      el('div', { class: 'flange-back', style: 'cursor:pointer', onClick: () => { state.selectedIdx = null; render() } }, '← Volver a la lista')
    )
    root.appendChild(el('h3', { class: 'flange-detail-title' }, `${entry.size}" — ${entry.pressureLabel} (Tipo ${type === '6bx' ? '6BX' : '6B'})`))
    root.appendChild(
      el('p', { class: 'calc-description' }, `Anillo estándar: ${s.ringStd ?? '—'} · Anillo energizado por presión: ${s.ringPE}${row.n != null ? ` · ${row.n} bulones` : ''}`)
    )
    root.appendChild(el('div', { html: flangeSheetDiagram(entry) }))
    root.appendChild(el('p', { class: 'flange-sheet-hint' }, 'Deslizá el dibujo hacia los costados para verlo completo.'))

    const card = el('div', { class: 'result-card' })
    card.appendChild(
      el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, 'Largo cara a cara'), el('span', { class: 'result-value result-value-text' }, fmtIn(s.face))])
    )
    for (const [key, label] of SPEC_FIELD_LABELS) {
      card.appendChild(
        el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, label), el('span', { class: 'result-value result-value-text' }, fmtIn(s[key]))])
      )
    }
    card.appendChild(
      el('div', { class: 'result-row' }, [
        el('span', { class: 'result-label' }, 'Tap End Stud — diámetro / largo'),
        el('span', { class: 'result-value result-value-text' }, `${fmtIn(s.tapStud.dia)} / ${fmtIn(s.tapStud.len)}`),
      ])
    )
    card.appendChild(
      el('div', { class: 'result-row' }, [
        el('span', { class: 'result-label' }, 'Stud Bolt — diámetro / largo'),
        el('span', { class: 'result-value result-value-text' }, `${fmtIn(s.studBolt.dia)} / ${fmtIn(s.studBolt.len)}`),
      ])
    )
    root.appendChild(card)
    root.appendChild(
      el(
        'p',
        { class: 'note' },
        'El Tap End Stud se enrosca directamente en el cuerpo de la brida (un solo extremo con tuerca); el Stud Bolt es un bulón pasante, con tuerca en ambos extremos. Valores no publicados por el fabricante para este tamaño/clase se indican como tales en vez de estimarse.'
      )
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
  formulaNote: 'Valores tabulados de la hoja de datos dimensional del fabricante (no son fórmulas estimadas). Todas las medidas en pulgadas.',
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
