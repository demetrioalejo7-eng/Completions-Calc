// Simulador de pesos RIH / POOH para coiled tubing (lavado post-frac).
// UI over src/calc/ctForces.js with the field-calibrated terms of
// src/data/ctCalibration.js.
import { el, fmt, clear } from './dom.js'
import { simulateTrip, maxSetDown, buildString, tubeProps, kopLp } from '../calc/ctForces.js'
import { readSurveyFile, parseSurveyTable, splitTable, parseRunCsv } from '../calc/ctDataParsers.js'
import { STANDARD_STRING_2375, DEFAULT_BHA } from '../data/ctSimDefaults.js'
import { CT_CALIBRATION, MU_LEVELS, ERT_LEVELS } from '../data/ctCalibration.js'
import { CT_GRADES } from '../data/ctStrength.js'
import { matchRun, matchSurfaceReadings } from '../calc/ctRunMatch.js'

const CASING_PRESETS = [
  { label: '5" 18 lb/ft (ID 4.276")', id: 4.276 },
  { label: '5" 21.4 lb/ft (ID 4.126")', id: 4.126 },
  { label: '5" 23.2 lb/ft (ID 4.044")', id: 4.044 },
  { label: '5 1/2" 20 lb/ft (ID 4.778")', id: 4.778 },
  { label: '5 1/2" 23 lb/ft (ID 4.670")', id: 4.67 },
  { label: '5 1/2" 26 lb/ft (ID 4.548")', id: 4.548 },
]

const M_TO_FT = 3.28084

function numField(label, value, onInput, { unit, step = 'any', hint } = {}) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, label + (unit ? ` (${unit})` : '')),
    el('input', { type: 'number', step, value: value ?? '', inputmode: 'decimal', onInput: (e) => onInput(e.target.value === '' ? null : Number(e.target.value)) }),
    hint ? el('span', { class: 'ctsim-hint' }, hint) : null,
  ])
}

function selectField(label, options, value, onChange) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, label),
    el('select', { onChange: (e) => onChange(e.target.value) }, options.map((o) => el('option', { value: o.value, selected: String(o.value) === String(value) }, o.label))),
  ])
}

function card(title, children, { open = true } = {}) {
  return el('details', { class: 'ctsim-card', open }, [el('summary', {}, title), el('div', { class: 'ctsim-card-body' }, children)])
}

export function mountCtSimulator(container) {
  clear(container)
  const cal = CT_CALIBRATION
  const state = {
    survey: null,
    surveyName: '',
    surveyText: '',
    casingId: 4.126,
    string: JSON.parse(JSON.stringify(STANDARD_STRING_2375)),
    grade: 'DC-120',
    fluidPpg: 8.4,
    whp: 5000,
    ctp: 9000,
    rate: 4.0,
    returnRate: 3.7,
    muLevel: 'cal',
    muRIH: MU_LEVELS.cal.rih,
    muPOOH: MU_LEVELS.cal.pooh,
    stripper: cal.stripperLbf,
    rbtRIH: cal.reelTensionLbf,
    rbtPOOH: cal.reelTensionLbf,
    // speed plan per section (m/min): vertical to KOP, curve KOP–LP, lateral
    speeds: { vert: { RIH: 23, POOH: 23 }, curve: { RIH: 10, POOH: 10 }, lat: { RIH: 3.5, POOH: 10 } },
    ertLevel: cal.ertDefault,
    ert: ERT_LEVELS[cal.ertDefault].value,
    readings: { rihMd: 2900, rihW: null, poohMd: 3500, poohW: null },
    readingsMsg: '',
    bha: { ...DEFAULT_BHA },
    run: null,
    runName: '',
    match: null,
    error: '',
  }

  const formEl = el('div', { class: 'calc-form' })
  const resultsEl = el('div', { class: 'calc-results' })
  container.appendChild(
    el('p', { class: 'calc-description' }, 'Pesos esperados en el indicador durante la bajada (RIH) y la sacada (POOH) para cada profundidad. Modelo de fuerzas soft-string (base Orpheus/Cerberus) con fricción dependiente de la velocidad y calibrado con carreras reales de lavado post-frac.')
  )
  container.appendChild(formEl)
  container.appendChild(resultsEl)

  let timer = null
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(renderResults, 200)
  }
  const set = (k) => (v) => {
    state[k] = v
    schedule()
  }

  // ---- survey --------------------------------------------------------------
  function surveyCard() {
    const status = el('p', { class: 'note' }, state.survey ? `✓ ${state.surveyName}: ${state.survey.length} estaciones, TD ${fmt(state.survey[state.survey.length - 1][0], 1)} m MD, inc. máx. ${fmt(Math.max(...state.survey.map((r) => r[1])), 1)}°` : 'Cargá el survey (xlsx/csv) o pegalo desde Excel: columnas MD (m), Inc (°), Az (°).')
    const fileInput = el('input', {
      type: 'file',
      accept: '.xlsx,.csv,.txt',
      class: 'ctsim-file',
      onChange: async (e) => {
        const f = e.target.files[0]
        if (!f) return
        try {
          state.survey = await readSurveyFile(f)
          state.surveyName = f.name
          state.error = ''
        } catch (err) {
          state.error = err.message
        }
        renderForm()
        renderResults()
      },
    })
    const paste = el('textarea', {
      class: 'ctsim-textarea',
      rows: 3,
      placeholder: 'MD\tInc\tAz\n0\t0\t0\n500\t2.1\t185 …',
      onChange: (e) => {
        const txt = e.target.value
        if (!txt.trim()) return
        try {
          state.survey = parseSurveyTable(splitTable(txt))
          state.surveyName = 'Survey pegado'
          state.error = ''
        } catch (err) {
          state.error = err.message
        }
        renderForm()
        renderResults()
      },
    })
    return card('1 · Survey del pozo', [fileInput, paste, status])
  }

  // ---- well & string -------------------------------------------------------
  function wellCard() {
    const preset = CASING_PRESETS.find((c) => Math.abs(c.id - state.casingId) < 1e-4)
    return card('2 · Casing', [
      selectField('Casing (OD y libraje)', [...CASING_PRESETS.map((c) => ({ value: c.id, label: c.label })), { value: 'custom', label: 'Otro (ingresar ID)…' }], preset ? preset.id : 'custom', (v) => {
        if (v !== 'custom') state.casingId = Number(v)
        renderForm()
        schedule()
      }),
      preset ? null : numField('ID del casing', state.casingId, set('casingId'), { unit: 'in', step: 0.001 }),
    ])
  }

  function stringCard() {
    const s = state.string
    const total = s.sections.reduce((a, x) => a + (Number(x.length) || 0), 0)
    const rows = s.sections.map((sec, i) =>
      el('div', { class: 'ctsim-sec-row' }, [
        el('span', { class: 'ctsim-sec-idx' }, String(i + 1)),
        el('input', { type: 'number', step: 1, value: sec.length, 'aria-label': 'Longitud (m)', onInput: (e) => ((sec.length = Number(e.target.value)), schedule()) }),
        el('input', { type: 'number', step: 0.001, value: sec.wallStart, 'aria-label': 'Espesor inicial (in)', onInput: (e) => ((sec.wallStart = Number(e.target.value)), schedule()) }),
        el('input', { type: 'number', step: 0.001, value: sec.wallEnd, 'aria-label': 'Espesor final (in)', onInput: (e) => ((sec.wallEnd = Number(e.target.value)), schedule()) }),
        el('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Quitar sección', onClick: () => (s.sections.splice(i, 1), renderForm(), schedule()) }, '×'),
      ])
    )
    return card(
      '3 · Sarta de coiled tubing',
      [
        el('div', { class: 'row' }, [
          numField('OD', s.od, (v) => ((s.od = v), schedule()), { unit: 'in', step: 0.001 }),
          selectField('Grado', CT_GRADES.map((g) => ({ value: g.id, label: g.id })), state.grade, set('grade')),
        ]),
        el('div', { class: 'ctsim-sec-head' }, [el('span', {}, '#'), el('span', {}, 'Long. (m)'), el('span', {}, 'Pared inicio (in)'), el('span', {}, 'Pared fin (in)'), el('span', {}, '')]),
        ...rows,
        el('div', { class: 'row' }, [
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => (s.sections.push({ length: 500, wallStart: 0.175, wallEnd: 0.175 }), renderForm(), schedule()) }, '+ Sección'),
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => ((state.string = JSON.parse(JSON.stringify(STANDARD_STRING_2375))), renderForm(), schedule()) }, 'Sarta estándar'),
        ]),
        el('p', { class: 'note' }, `Secciones del core (carrete) al extremo libre (herramienta). Largo total ${fmt(total, 0)} m.`),
        el('div', { class: 'row' }, [
          numField('BHA: longitud', state.bha.length, (v) => ((state.bha.length = v || 0), schedule()), { unit: 'm', step: 0.1 }),
          numField('BHA: peso en aire', state.bha.weight, (v) => ((state.bha.weight = v || 0), schedule()), { unit: 'lb', step: 10 }),
        ]),
      ],
      { open: false }
    )
  }

  // ---- operation -----------------------------------------------------------
  function operationCard() {
    return card('4 · Parámetros operativos', [
      el('div', { class: 'row' }, [
        numField('Presión de pozo (WHP)', state.whp, set('whp'), { unit: 'psi', step: 50 }),
        numField('Presión de circulación', state.ctp, set('ctp'), { unit: 'psi', step: 100, hint: 'Solo para el chequeo de tensión' }),
      ]),
      el('div', { class: 'row' }, [
        numField('Caudal de bombeo', state.rate, (v) => {
          state.rate = v
          state.returnRate = v != null ? Math.max(0, +(v - 0.3).toFixed(2)) : null
          renderForm()
          schedule()
        }, { unit: 'bpm', step: 0.1 }),
        numField('Caudal de retorno', state.returnRate, set('returnRate'), { unit: 'bpm', step: 0.1, hint: 'Estándar: bombeo − 0,3' }),
      ]),
      numField('Densidad del fluido (slickwater)', state.fluidPpg, set('fluidPpg'), { unit: 'ppg', step: 0.01 }),
      speedPlan(),
    ])
  }

  function speedPlan() {
    const { kop, lp } = state.survey ? kopLp(state.survey) : { kop: null, lp: null }
    const zones = [
      ['vert', `Vertical (0–${kop ? fmt(kop, 0) : 'KOP'} m)`],
      ['curve', `Curva (${kop ? fmt(kop, 0) : 'KOP'}–${lp ? fmt(lp, 0) : 'LP'} m)`],
      ['lat', `Lateral (${lp ? fmt(lp, 0) : 'LP'} m–TD)`],
    ]
    const inp = (z, dir) =>
      el('input', {
        type: 'number',
        step: 0.5,
        value: state.speeds[z][dir],
        inputmode: 'decimal',
        'aria-label': `Velocidad ${dir} ${z} (m/min)`,
        onInput: (e) => ((state.speeds[z][dir] = Number(e.target.value) || 0.1), schedule()),
      })
    return el('div', { class: 'field' }, [
      el('span', { class: 'field-label' }, 'Velocidad de tubería por tramo (m/min)'),
      el('div', { class: 'ctsim-speed-grid' }, [
        el('span', {}, ''),
        el('span', { class: 'ctsim-speed-h' }, 'RIH'),
        el('span', { class: 'ctsim-speed-h' }, 'POOH'),
        ...zones.flatMap(([z, label]) => [el('span', { class: 'ctsim-speed-z' }, label), inp(z, 'RIH'), inp(z, 'POOH')]),
      ]),
      el('span', { class: 'ctsim-hint' }, '1 m/min = 3,28 ft/min. La velocidad es la de toda la sarta y depende de dónde está la herramienta; es un factor clave en el lateral.'),
    ])
  }

  function speedAtFn() {
    const { kop, lp } = kopLp(state.survey)
    return (d, dir) => {
      const z = kop === null || d <= kop ? 'vert' : d <= lp ? 'curve' : 'lat'
      return Math.max(0.1, state.speeds[z][dir] || 0.1)
    }
  }

  function frictionCard() {
    return card('5 · Fricción, ERT y equipo de superficie', [
      selectField(
        'Coeficiente de fricción CT–casing',
        Object.entries(MU_LEVELS).map(([k, m]) => ({ value: k, label: `${m.label} — µ ${m.rih.toFixed(2)}` })).concat([{ value: 'custom', label: 'Personalizado…' }]),
        state.muLevel,
        (v) => {
          state.muLevel = v
          if (v !== 'custom') {
            state.muRIH = MU_LEVELS[v].rih
            state.muPOOH = MU_LEVELS[v].pooh
          }
          renderForm()
          schedule()
        }
      ),
      state.muLevel === 'custom'
        ? el('div', { class: 'row' }, [numField('µ RIH', state.muRIH, set('muRIH'), { step: 0.01 }), numField('µ POOH', state.muPOOH, set('muPOOH'), { step: 0.01 })])
        : el('p', { class: 'note' }, `µ RIH ${state.muRIH.toFixed(3)} · µ POOH ${state.muPOOH.toFixed(3)} (la sacada usa un µ menor: en RIH la curvatura residual del CT agrega contacto con el casing).`),
      selectField(
        'Herramienta de alcance extendido (ERT)',
        Object.entries(ERT_LEVELS).map(([k, e]) => ({ value: k, label: e.label })).concat([{ value: 'custom', label: 'Personalizado…' }]),
        state.ertLevel,
        (v) => {
          state.ertLevel = v
          if (v !== 'custom') state.ert = ERT_LEVELS[v].value
          renderForm()
          schedule()
        }
      ),
      state.ertLevel === 'custom' ? numField('Reducción de fricción ERT', state.ert, set('ert'), { unit: 'lbf/bpm', step: 50 }) : null,
      numField('Fuerza de fricción del stripper', state.stripper, set('stripper'), { unit: 'lbf', step: 250 }),
      el('div', { class: 'row' }, [
        numField('Tensión del reel RIH', state.rbtRIH, set('rbtRIH'), { unit: 'lbf', step: 100 }),
        numField('Tensión del reel POOH', state.rbtPOOH, set('rbtPOOH'), { unit: 'lbf', step: 100 }),
      ]),
    ])
  }

  function readingsCard() {
    const rd = state.readings
    const setR = (k) => (v) => (rd[k] = v)
    return card(
      '6 · Ajuste con lecturas de campo (opcional)',
      [
        el('p', { class: 'note' }, 'Con una lectura RIH (p. ej. al llegar a KOP) y una lectura POOH (p. ej. el pull test en el LP) se recalculan la fricción del stripper y la tensión del reel, que cambian en cada trabajo.'),
        el('div', { class: 'row' }, [numField('Prof. lectura RIH', rd.rihMd, setR('rihMd'), { unit: 'm', step: 10 }), numField('Peso RIH leído', rd.rihW, setR('rihW'), { unit: 'lb', step: 100 })]),
        el('div', { class: 'row' }, [numField('Prof. lectura POOH', rd.poohMd, setR('poohMd'), { unit: 'm', step: 10 }), numField('Peso POOH leído', rd.poohW, setR('poohW'), { unit: 'lb', step: 100 })]),
        el('button', { class: 'btn-secondary', type: 'button', onClick: fitReadings }, 'Ajustar stripper y reel'),
        state.readingsMsg ? el('p', { class: 'note' }, state.readingsMsg) : null,
      ],
      { open: !!state.readingsMsg }
    )
  }

  function fitReadings() {
    const rd = state.readings
    if (!state.survey) return
    if ([rd.rihMd, rd.rihW, rd.poohMd, rd.poohW].some((v) => v === null || v === undefined || Number.isNaN(v))) {
      state.readingsMsg = 'Completá las dos profundidades y los dos pesos leídos.'
    } else {
      try {
        const r = matchSurfaceReadings(params(state.muRIH, state.muPOOH), cal.model, { md: rd.rihMd, w: rd.rihW }, { md: rd.poohMd, w: rd.poohW })
        state.stripper = r.stripperLbf
        state.rbtRIH = r.reelTension
        state.rbtPOOH = r.reelTension
        state.readingsMsg = `Stripper ${fmt(r.stripperLbf, 0)} lbf · reel ${fmt(r.reelTension, 0)} lbf (cargados en el formulario).${r.stripperLbf < 0 ? ' ⚠ Stripper negativo: revisá las lecturas o el µ.' : ''}`
      } catch (err) {
        state.readingsMsg = err.message
      }
    }
    renderForm()
    renderResults()
  }

  function runCard() {
    const fileInput = el('input', {
      type: 'file',
      accept: '.csv,.txt',
      class: 'ctsim-file',
      onChange: async (e) => {
        const f = e.target.files[0]
        if (!f) return
        try {
          state.run = parseRunCsv(await f.text())
          state.runName = f.name
          state.error = ''
        } catch (err) {
          state.error = err.message
        }
        renderForm()
        renderResults()
      },
    })
    return card(
      '7 · Comparar con una carrera real (opcional)',
      [
        fileInput,
        el('p', { class: 'note' }, state.run ? `✓ ${state.runName}: ${state.run.points.length} puntos (medianas cada 25 m en movimiento estable).` : 'CSV del sistema de adquisición (columnas de Peso y Profundidad; Velocidad opcional). Se grafica sobre la simulación.'),
        state.run && state.survey
          ? el('button', { class: 'btn-secondary', type: 'button', onClick: fitRun }, 'Ajustar µ, stripper y reel a esta carrera')
          : null,
        state.match
          ? el('p', { class: 'note' }, `Ajuste: µ RIH ${state.match.muRIH.toFixed(2)} · µ POOH ${state.match.muPOOH.toFixed(2)} · stripper ${fmt(state.match.stripperLbf, 0)} lbf · reel ${fmt(state.match.reelTension, 0)} lbf. Error mediano ${fmt(state.match.maeRIH, 0)} lb RIH / ${fmt(state.match.maePOOH, 0)} lb POOH (${state.match.nRIH + state.match.nPOOH} puntos). Valores cargados en el formulario.`)
          : null,
        state.run ? el('button', { class: 'btn-secondary', type: 'button', onClick: () => ((state.run = null), (state.match = null), renderForm(), renderResults()) }, 'Quitar carrera') : null,
      ],
      { open: !!state.run }
    )
  }

  function fitRun() {
    try {
      // use the run's own median speeds for the match
      const m = matchRun(params(state.muRIH, state.muPOOH), cal.model, state.run.points)
      state.match = m
      state.muLevel = 'custom'
      state.muRIH = m.muRIH
      state.muPOOH = m.muPOOH
      state.stripper = Math.max(0, m.stripperLbf)
      state.rbtRIH = m.reelTension
      state.rbtPOOH = m.reelTension
      state.error = ''
    } catch (err) {
      state.error = err.message
    }
    renderForm()
    renderResults()
  }

  function renderForm() {
    clear(formEl)
    formEl.append(surveyCard(), wellCard(), stringCard(), operationCard(), frictionCard(), readingsCard(), runCard())
  }

  // ---- results -------------------------------------------------------------
  function params(muRIH, muPOOH) {
    return {
      survey: state.survey,
      casing: [{ top: 0, bottom: 1e9, id: state.casingId }],
      string: state.string,
      fluidPpg: state.fluidPpg,
      whp: state.whp || 0,
      rateBpm: state.rate || 0,
      returnRateBpm: state.returnRate ?? state.rate,
      muRIH,
      muPOOH,
      speedRIH: state.speeds.lat.RIH || 0.1,
      speedPOOH: state.speeds.lat.POOH || 0.1,
      speedAt: speedAtFn(),
      ertLbfPerBpm: state.ert || 0,
      stripperLbf: state.stripper || 0,
      reelTensionRIH: state.rbtRIH || 0,
      reelTensionPOOH: state.rbtPOOH || 0,
      bha: state.bha,
      outStepM: 50,
    }
  }

  function renderResults() {
    clear(resultsEl)
    if (state.error) resultsEl.appendChild(el('p', { class: 'note note-error' }, state.error))
    if (!state.survey) {
      resultsEl.appendChild(el('p', { class: 'note' }, 'Cargá un survey para ver la simulación.'))
      return
    }
    let base, lo, hi, setDown
    try {
      const ratio = state.muPOOH / state.muRIH
      base = simulateTrip(params(state.muRIH, state.muPOOH), cal.model)
      lo = simulateTrip(params(state.muRIH - 0.05, (state.muRIH - 0.05) * ratio), cal.model)
      hi = simulateTrip(params(state.muRIH + 0.05, (state.muRIH + 0.05) * ratio), cal.model)
      const td = base.rows[base.rows.length - 1].depth
      setDown = maxSetDown(params(state.muRIH, state.muPOOH), td, cal.model)
    } catch (err) {
      resultsEl.appendChild(el('p', { class: 'note note-error' }, err.message))
      return
    }
    resultsEl.appendChild(chart(base, lo, hi))
    resultsEl.appendChild(summary(base, setDown))
    resultsEl.appendChild(speedTable())
    resultsEl.appendChild(depthTable(base, lo, hi))
    resultsEl.appendChild(
      el('p', { class: 'formula-note' }, [
        'Modelo: dF/ds = W_B·cosθ ± µ(v)·F_N, con F_N por peso y curvatura (Johancsik / CTES Orpheus), pandeo helicoidal y contacto adicional r_c·F²/(4EI) en compresión. ',
        'Peso en superficie = F_E − WHP·A_o ∓ stripper − tensión del reel. ',
        `µ(v) = µ·[1 + k·ln(v/${cal.model.speedRef} m/min)] (k RIH ${cal.model.speedCoefRIH}, k POOH ${cal.model.speedCoefPOOH}); término de superficie ≈ +${Math.round((cal.model.speedSurfPOOH - cal.model.speedSurfRIH) / 2)} lb por m/min. ERT: reducción de arrastre k_ERT·caudal en los ${cal.model.ertZoneM} m sobre la herramienta. `,
        'La banda sombreada es µ ± 0,05. ',
        cal.note,
      ])
    )
  }

  function summary(base, setDown) {
    const rows = base.rows
    const last = rows[rows.length - 1]
    const lpRow = state.survey.find((s) => s[1] >= 80)
    const lp = lpRow ? lpRow[0] : 0
    const valid = rows.filter((r) => r.rih !== null && r.depth >= lp)
    const minRih = valid.length ? valid.reduce((a, r) => (r.rih < a.rih ? r : a), valid[0]) : { rih: NaN, depth: NaN }
    const lock = rows.find((r) => r.lockup)
    const helix = rows.find((r) => r.helixM > 0)
    const str = buildString(state.string)
    const grade = CT_GRADES.find((g) => g.id === state.grade) || CT_GRADES[0]
    // real axial force above the stripper at max POOH: F_R = Weight + P_i·A_i + RBT (Tech Note Eq 17)
    const maxPooh = rows.reduce((a, r) => (r.pooh > a.pooh ? r : a), rows[0])
    const tp = tubeProps(str.od, str.wallAt(Math.max(0, maxPooh.depth - (state.bha.length || 0))))
    const realTop = maxPooh.pooh + (state.ctp || 0) * tp.Ai + (state.rbtPOOH || 0)
    const yield80 = 0.8 * grade.smys * tp.As
    const r = (label, value, unit, strong) =>
      el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, label), el('span', { class: 'result-value' }, [el('strong', {}, value), unit ? el('span', { class: 'result-unit' }, ' ' + unit) : null])])
    return el('div', { class: 'result-card ctsim-summary' }, [
      r(`Peso RIH en ${fmt(last.depth, 0)} m`, last.rih === null ? 'Lock-up' : fmt(last.rih, 0), last.rih === null ? '' : 'lb'),
      r(`Peso POOH en ${fmt(last.depth, 0)} m`, fmt(last.pooh, 0), 'lb'),
      r('Peso RIH mínimo en el lateral', `${fmt(minRih.rih, 0)} lb @ ${fmt(minRih.depth, 0)}`, 'm'),
      r('Set-down máx. disponible en fondo', fmt(setDown.bottomForce, 0), `lb (indicador ${fmt(setDown.surfaceWeight, 0)} lb)`),
      r('Pandeo helicoidal (RIH) desde', helix ? fmt(helix.depth, 0) : 'No', helix ? 'm' : ''),
      r('Lock-up (RIH)', lock ? `a ${fmt(lock.depth, 0)}` : 'No se alcanza', lock ? 'm' : ''),
      r('Tensión real máx. / 80 % fluencia', `${fmt(realTop / 1000, 1)} / ${fmt(yield80 / 1000, 1)}`, `klb ${realTop > yield80 ? '⚠' : '✓'}`),
    ])
  }

  function speedTable() {
    const speeds = [2, 4, 6, 8, 12, 16]
    const rows = speeds.map((v) => {
      const p = params(state.muRIH, state.muPOOH)
      p.speedAt = () => v
      p.speedRIH = v
      p.speedPOOH = v
      const r = simulateTrip(p, cal.model, [Math.min(state.survey[state.survey.length - 1][0], buildString(state.string).totalLength)]).rows[0]
      return [v, r.rih, r.pooh]
    })
    return el('div', { class: 'ctsim-table-wrap' }, [
      el('div', { class: 'section-label ctsim-subtitle' }, 'Sensibilidad a la velocidad en el lateral (peso en TD)'),
      el('table', { class: 'ctsim-table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Vel. (m/min)'), el('th', {}, 'RIH (lb)'), el('th', {}, 'POOH (lb)')])),
        el('tbody', {}, rows.map(([v, a, b]) => el('tr', {}, [el('td', {}, `${v} (${fmt(v * M_TO_FT, 0)} fpm)`), el('td', {}, a === null ? 'Lock-up' : fmt(a, 0)), el('td', {}, fmt(b, 0))]))),
      ]),
    ])
  }

  function depthTable(base, lo, hi) {
    const every = 250
    const rows = base.rows.filter((r, i) => r.depth % every === 0 || i === base.rows.length - 1)
    const find = (sim, d) => sim.rows.find((r) => r.depth === d)
    const f = (v) => (v === null || v === undefined ? 'Lock-up' : fmt(v, 0))
    return el('details', { class: 'ctsim-card' }, [
      el('summary', {}, 'Tabla de pesos por profundidad'),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, el('tr', {}, ['MD (m)', 'RIH', 'RIH µ−', 'RIH µ+', 'POOH', 'POOH µ−', 'POOH µ+'].map((h) => el('th', {}, h)))),
          el(
            'tbody',
            {},
            rows.map((r) => {
              const l = find(lo, r.depth)
              const h = find(hi, r.depth)
              return el('tr', {}, [fmt(r.depth, 0), f(r.rih), f(l?.rih), f(h?.rih), f(r.pooh), f(l?.pooh), f(h?.pooh)].map((c) => el('td', {}, c)))
            })
          ),
        ]),
      ]),
    ])
  }

  // ---- chart ---------------------------------------------------------------
  function chart(base, lo, hi) {
    const W = 360
    const H = 520
    const m = { l: 46, r: 12, t: 12, b: 34 }
    const rows = base.rows
    const run = state.run ? state.run.points : []
    const xs = [...rows.flatMap((r) => [r.rih, r.pooh]), ...lo.rows.flatMap((r) => [r.rih, r.pooh]), ...hi.rows.flatMap((r) => [r.rih, r.pooh]), ...run.map((p) => p.w)].filter((v) => v !== null && Number.isFinite(v))
    const step = 10000
    const x0 = Math.floor(Math.min(...xs) / step) * step
    const x1 = Math.ceil(Math.max(...xs) / step) * step
    const d1 = Math.ceil(Math.max(rows[rows.length - 1].depth, ...run.map((p) => p.md)) / 1000) * 1000
    const sx = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r)
    const sy = (d) => m.t + (d / d1) * (H - m.t - m.b)
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('class', 'ctsim-chart')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', 'Peso en superficie vs profundidad, RIH y POOH')
    const add = (tag, attrs, parent = svg) => {
      const n = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
      parent.appendChild(n)
      return n
    }
    // grid & axes
    for (let x = x0; x <= x1; x += step) {
      add('line', { x1: sx(x), x2: sx(x), y1: m.t, y2: H - m.b, class: x === 0 ? 'ctsim-zero' : 'ctsim-grid' })
      if (((x - x0) / step) % 2 === 0) add('text', { x: sx(x), y: H - m.b + 14, class: 'ctsim-tick', 'text-anchor': 'middle' }).textContent = `${x / 1000}k`
    }
    for (let d = 0; d <= d1; d += 1000) {
      add('line', { x1: m.l, x2: W - m.r, y1: sy(d), y2: sy(d), class: 'ctsim-grid' })
      add('text', { x: m.l - 6, y: sy(d) + 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = String(d)
    }
    add('text', { x: (m.l + W - m.r) / 2, y: H - 4, class: 'ctsim-axis', 'text-anchor': 'middle' }).textContent = 'Peso en indicador (lb)'
    const yl = add('text', { x: 12, y: (m.t + H - m.b) / 2, class: 'ctsim-axis', 'text-anchor': 'middle' })
    yl.setAttribute('transform', `rotate(-90 12 ${(m.t + H - m.b) / 2})`)
    yl.textContent = 'MD (m)'
    // bands µ±0.05
    const band = (key, cls) => {
      const n = lo.rows.findIndex((r, i) => r[key] === null || hi.rows[i][key] === null)
      const upto = n < 0 ? lo.rows.length : n
      const a = lo.rows.slice(0, upto)
      const b = hi.rows.slice(0, upto)
      if (a.length < 2 || b.length < 2) return
      const pts = [...a.map((r) => `${sx(r[key])},${sy(r.depth)}`), ...b.reverse().map((r) => `${sx(r[key])},${sy(r.depth)}`)]
      add('polygon', { points: pts.join(' '), class: cls })
    }
    band('rih', 'ctsim-band ctsim-rih-fill')
    band('pooh', 'ctsim-band ctsim-pooh-fill')
    // measured
    for (const p of run) add('circle', { cx: sx(p.w), cy: sy(p.md), r: 2, class: p.dir === 'RIH' ? 'ctsim-dot ctsim-rih-fill' : 'ctsim-dot ctsim-pooh-fill' })
    // model lines
    const line = (key, cls) => {
      const segs = []
      let cur = []
      for (const r of rows) {
        if (r[key] === null) {
          if (cur.length) segs.push(cur)
          cur = []
        } else cur.push(`${sx(r[key])},${sy(r.depth)}`)
      }
      if (cur.length) segs.push(cur)
      for (const s of segs) add('polyline', { points: s.join(' '), class: cls })
    }
    line('rih', 'ctsim-line ctsim-rih-stroke')
    line('pooh', 'ctsim-line ctsim-pooh-stroke')
    const lock = rows.find((r) => r.lockup)
    if (lock) add('line', { x1: m.l, x2: W - m.r, y1: sy(lock.depth), y2: sy(lock.depth), class: 'ctsim-lock' })
    // hover crosshair
    const cross = add('line', { x1: m.l, x2: W - m.r, y1: 0, y2: 0, class: 'ctsim-cross', visibility: 'hidden' })
    const tip = el('div', { class: 'ctsim-tip', hidden: true })
    const wrap = el('div', { class: 'ctsim-chart-wrap' }, [
      el('div', { class: 'ctsim-legend' }, [
        el('span', {}, [el('i', { class: 'ctsim-key ctsim-rih-bg' }), 'RIH']),
        el('span', {}, [el('i', { class: 'ctsim-key ctsim-pooh-bg' }), 'POOH']),
        el('span', { class: 'ctsim-legend-dim' }, 'Banda: µ ± 0,05'),
        run.length ? el('span', { class: 'ctsim-legend-dim' }, '● medido') : null,
      ]),
      svg,
      tip,
    ])
    svg.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect()
      const y = ((e.clientY - rect.top) / rect.height) * H
      const d = ((y - m.t) / (H - m.t - m.b)) * d1
      if (d < 0 || d > rows[rows.length - 1].depth) {
        cross.setAttribute('visibility', 'hidden')
        tip.hidden = true
        return
      }
      const r = rows.reduce((a, b) => (Math.abs(b.depth - d) < Math.abs(a.depth - d) ? b : a))
      cross.setAttribute('y1', sy(r.depth))
      cross.setAttribute('y2', sy(r.depth))
      cross.setAttribute('visibility', 'visible')
      const near = (dir) => run.filter((p) => p.dir === dir).reduce((a, b) => (!a || Math.abs(b.md - r.depth) < Math.abs(a.md - r.depth) ? b : a), null)
      const mr = near('RIH')
      const mp = near('POOH')
      const ok = (p) => p && Math.abs(p.md - r.depth) <= 50
      tip.innerHTML = ''
      tip.append(
        el('strong', {}, `${fmt(r.depth, 0)} m`),
        el('div', {}, [el('i', { class: 'ctsim-key ctsim-rih-bg' }), `RIH ${r.rih === null ? 'lock-up' : fmt(r.rih, 0) + ' lb'}${ok(mr) ? ` · medido ${fmt(mr.w, 0)}` : ''}`]),
        el('div', {}, [el('i', { class: 'ctsim-key ctsim-pooh-bg' }), `POOH ${fmt(r.pooh, 0)} lb${ok(mp) ? ` · medido ${fmt(mp.w, 0)}` : ''}`])
      )
      tip.hidden = false
      tip.style.top = `${(sy(r.depth) / H) * rect.height + 8}px`
    })
    svg.addEventListener('pointerleave', () => {
      cross.setAttribute('visibility', 'hidden')
      tip.hidden = true
    })
    return wrap
  }

  renderForm()
  renderResults()
}
