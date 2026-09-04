import { el, fmt, clear } from '../ui/dom.js'
import { slurryDesign } from '../calc/cementCalc.js'
import { CEMENT_CLASSES, CEMENT_ADDITIVES, WATER_TYPES, nacl_avf } from '../data/cement.js'

function mountCementCalculator(container) {
  clear(container)
  const state = {
    classId: CEMENT_CLASSES[0].id,
    waterId: WATER_TYPES[0].id,
    density: 15.6,
    saltPct: 0,
    totalVolume: 100,
    totalVolumeUnit: 'sk',
    additives: [{ additiveId: CEMENT_ADDITIVES[0].id, pct: 8 }],
  }

  const formEl = el('div', { class: 'calc-form' })
  const resultsEl = el('div', { class: 'calc-results' })

  function renderResults() {
    clear(resultsEl)
    try {
      const cls = CEMENT_CLASSES.find((c) => c.id === state.classId)
      const water = WATER_TYPES.find((w) => w.id === state.waterId)
      const saltAvf = state.saltPct > 0 ? nacl_avf(state.saltPct) : 0
      const additives = state.additives
        .filter((a) => a.additiveId && a.pct)
        .map((a) => {
          const add = CEMENT_ADDITIVES.find((x) => x.id === a.additiveId)
          return { pctByWtCement: Number(a.pct), avfGalLb: add.avfGalLb }
        })

      const out = slurryDesign({
        cementLbPerSack: cls.lbPerSack,
        cementAvfGalLb: cls.avfGalLb,
        additives,
        desiredDensityPpg: Number(state.density),
        waterAvfGalLb: water.avfGalLb,
        saltPctByWtWater: Number(state.saltPct) || 0,
        saltAvfGalLb: saltAvf,
      })

      if (out.waterLb <= 0 || !Number.isFinite(out.waterLb)) {
        throw new Error(
          'La densidad deseada no es alcanzable con esta mezcla (revisá densidad y aditivos).'
        )
      }

      const rows = [
        { label: 'Agua de mezcla', value: out.waterLb, unit: 'lb/sk', digits: 2 },
        { label: 'Agua de mezcla', value: out.waterGal, unit: 'gal/sk', digits: 2 },
      ]
      if (out.saltLb > 0) {
        rows.push({ label: 'Sal (NaCl)', value: out.saltLb, unit: 'lb/sk', digits: 2 })
      }
      rows.push(
        { label: 'Rendimiento (Yield)', value: out.yieldGal, unit: 'gal/sk', digits: 3 },
        { label: 'Rendimiento (Yield)', value: out.yieldCuft, unit: 'ft³/sk', digits: 3 },
        { label: 'Densidad de verificación', value: out.checkDensityPpg, unit: 'lb/gal', digits: 3 },
        { label: 'Peso total de la lechada', value: out.totalLb, unit: 'lb/sk', digits: 1 }
      )

      let volNeeded = Number(state.totalVolume) || 0
      let sacks
      if (state.totalVolumeUnit === 'sk') {
        sacks = volNeeded
      } else if (state.totalVolumeUnit === 'ft3') {
        sacks = volNeeded / out.yieldCuft
      } else if (state.totalVolumeUnit === 'bbl') {
        sacks = (volNeeded * 5.6146) / out.yieldCuft
      }
      if (sacks) {
        rows.push({ label: 'Sacos necesarios', value: sacks, unit: 'sacos', digits: 1 })
        rows.push({ label: 'Agua total necesaria', value: sacks * out.waterGal, unit: 'gal', digits: 0 })
        if (state.saltPct > 0) {
          rows.push({ label: 'Sal total necesaria', value: sacks * out.saltLb, unit: 'lb', digits: 0 })
        }
      }

      resultsEl.appendChild(
        el(
          'div',
          { class: 'result-card' },
          rows.map((r) =>
            el('div', { class: 'result-row' }, [
              el('span', { class: 'result-label' }, r.label),
              el('span', { class: 'result-value' }, [
                el('strong', {}, fmt(r.value, r.digits ?? 4)),
                el('span', { class: 'result-unit' }, ' ' + r.unit),
              ]),
            ])
          )
        )
      )
    } catch (err) {
      resultsEl.appendChild(el('p', { class: 'note note-error' }, err.message || String(err)))
    }
  }

  function renderAdditiveRow(row, index) {
    const select = el(
      'select',
      {
        onChange: (e) => {
          row.additiveId = e.target.value
          renderResults()
        },
      },
      CEMENT_ADDITIVES.map((a) =>
        el('option', { value: a.id, selected: a.id === row.additiveId }, a.label)
      )
    )
    const pctInput = el('input', {
      type: 'number',
      step: 'any',
      value: row.pct,
      inputmode: 'decimal',
      onInput: (e) => {
        row.pct = e.target.value
        renderResults()
      },
    })
    const removeBtn = el(
      'button',
      {
        type: 'button',
        class: 'btn-icon',
        onClick: () => {
          state.additives.splice(index, 1)
          renderForm()
          renderResults()
        },
      },
      '✕'
    )
    return el('div', { class: 'additive-row' }, [
      select,
      el('label', { class: 'field field-inline' }, [
        el('span', { class: 'field-label' }, '% s/ peso cemento'),
        pctInput,
      ]),
      removeBtn,
    ])
  }

  function renderForm() {
    clear(formEl)

    const classSelect = el(
      'select',
      { onChange: (e) => { state.classId = e.target.value; renderResults() } },
      CEMENT_CLASSES.map((c) => el('option', { value: c.id, selected: c.id === state.classId }, c.label))
    )
    const waterSelect = el(
      'select',
      { onChange: (e) => { state.waterId = e.target.value; renderResults() } },
      WATER_TYPES.map((w) => el('option', { value: w.id, selected: w.id === state.waterId }, w.label))
    )
    const densityInput = el('input', {
      type: 'number', step: 'any', value: state.density, inputmode: 'decimal',
      onInput: (e) => { state.density = e.target.value; renderResults() },
    })
    const saltInput = el('input', {
      type: 'number', step: 'any', value: state.saltPct, inputmode: 'decimal',
      onInput: (e) => { state.saltPct = e.target.value; renderResults() },
    })

    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Cemento'), classSelect]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Agua'), waterSelect]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Densidad deseada (lb/gal)'), densityInput]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Sal, % sobre peso de agua'), saltInput]))

    formEl.appendChild(el('div', { class: 'field-label section-label' }, 'Aditivos (% sobre peso de cemento)'))
    const additivesWrap = el('div', { class: 'additives-wrap' }, state.additives.map((row, i) => renderAdditiveRow(row, i)))
    formEl.appendChild(additivesWrap)
    formEl.appendChild(
      el('button', {
        type: 'button', class: 'btn-secondary',
        onClick: () => {
          state.additives.push({ additiveId: CEMENT_ADDITIVES[0].id, pct: 0 })
          renderForm()
          renderResults()
        },
      }, '+ Agregar aditivo')
    )

    formEl.appendChild(el('div', { class: 'field-label section-label' }, 'Volumen total de lechada a preparar'))
    const volInput = el('input', {
      type: 'number', step: 'any', value: state.totalVolume, inputmode: 'decimal',
      onInput: (e) => { state.totalVolume = e.target.value; renderResults() },
    })
    const unitSelect = el(
      'select',
      { onChange: (e) => { state.totalVolumeUnit = e.target.value; renderResults() } },
      [
        el('option', { value: 'sk', selected: state.totalVolumeUnit === 'sk' }, 'sacos'),
        el('option', { value: 'ft3', selected: state.totalVolumeUnit === 'ft3' }, 'pies³'),
        el('option', { value: 'bbl', selected: state.totalVolumeUnit === 'bbl' }, 'barriles'),
      ]
    )
    formEl.appendChild(el('div', { class: 'row' }, [
      el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Cantidad'), volInput]),
      el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Unidad'), unitSelect]),
    ]))
  }

  renderForm()
  renderResults()
  container.appendChild(
    el('p', { class: 'calc-description' },
      'Método de volumen absoluto: a partir de la densidad deseada, calcula el agua de mezcla y el rendimiento (yield) de la lechada.'
    )
  )
  container.appendChild(formEl)
  container.appendChild(resultsEl)
}

export const section5 = {
  id: 'cement',
  title: 'Cemento',
  icon: '🧱',
  summary: 'Diseño de lechadas de cemento por el método de volumen absoluto.',
  formulaNote:
    'Densidad = peso total / volumen total. Agua (lb/sk) = [sólidos(lb) − densidad·sólidos(gal)] / [densidad·(AVF agua + %sal·AVF sal) − 1 − %sal]',
  calculators: [
    {
      id: 'slurry-design',
      title: 'Diseño de Lechada (Volumen Absoluto)',
      custom: true,
      mount: mountCementCalculator,
    },
  ],
}
