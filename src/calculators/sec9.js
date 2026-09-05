import {
  buoyancyFactor,
  apparentWeightInFluid,
  hydrostaticPressure,
  apiGravity,
  specificGravityFromApi,
  bottomHoleFracPressure,
  surfaceTreatingPressure,
  fractureGradient,
  balancedPlugHeight,
  darcyOilRateBblDay,
  pipeDisplacementBbl,
  pipeDisplacementCuFt,
} from '../calc/generalCalc.js'
import { capacityFactors, annulusFactors } from '../calc/geometry.js'
import { ALL_PIPES } from '../data/pipes.js'
import { UNIT_CATEGORIES, convertTemperature, VISCOSITY_TABLE } from '../data/units.js'
import { el, fmt, clear } from '../ui/dom.js'
import { density, lengthFt, lengthFtResult, lengthIn, pressure, pressureResult, volumeResult, weight, weightPerLength, weightResult } from '../ui/fieldHelpers.js'

const categoryNames = Object.keys(UNIT_CATEGORIES)

function mountUnitConverter(container) {
  clear(container)
  const state = { category: categoryNames[0], from: null, to: null, value: 1 }
  const units = () => Object.keys(UNIT_CATEGORIES[state.category])
  state.from = units()[0]
  state.to = units()[1]

  const formEl = el('div', { class: 'calc-form' })
  const resultsEl = el('div', { class: 'calc-results' })

  function renderResults() {
    clear(resultsEl)
    const factors = UNIT_CATEGORIES[state.category]
    const val = Number(state.value) || 0
    const out = (val * factors[state.from]) / factors[state.to]
    resultsEl.appendChild(
      el('div', { class: 'result-card' }, [
        el('div', { class: 'result-row' }, [
          el('span', { class: 'result-label' }, `${fmt(val, 6)} ${state.from} =`),
          el('span', { class: 'result-value' }, [el('strong', {}, fmt(out, 6)), el('span', { class: 'result-unit' }, ' ' + state.to)]),
        ]),
      ])
    )
  }

  function renderForm() {
    clear(formEl)
    const catSelect = el(
      'select',
      {
        onChange: (e) => {
          state.category = e.target.value
          state.from = units()[0]
          state.to = units()[1]
          renderForm()
          renderResults()
        },
      },
      categoryNames.map((c) => el('option', { value: c, selected: c === state.category }, c))
    )
    const fromSelect = el(
      'select',
      { onChange: (e) => { state.from = e.target.value; renderResults() } },
      units().map((u) => el('option', { value: u, selected: u === state.from }, u))
    )
    const toSelect = el(
      'select',
      { onChange: (e) => { state.to = e.target.value; renderResults() } },
      units().map((u) => el('option', { value: u, selected: u === state.to }, u))
    )
    const valueInput = el('input', {
      type: 'number', step: 'any', value: state.value, inputmode: 'decimal',
      onInput: (e) => { state.value = e.target.value; renderResults() },
    })
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Categoría'), catSelect]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Tengo'), fromSelect]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Quiero'), toSelect]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Valor'), valueInput]))
  }

  renderForm()
  renderResults()
  container.appendChild(formEl)
  container.appendChild(resultsEl)
}

function mountTemperatureConverter(container) {
  clear(container)
  const state = { from: 'F', to: 'C', value: 100 }
  const labels = { F: '°Fahrenheit', C: '°Celsius', K: 'Kelvin' }
  const formEl = el('div', { class: 'calc-form' })
  const resultsEl = el('div', { class: 'calc-results' })

  function renderResults() {
    clear(resultsEl)
    const out = convertTemperature(Number(state.value) || 0, state.from, state.to)
    resultsEl.appendChild(
      el('div', { class: 'result-card' }, [
        el('div', { class: 'result-row' }, [
          el('span', { class: 'result-label' }, `${fmt(Number(state.value) || 0, 2)} ${labels[state.from]} =`),
          el('span', { class: 'result-value' }, [el('strong', {}, fmt(out, 3)), el('span', { class: 'result-unit' }, ' ' + labels[state.to])]),
        ]),
      ])
    )
  }
  function renderForm() {
    clear(formEl)
    const opts = (selected) => Object.keys(labels).map((k) => el('option', { value: k, selected: k === selected }, labels[k]))
    const fromSelect = el('select', { onChange: (e) => { state.from = e.target.value; renderResults() } }, opts(state.from))
    const toSelect = el('select', { onChange: (e) => { state.to = e.target.value; renderResults() } }, opts(state.to))
    const valueInput = el('input', {
      type: 'number', step: 'any', value: state.value, inputmode: 'decimal',
      onInput: (e) => { state.value = e.target.value; renderResults() },
    })
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Tengo'), fromSelect]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Quiero'), toSelect]))
    formEl.appendChild(el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Valor'), valueInput]))
  }
  renderForm()
  renderResults()
  container.appendChild(formEl)
  container.appendChild(resultsEl)
}

export const section9 = {
  id: 'general',
  title: 'Fórmulas y Conversiones',
  icon: '🧮',
  summary: 'Boyancia, presión hidrostática, hidráulica de tratamiento, tapón balanceado, Darcy y conversión de unidades.',
  formulaNote: 'Boyancia = 1 − 0.015·(lb/gal). Ph (psi) = 0.052·(lb/gal)·altura(ft). °API = 141.5/SG − 131.5.',
  calculators: [
    {
      id: 'buoyancy',
      title: 'Factor de Boyancia y Peso Aparente',
      inputs: [
        density('mudWeight', 'Peso del fluido', { step: 0.01, default: 10 }),
        weight('airWeight', 'Peso al aire (opcional)', { step: 1 }),
      ],
      compute(v) {
        if (!v.mudWeight) throw new Error('Ingresá el peso del fluido.')
        const bf = buoyancyFactor(v.mudWeight)
        const results = [{ label: 'Factor de boyancia', value: bf, unit: '', digits: 4 }]
        if (v.airWeight) {
          results.push(weightResult('Peso aparente en fluido', apparentWeightInFluid(v.airWeight, v.mudWeight), { digits: 1 }))
        }
        return { results }
      },
    },
    {
      id: 'hydrostatic',
      title: 'Presión Hidrostática',
      inputs: [
        density('ppg', 'Peso del fluido', { step: 0.01, default: 9 }),
        lengthFt('height', 'Altura de columna', { step: 1, default: 5000 }),
      ],
      compute(v) {
        if (!v.ppg) throw new Error('Ingresá el peso del fluido.')
        const psiPerFt = 0.052 * v.ppg
        const results = [{ label: 'Gradiente', value: psiPerFt, unit: 'psi/ft', digits: 4 }]
        if (v.height) results.push(pressureResult('Presión hidrostática', hydrostaticPressure(v.ppg, v.height), { digits: 1 }))
        return { results }
      },
    },
    {
      id: 'treatment-hydraulics',
      title: 'Hidráulica de Tratamiento (Frac)',
      inputs: [
        pressure('isip', 'ISIP', { step: 1, default: 3000 }),
        density('ppg', 'Peso del fluido', { step: 0.01, default: 9 }),
        lengthFt('depth', 'Profundidad', { step: 1, default: 8000 }),
        pressure('pf', 'Fricción en tubería (Pf)', { step: 1, default: 0 }),
        pressure('ppf', 'Fricción de perforaciones (Ppf)', { step: 1, default: 0 }),
      ],
      compute(v) {
        if (!v.isip || !v.depth) throw new Error('Completá ISIP y profundidad.')
        const ph = hydrostaticPressure(v.ppg || 0, v.depth)
        const bhfp = bottomHoleFracPressure(v.isip, ph)
        const stp = surfaceTreatingPressure(v.isip, v.pf || 0, v.ppf || 0)
        const fg = fractureGradient(v.isip, ph, v.depth)
        return {
          results: [
            pressureResult('Presión hidrostática (Ph)', ph, { digits: 1 }),
            pressureResult('BHFP (presión de frac. de fondo)', bhfp, { digits: 1 }),
            pressureResult('STP (presión de superficie)', stp, { digits: 1 }),
            { label: 'Gradiente de fractura', value: fg, unit: 'psi/ft', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'api-gravity',
      title: 'Gravedad API ↔ Gravedad Específica',
      inputs: [
        { type: 'number', id: 'sg', label: 'Gravedad específica', step: 0.001, default: 0.85 },
      ],
      compute(v) {
        if (!v.sg) throw new Error('Ingresá la gravedad específica.')
        return {
          results: [
            { label: 'Gravedad API', value: apiGravity(v.sg), unit: '°API', digits: 2 },
            { label: 'Verificación (SG desde °API)', value: specificGravityFromApi(apiGravity(v.sg)), unit: '', digits: 4 },
          ],
        }
      },
    },
    {
      id: 'balanced-plug',
      title: 'Tapón Balanceado (Balanced Plug)',
      description: 'Altura de la lechada con la sarta de trabajo adentro, dado el volumen total de cemento.',
      diagram: { kind: 'annulusCrossSection', labels: { outer: 'D', inner: 'd' } },
      inputs: [
        { type: 'number', id: 'totalCuFt', label: 'Volumen total de lechada', unit: 'ft³', step: 0.1, default: 50 },
        {
          type: 'pipePreset', id: 'workString', label: 'Sarta de trabajo (ID)', dataset: ALL_PIPES,
          odField: 'wsOd', idField: 'wsId',
        },
        lengthIn('annulusD', 'Diámetro exterior del anular (pozo o ID casing)', { step: 0.001, default: 8.5 }),
      ],
      compute(v) {
        if (!v.totalCuFt || !v.wsId || !v.annulusD) throw new Error('Completá todos los campos.')
        const cfWs = capacityFactors(v.wsId).cuftPerFt
        const cfAnnulus = annulusFactors(v.annulusD, v.wsOd).cuftPerFt
        const height = balancedPlugHeight(v.totalCuFt, cfWs, cfAnnulus)
        return {
          results: [
            { label: 'Capacidad sarta de trabajo', value: cfWs, unit: 'ft³/ft', digits: 5 },
            { label: 'Capacidad anular', value: cfAnnulus, unit: 'ft³/ft', digits: 5 },
            lengthFtResult('Altura del tapón (sarta adentro)', height, { digits: 1 }),
          ],
        }
      },
    },
    {
      id: 'darcy-oil',
      title: "Darcy — Caudal Radial de Petróleo",
      description: 'Fórmula estándar de flujo radial en régimen permanente, unidades de campo.',
      inputs: [
        { type: 'number', id: 'k', label: 'Permeabilidad (k)', unit: 'md', step: 0.1, default: 50 },
        lengthFt('h', 'Espesor de la formación (h)', { step: 0.1, default: 20 }),
        pressure('dp', 'Pe − Pwf', { step: 1, default: 500 }),
        { type: 'number', id: 'mu', label: 'Viscosidad del petróleo', unit: 'cp', step: 0.01, default: 2 },
        { type: 'number', id: 'bo', label: 'Factor volumétrico (Bo)', unit: 'rb/stb', step: 0.01, default: 1.2 },
        lengthFt('re', 'Radio de drenaje (re)', { step: 1, default: 1000 }),
        lengthFt('rw', 'Radio de pozo (rw)', { step: 0.01, default: 0.354 }),
      ],
      compute(v) {
        if (!v.k || !v.h || !v.mu || !v.bo || !v.re || !v.rw) throw new Error('Completá todos los campos.')
        const q = darcyOilRateBblDay(v.k, v.h, v.dp, v.mu, v.bo, v.re, v.rw)
        return { results: [{ label: 'Caudal estimado', value: q, unit: 'bbl/día', digits: 1 }] }
      },
    },
    {
      id: 'pipe-displacement',
      title: 'Desplazamiento de Tubería (metal)',
      inputs: [
        weightPerLength('wt', 'Peso con acoples', { step: 0.01, default: 15.5 }),
        lengthFt('depth', 'Profundidad / longitud', { step: 1, default: 5000 }),
      ],
      compute(v) {
        if (!v.wt || !v.depth) throw new Error('Completá peso y profundidad.')
        return {
          results: [
            { label: 'Desplazamiento', value: pipeDisplacementCuFt(v.wt, v.depth), unit: 'ft³', digits: 2 },
            volumeResult('Desplazamiento', pipeDisplacementBbl(v.wt, v.depth), { digits: 3 }),
          ],
        }
      },
    },
    {
      id: 'unit-converter',
      title: 'Conversor de Unidades',
      custom: true,
      mount: mountUnitConverter,
    },
    {
      id: 'temperature-converter',
      title: 'Conversor de Temperatura',
      custom: true,
      mount: mountTemperatureConverter,
    },
    {
      id: 'viscosity-converter',
      title: 'Conversor de Viscosidad',
      description: 'Interpola entre Saybolt Universal Seconds, grados Engler y centipoise.',
      inputs: [{ type: 'number', id: 'sus', label: 'Saybolt Universal Seconds', step: 1, default: 100 }],
      compute(v) {
        if (!v.sus) throw new Error('Ingresá SUS.')
        const rows = VISCOSITY_TABLE
        const s = Math.min(Math.max(v.sus, rows[0].sus), rows[rows.length - 1].sus)
        let out = rows[rows.length - 1]
        for (let i = 0; i < rows.length - 1; i++) {
          const a = rows[i], b = rows[i + 1]
          if (s >= a.sus && s <= b.sus) {
            const t = (s - a.sus) / (b.sus - a.sus)
            out = { engler: a.engler + t * (b.engler - a.engler), cp: a.cp + t * (b.cp - a.cp) }
            break
          }
        }
        return {
          results: [
            { label: 'Grados Engler', value: out.engler, unit: '°E', digits: 3 },
            { label: 'Centipoise (relativo, × SG del fluido)', value: out.cp, unit: 'cp', digits: 2 },
          ],
        }
      },
    },
    {
      id: 'decimal-equivalents',
      title: 'Equivalentes Decimales de Fracciones',
      inputs: [
        { type: 'number', id: 'num', label: 'Numerador', step: 1, default: 11 },
        { type: 'number', id: 'den', label: 'Denominador', step: 1, default: 16 },
      ],
      compute(v) {
        if (!v.num || !v.den) throw new Error('Completá numerador y denominador.')
        const dec = v.num / v.den
        const nearest64 = Math.round(dec * 64)
        return {
          results: [
            { label: 'Decimal', value: dec, unit: '', digits: 5 },
            { label: 'Equivalente más cercano en 64avos', value: nearest64, unit: `/64 = ${(nearest64 / 64).toFixed(5)}`, digits: 0 },
          ],
        }
      },
    },
  ],
}
