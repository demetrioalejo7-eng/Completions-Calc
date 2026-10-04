// Simulador de pesos RIH / POOH para coiled tubing (lavado post-frac).
// UI over src/ctsim/forces.js with the field-calibrated terms of
// src/ctsim/calibration.js.
import { el, fmt, clear } from '../ui/dom.js'
import { simulateTrip, maxSetDown, buildString, tubeProps, kopLp, wellTrajectory, pointAtMd, buildContext, forcesAtDepth } from './forces.js'
import { readSurveyFile, parseSurveyTable, splitTable, parseRunCsv, parseDepthList, parseCoordinate, parseWellHead } from './parsers.js'
import { STANDARD_STRING_2375, DEFAULT_BHA, STRING_PRESETS } from './defaults.js'
import { CT_CALIBRATION, MU_LEVELS, ERT_LEVELS } from './calibration.js'
import { CT_MANUFACTURERS, findGrade, minWall } from './grades.js'
import { matchRun, matchSurfaceReadings } from './runMatch.js'
import { sensitivityGrid, sensitivityDepths } from './sensitivity.js'
import { tubeGeometry, envelope, allowableLoad, utilization, collapseOval, collapseCurve } from './triaxial.js'

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
    surveys: [], // [{ name, rows, plugs, plugsText, head: { x, y, z } }] up to MAX_SURVEYS
    // wellhead coordinates: 'gk' = Gauss-Krüger (X = Norte, Y = Este), 'xe' = X = Este
    coordConv: 'gk',
    view3dAll: true,
    // label groups shown in the 3D view
    labels3d: { names: true, heads: true, marks: true, tvd: true, plugs: true, north: true, curve: true, lateral: true },
    active: -1,
    pasteName: '',
    surveyText: '',
    plugs: [],
    plugsText: '',
    casingId: 4.126,
    string: JSON.parse(JSON.stringify(STANDARD_STRING_2375)),
    grade: 'global-duracoil|DC-120',
    stringPreset: 'standard',
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
    reelTared: cal.reelTared,
    ertInPooh: false,
    indicatorOffset: 0,
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
    tab: 'pesos',
    sens: { mus: [0.25, 0.3, 0.35], erts: [0, 500, 1000, 1500], required: 2000, showMu: null, showErt: null, wells: null, result: null, key: '' },
    tri: { wall: 'surface', wear: 0, ovality: 2, manualF: null, manualDp: null },
  }

  const formEl = el('div', { class: 'calc-form ctsim-form' })
  const resultsEl = el('div', { class: 'calc-results ctsim-results' })
  container.appendChild(el('div', { class: 'ctsim-layout' }, [formEl, resultsEl]))
  // narrow screens: a floating "Datos / Gráficos" switch (wide screens scroll
  // each column on its own and hide it)
  const jumpBtn = (label, target) => el('button', { type: 'button', onClick: () => target.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, label)
  const jumpData = jumpBtn('Datos', formEl)
  const jumpCharts = jumpBtn('Gráficos', resultsEl)
  container.appendChild(el('nav', { class: 'ctsim-jump', 'aria-label': 'Ir a' }, [jumpData, jumpCharts]))
  const markJump = () => {
    const charts = resultsEl.getBoundingClientRect().top < window.innerHeight * 0.5
    jumpCharts.classList.toggle('active', charts)
    jumpData.classList.toggle('active', !charts)
  }
  window.addEventListener('scroll', markJump, { passive: true })
  requestAnimationFrame(markJump)
  let view3d = null

  let timer = null
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(renderResults, 200)
  }
  const set = (k) => (v) => {
    state[k] = v
    schedule()
  }

  // ---- surveys (up to MAX_SURVEYS wells) ----------------------------------
  const MAX_SURVEYS = 6

  function setActive(i) {
    // plugs belong to each well: save the current ones, load the new well's
    const cur = state.surveys[state.active]
    if (cur) (cur.plugs = state.plugs), (cur.plugsText = state.plugsText)
    state.active = i
    const sv = state.surveys[i]
    state.survey = sv ? sv.rows : null
    state.surveyName = sv ? sv.name : ''
    state.plugs = sv?.plugs || []
    state.plugsText = sv?.plugsText || ''
  }

  // "Survey_Final_Pozo_BdC-1034h.xlsx" → "BdC-1034h"
  function wellNameFromFile(fname) {
    // a well code such as "BdC-1028h" or "LCav-123(h)" wins over the rest
    const code = fname.match(/(?<![A-Za-z0-9])([A-Za-z]{1,6}[.\s-]?\d{2,5}(?:\([a-z]\)|[a-z])?)(?=[^A-Za-z0-9]|$)/)
    if (code && /[-.\s]/.test(code[1])) return code[1]
    return (
      fname
        .replace(/\.(xlsx|csv|txt)$/i, '')
        .replace(/^[0-9a-f]{8}-/i, '')
        .replace(/^survey[\s_-]*(final[\s_-]*)?(pozo[\s_-]*)?/i, '')
        .replace(/_/g, ' ')
        .trim() || fname
    )
  }

  function addSurvey(name, rows) {
    if (state.surveys.length >= MAX_SURVEYS) throw new Error(`Se pueden cargar hasta ${MAX_SURVEYS} surveys. Quitá alguno para agregar otro.`)
    let n = name
    let k = 2
    while (state.surveys.some((x) => x.name === n)) n = `${name} (${k++})`
    state.surveys.push({ name: n, rows, plugs: [], plugsText: '', head: { x: null, y: null, z: null } })
    setActive(state.surveys.length - 1)
  }

  function removeSurvey(i) {
    const wasActive = i === state.active
    if (wasActive) state.active = -1
    state.surveys.splice(i, 1)
    if (wasActive) setActive(state.surveys.length ? 0 : -1)
    else if (i < state.active) state.active--
  }

  function surveyCard() {
    const sv = state.survey
    const fileInput = el('input', {
      type: 'file',
      multiple: true,
      accept: '.xlsx,.csv,.txt',
      class: 'ctsim-file',
      onChange: async (e) => {
        const errs = []
        for (const f of e.target.files) {
          try {
            addSurvey(wellNameFromFile(f.name), await readSurveyFile(f))
          } catch (err) {
            errs.push(`${f.name}: ${err.message}`)
          }
        }
        state.error = errs.join(' · ')
        renderForm()
        renderResults()
      },
    })
    const paste = el('textarea', {
      class: 'ctsim-textarea',
      rows: 5,
      placeholder: 'Pegá acá (Ctrl+V) las 3 columnas copiadas de Excel:\nMD\tInc\tAz\n0\t0\t0\n500,5\t2,10\t185,3\n…',
      onInput: (e) => (state.surveyText = e.target.value),
    })
    paste.value = state.surveyText
    const nameInput = el('input', { type: 'text', class: 'ctsim-text', placeholder: `Nombre del pozo (p. ej. Pozo ${state.surveys.length + 1})`, value: state.pasteName, onInput: (e) => (state.pasteName = e.target.value) })
    const loadPasted = () => {
      if (!state.surveyText.trim()) {
        state.error = 'No hay datos pegados.'
      } else {
        try {
          addSurvey(state.pasteName.trim() || `Pozo ${state.surveys.length + 1}`, parseSurveyTable(splitTable(state.surveyText)))
          state.surveyText = ''
          state.pasteName = ''
          state.error = ''
        } catch (err) {
          state.error = err.message
        }
      }
      renderForm()
      renderResults()
    }
    const list = state.surveys.length
      ? el(
          'div',
          { class: 'ctsim-wells' },
          state.surveys.map((w, i) =>
            el('div', { class: `ctsim-well${i === state.active ? ' active' : ''}` }, [
              el('input', { type: 'radio', name: 'ctsim-active', checked: i === state.active, 'aria-label': `Usar ${w.name}`, onChange: () => (setActive(i), renderForm(), renderResults()) }),
              el('input', {
                type: 'text',
                class: 'ctsim-text',
                value: w.name,
                'aria-label': 'Nombre del pozo',
                onChange: (e) => {
                  w.name = e.target.value.trim() || w.name
                  if (i === state.active) state.surveyName = w.name
                  renderForm()
                  renderResults()
                },
              }),
              el('span', { class: 'ctsim-well-info' }, `TD ${fmt(w.rows[w.rows.length - 1][0], 0)} m · ${w.rows.length} est.${(i === state.active ? state.plugs : w.plugs).length ? ` · ${(i === state.active ? state.plugs : w.plugs).length} tap.` : ''}`),
              el('button', { class: 'btn-icon', type: 'button', 'aria-label': `Quitar ${w.name}`, onClick: () => (removeSurvey(i), renderForm(), renderResults()) }, '×'),
            ])
          )
        )
      : el('p', { class: 'note' }, 'Elegí los archivos (xlsx/csv, podés seleccionar varios) o copiá las columnas Profundidad (MD), Inclinación y Azimut desde Excel y pegalas abajo.')
    const preview = sv
      ? el('details', { class: 'ctsim-preview-det' }, [
          el('summary', {}, `Ver estaciones de ${state.surveyName}`),
          el('div', { class: 'ctsim-table-wrap ctsim-preview' }, [
            el('table', { class: 'ctsim-table' }, [
              el('thead', {}, el('tr', {}, ['MD (m)', 'Inc (°)', 'Az (°)'].map((h) => el('th', {}, h)))),
              el(
                'tbody',
                {},
                (sv.length > 8 ? [...sv.slice(0, 4), null, ...sv.slice(-3)] : sv).map((r) =>
                  r ? el('tr', {}, r.map((v) => el('td', {}, fmt(v, 2)))) : el('tr', {}, [el('td', { colspan: 3, class: 'ctsim-ellipsis' }, `… ${sv.length - 7} estaciones más …`)])
                )
              ),
            ]),
          ]),
        ])
      : null
    const full = state.surveys.length >= MAX_SURVEYS
    return card(`1 · Surveys (${state.surveys.length}/${MAX_SURVEYS})`, [
      list,
      state.surveys.length > 1 ? el('p', { class: 'note' }, 'El pozo marcado es el que se usa en Pesos, Límites triaxiales y 3D. En Sensibilidad podés comparar todos.') : null,
      preview,
      state.surveys.length ? headCoords() : null,
      full ? el('p', { class: 'note' }, `Máximo ${MAX_SURVEYS} surveys: quitá alguno para agregar otro.`) : el('span', { class: 'field-label' }, 'Agregar desde archivo'),
      full ? null : fileInput,
      full ? null : el('span', { class: 'field-label' }, 'O pegando las columnas'),
      full ? null : nameInput,
      full ? null : paste,
      full
        ? null
        : el('div', { class: 'row' }, [
            el('button', { class: 'btn-secondary', type: 'button', onClick: loadPasted }, 'Agregar survey pegado'),
            el('button', { class: 'btn-secondary', type: 'button', onClick: () => ((state.surveyText = ''), renderForm()) }, 'Limpiar'),
          ]),
    ])
  }

  // ---- wellhead coordinates ---------------------------------------------------
  function headCoords() {
    const hasAny = state.surveys.some((w) => w.head && (w.head.x !== null || w.head.y !== null))
    const shown = (v) => (v === null || v === undefined ? '' : fmt(v, v % 1 ? 2 : 0))
    const cell = (w, k, ph) =>
      el('td', {}, [
        el('input', {
          type: 'text',
          inputmode: 'decimal',
          placeholder: ph,
          value: shown(w.head?.[k]),
          'aria-label': `${ph} de ${w.name}`,
          onChange: (e) => {
            w.head ||= { x: null, y: null, z: null }
            const t = e.target.value
            // a pasted "X:: 5,826,574.00m  Y:: 2,487,407.00m" line fills X and Y
            if (/[xy]\s*:/i.test(t)) {
              const h = parseWellHead(t)
              if (h.x !== null) w.head.x = h.x
              if (h.y !== null) w.head.y = h.y
              if (h.z !== null) w.head.z = h.z
            } else w.head[k] = parseCoordinate(t)
            renderForm()
            renderResults()
          },
        }),
      ])
    const [lx, ly] = state.coordConv === 'gk' ? ['X (Norte)', 'Y (Este)'] : ['X (Este)', 'Y (Norte)']
    return el('details', { class: 'ctsim-preview-det', open: hasAny }, [
      el('summary', {}, 'Coordenadas de boca de pozo'),
      selectField(
        'Sistema',
        [
          { value: 'gk', label: 'Gauss-Krüger / POSGAR (X = Norte, Y = Este)' },
          { value: 'xe', label: 'X = Este, Y = Norte (UTM / local)' },
        ],
        state.coordConv,
        (v) => ((state.coordConv = v), renderForm(), renderResults())
      ),
      el('div', { class: 'ctsim-table-wrap ctsim-head-table' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, el('tr', {}, ['Pozo', `${lx} (m)`, `${ly} (m)`, 'Cota (m)'].map((h) => el('th', {}, h)))),
          el(
            'tbody',
            {},
            state.surveys.map((w, i) =>
              el('tr', {}, [
                el('td', {}, [el('span', { class: `ctsim-swatch ctsim-${WELL_CLS[i % WELL_CLS.length]}-bg` }), w.name]),
                cell(w, 'x', 'X'),
                cell(w, 'y', 'Y'),
                cell(w, 'z', 'opcional'),
              ])
            )
          ),
        ]),
      ]),
      el('p', { class: 'note' }, 'Pegá la línea del WELL INFO (p. ej. "X:: 5,826,574.00m  Y:: 2,487,407.00m") en la columna X y se completan las dos. La cota (boca de pozo o mesa rotaria, la misma referencia de TVD en todos) es opcional: si falta, las bocas se dibujan a la misma altura. Se supone que el azimut de los surveys está referido al mismo norte que las coordenadas.'),
    ])
  }

  // Offsets (m) of each wellhead from the first one with coordinates:
  // { n, e, z, known } per survey index.
  function headOffsets() {
    const ne = (h) => (state.coordConv === 'gk' ? { n: h.x, e: h.y } : { n: h.y, e: h.x })
    const ok = (w) => w.head && Number.isFinite(w.head.x) && Number.isFinite(w.head.y)
    const ref = state.surveys.find(ok)
    const r = ref ? ne(ref.head) : null
    const zRef = state.surveys.find((w) => w.head && Number.isFinite(w.head.z))?.head.z
    return state.surveys.map((w) => {
      if (!ok(w) || !r) return { n: 0, e: 0, z: 0, known: false }
      const p = ne(w.head)
      return { n: p.n - r.n, e: p.e - r.e, z: Number.isFinite(w.head.z) && Number.isFinite(zRef) ? w.head.z - zRef : 0, known: true }
    })
  }

  // ---- plugs ---------------------------------------------------------------
  function plugsCard() {
    const ta = el('textarea', {
      class: 'ctsim-textarea',
      rows: 4,
      placeholder: 'Profundidades MD (m) de los tapones, una por línea o copiadas de una columna de Excel:\n3587\n3659\n3731\n…',
      onInput: (e) => (state.plugsText = e.target.value),
    })
    ta.value = state.plugsText
    const n = state.plugs.length
    return card(
      state.surveyName ? `2 · Tapones — ${state.surveyName}` : '2 · Tapones',
      [
        ta,
        el('div', { class: 'row' }, [
          el('button', {
            class: 'btn-secondary',
            type: 'button',
            onClick: () => {
              try {
                state.plugs = parseDepthList(state.plugsText)
                const w = state.surveys[state.active]
                if (w) (w.plugs = state.plugs), (w.plugsText = state.plugsText)
                state.error = ''
              } catch (err) {
                state.error = err.message
              }
              renderForm()
              renderResults()
            },
          }, 'Cargar tapones'),
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => { state.plugs = []; state.plugsText = ''; const w = state.surveys[state.active]; if (w) (w.plugs = []), (w.plugsText = ''); renderForm(); renderResults() } }, 'Quitar'),
        ]),
        el('p', { class: 'note' }, n ? `✓ ${n} tapones entre ${fmt(state.plugs[0], 0)} y ${fmt(state.plugs[n - 1], 0)} m MD. Se marcan en el gráfico, en la vista 3D y en la tabla de tapones.` : 'Opcional. Se muestran en el gráfico, en el 3D y con el peso esperado y el set-down disponible en cada uno.'),
      ],
      { open: n > 0 || !!state.plugsText }
    )
  }

  // ---- well & string -------------------------------------------------------
  function wellCard() {
    const preset = CASING_PRESETS.find((c) => Math.abs(c.id - state.casingId) < 1e-4)
    return card('3 · Casing', [
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
        el('input', { type: 'number', step: 1, value: sec.length, 'aria-label': 'Longitud (m)', onInput: (e) => ((sec.length = Number(e.target.value)), (state.stringPreset = 'custom'), schedule()) }),
        el('input', { type: 'number', step: 0.001, value: sec.wallStart, 'aria-label': 'Espesor inicial (in)', onInput: (e) => ((sec.wallStart = Number(e.target.value)), (state.stringPreset = 'custom'), schedule()) }),
        el('input', { type: 'number', step: 0.001, value: sec.wallEnd, 'aria-label': 'Espesor final (in)', onInput: (e) => ((sec.wallEnd = Number(e.target.value)), (state.stringPreset = 'custom'), schedule()) }),
        el('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Quitar sección', onClick: () => (s.sections.splice(i, 1), (state.stringPreset = 'custom'), renderForm(), schedule()) }, '×'),
      ])
    )
    const presetLabel = (STRING_PRESETS.find((x) => x.id === state.stringPreset) || { label: 'personalizada' }).label
    return card(
      `4 · Sarta: ${presetLabel}`,
      [
        selectField(
          'Diseño de sarta',
          [...STRING_PRESETS.map((x) => ({ value: x.id, label: x.label })), { value: 'custom', label: 'Personalizada (editada)' }],
          state.stringPreset,
          (v) => {
            const pr = STRING_PRESETS.find((x) => x.id === v)
            if (pr) {
              state.string = JSON.parse(JSON.stringify(pr.string))
              if (pr.grade) state.grade = pr.grade
            }
            state.stringPreset = v
            renderForm()
            schedule()
          }
        ),
        el('div', { class: 'row' }, [
          numField('OD', s.od, (v) => ((s.od = v), (state.stringPreset = 'custom'), schedule()), { unit: 'in', step: 0.001 }),
          gradeSelect(),
        ]),
        el('div', { class: 'ctsim-sec-head' }, [el('span', {}, '#'), el('span', {}, 'Long. (m)'), el('span', {}, 'Pared inicio (in)'), el('span', {}, 'Pared fin (in)'), el('span', {}, '')]),
        ...rows,
        el('div', { class: 'row' }, [
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => (s.sections.push({ length: 500, wallStart: 0.175, wallEnd: 0.175 }), (state.stringPreset = 'custom'), renderForm(), schedule()) }, '+ Sección'),
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => ((state.string = JSON.parse(JSON.stringify(STANDARD_STRING_2375))), (state.stringPreset = 'standard'), (state.grade = STRING_PRESETS[0].grade), renderForm(), schedule()) }, 'Sarta estándar'),
        ]),
        el('p', { class: 'note' }, `Secciones del core (carrete) al extremo libre (herramienta). Largo total ${fmt(total, 0)} m.`),
        el('div', { class: 'row' }, [
          numField('BHA: longitud', state.bha.length, (v) => ((state.bha.length = v || 0), schedule()), { unit: 'm', step: 0.1 }),
          numField('BHA: peso en aire', state.bha.weight, (v) => ((state.bha.weight = v || 0), schedule()), { unit: 'lb', step: 10 }),
        ]),
      ],
      { open: true }
    )
  }

  function gradeSelect() {
    const sel = el(
      'select',
      { onChange: (e) => ((state.grade = e.target.value), renderForm(), schedule()) },
      CT_MANUFACTURERS.map((m) =>
        el(
          'optgroup',
          { label: m.label },
          m.grades.map((g) => el('option', { value: `${m.id}|${g.id}`, selected: `${m.id}|${g.id}` === state.grade }, `${g.id} (${g.smys / 1000} ksi)`))
        )
      )
    )
    const g = findGrade(state.grade)
    return el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Fabricante y grado'), sel, el('span', { class: 'ctsim-hint' }, `${g.manufacturerLabel}: fluencia ${fmt(g.smys, 0)} psi, tracción ${fmt(g.smts, 0)} psi`)])
  }

  // ---- operation -----------------------------------------------------------
  function operationCard() {
    return card('5 · Parámetros operativos', [
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

  function speedAtFn(survey = state.survey) {
    const { kop, lp } = kopLp(survey)
    const sp = (z, dir) => Math.max(0.1, state.speeds[z][dir] || 0.1)
    const RAMP = 100 // m: speed changes are ramped over ±100 m around KOP / LP
    const blend = (d, at, a, b, dir) => {
      const f = Math.min(1, Math.max(0, (d - (at - RAMP)) / (2 * RAMP)))
      return sp(a, dir) + f * (sp(b, dir) - sp(a, dir))
    }
    return (d, dir) => {
      if (kop === null) return sp('lat', dir)
      if (d < (kop + lp) / 2) return blend(d, kop, 'vert', 'curve', dir)
      return blend(d, lp, 'curve', 'lat', dir)
    }
  }

  function frictionCard() {
    return card('6 · Fricción, ERT y equipo de superficie', [
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
      el('label', { class: 'ctsim-chk' }, [
        el('input', { type: 'checkbox', checked: state.ertInPooh, onChange: (e) => ((state.ertInPooh = e.target.checked), schedule()) }),
        'ERT activo en POOH (sin tildar: se saca bombeando por la válvula multiciclo, ERT baypaseado)',
      ]),
      numField('Fuerza de fricción del stripper', state.stripper, set('stripper'), { unit: 'lbf', step: 250 }),
      el('div', { class: 'row' }, [
        numField('Tensión del reel RIH', state.rbtRIH, set('rbtRIH'), { unit: 'lbf', step: 100 }),
        numField('Tensión del reel POOH', state.rbtPOOH, set('rbtPOOH'), { unit: 'lbf', step: 100 }),
      ]),
      el('label', { class: 'ctsim-chk' }, [
        el('input', { type: 'checkbox', checked: state.reelTared, onChange: (e) => ((state.reelTared = e.target.checked), renderForm(), schedule()) }),
        'Indicador de peso tarado con el CT en el inyector y tensión de reel (el reel no aparece en la lectura)',
      ]),
      numField('Corrección del cero del indicador', state.indicatorOffset, set('indicatorOffset'), { unit: 'lbf', step: 250, hint: 'Se resta de la lectura en RIH y POOH. La completa el ajuste con lecturas de campo o con una carrera.' }),
    ])
  }

  function readingsCard() {
    const rd = state.readings
    const setR = (k) => (v) => (rd[k] = v)
    return card(
      '7 · Ajuste con lecturas de campo (opcional)',
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

  // The common offset of RIH and POOH found by a match is the reel back
  // tension when the indicator sees it, else a correction of its zero.
  function applySurfaceOffset(v) {
    if (state.reelTared) {
      state.indicatorOffset = Math.round(v)
      return 'corrección del cero'
    }
    state.rbtRIH = v
    state.rbtPOOH = v
    return 'reel'
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
        const offLabel = applySurfaceOffset(r.reelTension)
        state.readingsMsg = `Stripper ${fmt(r.stripperLbf, 0)} lbf · ${offLabel} ${fmt(r.reelTension, 0)} lbf (cargados en el formulario).${r.stripperLbf < 0 ? ' ⚠ Stripper negativo: revisá las lecturas o el µ.' : ''}`
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
      '8 · Comparar con una carrera real (opcional)',
      [
        fileInput,
        el('p', { class: 'note' }, state.run ? `✓ ${state.runName}: ${state.run.points.length} puntos (medianas cada 25 m en movimiento estable).` : 'CSV del sistema de adquisición (columnas de Peso y Profundidad; Velocidad opcional). Se grafica sobre la simulación.'),
        state.run && state.survey
          ? el('button', { class: 'btn-secondary', type: 'button', onClick: fitRun }, state.reelTared ? 'Ajustar µ, stripper y cero del indicador a esta carrera' : 'Ajustar µ, stripper y reel a esta carrera')
          : null,
        state.match
          ? el('p', { class: 'note' }, `Ajuste: µ RIH ${state.match.muRIH.toFixed(2)} · µ POOH ${state.match.muPOOH.toFixed(2)} · stripper ${fmt(state.match.stripperLbf, 0)} lbf · ${state.reelTared ? 'corrección del cero' : 'reel'} ${fmt(state.match.reelTension, 0)} lbf. Error mediano ${fmt(state.match.maeRIH, 0)} lb RIH / ${fmt(state.match.maePOOH, 0)} lb POOH (${state.match.nRIH + state.match.nPOOH} puntos). Valores cargados en el formulario.`)
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
      applySurfaceOffset(m.reelTension)
      state.error = ''
    } catch (err) {
      state.error = err.message
    }
    renderForm()
    renderResults()
  }

  function renderForm() {
    // keep the panels the user opened / closed across re-renders
    const prev = new Map([...formEl.querySelectorAll(':scope > details')].map((d) => [d.querySelector('summary')?.textContent, d.open]))
    clear(formEl)
    formEl.append(surveyCard(), plugsCard(), wellCard(), stringCard(), operationCard(), frictionCard(), readingsCard(), runCard())
    for (const d of formEl.querySelectorAll(':scope > details')) {
      const was = prev.get(d.querySelector('summary')?.textContent)
      if (was === true) d.open = true
    }
  }

  // ---- results -------------------------------------------------------------
  function params(muRIH, muPOOH, survey = state.survey) {
    return {
      survey,
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
      speedAt: speedAtFn(survey),
      ertLbfPerBpm: state.ert || 0,
      stripperLbf: state.stripper || 0,
      reelTensionRIH: state.rbtRIH || 0,
      reelTensionPOOH: state.rbtPOOH || 0,
      reelTared: state.reelTared,
      ertInPooh: state.ertInPooh,
      indicatorOffset: state.indicatorOffset || 0,
      bha: state.bha,
      outStepM: 50,
    }
  }

  const TABS = [
    ['pesos', 'Pesos RIH / POOH'],
    ['sens', 'Sensibilidad'],
    ['tri', 'Límites triaxiales'],
    ['3d', 'Survey 3D'],
  ]

  function renderResults() {
    if (view3d) {
      view3d.dispose()
      view3d = null
    }
    clear(resultsEl)
    resultsEl.appendChild(
      el(
        'div',
        { class: 'ctsim-tabs', role: 'tablist' },
        TABS.map(([k, label]) =>
          el('button', { type: 'button', role: 'tab', class: `ctsim-tab${state.tab === k ? ' active' : ''}`, 'aria-selected': state.tab === k ? 'true' : 'false', onClick: () => ((state.tab = k), renderResults()) }, label)
        )
      )
    )
    if (state.error) resultsEl.appendChild(el('p', { class: 'note note-error' }, state.error))
    if (!state.survey) {
      resultsEl.appendChild(el('p', { class: 'note' }, 'Cargá un survey para ver la simulación.'))
      return
    }
    try {
      if (state.tab === 'pesos') weightsPanel()
      else if (state.tab === 'sens') sensPanel()
      else if (state.tab === 'tri') triPanel()
      else resultsEl.appendChild(survey3dPanel())
    } catch (err) {
      resultsEl.appendChild(el('p', { class: 'note note-error' }, err.message))
    }
  }

  function baseTrips() {
    const ratio = state.muPOOH / state.muRIH
    const base = simulateTrip(params(state.muRIH, state.muPOOH), cal.model)
    const lo = simulateTrip(params(state.muRIH - 0.05, (state.muRIH - 0.05) * ratio), cal.model)
    const hi = simulateTrip(params(state.muRIH + 0.05, (state.muRIH + 0.05) * ratio), cal.model)
    return { base, lo, hi }
  }

  function weightsPanel() {
    const { base, lo, hi } = baseTrips()
    const td = base.rows[base.rows.length - 1].depth
    const setDown = maxSetDown(params(state.muRIH, state.muPOOH), td, cal.model)
    resultsEl.appendChild(chart(base, lo, hi))
    resultsEl.appendChild(summary(base, setDown))
    if (state.plugs.length) resultsEl.appendChild(plugTable())
    resultsEl.appendChild(speedTable())
    resultsEl.appendChild(depthTable(base, lo, hi))
    resultsEl.appendChild(
      el('p', { class: 'formula-note' }, [
        'Modelo: dF/ds = W_B·cosθ ± µ(v)·F_N, con F_N por peso y curvatura (Johancsik / CTES Orpheus), pandeo helicoidal y contacto adicional r_c·F²/(4EI) en compresión. ',
        state.reelTared ? 'Peso en superficie = F_E − WHP·A_o ∓ stripper − corrección del cero (indicador tarado con el reel: la tensión del reel no aparece en la lectura). ' : 'Peso en superficie = F_E − WHP·A_o ∓ stripper − tensión del reel. ',
        `µ(v) = µ·[1 + k·ln(v/${cal.model.speedRef} m/min)] (k RIH ${cal.model.speedCoefRIH}, k POOH ${cal.model.speedCoefPOOH}); término de superficie ≈ +${Math.round((cal.model.speedSurfPOOH - cal.model.speedSurfRIH) / 2)} lb por m/min respecto de ${cal.model.speedSurfRef} m/min. `,
        `ERT: reduce µ en los ${cal.model.ertZoneM} m sobre la herramienta, ${Math.round(cal.model.ertMuReductionRef * 100)} % con ${cal.model.ertRefLbfPerBpm} lbf/bpm a ${cal.model.ertRefRateBpm} bpm, proporcional a k_ERT·caudal (calibrado con BdC-1030h: con el ERT trabado se sacó a 5632 m por lock-up incipiente, con ERT llegó a TD; efecto incierto, 20–48 % según el pad). ${state.ertInPooh ? `En POOH actúa al ${Math.round(cal.model.ertPoohEfficiency * 100)} %. ` : 'En POOH no actúa (ERT baypaseado por la válvula multiciclo). '}`,
        'La banda sombreada es µ ± 0,05. ',
        cal.note,
      ])
    )
  }

  // ---- sensitivity: set-down capacity vs µ and ERT ------------------------
  const ERT_SERIES = [
    { v: 0, label: 'Sin ERT', cls: 's1' },
    { v: 500, label: 'Baja 500', cls: 's2' },
    { v: 1000, label: 'Media 1000', cls: 's3' },
    { v: 1500, label: 'Alta 1500', cls: 's4' },
  ]

  const WELL_CLS = ['s1', 's2', 's3', 's4', 's5', 's6']
  const ertLabel = (v) => (ERT_SERIES.find((x) => x.v === v) || { label: `${v} lbf/bpm` }).label

  function sensWells() {
    const sn = state.sens
    const all = state.surveys.map((w, i) => i)
    if (!sn.wells) return all
    return sn.wells.filter((i) => i < state.surveys.length)
  }

  function sensKey() {
    const wells = sensWells().map((i) => [state.surveys[i].name, state.surveys[i].rows.length, i === state.active ? state.plugs : state.surveys[i].plugs])
    return JSON.stringify([params(state.muRIH, state.muPOOH), state.sens.mus, state.sens.erts, state.sens.required, wells], (k, v) => (typeof v === 'function' ? undefined : v))
  }

  function sensPanel() {
    const sn = state.sens
    const MU_OPTS = [0.2, 0.25, 0.3, 0.35, 0.4]
    const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a, b) => a - b))
    const chk = (label, on, onChange) => el('label', { class: 'ctsim-chk' }, [el('input', { type: 'checkbox', checked: on, onChange }), label])
    const muNow = +state.muRIH.toFixed(3)
    const wells = sensWells()
    const controls = el('div', { class: 'ctsim-card ctsim-card-body ctsim-sens-controls' }, [
      el('p', { class: 'note' }, 'Capacidad de asentamiento = fuerza máxima que llega a la herramienta (set-down / WOB) antes del lock-up, para cada combinación de fricción y ERT. El resto de los parámetros (sarta, caudal, velocidades, WHP) es el del formulario.'),
      state.surveys.length > 1 ? el('span', { class: 'field-label' }, 'Pozos a comparar') : null,
      state.surveys.length > 1
        ? el('div', { class: 'ctsim-chk-row' }, state.surveys.map((w, i) => chk(w.name, wells.includes(i), () => (sn.wells = toggle(wells, i)))))
        : null,
      el('span', { class: 'field-label' }, 'Coeficiente de fricción µ RIH (µ POOH mantiene la relación calibrada)'),
      el('div', { class: 'ctsim-chk-row' }, [...new Set([...MU_OPTS, muNow])].sort((a, b) => a - b).map((m) => chk(m === muNow ? `${m.toFixed(2)} (actual)` : m.toFixed(2), sn.mus.includes(m), () => (sn.mus = toggle(sn.mus, m))))),
      el('span', { class: 'field-label' }, 'ERT (lbf/bpm)'),
      el('div', { class: 'ctsim-chk-row' }, ERT_SERIES.map((e) => chk(e.label, sn.erts.includes(e.v), () => (sn.erts = toggle(sn.erts, e.v))))),
      numField('Set-down mínimo requerido en la herramienta', sn.required, (v) => (sn.required = v || 0), { unit: 'lbf', step: 250, hint: 'P. ej. el peso mínimo para rotar un tapón.' }),
      el('button', { class: 'btn-secondary', type: 'button', onClick: runSens }, 'Calcular sensibilidad'),
    ])
    resultsEl.appendChild(controls)
    const r = sn.result
    if (!r) return
    if (sn.key !== sensKey()) resultsEl.appendChild(el('p', { class: 'note' }, '⚠ Cambiaste parámetros desde el último cálculo: volvé a calcular.'))
    const mus = [...new Set(r.wells[0].grid.map((g) => g.mu))]
    const erts = [...new Set(r.wells[0].grid.map((g) => g.ert))]
    if (!mus.includes(sn.showMu)) sn.showMu = mus.reduce((a, b) => (Math.abs(b - muNow) < Math.abs(a - muNow) ? b : a), mus[0])
    if (!erts.includes(sn.showErt)) sn.showErt = erts[erts.length - 1]
    const muSel = el('select', { class: 'ctsim-inline-select', 'aria-label': 'µ a mostrar', onChange: (e) => ((sn.showMu = Number(e.target.value)), renderResults()) }, mus.map((x) => el('option', { value: x, selected: x === sn.showMu }, `µ ${x.toFixed(2)}`)))
    if (r.wells.length === 1) {
      const w = r.wells[0]
      const series = w.grid.filter((g) => g.mu === sn.showMu).map((g) => ({ label: ertLabel(g.ert), cls: (ERT_SERIES.find((e) => e.v === g.ert) || ERT_SERIES[0]).cls, profile: g.profile }))
      resultsEl.appendChild(sensChart({ series, d0: w.depths[0], d1: w.td, required: r.required, plugs: w.plugs, selectors: [muSel], title: `${w.name} — set-down disponible por ERT` }))
      resultsEl.appendChild(sensMatrix(w, r.required))
      if (w.plugs.length) resultsEl.appendChild(sensPlugTable(w, r.required, sn.showMu))
      return
    }
    // several wells: one line per well for the chosen µ and ERT
    const ertSel = el('select', { class: 'ctsim-inline-select', 'aria-label': 'ERT a mostrar', onChange: (e) => ((sn.showErt = Number(e.target.value)), renderResults()) }, erts.map((x) => el('option', { value: x, selected: x === sn.showErt }, ertLabel(x))))
    const series = r.wells.map((w, k) => ({ label: w.name, cls: WELL_CLS[k % WELL_CLS.length], profile: (w.grid.find((g) => g.mu === sn.showMu && g.ert === sn.showErt) || { profile: [] }).profile }))
    resultsEl.appendChild(
      sensChart({
        series,
        d0: Math.min(...r.wells.map((w) => w.depths[0])),
        d1: Math.max(...r.wells.map((w) => w.td)),
        required: r.required,
        plugs: [],
        selectors: [muSel, ertSel],
        title: 'Comparación de pozos — set-down disponible',
      })
    )
    resultsEl.appendChild(wellsTable(r, sn.showMu, erts))
    for (const w of r.wells) {
      resultsEl.appendChild(
        el('details', { class: 'ctsim-card' }, [
          el('summary', {}, `${w.name}: matriz µ × ERT${w.plugs.length ? ' y tapones' : ''}`),
          sensMatrix(w, r.required, true),
          w.plugs.length ? sensPlugTable(w, r.required, sn.showMu, true) : null,
        ])
      )
    }
  }

  function runSens() {
    const sn = state.sens
    const wells = sensWells()
    if (!sn.mus.length || !sn.erts.length || !wells.length) {
      state.error = 'Elegí al menos un pozo, un µ y una opción de ERT.'
      renderResults()
      return
    }
    state.error = ''
    const btn = resultsEl.querySelector('.ctsim-sens-controls button')
    if (btn) btn.disabled = true
    const cur = state.surveys[state.active]
    if (cur) (cur.plugs = state.plugs), (cur.plugsText = state.plugsText)
    const strLen = buildString(state.string).totalLength
    const out = []
    const step = (k) => {
      if (k >= wells.length) {
        sn.result = { wells: out, required: sn.required || 0 }
        sn.key = sensKey()
        renderResults()
        return
      }
      if (btn) btn.textContent = wells.length > 1 ? `Calculando ${state.surveys[wells[k]].name} (${k + 1}/${wells.length})…` : 'Calculando…'
      setTimeout(() => {
        try {
          const w = state.surveys[wells[k]]
          const plugs = w.plugs || []
          const td = Math.min(w.rows[w.rows.length - 1][0], strLen)
          const { lp } = kopLp(w.rows)
          const depths = sensitivityDepths(td, lp, 250, plugs)
          const grid = sensitivityGrid(params(state.muRIH, state.muPOOH, w.rows), cal.model, { mus: sn.mus, erts: sn.erts, depths, requiredLbf: sn.required || 0 })
          out.push({ name: w.name, grid, depths, td, plugs })
          step(k + 1)
        } catch (err) {
          state.error = `${state.surveys[wells[k]].name}: ${err.message}`
          renderResults()
        }
      }, 30)
    }
    step(0)
  }

  function sensChart({ series, d0, d1, required, plugs, selectors, title }) {
    const W = Math.round(Math.min(760, Math.max(340, (resultsEl.clientWidth || 360) - 18)))
    const H = 340
    const m = { l: 52, r: 14, t: 14, b: 36 }
    const yMax = Math.max(required * 1.3, ...series.flatMap((g) => g.profile.map((p) => p.setDown)), 1000)
    const yStep = yMax > 16000 ? 5000 : yMax > 6000 ? 2000 : 1000
    const y1 = Math.ceil(yMax / yStep) * yStep
    const sx = (d) => m.l + ((d - d0) / Math.max(1, d1 - d0)) * (W - m.l - m.r)
    const sy = (v) => H - m.b - (v / y1) * (H - m.t - m.b)
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('class', 'ctsim-chart')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', title)
    const add = (tag, attrs) => {
      const n = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
      svg.appendChild(n)
      return n
    }
    for (let v = 0; v <= y1; v += yStep) {
      add('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), class: v === 0 ? 'ctsim-zero' : 'ctsim-grid' })
      add('text', { x: m.l - 6, y: sy(v) + 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = v >= 1000 ? `${v / 1000}k` : String(v)
    }
    const dStep = d1 - d0 > 2500 ? 500 : 250
    for (let d = Math.ceil(d0 / dStep) * dStep; d <= d1; d += dStep) {
      add('line', { x1: sx(d), x2: sx(d), y1: m.t, y2: H - m.b, class: 'ctsim-grid' })
      add('text', { x: sx(d), y: H - m.b + 14, class: 'ctsim-tick', 'text-anchor': 'middle' }).textContent = String(d)
    }
    add('text', { x: (m.l + W - m.r) / 2, y: H - 4, class: 'ctsim-axis', 'text-anchor': 'middle' }).textContent = 'MD (m)'
    const yl = add('text', { x: 12, y: (m.t + H - m.b) / 2, class: 'ctsim-axis', 'text-anchor': 'middle' })
    yl.setAttribute('transform', `rotate(-90 12 ${(m.t + H - m.b) / 2})`)
    yl.textContent = 'Set-down disponible (lbf)'
    if (required > 0) {
      add('line', { x1: m.l, x2: W - m.r, y1: sy(required), y2: sy(required), class: 'ctsim-lock' })
      add('text', { x: W - m.r - 4, y: sy(required) - 5, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = `requerido ${fmt(required, 0)} lbf`
    }
    for (const d of plugs) if (d >= d0 && d <= d1) add('line', { x1: sx(d), x2: sx(d), y1: H - m.b, y2: H - m.b - 7, class: 'ctsim-plug' })
    for (const g of series) if (g.profile.length) add('polyline', { points: g.profile.map((p) => `${sx(p.depth)},${sy(p.setDown)}`).join(' '), class: `ctsim-line ctsim-${g.cls}-stroke` })
    return el('div', { class: 'ctsim-chart-wrap' }, [
      el('div', { class: 'ctsim-legend' }, [...selectors, ...series.map((g) => el('span', {}, [el('i', { class: `ctsim-key ctsim-${g.cls}-bg` }), g.label]))]),
      svg,
    ])
  }

  function sensCell(g, required) {
    const ok = g.atTD.setDown >= required && g.lockupDepth === null
    const lines = [el('strong', {}, `${fmt(g.atTD.setDown, 0)} lbf`)]
    if (g.lockupDepth !== null) lines.push(el('span', { class: 'ctsim-cell-sub' }, `lock-up ${fmt(g.lockupDepth, 0)} m`))
    else if (g.limitDepth !== null) lines.push(el('span', { class: 'ctsim-cell-sub' }, `< req. desde ${fmt(g.limitDepth, 0)} m`))
    else lines.push(el('span', { class: 'ctsim-cell-sub' }, 'OK hasta TD'))
    return el('td', { class: ok ? 'ctsim-ok' : 'ctsim-bad' }, [el('span', { class: 'ctsim-cell-icon' }, ok ? '✓ ' : '✕ '), ...lines])
  }

  function wellsTable(r, mu, erts) {
    return el('div', { class: 'ctsim-card' }, [
      el('div', { class: 'section-label ctsim-subtitle ctsim-pad-top' }, `Set-down disponible en TD por pozo (µ ${mu.toFixed(2)})`),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table ctsim-matrix' }, [
          el('thead', {}, el('tr', {}, [el('th', {}, 'Pozo'), el('th', {}, 'TD (m)'), ...erts.map((e) => el('th', {}, ertLabel(e)))])),
          el(
            'tbody',
            {},
            r.wells.map((w, k) =>
              el('tr', {}, [
                el('td', {}, [el('i', { class: `ctsim-key ctsim-${WELL_CLS[k % WELL_CLS.length]}-bg` }), w.name]),
                el('td', {}, fmt(w.td, 0)),
                ...erts.map((e) => sensCell(w.grid.find((g) => g.mu === mu && g.ert === e), r.required)),
              ])
            )
          ),
        ]),
      ]),
      el('p', { class: 'note ctsim-pad' }, `✓ = llega a TD con al menos ${fmt(r.required, 0)} lbf de set-down. Misma sarta, caudal (${fmt(state.rate, 1)} bpm), velocidades y WHP para todos los pozos; cambia solo el survey (y sus tapones).`),
    ])
  }

  function sensMatrix(w, required, bare = false) {
    const mus = [...new Set(w.grid.map((g) => g.mu))]
    const erts = [...new Set(w.grid.map((g) => g.ert))]
    const body = [
      el('div', { class: 'section-label ctsim-subtitle ctsim-pad-top' }, `Set-down disponible en TD (${fmt(w.td, 0)} m)`),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table ctsim-matrix' }, [
          el('thead', {}, el('tr', {}, [el('th', {}, 'µ RIH \\ ERT'), ...erts.map((e) => el('th', {}, ertLabel(e)))])),
          el('tbody', {}, mus.map((mu) => el('tr', {}, [el('td', {}, mu.toFixed(2)), ...erts.map((e) => sensCell(w.grid.find((g) => g.mu === mu && g.ert === e), required))]))),
        ]),
      ]),
      el('p', { class: 'note ctsim-pad' }, `✓ = llega a TD con al menos ${fmt(required, 0)} lbf de set-down. Debajo: profundidad de lock-up en RIH o desde dónde la capacidad es menor que la requerida. ERT en lbf por bpm bombeado (caudal ${fmt(state.rate, 1)} bpm).`),
    ]
    return bare ? el('div', {}, body) : el('div', { class: 'ctsim-card' }, body)
  }

  function sensPlugTable(w, required, mu, bare = false) {
    const series = w.grid.filter((g) => g.mu === mu)
    const plugs = w.plugs.filter((d) => d <= w.td)
    const at = (g, d) => g.profile.find((p) => p.depth === Math.round(d))
    const table = el('div', { class: 'ctsim-table-wrap' }, [
      el('table', { class: 'ctsim-table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, '#'), el('th', {}, 'MD (m)'), ...series.map((g) => el('th', {}, ertLabel(g.ert)))])),
        el(
          'tbody',
          {},
          plugs.map((d, i) =>
            el('tr', {}, [
              el('td', {}, `T${i + 1}`),
              el('td', {}, fmt(d, 0)),
              ...series.map((g) => {
                const p = at(g, d)
                const v = p ? p.setDown : null
                return el('td', { class: v !== null && v < required ? 'ctsim-bad-text' : '' }, v === null ? '—' : fmt(v, 0))
              }),
            ])
          )
        ),
      ]),
    ])
    if (bare) return el('div', {}, [el('div', { class: 'section-label ctsim-subtitle ctsim-pad-top' }, `Set-down en cada tapón (µ ${mu.toFixed(2)})`), table])
    return el('details', { class: 'ctsim-card' }, [el('summary', {}, `Set-down disponible en cada tapón (µ ${mu.toFixed(2)})`), table])
  }

  // ---- triaxial (von Mises) operating limits ------------------------------
  function triPanel() {
    const tr = state.tri
    const str = buildString(state.string)
    const grade = findGrade(state.grade)
    const td = Math.min(state.survey[state.survey.length - 1][0], str.totalLength)
    const surfWall = str.wallAt(Math.max(0, td - (state.bha.length || 0)))
    const walls = [...new Set(state.string.sections.flatMap((x) => [Number(x.wallStart), Number(x.wallEnd)]))].sort((a, b) => a - b)
    const wallNom = tr.wall === 'surface' ? surfWall : Number(tr.wall)
    // stresses with the manufacturer's minimum wall (and optional extra wear)
    const wallMin = minWall(wallNom, grade.tol)
    const wallEff = wallMin * (1 - (tr.wear || 0) / 100)
    const g = tubeGeometry(str.od, wallEff)
    const gNom = tubeGeometry(str.od, wallNom) // pressure areas for the force conversion
    const Y = grade.smys
    const ov = (tr.ovality || 0) / 100
    const e100 = envelope(g, Y, 1)
    const e80 = envelope(g, Y, 0.8)
    const Pc = (F) => collapseOval({ od: str.od, tmin: wallEff, smys: Y, ovality: ov, axialStress: F / g.As })

    // operating points from the simulation (CT at TD)
    const pts = []
    const p = params(state.muRIH, state.muPOOH)
    const ctx = buildContext(p, cal.model)
    const sp = (dir) => (p.speedAt ? p.speedAt(td, dir) : dir === 'RIH' ? p.speedRIH : p.speedPOOH)
    const ctp = state.ctp || 0
    const whp = state.whp || 0
    for (const dir of ['POOH', 'RIH']) {
      const c = { ...ctx, p: { ...ctx.p, speedRIH: sp('RIH'), speedPOOH: sp('POOH') } }
      const f = forcesAtDepth(c, td, dir)
      if (f.lockup) continue
      // below the stripper (in the well): real force from effective force (Tech Note Eq 14)
      const Fbelow = f.surfaceForce + ctp * gNom.Ai - whp * gNom.Ao
      pts.push({ label: `${dir} en TD — bajo el stripper`, F: Fbelow, pi: ctp, po: whp })
      // above the stripper (atmospheric outside): Eq 16
      const strip = dir === 'POOH' ? state.stripper || 0 : -(state.stripper || 0)
      const Fabove = f.surfaceForce - whp * gNom.Ao + strip + ctp * gNom.Ai
      pts.push({ label: `${dir} en TD — sobre el stripper`, F: Fabove, pi: ctp, po: 0 })
    }
    if (tr.manualF !== null && tr.manualDp !== null) pts.push({ label: 'Punto manual', F: tr.manualF, pi: Math.max(0, tr.manualDp), po: Math.max(0, -tr.manualDp), manual: true })
    for (const q of pts) {
      q.dp = q.pi - q.po
      q.u = utilization(g, Y, q.F, q.pi, q.po)
      // collapse utilization with ovality when the net pressure is external
      q.uc = q.dp < 0 ? -q.dp / Math.max(1, Pc(q.F)) : 0
      q.umax = Math.max(q.u, q.uc)
    }

    const controls = el('div', { class: 'ctsim-card ctsim-card-body' }, [
      el('div', { class: 'row' }, [
        selectField('Espesor de pared analizado', [{ value: 'surface', label: `En superficie con CT en TD (${surfWall.toFixed(3)}")` }, ...walls.map((w) => ({ value: w, label: `${w.toFixed(3)}"` }))], tr.wall, (v) => ((tr.wall = v === 'surface' ? 'surface' : Number(v)), renderResults())),
        numField('Ovalidad', tr.ovality, (v) => ((tr.ovality = v || 0), schedule()), { unit: '%', step: 0.5, hint: '(Dmax − Dmin) / D' }),
      ]),
      numField('Desgaste adicional de pared', tr.wear, (v) => ((tr.wear = v || 0), schedule()), { unit: '%', step: 1, hint: 'Sobre el espesor mínimo del fabricante' }),
      el('div', { class: 'row' }, [
        numField('Punto manual: carga axial real', tr.manualF, (v) => ((tr.manualF = v), schedule()), { unit: 'lbf', step: 1000, hint: 'Tracción +, compresión −' }),
        numField('Punto manual: presión diferencial', tr.manualDp, (v) => ((tr.manualDp = v), schedule()), { unit: 'psi', step: 250, hint: 'Pi − Po (estallido +, colapso −)' }),
      ]),
      el('p', { class: 'note' }, `CT ${str.od}" · pared nominal ${wallNom.toFixed(3)}" → mínima ${wallMin.toFixed(3)}" (${grade.manufacturerLabel})${tr.wear ? ` − ${tr.wear} % = ${wallEff.toFixed(3)}"` : ''} · ${grade.id} (SMYS ${fmt(Y, 0)} psi) · ovalidad ${fmt(tr.ovality, 1)} %. Los puntos de la simulación usan la presión de circulación (${fmt(ctp, 0)} psi) y la WHP (${fmt(whp, 0)} psi) del formulario.`),
    ])
    resultsEl.appendChild(controls)
    const Fr = { Fmin: Math.min(...e100.points.map((q) => q.F)), Fmax: Math.max(...e100.points.map((q) => q.F)) }
    const cc = {
      c100: collapseCurve({ od: str.od, tmin: wallEff, smys: Y, ovality: ov, factor: 1, As: g.As, ...Fr }),
      c80: collapseCurve({ od: str.od, tmin: wallEff, smys: Y, ovality: ov, factor: 0.8, As: g.As, ...Fr }),
    }
    resultsEl.appendChild(triChart(e100, e80, pts, cc, tr.ovality))
    const allow = (dp) => allowableLoad(g, Y, 0.8, dp)
    const r = (label, value, unit) => el('div', { class: 'result-row' }, [el('span', { class: 'result-label' }, label), el('span', { class: 'result-value' }, [el('strong', {}, value), unit ? el('span', { class: 'result-unit' }, ' ' + unit) : null])])
    const aCtp = allow(ctp)
    resultsEl.appendChild(
      el('div', { class: 'result-card ctsim-summary' }, [
        r('Estallido sin carga axial (80 % / 100 %)', `${fmt(e80.burst, 0)} / ${fmt(e100.burst, 0)}`, 'psi'),
        r(`Colapso con ovalidad ${fmt(tr.ovality, 1)} % sin carga axial (80 % / 100 %)`, `${fmt(0.8 * Pc(0), 0)} / ${fmt(Pc(0), 0)}`, 'psi'),
        r('Colapso por fluencia (von Mises), sin ovalidad (80 % / 100 %)', `${fmt(-e80.collapse, 0)} / ${fmt(-e100.collapse, 0)}`, 'psi'),
        r(`Colapso con ovalidad bajo ${fmt(Math.max(0, pts[0]?.F || 0) / 1000, 0)} klbf de tracción (100 %)`, fmt(Pc(Math.max(0, pts[0]?.F || 0)), 0), 'psi'),
        r('Tracción máx. sin presión (80 % / 100 %)', `${fmt(e80.tensionAtZero / 1000, 1)} / ${fmt(e100.tensionAtZero / 1000, 1)}`, 'klbf'),
        aCtp ? r(`Carga admisible (80 %) con Δp = ${fmt(ctp, 0)} psi`, `${fmt(aCtp.compression / 1000, 1)} a ${fmt(aCtp.tension / 1000, 1)}`, 'klbf') : r(`Δp = ${fmt(ctp, 0)} psi`, 'fuera del límite', ''),
      ])
    )
    resultsEl.appendChild(
      el('div', { class: 'ctsim-card' }, [
        el('div', { class: 'ctsim-table-wrap' }, [
          el('table', { class: 'ctsim-table' }, [
            el('thead', {}, el('tr', {}, ['Punto', 'Carga (klbf)', 'Pi (psi)', 'Po (psi)', 'Δp (psi)', 'σVME / fluencia', 'Δp / colapso oval.'].map((h) => el('th', {}, h)))),
            el(
              'tbody',
              {},
              pts.map((q, i) =>
                el('tr', {}, [
                  el('td', {}, `${i + 1}. ${q.label}`),
                  el('td', {}, fmt(q.F / 1000, 1)),
                  el('td', {}, fmt(q.pi, 0)),
                  el('td', {}, fmt(q.po, 0)),
                  el('td', {}, fmt(q.dp, 0)),
                  el('td', { class: q.u > 0.8 ? 'ctsim-bad-text' : '' }, `${fmt(q.u * 100, 0)} % ${q.u > 0.8 ? '⚠' : '✓'}`),
                  el('td', { class: q.uc > 0.8 ? 'ctsim-bad-text' : '' }, q.dp < 0 ? `${fmt(q.uc * 100, 0)} % ${q.uc > 0.8 ? '⚠' : '✓'}` : '—'),
                ])
              )
            ),
          ]),
        ]),
      ])
    )
    resultsEl.appendChild(
      el('p', { class: 'formula-note' }, 'Esfuerzos calculados con el espesor mínimo del fabricante. Criterio de von Mises con esfuerzos de Lamé en las caras interna y externa: σVME = √{½[(σa−σθ)² + (σθ−σr)² + (σr−σa)²]}, σa = F/As; envolvente contra Δp = Pi − Po (estallido con Po = 0, colapso con Pi = 0) al 80 % (continua) y 100 % (punteada). Colapso con ovalidad (API RP 5C7 / Timoshenko): Pc² − [Py + (1 + 1,5·Δ·D/t)·Pe]·Pc + Py·Pe = 0, Py = 2σy,a·t/D, Pe = 2E/(1−ν²)·(t/D)³, Δ = (Dmax − Dmin)/D, con la fluencia reducida por la carga axial σy,a = σy[√(1 − 0,75(σa/σy)²) − 0,5·σa/σy]. En el lado de colapso rige la curva más restrictiva. La fatiga por ciclos de doblado no está incluida.')
    )
  }

  function triChart(e100, e80, pts, cc, ovPct) {
    const W = Math.round(Math.min(760, Math.max(340, (resultsEl.clientWidth || 360) - 18)))
    const H = Math.round(W * 0.78)
    const m = { l: 56, r: 14, t: 14, b: 40 }
    const all = [...e100.points, ...pts.map((q) => ({ F: q.F, dp: q.dp }))]
    const xAbs = Math.max(...all.map((q) => Math.abs(q.F))) * 1.08
    const yAbs = Math.max(...all.map((q) => Math.abs(q.dp))) * 1.08
    const xStep = xAbs > 150000 ? 50000 : 25000
    const yStep = yAbs > 15000 ? 5000 : 2500
    const x1 = Math.ceil(xAbs / xStep) * xStep
    const y1 = Math.ceil(yAbs / yStep) * yStep
    const sx = (F) => m.l + ((F + x1) / (2 * x1)) * (W - m.l - m.r)
    const sy = (dp) => m.t + ((y1 - dp) / (2 * y1)) * (H - m.t - m.b)
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('class', 'ctsim-chart')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', 'Elipse de von Mises: carga axial vs presión diferencial')
    const add = (tag, attrs) => {
      const n = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
      svg.appendChild(n)
      return n
    }
    for (let x = -x1; x <= x1; x += xStep) {
      add('line', { x1: sx(x), x2: sx(x), y1: m.t, y2: H - m.b, class: x === 0 ? 'ctsim-zero' : 'ctsim-grid' })
      add('text', { x: sx(x), y: H - m.b + 14, class: 'ctsim-tick', 'text-anchor': 'middle' }).textContent = `${x / 1000}k`
    }
    for (let y = -y1; y <= y1; y += yStep) {
      add('line', { x1: m.l, x2: W - m.r, y1: sy(y), y2: sy(y), class: y === 0 ? 'ctsim-zero' : 'ctsim-grid' })
      add('text', { x: m.l - 6, y: sy(y) + 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = `${y / 1000}k`
    }
    add('text', { x: (m.l + W - m.r) / 2, y: H - 6, class: 'ctsim-axis', 'text-anchor': 'middle' }).textContent = '← compresión · Carga axial real (lbf) · tracción →'
    const yl = add('text', { x: 12, y: (m.t + H - m.b) / 2, class: 'ctsim-axis', 'text-anchor': 'middle' })
    yl.setAttribute('transform', `rotate(-90 12 ${(m.t + H - m.b) / 2})`)
    yl.textContent = '← colapso · Δp (psi) · estallido →'
    const poly = (e, cls) => add('polygon', { points: e.points.map((q) => `${sx(q.F)},${sy(q.dp)}`).join(' '), class: cls })
    poly(e100, 'ctsim-env100')
    poly(e80, 'ctsim-env80')
    const curve = (arr, cls) => add('polyline', { points: arr.filter((q) => q.dp < 0).map((q) => `${sx(q.F)},${sy(q.dp)}`).join(' '), class: cls })
    curve(cc.c100, 'ctsim-coll100')
    curve(cc.c80, 'ctsim-coll80')
    pts.forEach((q, i) => {
      add('circle', { cx: sx(q.F), cy: sy(q.dp), r: 5, class: q.umax > 0.8 ? 'ctsim-pt ctsim-pt-bad' : 'ctsim-pt' })
      add('text', { x: sx(q.F) + 8, y: sy(q.dp) - 7, class: 'ctsim-pt-label' }).textContent = String(i + 1)
    })
    return el('div', { class: 'ctsim-chart-wrap' }, [
      el('div', { class: 'ctsim-legend' }, [
        el('span', {}, [el('i', { class: 'ctsim-key ctsim-rih-bg' }), 'Límite operativo 80 %']),
        el('span', { class: 'ctsim-legend-dim' }, [el('i', { class: 'ctsim-key ctsim-dash-bg' }), 'Fluencia 100 %']),
        el('span', {}, [el('i', { class: 'ctsim-key ctsim-s3-bg' }), `Colapso ovalidad ${fmt(ovPct, 1)} % (80 % / 100 %)`]),
        el('span', {}, [el('i', { class: 'ctsim-key ctsim-pooh-bg' }), 'Puntos de operación']),
      ]),
      svg,
    ])
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
    const grade = findGrade(state.grade)
    // real axial force above the stripper at max POOH: F_R = Weight + P_i·A_i + RBT (Tech Note Eq 17)
    const maxPooh = rows.reduce((a, r) => (r.pooh > a.pooh ? r : a), rows[0])
    const tp = tubeProps(str.od, str.wallAt(Math.max(0, maxPooh.depth - (state.bha.length || 0))))
    const realTop = maxPooh.pooh + (state.ctp || 0) * tp.Ai + (state.reelTared ? 0 : state.rbtPOOH || 0) + (state.indicatorOffset || 0)
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

  function plugTable() {
    const td = Math.min(state.survey[state.survey.length - 1][0], buildString(state.string).totalLength)
    const plugs = state.plugs.filter((d) => d > 0 && d <= td)
    const p = params(state.muRIH, state.muPOOH)
    const sim = simulateTrip(p, cal.model, plugs)
    const traj = wellTrajectory(state.survey, 10)
    const f = (v) => (v === null || v === undefined ? 'Lock-up' : fmt(v, 0))
    const rows = sim.rows.map((r, i) => {
      const pt = pointAtMd(traj, r.depth)
      const sd = r.rih === null ? { bottomForce: 0 } : maxSetDown({ ...p, speedRIH: p.speedAt(r.depth, 'RIH') }, r.depth, cal.model)
      return el('tr', {}, [
        el('td', {}, `T${i + 1}`),
        el('td', {}, fmt(r.depth, 0)),
        el('td', {}, fmt(pt.inc, 1)),
        el('td', {}, f(r.rih)),
        el('td', {}, f(r.pooh)),
        el('td', {}, fmt(sd.bottomForce, 0)),
      ])
    })
    const skipped = state.plugs.length - plugs.length
    return el('details', { class: 'ctsim-card', open: true }, [
      el('summary', {}, `Pesos en cada tapón (${plugs.length})`),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, el('tr', {}, ['#', 'MD (m)', 'Inc (°)', 'RIH (lb)', 'POOH (lb)', 'Set-down máx. (lb)'].map((h) => el('th', {}, h)))),
          el('tbody', {}, rows),
        ]),
      ]),
      el('p', { class: 'note ctsim-pad' }, `Numeración desde el más somero. RIH/POOH con la velocidad del tramo; set-down = fuerza máxima que llega a la herramienta antes del lock-up.${skipped ? ` ${skipped} tapón(es) fuera del survey/sarta no se muestran.` : ''}`),
    ])
  }

  const WELL_VARS = ['--ctsim-rih', '--ctsim-pooh', '--ctsim-s3', '--ctsim-s4', '--ctsim-s5', '--ctsim-s6']

  function survey3dPanel() {
    const multi = state.surveys.length > 1
    const all = multi && state.view3dAll
    const holder = el('div', { class: 'ctsim-3d' })
    const btns = el('div', { class: 'ctsim-3d-btns' }, [
      ...(multi
        ? [
            el('button', { class: `btn-secondary${all ? ' active' : ''}`, type: 'button', onClick: () => ((state.view3dAll = true), renderResults()) }, 'Todos los pozos'),
            el('button', { class: `btn-secondary${all ? '' : ' active'}`, type: 'button', onClick: () => ((state.view3dAll = false), renderResults()) }, `Solo ${state.surveyName}`),
          ]
        : []),
      ...[
        ['iso', 'Perspectiva'],
        ['plan', 'Planta'],
        ['section', 'Corte'],
      ].map(([k, lab]) => el('button', { class: 'btn-secondary', type: 'button', onClick: () => view3d?.setView(k) }, lab)),
    ])
    const offs = headOffsets()
    const wells = state.surveys
      .map((w, i) => ({ w, i }))
      .filter(({ i }) => all || i === state.active)
      .map(({ w, i }) => {
        const traj = wellTrajectory(w.rows, 10)
        const { kop, lp } = kopLp(w.rows)
        const last = traj[traj.length - 1]
        const plugList = (i === state.active ? state.plugs : w.plugs || []).filter((d) => d <= last.md)
        return {
          idx: i,
          name: w.name,
          traj,
          offset: all ? offs[i] : { n: 0, e: 0, z: 0 },
          colorVar: all ? WELL_VARS[i % WELL_VARS.length] : '--ctsim-rih',
          active: i === state.active,
          marks: { kop: kop != null ? pointAtMd(traj, kop) : null, lp: lp != null ? pointAtMd(traj, lp) : null },
          plugs: plugList.map((d, k) => ({ ...pointAtMd(traj, d), idx: k + 1 })),
        }
      })
    const act = wells.find((w) => w.active) || wells[0]
    const last = act.traj[act.traj.length - 1]
    const missing = all ? state.surveys.filter((w, i) => !offs[i].known).map((w) => w.name) : []
    const notes = [
      el('p', { class: 'note ctsim-pad' }, `${act.name}: TVD ${fmt(last.tvd, 1)} m · desplazamiento ${fmt(Math.hypot(last.n, last.e), 0)} m · DLS máx. ${fmt(Math.max(...act.traj.map((t) => t.dls)), 1)}°/30 m. Arrastrá para rotar, rueda o pellizco para zoom.`),
      missing.length
        ? el('p', { class: 'note ctsim-pad' }, `⚠ Sin coordenadas de boca de pozo: ${missing.join(', ')}. ${missing.length === state.surveys.length ? 'Todos se dibujan' : 'Se dibuja'} desde el mismo punto; cargalas en "1 · Surveys → Coordenadas de boca de pozo".`)
        : null,
    ]
    const pairs = all && wells.length > 1 ? wellPairs(wells) : []
    const measures = []
    for (const pr of pairs.filter((x) => x.adjacent)) {
      if (pr.curve) measures.push({ kind: 'curve', a: pr.curve.a, b: pr.curve.b, text: `Curva ${pr.A.name}–${pr.B.name}: ${fmt(pr.curve.d, 0)} m` })
      if (pr.lat) measures.push({ kind: 'lateral', a: pr.lat.a, b: pr.lat.b, text: `${pr.A.name}–${pr.B.name}: ${fmt(pr.lat.d, 0)} m en planta (ΔX ${fmt(pr.lat.dx, 0)} · ΔY ${fmt(pr.lat.dy, 0)} · ΔTVD ${fmt(pr.lat.dz, 0)})` })
    }
    const LBL = [
      ['names', multi && all ? 'Nombres de pozo' : 'TD'],
      ['heads', 'Bocas de pozo'],
      ['marks', 'KOP / LP'],
      ['tvd', 'Profundidad TVD'],
      ['plugs', 'Tapones'],
      ['north', 'Norte'],
      ...(measures.length
        ? [
            ['curve', 'Distancia en la curva'],
            ['lateral', 'Distancia entre laterales'],
          ]
        : []),
    ]
    const toggles = el('div', { class: 'ctsim-chk-row ctsim-3d-toggles' }, [
      el('span', { class: 'field-label' }, 'Etiquetas'),
      ...LBL.map(([k, lab]) =>
        el('label', { class: 'ctsim-chk' }, [
          el('input', { type: 'checkbox', checked: state.labels3d[k] !== false, onChange: (e) => ((state.labels3d[k] = e.target.checked), view3d?.setLabels(state.labels3d)) }),
          lab,
        ])
      ),
    ])
    const wrap = el('div', { class: 'ctsim-card' }, [el('div', { class: 'ctsim-card-body ctsim-pad-top' }, [btns, toggles, holder, ...notes])])
    const out = el('div', {}, [wrap, pairs.length ? separationTable(pairs) : null])
    holder.textContent = 'Cargando visor 3D…'
    requestAnimationFrame(async () => {
      try {
        const { mountSurvey3D } = await import('./view3d.js')
        if (state.tab !== '3d' || !holder.isConnected) return
        view3d = mountSurvey3D(holder, { wells, measures, labels: state.labels3d })
      } catch (err) {
        holder.textContent = `No se pudo abrir el visor 3D: ${err.message}`
      }
    })
    return out
  }

  // Distances between every pair of wells (points with wellhead offsets):
  //  curve: closest points of the two curves (KOP–LP of each), 3-D
  //  lat:   closest points of the two laterals (inc > 80°) in plan, with
  //         ΔX / ΔY in the coordinate convention and ΔTVD
  //  latMed: median over A's lateral of the 3-D distance to B
  //  min:   closest points of the whole trajectories, 3-D
  // `adjacent` marks neighbouring laterals (ordered across the mean lateral
  // azimuth), the pairs drawn in the 3D view.
  function wellPairs(wells) {
    const abs = wells.map((w) => {
      const o = w.offset
      const { kop, lp } = kopLp(state.surveys[w.idx].rows)
      const pts = w.traj.map((p) => ({ md: p.md, inc: p.inc, n: p.n + o.n, e: p.e + o.e, tvd: p.tvd - o.z }))
      return { pts, curve: kop != null && lp != null ? pts.filter((p) => p.md >= kop && p.md <= lp) : [], lat: pts.filter((p) => p.inc > 80) }
    })
    const d3 = (p, q) => Math.hypot(p.n - q.n, p.e - q.e, p.tvd - q.tvd)
    const closest = (P, Q, dist) => {
      let best = null
      for (const p of P)
        for (const q of Q) {
          const d = dist(p, q)
          if (!best || d < best.d) best = { d, a: p, b: q }
        }
      return best
    }
    // order the wells across the mean lateral direction
    let sn = 0
    let se = 0
    for (const w of abs) if (w.lat.length) (sn += w.lat[w.lat.length - 1].n - w.lat[0].n), (se += w.lat[w.lat.length - 1].e - w.lat[0].e)
    const az = Math.atan2(se, sn)
    const across = abs.map((w, k) => {
      const m = w.lat.length ? w.lat[Math.floor(w.lat.length / 2)] : w.pts[w.pts.length - 1]
      return { k, s: m.e * Math.cos(az) - m.n * Math.sin(az) }
    })
    across.sort((x, y) => x.s - y.s)
    const adj = new Set(across.slice(1).map((x, i) => [across[i].k, x.k].sort().join('-')))
    const gk = state.coordConv === 'gk'
    const out = []
    for (let i = 0; i < wells.length; i++)
      for (let j = i + 1; j < wells.length; j++) {
        const A = abs[i]
        const B = abs[j]
        const curve = A.curve.length && B.curve.length ? closest(A.curve, B.curve, d3) : null
        let lat = A.lat.length && B.lat.length ? closest(A.lat, B.lat, (p, q) => Math.hypot(p.n - q.n, p.e - q.e)) : null
        if (lat) {
          const dN = Math.abs(lat.a.n - lat.b.n)
          const dE = Math.abs(lat.a.e - lat.b.e)
          lat = { ...lat, dx: gk ? dN : dE, dy: gk ? dE : dN, dz: Math.abs(lat.a.tvd - lat.b.tvd) }
        }
        const dl = A.lat.map((p) => Math.min(...B.pts.map((q) => d3(p, q)))).sort((x, y) => x - y)
        out.push({
          A: wells[i],
          B: wells[j],
          heads: Math.hypot(A.pts[0].n - B.pts[0].n, A.pts[0].e - B.pts[0].e),
          curve,
          lat,
          latMed: dl.length ? dl[Math.floor(dl.length / 2)] : null,
          min: closest(A.pts, B.pts, d3),
          adjacent: wells.length === 2 || adj.has([i, j].sort().join('-')),
        })
      }
    return out
  }

  function separationTable(pairs) {
    const sw = (w) => el('span', { class: `ctsim-swatch ctsim-${WELL_CLS[w.idx % WELL_CLS.length]}-bg` })
    const [lx, ly] = state.coordConv === 'gk' ? ['ΔX (N)', 'ΔY (E)'] : ['ΔX (E)', 'ΔY (N)']
    const f0 = (v) => (v === null || v === undefined ? '—' : fmt(v, 0))
    return el('details', { class: 'ctsim-card ctsim-head-table', open: true }, [
      el('summary', {}, 'Separación entre pozos'),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, [
            el('tr', {}, [
              el('th', { rowspan: 2 }, 'Pozos'),
              el('th', { rowspan: 2 }, 'Bocas (m)'),
              el('th', { rowspan: 2 }, 'Curva mín. (m)'),
              el('th', { colspan: 4 }, 'Laterales: menor distancia en planta (m)'),
              el('th', { rowspan: 2 }, 'Laterales mediana (m)'),
              el('th', { rowspan: 2 }, 'Mín. 3D (m) @ MD'),
            ]),
            el('tr', {}, ['Dist.', lx, ly, 'ΔTVD'].map((h) => el('th', {}, h))),
          ]),
          el(
            'tbody',
            {},
            pairs.map((r) =>
              el('tr', {}, [
                el('td', {}, [sw(r.A), r.A.name, ' – ', sw(r.B), r.B.name, r.adjacent && pairs.length > 1 ? ' ·' : '']),
                el('td', {}, fmt(r.heads, 1)),
                el('td', {}, r.curve ? `${f0(r.curve.d)} @ ${f0(r.curve.a.md)}/${f0(r.curve.b.md)}` : '—'),
                el('td', {}, r.lat ? f0(r.lat.d) : '—'),
                el('td', {}, r.lat ? f0(r.lat.dx) : '—'),
                el('td', {}, r.lat ? f0(r.lat.dy) : '—'),
                el('td', {}, r.lat ? f0(r.lat.dz) : '—'),
                el('td', {}, f0(r.latMed)),
                el('td', {}, `${fmt(r.min.d, 1)} @ ${f0(r.min.a.md)}/${f0(r.min.b.md)}`),
              ])
            )
          ),
        ]),
      ]),
      el('p', { class: 'note' }, `Distancias centro a centro entre trayectorias (cada 10 m de MD), sin elipses de incertidumbre. Curva: puntos más cercanos entre los tramos KOP–LP (3D). Laterales (inclinación > 80°): menor distancia en planta, con sus componentes ΔX / ΔY ${state.coordConv === 'gk' ? '(X = Norte, Y = Este)' : '(X = Este, Y = Norte)'} y la diferencia de TVD en esos puntos; mediana: distancia típica a lo largo del lateral del primer pozo. "@" indica la MD de cada pozo.${pairs.length > 2 ? ' En el 3D se acotan los pozos vecinos (marcados con ·).' : ''}`),
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
    // viewBox follows the available width so text keeps its size on wide screens
    const W = Math.round(Math.min(760, Math.max(360, (resultsEl.clientWidth || 360) - 18)))
    const H = W > 500 ? 620 : 520
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
    for (const d of state.plugs) {
      if (d > d1) continue
      add('line', { x1: W - m.r - 8, x2: W - m.r, y1: sy(d), y2: sy(d), class: 'ctsim-plug' })
    }
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
        state.plugs.length ? el('span', { class: 'ctsim-legend-dim' }, [el('i', { class: 'ctsim-key ctsim-plug-bg' }), 'tapones']) : null,
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
