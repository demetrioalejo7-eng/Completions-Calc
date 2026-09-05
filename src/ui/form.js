import { el, fmt, clear } from './dom.js'
import { pipeLabel } from '../data/pipes.js'
import { UNIT_CATEGORIES } from '../data/units.js'
import { diagramMarkup } from './diagrams.js'

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

// A number input with a unit dropdown. `values[spec.id]` always holds the
// value converted to `spec.canonicalUnit` (the unit compute() expects), so
// compute() functions never need to know which unit the user picked.
// `values['__unit_'+spec.id]` tracks the currently-displayed unit.
function unitNumberInput(spec, values, setValue, rerenderAll) {
  const category = UNIT_CATEGORIES[spec.category]
  const unitStateKey = '__unit_' + spec.id
  const selectedUnit = values[unitStateKey] || spec.canonicalUnit
  const canonicalVal = values[spec.id]
  const rawVal =
    canonicalVal === null || canonicalVal === undefined
      ? ''
      : (canonicalVal * category[spec.canonicalUnit]) / category[selectedUnit]

  const numInput = el('input', {
    type: 'number',
    step: spec.step ?? 'any',
    value: rawVal === '' ? '' : Math.round(rawVal * 1e8) / 1e8,
    inputmode: 'decimal',
    onInput: (e) => {
      const raw = e.target.value === '' ? null : Number(e.target.value)
      const canon = raw === null ? null : (raw * category[selectedUnit]) / category[spec.canonicalUnit]
      setValue(spec.id, canon)
      rerenderAll(false)
    },
  })
  const unitSelect = el(
    'select',
    {
      class: 'unit-select',
      onChange: (e) => {
        setValue(unitStateKey, e.target.value)
        rerenderAll(true)
      },
    },
    Object.keys(category).map((u) => el('option', { value: u, selected: u === selectedUnit }, u))
  )
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, spec.label),
    el('div', { class: 'unit-field-row' }, [numInput, unitSelect]),
  ])
}

// A result row's displayed unit is switchable when it carries `category` +
// `canonicalUnit`. Selection is kept in `values['__outunit_<key>']` so it
// survives result re-renders triggered by input changes.
function resultValueNode(r, key, values, setValue, rerenderResultsOnly) {
  if (typeof r.value === 'string') {
    return el('span', { class: 'result-value' }, [el('strong', {}, r.value)])
  }
  if (!r.category || !UNIT_CATEGORIES[r.category]) {
    return el('span', { class: 'result-value' }, [
      el('strong', {}, fmt(r.value, r.digits ?? 4)),
      r.unit ? el('span', { class: 'result-unit' }, ' ' + r.unit) : null,
    ])
  }
  const category = UNIT_CATEGORIES[r.category]
  const unitStateKey = '__outunit_' + key
  const selectedUnit = values[unitStateKey] || r.canonicalUnit
  const converted = (r.value * category[r.canonicalUnit]) / category[selectedUnit]
  const unitSelect = el(
    'select',
    {
      class: 'unit-select unit-select-output',
      onChange: (e) => {
        setValue(unitStateKey, e.target.value)
        rerenderResultsOnly()
      },
    },
    Object.keys(category).map((u) => el('option', { value: u, selected: u === selectedUnit }, u))
  )
  return el('span', { class: 'result-value result-value-unit' }, [
    el('strong', {}, fmt(converted, r.digits ?? 4)),
    unitSelect,
  ])
}

function pipePresetInput(spec, values, setValue, rerender, onFieldEdit) {
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

  const odSpec = {
    id: spec.odField,
    label: spec.odLabel ?? 'OD',
    category: 'Longitud',
    canonicalUnit: 'Pulgadas (in)',
    step: 0.001,
  }
  const idSpec = {
    id: spec.idField,
    label: spec.idLabel ?? 'ID',
    category: 'Longitud',
    canonicalUnit: 'Pulgadas (in)',
    step: 0.001,
  }

  const wrap = el('div', { class: 'pipe-preset' }, [
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label' }, spec.label),
      select,
    ]),
    el('div', { class: 'stack' }, [
      unitNumberInput(odSpec, values, setValue, (full) => {
        if (full) rerender()
        else onFieldEdit()
      }),
      unitNumberInput(idSpec, values, setValue, (full) => {
        if (full) rerender()
        else onFieldEdit()
      }),
    ]),
  ])
  return wrap
}

// Generic "pick a standard size" dropdown that fills one or more other
// fields from a dataset row (e.g. CT OD -> also sets wall thickness).
// spec.fields: [{ target: fieldId, source: rowKeyInDataset }]
function sizePresetInput(spec, values, setValue, rerender) {
  const presetKey = '__preset_' + spec.id
  const selectedIdx = values[presetKey] ?? ''
  const options = [el('option', { value: '', selected: selectedIdx === '' }, spec.placeholder ?? 'Tamaño personalizado…')].concat(
    spec.dataset.map((row, i) =>
      el('option', { value: String(i), selected: String(i) === String(selectedIdx) }, spec.labelFn(row))
    )
  )
  const select = el('select', {
    onChange: (e) => {
      const idx = e.target.value
      setValue(presetKey, idx)
      if (idx === '') return
      const row = spec.dataset[Number(idx)]
      for (const f of spec.fields) setValue(f.target, row[f.source])
      rerender()
    },
  }, options)
  return el('label', { class: 'field' }, [el('span', { class: 'field-label' }, spec.label), select])
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
  for (const rawInput of calc.inputs) {
    if (typeof rawInput === 'function') continue
    const input = rawInput
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
            results.map((r, i) =>
              el('div', { class: 'result-row' }, [
                el('span', { class: 'result-label' }, r.label),
                resultValueNode(r, r.label + '_' + i, values, setValue, renderResults),
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
    for (const rawInput of calc.inputs) {
      const input = typeof rawInput === 'function' ? rawInput(values) : rawInput
      let node
      if (input.type === 'number') {
        node = numberInput(input, values[input.id], (v) => {
          setValue(input.id, v)
          renderResults()
        })
      } else if (input.type === 'unitNumber') {
        node = unitNumberInput(input, values, setValue, (fullRerender) => {
          if (fullRerender) renderForm()
          renderResults()
        })
      } else if (input.type === 'select') {
        node = selectInput(input, values[input.id], (v) => {
          setValue(input.id, v)
          if (input.rerenderForm) renderForm()
          renderResults()
        })
      } else if (input.type === 'checkbox') {
        node = checkboxInput(input, values[input.id], (v) => {
          setValue(input.id, v)
          renderResults()
        })
      } else if (input.type === 'pipePreset') {
        node = pipePresetInput(
          input,
          values,
          setValue,
          () => {
            renderForm()
            renderResults()
          },
          renderResults
        )
      } else if (input.type === 'sizePreset') {
        node = sizePresetInput(input, values, setValue, () => {
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
  const diagram = diagramMarkup(calc.diagram)
  if (diagram) {
    container.insertBefore(el('div', { html: diagram }), formEl)
  }
  if (calc.description) {
    container.insertBefore(el('p', { class: 'calc-description' }, calc.description), formEl)
  }
  container.appendChild(resultsEl)
}
