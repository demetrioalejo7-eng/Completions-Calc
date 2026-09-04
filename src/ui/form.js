import { el, fmt, clear } from './dom.js'
import { pipeLabel } from '../data/pipes.js'

function numberInput(spec, value, onChange) {
  const input = el('input', {
    type: 'number',
    step: spec.step ?? 'any',
    value: value ?? '',
    inputmode: 'decimal',
    onInput: (e) => onChange(e.target.value === '' ? null : Number(e.target.value)),
  })
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, spec.label + (spec.unit ? ` (${spec.unit})` : '')),
    input,
  ])
}

function selectInput(spec, value, onChange) {
  const select = el(
    'select',
    { onChange: (e) => onChange(e.target.value) },
    spec.options.map((o) =>
      el('option', { value: o.value, selected: o.value === value }, o.label)
    )
  )
  return el('label', { class: 'field' }, [el('span', { class: 'field-label' }, spec.label), select])
}

function pipePresetInput(spec, values, setValue, rerender) {
  const presetKey = '__preset_' + spec.id
  const selectedIdx = values[presetKey] ?? ''
  const options = [el('option', { value: '', selected: selectedIdx === '' }, 'Tamaño personalizado…')].concat(
    spec.dataset.map((row, i) =>
      el('option', { value: String(i), selected: String(i) === String(selectedIdx) }, pipeLabel(row))
    )
  )
  const select = el('select', {
    onChange: (e) => {
      const idx = e.target.value
      setValue(presetKey, idx)
      if (idx === '') return
      const row = spec.dataset[Number(idx)]
      setValue(spec.odField, row.od)
      setValue(spec.idField, row.id)
      if (spec.wtField) setValue(spec.wtField, row.wt)
      rerender()
    },
  }, options)

  const odSpec = { id: spec.odField, label: spec.odLabel ?? 'OD', unit: 'in', step: 0.001 }
  const idSpec = { id: spec.idField, label: spec.idLabel ?? 'ID', unit: 'in', step: 0.001 }

  const wrap = el('div', { class: 'pipe-preset' }, [
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label' }, spec.label),
      select,
    ]),
    el('div', { class: 'row' }, [
      numberInput(odSpec, values[spec.odField], (v) => setValue(spec.odField, v)),
      numberInput(idSpec, values[spec.idField], (v) => setValue(spec.idField, v)),
    ]),
  ])
  return wrap
}

function checkboxInput(spec, value, onChange) {
  const input = el('input', {
    type: 'checkbox',
    checked: !!value,
    onChange: (e) => onChange(e.target.checked),
  })
  return el('label', { class: 'field field-checkbox' }, [input, el('span', {}, spec.label)])
}

export function renderCalculatorForm(container, calc) {
  clear(container)
  const values = {}
  for (const input of calc.inputs) {
    values[input.id] = input.default ?? null
    if (input.type === 'pipePreset') {
      values[input.odField] = input.odDefault ?? null
      values[input.idField] = input.idDefault ?? null
    }
  }

  const formEl = el('div', { class: 'calc-form' })
  const resultsEl = el('div', { class: 'calc-results' })

  function setValue(id, v) {
    values[id] = v
  }

  function renderResults() {
    clear(resultsEl)
    try {
      const out = calc.compute(values)
      if (!out) return
      const { results = [], notes = [] } = out
      if (results.length) {
        resultsEl.appendChild(
          el(
            'div',
            { class: 'result-card' },
            results.map((r) =>
              el('div', { class: 'result-row' }, [
                el('span', { class: 'result-label' }, r.label),
                el('span', { class: 'result-value' }, [
                  el('strong', {}, fmt(r.value, r.digits ?? 4)),
                  r.unit ? el('span', { class: 'result-unit' }, ' ' + r.unit) : null,
                ]),
              ])
            )
          )
        )
      }
      for (const n of notes) {
        resultsEl.appendChild(el('p', { class: 'note' }, n))
      }
    } catch (err) {
      resultsEl.appendChild(el('p', { class: 'note note-error' }, err.message || String(err)))
    }
  }

  function renderForm() {
    clear(formEl)
    for (const input of calc.inputs) {
      let node
      if (input.type === 'number') {
        node = numberInput(input, values[input.id], (v) => {
          setValue(input.id, v)
          renderResults()
        })
      } else if (input.type === 'select') {
        node = selectInput(input, values[input.id], (v) => {
          setValue(input.id, v)
          renderResults()
        })
      } else if (input.type === 'checkbox') {
        node = checkboxInput(input, values[input.id], (v) => {
          setValue(input.id, v)
          renderResults()
        })
      } else if (input.type === 'pipePreset') {
        node = pipePresetInput(input, values, setValue, () => {
          renderForm()
          renderResults()
        })
      }
      if (node) formEl.appendChild(node)
    }
  }

  renderForm()
  renderResults()

  container.appendChild(formEl)
  if (calc.description) {
    container.insertBefore(el('p', { class: 'calc-description' }, calc.description), formEl)
  }
  container.appendChild(resultsEl)
}
