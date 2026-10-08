// Simulador de pesos RIH / POOH para coiled tubing (lavado post-frac).
// UI over src/ctsim/forces.js with the field-calibrated terms of
// src/ctsim/calibration.js.
import { el, fmt, clear } from '../ui/dom.js'
import { toNumber as toNum } from './parsers.js'
import { simulateTrip, maxSetDown, buildString, tubeProps, kopLp, wellTrajectory, pointAtMd, buildContext, forcesAtDepth } from './forces.js'
import { readSurveyFile, parseSurveyTable, splitTable, readRunFile, parseDepthList, parseCoordinate, parseWellHead } from './parsers.js'
import { HIST_SPEEDS, planSegments, actualTimes, plannedCurve, fmtDuration } from './times.js'
import { makeUnits, DEFAULT_UNITS, UNIT_CHOICES, niceStep, scaledStep } from './units.js'
import { toProject, applyProject, validateProject, loadLocal, clearLocal, listTemplates, saveTemplate, applyTemplate, deleteTemplate, projectFileName } from './project.js'
import { mergeRuns, autoAssign, runsOf, pickRun } from './runs.js'
import { putPad, getPad, deletePad, listPads, newPadId, currentPadId, setCurrentPadId } from './padstore.js'
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
    projectName: '',
    units: { ...DEFAULT_UNITS }, // display units (calculations stay in m, lbf, psi)
    saveStatus: '', // last autosave result shown in the project card
    tplName: '',
    survey: null,
    surveyName: '',
    surveys: [], // [{ name, rows, plugs, plugsText, head: { x, y, z } }] up to MAX_SURVEYS
    // wellhead coordinates: 'gk' = Gauss-Krüger (X = Norte, Y = Este), 'xe' = X = Este
    coordConv: 'gk',
    // wells drawn in the 3D view (indices; null = all) and label groups shown
    // (none by default: they appear when ticked)
    wells3d: null,
    // 3D view pinned at the top while the tables scroll underneath
    pin3d: true,
    // operation times: expected average speeds (m/min) and time at bottom
    timePlan: JSON.parse(JSON.stringify(HIST_SPEEDS)),
    // runs of the pad CSV(s), each assigned to a well; runSel: well → run uid
    runs: [],
    runSel: {},
    runProgress: null,
    padId: null, // saved pad (IndexedDB) this session writes to
    pads: [], // saved pads list (summary)
    size3d: 'm', // pinned view height: s / m / l
    labels3d: { names: false, heads: false, marks: false, tvd: false, plugs: false, north: false, curve: false, lateral: false },
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
    // no pumping (no ERT, no annular drag) while the tool is above the KOP
    noPumpAboveKop: { RIH: true, POOH: true },
    indicatorOffset: 0,
    // speed plan per section (m/min): vertical to KOP, curve KOP–LP, lateral
    speeds: { vert: { RIH: 23, POOH: 23 }, curve: { RIH: 10, POOH: 10 }, lat: { RIH: 3.5, POOH: 10 } },
    ertLevel: cal.ertDefault,
    ert: ERT_LEVELS[cal.ertDefault].value,
    readings: { rihMd: 2900, rihW: null, poohMd: 3500, poohW: null },
    readingsMsg: '',
    bha: { ...DEFAULT_BHA },
    run: null,
    runMsg: '',
    match: null,
    error: '',
    tab: 'pesos',
    sens: { mus: [0.25, 0.3, 0.35], erts: [0, 500, 1000, 1500], required: 2000, showMu: null, showErt: null, wells: null, result: null, key: '' },
    tri: { wall: 'surface', wear: 0, ovality: 2, manualF: null, manualDp: null },
  }

  // ---- display units -------------------------------------------------------
  const U = () => makeUnits(state.units)
  const nL = (v, d) => fmt(U().cv.len(v), d ?? U().d.len)
  const nF = (v, d) => fmt(U().cv.force(v), d ?? U().d.force)
  const nP = (v, d) => fmt(U().cv.press(v), d ?? U().d.press)
  const nS = (v, d) => fmt(U().cv.speed(v), d ?? U().d.speed)
  // large forces (string tension, loads): klb when in lbf, else kN / tf
  const nFk = (v, d = 1) => (state.units.force === 'lbf' || !state.units.force ? fmt(v / 1000, d) : nF(v))
  const uFk = () => (state.units.force === 'lbf' || !state.units.force ? 'klb' : uF())
  const uL = () => U().label.len
  const uF = () => U().label.force
  const uP = () => U().label.press
  const uS = () => U().label.speed
  // number field in display units: q = 'len' | 'force' | 'press' | 'speed'
  function qField(label, value, onSet, q, opts = {}) {
    const u = U()
    const shown = value === null || value === undefined ? null : +u.cv[q](value).toFixed(u.d[q] + 2)
    return numField(label, shown, (v) => onSet(v === null ? null : u.inv[q](v)), { ...opts, unit: u.label[q], step: scaledStep(opts.step, u.f[q]) })
  }
  const qset = (k) => (v) => {
    state[k] = v
    schedule()
  }
  // depth axis helper for charts: nice ticks in display units for [0, dMax] m
  function depthTicks(dMax, ticks = 7) {
    const u = U()
    const top = u.cv.len(dMax)
    const step = niceStep(top, ticks)
    const out = []
    for (let v = 0; v <= top + 1e-6; v += step) out.push({ m: u.inv.len(v), label: fmt(v, 0) })
    return { ticks: out, max: u.inv.len(Math.ceil(top / step) * step) }
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
    syncRun()
  }

  // run shown for the active well (its own, or the one picked if several)
  function syncRun() {
    const r = state.surveyName ? pickRun(state.runs, state.runSel, state.surveyName) : null
    if (r !== state.run) state.match = null
    state.run = r
  }

  // Target depth of a well (the job's objective, usually short of TD),
  // limited by TD and the string length.
  function surveyOf(rows) {
    return state.surveys.find((w) => w.rows === rows)
  }
  function tdOf(rows = state.survey) {
    const td = rows[rows.length - 1][0]
    const t = surveyOf(rows)?.target
    return Math.min(td, t > 0 ? t : td, buildString(state.string).totalLength)
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
              el('span', { class: 'ctsim-well-info' }, `TD ${nL(w.rows[w.rows.length - 1][0])} ${uL()}${w.target > 0 && w.target < w.rows[w.rows.length - 1][0] ? ` · obj. ${nL(w.target)} ${uL()}` : ''} · ${w.rows.length} est.${(i === state.active ? state.plugs : w.plugs).length ? ` · ${(i === state.active ? state.plugs : w.plugs).length} tap.` : ''}`),
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
              el('thead', {}, el('tr', {}, [`MD (${uL()})`, 'Inc (°)', 'Az (°)'].map((h) => el('th', {}, h)))),
              el(
                'tbody',
                {},
                (sv.length > 8 ? [...sv.slice(0, 4), null, ...sv.slice(-3)] : sv).map((r) =>
                  r ? el('tr', {}, r.map((v, j) => el('td', {}, j === 0 ? nL(v, 2) : fmt(v, 2)))) : el('tr', {}, [el('td', { colspan: 3, class: 'ctsim-ellipsis' }, `… ${sv.length - 7} estaciones más …`)])
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
      state.surveys.length ? targetsTable() : null,
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

  // ---- target depth of every well (one table for the whole pad) -----------
  function targetsTable() {
    const u = U()
    const set = (w, v) => {
      const td = w.rows[w.rows.length - 1][0]
      w.target = v > 0 ? Math.min(u.inv.len(v), td) : null
    }
    const cell = (w, i) =>
      el('input', {
        type: 'text',
        inputmode: 'decimal',
        class: 'ctsim-cell-input',
        placeholder: 'TD',
        value: w.target > 0 ? String(+u.cv.len(w.target).toFixed(1)) : '',
        'aria-label': `Profundidad objetivo de ${w.name} (${uL()})`,
        onChange: (e) => {
          set(w, toNum(e.target.value))
          renderForm()
          schedule()
        },
        // a column pasted from Excel fills this well and the ones below
        onPaste: (e) => {
          // keep the pasted order (one value per well), unlike the plug list
          const vals = (e.clipboardData?.getData('text') || '').split(/[\r\n\t;]+/).map((x) => toNum(x.trim())).filter((v) => v !== null && v > 0)
          if (vals.length < 2) return
          e.preventDefault()
          vals.forEach((v, k) => state.surveys[i + k] && set(state.surveys[i + k], v))
          renderForm()
          schedule()
        },
      })
    const open = state.surveys.some((w) => w.target > 0) || state.targetsOpen
    return el('details', { class: 'ctsim-preview-det', open, onToggle: (e) => (state.targetsOpen = e.target.open) }, [
      el('summary', {}, 'Profundidad objetivo de cada pozo'),
      el('div', { class: 'ctsim-table-wrap ctsim-head-table' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, el('tr', {}, ['Pozo', `TD survey (${uL()})`, `Objetivo (${uL()})`].map((h) => el('th', {}, h)))),
          el(
            'tbody',
            {},
            state.surveys.map((w, i) =>
              el('tr', {}, [
                el('td', {}, [el('span', { class: `ctsim-swatch ctsim-w${(i % 6) + 1}-bg` }), w.name]),
                el('td', {}, nL(w.rows[w.rows.length - 1][0])),
                el('td', {}, cell(w, i)),
              ])
            )
          ),
        ]),
      ]),
      el('p', { class: 'note' }, 'Hasta dónde se baja en cada pozo (nunca es la TD). Vacío = TD del survey. Podés pegar una columna de Excel en la primera fila y se completan todos en orden. Se usa en pesos, sensibilidad, tiempos y triaxial.'),
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
                el('td', {}, [el('span', { class: `ctsim-swatch ctsim-w${(i % 6) + 1}-bg` }), w.name]),
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
                state.plugs = parseDepthList(state.plugsText).map((d) => U().inv.len(d))
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
        el('p', { class: 'note' }, n ? `✓ ${n} tapones entre ${nL(state.plugs[0])} y ${nL(state.plugs[n - 1])} ${uL()} MD. Se marcan en el gráfico, en la vista 3D y en la tabla de tapones.` : 'Opcional. Se muestran en el gráfico, en el 3D y con el peso esperado y el set-down disponible en cada uno.'),
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
        el('input', { type: 'number', step: 1, value: +U().cv.len(sec.length).toFixed(2), 'aria-label': `Longitud (${uL()})`, onInput: (e) => ((sec.length = U().inv.len(Number(e.target.value))), (state.stringPreset = 'custom'), schedule()) }),
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
        el('div', { class: 'ctsim-sec-head' }, [el('span', {}, '#'), el('span', {}, `Long. (${uL()})`), el('span', {}, 'Pared inicio (in)'), el('span', {}, 'Pared fin (in)'), el('span', {}, '')]),
        ...rows,
        el('div', { class: 'row' }, [
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => (s.sections.push({ length: 500, wallStart: 0.175, wallEnd: 0.175 }), (state.stringPreset = 'custom'), renderForm(), schedule()) }, '+ Sección'),
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => ((state.string = JSON.parse(JSON.stringify(STANDARD_STRING_2375))), (state.stringPreset = 'standard'), (state.grade = STRING_PRESETS[0].grade), renderForm(), schedule()) }, 'Sarta estándar'),
        ]),
        el('p', { class: 'note' }, `Secciones del core (carrete) al extremo libre (herramienta). Largo total ${nL(total)} ${uL()}.`),
        el('div', { class: 'row' }, [
          qField('BHA: longitud', state.bha.length, (v) => ((state.bha.length = v || 0), schedule()), 'len', { step: 0.1 }),
          qField('BHA: peso en aire', state.bha.weight, (v) => ((state.bha.weight = v || 0), schedule()), 'force', { step: 10 }),
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
    return el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Fabricante y grado'), sel, el('span', { class: 'ctsim-hint' }, `${g.manufacturerLabel}: fluencia ${nP(g.smys)} ${uP()}, tracción ${nP(g.smts)} ${uP()}`)])
  }

  // ---- operation -----------------------------------------------------------
  function operationCard() {
    return card('5 · Parámetros operativos', [
      el('div', { class: 'row' }, [
        qField('Presión de pozo (WHP)', state.whp, qset('whp'), 'press', { step: 50 }),
        qField('Presión de circulación', state.ctp, qset('ctp'), 'press', { step: 100, hint: 'Solo para el chequeo de tensión' }),
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
      el('span', { class: 'field-label' }, 'Sin bombeo con la herramienta arriba del KOP (sin ERT ni arrastre del flujo anular en la vertical)'),
      el('div', { class: 'row' }, [
        ...['RIH', 'POOH'].map((dir) =>
          el('label', { class: 'ctsim-chk' }, [
            el('input', { type: 'checkbox', checked: !!state.noPumpAboveKop?.[dir], onChange: (e) => ((state.noPumpAboveKop = { ...state.noPumpAboveKop, [dir]: e.target.checked }), schedule()) }),
            dir,
          ])
        ),
      ]),
      numField('Densidad del fluido (slickwater)', state.fluidPpg, set('fluidPpg'), { unit: 'ppg', step: 0.01 }),
      speedPlan(),
    ])
  }

  function speedPlan() {
    const { kop, lp } = state.survey ? kopLp(state.survey) : { kop: null, lp: null }
    const zones = [
      ['vert', `Vertical (0–${kop ? nL(kop) : 'KOP'} ${uL()})`],
      ['curve', `Curva (${kop ? nL(kop) : 'KOP'}–${lp ? nL(lp) : 'LP'} ${uL()})`],
      ['lat', `Lateral (${lp ? nL(lp) : 'LP'} ${uL()}–TD)`],
    ]
    const inp = (z, dir) =>
      el('input', {
        type: 'number',
        step: 0.5,
        value: +U().cv.speed(state.speeds[z][dir]).toFixed(2),
        inputmode: 'decimal',
        'aria-label': `Velocidad ${dir} ${z} (${uS()})`,
        onInput: (e) => ((state.speeds[z][dir] = U().inv.speed(Number(e.target.value)) || 0.1), schedule()),
      })
    return el('div', { class: 'field' }, [
      el('span', { class: 'field-label' }, `Velocidad de tubería por tramo (${uS()})`),
      el('div', { class: 'ctsim-speed-grid' }, [
        el('span', {}, ''),
        el('span', { class: 'ctsim-speed-h' }, 'RIH'),
        el('span', { class: 'ctsim-speed-h' }, 'POOH'),
        ...zones.flatMap(([z, label]) => [el('span', { class: 'ctsim-speed-z' }, label), inp(z, 'RIH'), inp(z, 'POOH')]),
      ]),
      el('span', { class: 'ctsim-hint' }, '1 m/min = 3,28 ft/min. Elegís las unidades en «0 · Proyecto». La velocidad es la de toda la sarta y depende de dónde está la herramienta; es un factor clave en el lateral.'),
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
      qField('Fuerza de fricción del stripper', state.stripper, qset('stripper'), 'force', { step: 250 }),
      el('div', { class: 'row' }, [
        qField('Tensión del reel RIH', state.rbtRIH, qset('rbtRIH'), 'force', { step: 100 }),
        qField('Tensión del reel POOH', state.rbtPOOH, qset('rbtPOOH'), 'force', { step: 100 }),
      ]),
      el('label', { class: 'ctsim-chk' }, [
        el('input', { type: 'checkbox', checked: state.reelTared, onChange: (e) => ((state.reelTared = e.target.checked), renderForm(), schedule()) }),
        'Indicador de peso tarado con el CT en el inyector y tensión de reel (el reel no aparece en la lectura)',
      ]),
      qField('Corrección del cero del indicador', state.indicatorOffset, qset('indicatorOffset'), 'force', { step: 250, hint: 'Se resta de la lectura en RIH y POOH. La completa el ajuste con lecturas de campo o con una carrera.' }),
    ])
  }

  function readingsCard() {
    const rd = state.readings
    const setR = (k) => (v) => (rd[k] = v)
    return card(
      '7 · Ajuste con lecturas de campo (opcional)',
      [
        el('p', { class: 'note' }, 'Con una lectura RIH (p. ej. al llegar a KOP) y una lectura POOH (p. ej. el pull test en el LP) se recalculan la fricción del stripper y la tensión del reel, que cambian en cada trabajo.'),
        el('div', { class: 'row' }, [qField('Prof. lectura RIH', rd.rihMd, setR('rihMd'), 'len', { step: 10 }), qField('Peso RIH leído', rd.rihW, setR('rihW'), 'force', { step: 100 })]),
        el('div', { class: 'row' }, [qField('Prof. lectura POOH', rd.poohMd, setR('poohMd'), 'len', { step: 10 }), qField('Peso POOH leído', rd.poohW, setR('poohW'), 'force', { step: 100 })]),
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
        state.readingsMsg = `Stripper ${nF(r.stripperLbf)} ${uF()} · ${offLabel} ${nF(r.reelTension)} ${uF()} (cargados en el formulario).${r.stripperLbf < 0 ? ' ⚠ Stripper negativo: revisá las lecturas o el µ.' : ''}`
      } catch (err) {
        state.readingsMsg = err.message
      }
    }
    renderForm()
    renderResults()
  }

  // "21/08 13:24" from a CSV timestamp (s, wall clock stored as UTC)
  function fmtStamp(t) {
    const d = new Date(t * 1000)
    const p2 = (n) => String(n).padStart(2, '0')
    return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
  }

  function runCard() {
    const fileInput = el('input', {
      type: 'file',
      accept: '.csv,.txt',
      class: 'ctsim-file',
      onChange: async (e) => {
        const f = e.target.files[0]
        if (!f) return
        state.runProgress = 0
        renderForm()
        try {
          let last = 0
          const res = await readRunFile(f, {}, (p) => {
            if (p - last < 0.05) return
            last = p
            const n = formEl.querySelector('.ctsim-run-progress')
            if (n) n.textContent = `Leyendo ${f.name}… ${Math.round(p * 100)} %`
          })
          const before = state.runs.length
          state.runs = mergeRuns(state.runs, res.runs, { file: f.name, hasTime: res.hasTime, hasWHP: res.hasWHP, hasQ: res.hasQ })
          // new runs go to the wells in list order (a short first attempt
          // and its retry stay on the same well); fix it in the table
          autoAssign(
            state.runs,
            state.surveys.map((w) => ({ name: w.name, td: w.rows[w.rows.length - 1][0] }))
          )
          state.runMsg = `${f.name}: ${state.runs.length - before} carrera(s) nueva(s)${res.runs.length > state.runs.length - before ? ` (${res.runs.length - (state.runs.length - before)} ya estaban)` : ''}.`
          syncRun()
          state.error = ''
        } catch (err) {
          state.error = err.message
        }
        state.runProgress = null
        renderForm()
        renderResults()
      },
    })
    const runLabel = (r) => `${fmtStamp(r.start)} → ${fmtStamp(r.end)} · máx. ${nL(r.maxMd)} ${uL()}`
    const wellOpts = [{ value: '', label: '(sin asignar)' }, ...state.surveys.map((w) => ({ value: w.name, label: w.name }))]
    const runsTable = state.runs.length
      ? el('div', { class: 'ctsim-table-wrap ctsim-head-table' }, [
          el('table', { class: 'ctsim-table' }, [
            el('thead', {}, el('tr', {}, ['#', 'Carrera', 'Pozo', ''].map((h) => el('th', {}, h)))),
            el(
              'tbody',
              {},
              state.runs.map((r, i) =>
                el('tr', { class: r === state.run ? 'ctsim-run-active' : '' }, [
                  el('td', {}, String(i + 1)),
                  el('td', {}, [runLabel(r), el('div', { class: 'ctsim-hint' }, `${r.file} · ${r.points.length} puntos de peso`)]),
                  el('td', {}, [
                    el(
                      'select',
                      {
                        class: 'ctsim-inline-select',
                        'aria-label': `Pozo de la carrera ${i + 1}`,
                        onChange: (e) => {
                          r.well = e.target.value || null
                          syncRun()
                          renderForm()
                          renderResults()
                        },
                      },
                      wellOpts.map((o) => el('option', { value: o.value, selected: (r.well || '') === o.value }, o.label))
                    ),
                  ]),
                  el('td', {}, [
                    el(
                      'button',
                      {
                        class: 'btn-icon',
                        type: 'button',
                        'aria-label': `Quitar la carrera ${i + 1}`,
                        onClick: () => {
                          state.runs = state.runs.filter((x) => x !== r)
                          syncRun()
                          renderForm()
                          renderResults()
                        },
                      },
                      '×'
                    ),
                  ]),
                ])
              )
            ),
          ]),
        ])
      : null
    const mine = state.surveyName ? runsOf(state.runs, state.surveyName) : []
    return card(
      state.runs.length ? `8 · Carreras reales (${state.runs.length})` : '8 · Comparar con una carrera real (opcional)',
      [
        fileInput,
        state.runProgress !== null ? el('p', { class: 'note ctsim-run-progress' }, 'Leyendo…') : null,
        state.runMsg ? el('p', { class: 'note' }, state.runMsg) : null,
        runsTable,
        mine.length > 1
          ? selectField(
              `Carrera usada para ${state.surveyName} (tiene ${mine.length})`,
              mine.map((r) => ({ value: r.uid, label: runLabel(r) })),
              state.run?.uid,
              (v) => ((state.runSel = { ...state.runSel, [state.surveyName]: v }), syncRun(), renderForm(), renderResults())
            )
          : null,
        el(
          'p',
          { class: 'note' },
          state.runs.length
            ? state.run
              ? `${state.surveyName}: se compara con la carrera del ${runLabel(state.run)}${state.run.hasTime ? '' : ' (sin fecha/hora: los tiempos suponen 1 dato por segundo)'}. Las carreras quedan guardadas con el pad; al elegir otro pozo se usa la suya.`
              : `${state.surveyName || 'El pozo elegido'} no tiene carrera asignada: elegí el pozo de cada carrera en la tabla.`
            : 'CSV del sistema de adquisición (fecha/hora, peso y profundidad; velocidad, WHP y caudal opcionales). Cargá el archivo de todo el pad: se detectan las carreras y se asignan a los pozos en orden (corregilo en la tabla si hace falta). Quedan guardadas con el pad.'
        ),
        state.run && state.survey
          ? el('button', { class: 'btn-secondary', type: 'button', onClick: fitRun }, state.reelTared ? 'Ajustar µ, stripper y cero del indicador a esta carrera' : 'Ajustar µ, stripper y reel a esta carrera')
          : null,
        state.match
          ? el('p', { class: 'note' }, `Ajuste: µ RIH ${state.match.muRIH.toFixed(3)} · µ POOH ${state.match.muPOOH.toFixed(3)} (relación POOH/RIH calibrada) · stripper ${nF(state.match.stripperLbf)} ${uF()} · ${state.reelTared ? 'corrección del cero' : 'reel'} ${nF(state.match.reelTension)} ${uF()}. Error mediano ${nF(state.match.maeRIH)} ${uF()} RIH / ${nF(state.match.maePOOH)} ${uF()} POOH (${state.match.nRIH + state.match.nPOOH} puntos). Valores cargados en el formulario.`)
          : null,
        state.runs.length
          ? el('button', { class: 'btn-secondary', type: 'button', onClick: () => window.confirm('¿Quitar todas las carreras de este pad?') && ((state.runs = []), (state.runSel = {}), (state.runMsg = ''), syncRun(), renderForm(), renderResults()) }, 'Quitar todas las carreras')
          : null,
      ],
      { open: !!state.runs.length || state.runProgress !== null }
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
    formEl.append(projectCard(), surveyCard(), plugsCard(), wellCard(), stringCard(), operationCard(), frictionCard(), readingsCard(), runCard())
    for (const d of formEl.querySelectorAll(':scope > details')) {
      const was = prev.get(d.querySelector('summary')?.textContent)
      if (was === true) d.open = true
    }
    autosave()
  }

  // ---- project: autosave, export / open, templates -------------------------
  let saveTimer = null
  let loading = true // no autosave until the saved pad has been loaded
  const padName = () => state.projectName || state.surveys.map((w) => w.name).join(', ') || 'Pad sin nombre'
  function autosave() {
    clearTimeout(saveTimer)
    if (loading) return
    saveTimer = setTimeout(async () => {
      if (!state.surveys.length && !state.projectName && !state.runs.length) return
      if (!state.padId) {
        state.padId = newPadId()
        setCurrentPadId(state.padId)
      }
      const hhmm = new Date().toTimeString().slice(0, 5)
      try {
        await putPad({ id: state.padId, name: padName(), savedAt: new Date().toISOString(), wells: state.surveys.length, runs: state.runs.length, project: toProject(state) })
        state.saveStatus = `«${padName()}» guardado en este navegador · ${hhmm} (${state.surveys.length} pozos${state.runs.length ? `, ${state.runs.length} carreras` : ''})`
        state.pads = await listPads()
      } catch (err) {
        state.saveStatus = `No se pudo guardar en este navegador: ${err.message || 'sin espacio o modo privado'}. Exportá el proyecto para no perderlo.`
      }
      const n = formEl.querySelector('.ctsim-save-status')
      if (n) n.textContent = state.saveStatus
    }, 800)
  }

  async function openPad(id) {
    const rec = await getPad(id)
    if (!rec) throw new Error('No se encontró el pad guardado.')
    state.padId = rec.id
    setCurrentPadId(rec.id)
    loadProjectObject(rec.project)
    state.saveStatus = `Pad abierto: «${rec.name}» (guardado ${new Date(rec.savedAt).toLocaleString('es-AR')}).`
    renderForm()
  }

  function download(name, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = el('a', { href: url, download: name })
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  function loadProjectObject(p) {
    const a = applyProject(state, p)
    state.active = -1
    state.surveyName = ''
    setActive(a)
    state.error = ''
    renderForm()
    renderResults()
  }

  // saved pads in this browser: open another one or delete it
  function padsPicker() {
    const others = state.pads.filter((p) => p.id !== state.padId)
    if (!others.length) return null
    let pick = others[0].id
    return el('div', { class: 'field' }, [
      el('span', { class: 'field-label' }, `Pads guardados en este navegador (${state.pads.length})`),
      el('div', { class: 'row ctsim-row-btns' }, [
        el(
          'select',
          { class: 'ctsim-inline-select', 'aria-label': 'Pad guardado', onChange: (e) => (pick = e.target.value) },
          others.map((p) => el('option', { value: p.id }, `${p.name} · ${p.wells} pozos${p.runs ? ` · ${p.runs} carreras` : ''} · ${new Date(p.savedAt).toLocaleDateString('es-AR')}`))
        ),
        el(
          'button',
          {
            class: 'btn-secondary',
            type: 'button',
            onClick: async () => {
              try {
                await openPad(pick)
              } catch (err) {
                state.error = err.message
                renderResults()
              }
            },
          },
          'Abrir'
        ),
        el(
          'button',
          {
            class: 'btn-secondary',
            type: 'button',
            onClick: async () => {
              const p = state.pads.find((x) => x.id === pick)
              if (!window.confirm(`¿Borrar el pad «${p?.name}» de este navegador? No se puede deshacer (exportalo antes si lo querés conservar).`)) return
              await deletePad(pick)
              state.pads = await listPads()
              renderForm()
            },
          },
          'Borrar'
        ),
      ]),
    ])
  }

  function projectCard() {
    const opener = el('input', {
      type: 'file',
      accept: '.json,application/json',
      class: 'ctsim-file',
      onChange: async (e) => {
        const f = e.target.files[0]
        if (!f) return
        try {
          const proj = validateProject(JSON.parse(await f.text()))
          // an opened file becomes a new saved pad (the current one is kept)
          state.padId = newPadId()
          setCurrentPadId(state.padId)
          loadProjectObject(proj)
          state.saveStatus = `Proyecto abierto: ${f.name} (guardado como pad nuevo en este navegador)`
        } catch (err) {
          state.error = err instanceof SyntaxError ? 'El archivo no es un JSON válido.' : err.message
          renderResults()
        }
        renderForm()
      },
    })
    const tpls = listTemplates()
    const names = Object.keys(tpls).sort((a, b) => a.localeCompare(b))
    let tplSel = names[0] || ''
    const tplSelect = names.length
      ? el(
          'select',
          { class: 'ctsim-inline-select', 'aria-label': 'Plantilla', onChange: (e) => (tplSel = e.target.value) },
          names.map((n) => el('option', { value: n }, `${n} (${new Date(tpls[n].savedAt).toLocaleDateString('es-AR')})`))
        )
      : null
    return card(
      state.projectName ? `0 · Proyecto — ${state.projectName}` : '0 · Proyecto y plantillas',
      [
        el('label', { class: 'field' }, [
          el('span', { class: 'field-label' }, 'Nombre del proyecto (pad)'),
          el('input', { type: 'text', class: 'ctsim-text', placeholder: 'p. ej. Pad B1B — lavado post-frac', value: state.projectName, onChange: (e) => ((state.projectName = e.target.value.trim()), renderForm()) }),
        ]),
        el('span', { class: 'field-label' }, 'Unidades'),
        el(
          'div',
          { class: 'row ctsim-units' },
          [
            ['len', 'Longitud'],
            ['force', 'Fuerza / peso'],
            ['press', 'Presión'],
          ].map(([k, lab]) =>
            selectField(
              lab,
              UNIT_CHOICES[k].map(([v, l]) => ({ value: v, label: l })),
              state.units[k],
              (v) => {
                state.units = { ...state.units, [k]: v }
                renderForm()
                renderResults()
              }
            )
          )
        ),
        el('p', { class: 'note ctsim-save-status' }, state.saveStatus || 'Cada pad se guarda solo en este navegador con todo lo cargado: surveys, tapones, coordenadas, objetivos, parámetros y las carreras del CSV.'),
        padsPicker(),
        el('div', { class: 'row ctsim-row-btns' }, [
          el(
            'button',
            {
              class: 'btn-secondary',
              type: 'button',
              onClick: () => {
                if (!window.confirm('¿Empezar un pad nuevo? El actual queda guardado y lo podés volver a abrir desde «Pads guardados».')) return
                setCurrentPadId(null)
                clearLocal()
                location.reload()
              },
            },
            'Nuevo pad'
          ),
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => download(projectFileName(state), JSON.stringify(toProject(state))) }, 'Exportar'),
          el('button', { class: 'btn-secondary', type: 'button', onClick: () => opener.click() }, 'Abrir archivo…'),
        ]),
        el('div', { hidden: true }, opener),
        el('span', { class: 'field-label' }, 'Plantillas de equipo'),
        el('p', { class: 'note' }, 'Guardan sarta, casing, fluido, presiones y caudales, fricción, ERT, stripper, reel, velocidades y tiempos para reusarlos en otros pads (no incluyen surveys ni carreras).'),
        names.length
          ? el('div', { class: 'row ctsim-row-btns' }, [
              tplSelect,
              el(
                'button',
                {
                  class: 'btn-secondary',
                  type: 'button',
                  onClick: () => {
                    try {
                      applyTemplate(state, tplSel)
                      state.saveStatus = `Plantilla aplicada: ${tplSel}`
                    } catch (err) {
                      state.error = err.message
                    }
                    renderForm()
                    renderResults()
                  },
                },
                'Aplicar'
              ),
              el('button', { class: 'btn-secondary', type: 'button', onClick: () => window.confirm(`¿Borrar la plantilla "${tplSel}"?`) && (deleteTemplate(tplSel), renderForm()) }, 'Borrar'),
            ])
          : null,
        el('div', { class: 'row ctsim-row-btns' }, [
          el('input', { type: 'text', class: 'ctsim-text', placeholder: 'Nombre (p. ej. Unidad PCN1 — 2 3/8" HT-125)', value: state.tplName, onInput: (e) => (state.tplName = e.target.value) }),
          el(
            'button',
            {
              class: 'btn-secondary',
              type: 'button',
              onClick: () => {
                const n = state.tplName.trim()
                if (!n) return
                if (listTemplates()[n] && !window.confirm(`Ya existe "${n}". ¿Reemplazarla?`)) return
                state.saveStatus = saveTemplate(state, n) ? `Plantilla guardada: ${n}` : 'No se pudo guardar la plantilla (almacenamiento del navegador no disponible).'
                state.tplName = ''
                renderForm()
              },
            },
            'Guardar plantilla'
          ),
        ]),
      ],
      { open: !state.surveys.length }
    )
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
      targetM: survey ? tdOf(survey) : undefined,
      ertLbfPerBpm: state.ert || 0,
      stripperLbf: state.stripper || 0,
      reelTensionRIH: state.rbtRIH || 0,
      reelTensionPOOH: state.rbtPOOH || 0,
      reelTared: state.reelTared,
      ertInPooh: state.ertInPooh,
      noPumpAboveKop: state.noPumpAboveKop,
      kopM: survey ? kopLp(survey).kop : null,
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
    ['tiempos', 'Tiempos'],
  ]

  function renderResults() {
    autosave()
    if (view3d) {
      view3d.dispose()
      view3d = null
    }
    clear(resultsEl)
    resultsEl.appendChild(
      el('div', { class: 'ctsim-tabs', role: 'tablist' }, [
        ...TABS.map(([k, label]) =>
          el('button', { type: 'button', role: 'tab', class: `ctsim-tab${state.tab === k ? ' active' : ''}`, 'aria-selected': state.tab === k ? 'true' : 'false', onClick: () => ((state.tab = k), renderResults()) }, label)
        ),
        state.survey ? el('button', { type: 'button', class: 'ctsim-tab ctsim-report-btn', title: 'Informe imprimible (Guardar como PDF)', onClick: () => printReport() }, '🖨 Informe PDF') : null,
      ])
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
      else if (state.tab === 'tiempos') timesPanel()
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
      qField('Set-down mínimo requerido en la herramienta', sn.required, (v) => (sn.required = v || 0), 'force', { step: 250, hint: 'P. ej. el peso mínimo para rotar un tapón.' }),
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
          const td = Math.min(tdOf(w.rows), strLen)
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
    const u = U()
    const yMax = u.cv.force(Math.max(required * 1.3, ...series.flatMap((g) => g.profile.map((p) => p.setDown)), 1000))
    const yStep = niceStep(yMax, 5)
    const y1 = Math.ceil(yMax / yStep) * yStep
    const sx = (d) => m.l + ((d - d0) / Math.max(1, d1 - d0)) * (W - m.l - m.r)
    const sy = (v) => H - m.b - (u.cv.force(v) / y1) * (H - m.t - m.b)
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
    for (let k = 0, v = 0; v <= y1 + 1e-9; k++, v = k * yStep) {
      const py = H - m.b - (v / y1) * (H - m.t - m.b)
      add('line', { x1: m.l, x2: W - m.r, y1: py, y2: py, class: v === 0 ? 'ctsim-zero' : 'ctsim-grid' })
      add('text', { x: m.l - 6, y: py + 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = v >= 1000 && yStep >= 1000 ? `${fmt(v / 1000, 1)}k` : fmt(v, yStep < 1 ? 1 : 0)
    }
    const dStepD = niceStep(u.cv.len(d1 - d0), 7)
    for (let dd = Math.ceil(u.cv.len(d0) / dStepD) * dStepD; dd <= u.cv.len(d1) + 1e-6; dd += dStepD) {
      const d = u.inv.len(dd)
      add('line', { x1: sx(d), x2: sx(d), y1: m.t, y2: H - m.b, class: 'ctsim-grid' })
      add('text', { x: sx(d), y: H - m.b + 14, class: 'ctsim-tick', 'text-anchor': 'middle' }).textContent = fmt(dd, 0)
    }
    add('text', { x: (m.l + W - m.r) / 2, y: H - 4, class: 'ctsim-axis', 'text-anchor': 'middle' }).textContent = `MD (${uL()})`
    const yl = add('text', { x: 12, y: (m.t + H - m.b) / 2, class: 'ctsim-axis', 'text-anchor': 'middle' })
    yl.setAttribute('transform', `rotate(-90 12 ${(m.t + H - m.b) / 2})`)
    yl.textContent = `Set-down disponible (${uF()})`
    if (required > 0) {
      add('line', { x1: m.l, x2: W - m.r, y1: sy(required), y2: sy(required), class: 'ctsim-lock' })
      add('text', { x: W - m.r - 4, y: sy(required) - 5, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = `requerido ${nF(required)} ${uF()}`
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
    const lines = [el('strong', {}, `${nF(g.atTD.setDown)} ${uF()}`)]
    if (g.lockupDepth !== null) lines.push(el('span', { class: 'ctsim-cell-sub' }, `lock-up ${nL(g.lockupDepth)} ${uL()}`))
    else if (g.limitDepth !== null) lines.push(el('span', { class: 'ctsim-cell-sub' }, `< req. desde ${nL(g.limitDepth)} ${uL()}`))
    else lines.push(el('span', { class: 'ctsim-cell-sub' }, 'OK hasta TD'))
    return el('td', { class: ok ? 'ctsim-ok' : 'ctsim-bad' }, [el('span', { class: 'ctsim-cell-icon' }, ok ? '✓ ' : '✕ '), ...lines])
  }

  function wellsTable(r, mu, erts) {
    return el('div', { class: 'ctsim-card' }, [
      el('div', { class: 'section-label ctsim-subtitle ctsim-pad-top' }, `Set-down disponible en TD por pozo (µ ${mu.toFixed(2)})`),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table ctsim-matrix' }, [
          el('thead', {}, el('tr', {}, [el('th', {}, 'Pozo'), el('th', {}, `TD (${uL()})`), ...erts.map((e) => el('th', {}, ertLabel(e)))])),
          el(
            'tbody',
            {},
            r.wells.map((w, k) =>
              el('tr', {}, [
                el('td', {}, [el('i', { class: `ctsim-key ctsim-${WELL_CLS[k % WELL_CLS.length]}-bg` }), w.name]),
                el('td', {}, nL(w.td)),
                ...erts.map((e) => sensCell(w.grid.find((g) => g.mu === mu && g.ert === e), r.required)),
              ])
            )
          ),
        ]),
      ]),
      el('p', { class: 'note ctsim-pad' }, `✓ = llega a TD con al menos ${nF(r.required)} ${uF()} de set-down. Misma sarta, caudal (${fmt(state.rate, 1)} bpm), velocidades y WHP para todos los pozos; cambia solo el survey (y sus tapones).`),
    ])
  }

  function sensMatrix(w, required, bare = false) {
    const mus = [...new Set(w.grid.map((g) => g.mu))]
    const erts = [...new Set(w.grid.map((g) => g.ert))]
    const body = [
      el('div', { class: 'section-label ctsim-subtitle ctsim-pad-top' }, `Set-down disponible en TD (${nL(w.td)} ${uL()})`),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table ctsim-matrix' }, [
          el('thead', {}, el('tr', {}, [el('th', {}, 'µ RIH \\ ERT'), ...erts.map((e) => el('th', {}, ertLabel(e)))])),
          el('tbody', {}, mus.map((mu) => el('tr', {}, [el('td', {}, mu.toFixed(2)), ...erts.map((e) => sensCell(w.grid.find((g) => g.mu === mu && g.ert === e), required))]))),
        ]),
      ]),
      el('p', { class: 'note ctsim-pad' }, `✓ = llega a TD con al menos ${nF(required)} ${uF()} de set-down. Debajo: profundidad de lock-up en RIH o desde dónde la capacidad es menor que la requerida. ERT en lbf por bpm bombeado (caudal ${fmt(state.rate, 1)} bpm).`),
    ]
    return bare ? el('div', {}, body) : el('div', { class: 'ctsim-card' }, body)
  }

  function sensPlugTable(w, required, mu, bare = false) {
    const series = w.grid.filter((g) => g.mu === mu)
    const plugs = w.plugs.filter((d) => d <= w.td)
    const at = (g, d) => g.profile.find((p) => p.depth === Math.round(d))
    const table = el('div', { class: 'ctsim-table-wrap' }, [
      el('table', { class: 'ctsim-table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, '#'), el('th', {}, `MD (${uL()})`), ...series.map((g) => el('th', {}, ertLabel(g.ert)))])),
        el(
          'tbody',
          {},
          plugs.map((d, i) =>
            el('tr', {}, [
              el('td', {}, `T${i + 1}`),
              el('td', {}, nL(d)),
              ...series.map((g) => {
                const p = at(g, d)
                const v = p ? p.setDown : null
                return el('td', { class: v !== null && v < required ? 'ctsim-bad-text' : '' }, v === null ? '—' : nF(v))
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
    const td = tdOf()
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
        qField('Punto manual: carga axial real', tr.manualF, (v) => ((tr.manualF = v), schedule()), 'force', { step: 1000, hint: 'Tracción +, compresión −' }),
        qField('Punto manual: presión diferencial', tr.manualDp, (v) => ((tr.manualDp = v), schedule()), 'press', { step: 250, hint: 'Pi − Po (estallido +, colapso −)' }),
      ]),
      el('p', { class: 'note' }, `CT ${str.od}" · pared nominal ${wallNom.toFixed(3)}" → mínima ${wallMin.toFixed(3)}" (${grade.manufacturerLabel})${tr.wear ? ` − ${tr.wear} % = ${wallEff.toFixed(3)}"` : ''} · ${grade.id} (SMYS ${nP(Y)} ${uP()}) · ovalidad ${fmt(tr.ovality, 1)} %. Los puntos de la simulación usan la presión de circulación (${nP(ctp)} ${uP()}) y la WHP (${nP(whp)} ${uP()}) del formulario.`),
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
        r('Estallido sin carga axial (80 % / 100 %)', `${nP(e80.burst)} / ${nP(e100.burst)}`, uP()),
        r(`Colapso con ovalidad ${fmt(tr.ovality, 1)} % sin carga axial (80 % / 100 %)`, `${nP(0.8 * Pc(0))} / ${nP(Pc(0))}`, uP()),
        r('Colapso por fluencia (von Mises), sin ovalidad (80 % / 100 %)', `${nP(-e80.collapse)} / ${nP(-e100.collapse)}`, uP()),
        r(`Colapso con ovalidad bajo ${nFk(Math.max(0, pts[0]?.F || 0), 0)} ${uFk()} de tracción (100 %)`, nP(Pc(Math.max(0, pts[0]?.F || 0))), uP()),
        r('Tracción máx. sin presión (80 % / 100 %)', `${nFk(e80.tensionAtZero)} / ${nFk(e100.tensionAtZero)}`, uFk()),
        aCtp ? r(`Carga admisible (80 %) con Δp = ${nP(ctp)} ${uP()}`, `${nFk(aCtp.compression)} a ${nFk(aCtp.tension)}`, uFk()) : r(`Δp = ${nP(ctp)} ${uP()}`, 'fuera del límite', ''),
      ])
    )
    resultsEl.appendChild(
      el('div', { class: 'ctsim-card' }, [
        el('div', { class: 'ctsim-table-wrap' }, [
          el('table', { class: 'ctsim-table' }, [
            el('thead', {}, el('tr', {}, ['Punto', `Carga (${uFk()})`, `Pi (${uP()})`, `Po (${uP()})`, `Δp (${uP()})`, 'σVME / fluencia', 'Δp / colapso oval.'].map((h) => el('th', {}, h)))),
            el(
              'tbody',
              {},
              pts.map((q, i) =>
                el('tr', {}, [
                  el('td', {}, `${i + 1}. ${q.label}`),
                  el('td', {}, nFk(q.F)),
                  el('td', {}, nP(q.pi)),
                  el('td', {}, nP(q.po)),
                  el('td', {}, nP(q.dp)),
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
    // axes in display units (data stay in lbf / psi)
    const u = U()
    const xStep = niceStep(u.cv.force(xAbs), 4)
    const yStep = niceStep(u.cv.press(yAbs), 4)
    const x1 = Math.ceil(u.cv.force(xAbs) / xStep) * xStep
    const y1 = Math.ceil(u.cv.press(yAbs) / yStep) * yStep
    const sx = (F) => m.l + ((u.cv.force(F) + x1) / (2 * x1)) * (W - m.l - m.r)
    const sy = (dp) => m.t + ((y1 - u.cv.press(dp)) / (2 * y1)) * (H - m.t - m.b)
    const kf = (v, st) => (Math.abs(v) >= 1000 && st >= 1000 ? `${fmt(v / 1000, 1)}k` : fmt(v, st < 1 ? 1 : 0))
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
    for (let k = -Math.round(x1 / xStep); k <= Math.round(x1 / xStep); k++) {
      const x = k * xStep
      const px = m.l + ((x + x1) / (2 * x1)) * (W - m.l - m.r)
      add('line', { x1: px, x2: px, y1: m.t, y2: H - m.b, class: k === 0 ? 'ctsim-zero' : 'ctsim-grid' })
      add('text', { x: px, y: H - m.b + 14, class: 'ctsim-tick', 'text-anchor': 'middle' }).textContent = kf(x, xStep)
    }
    for (let k = -Math.round(y1 / yStep); k <= Math.round(y1 / yStep); k++) {
      const y = k * yStep
      const py = m.t + ((y1 - y) / (2 * y1)) * (H - m.t - m.b)
      add('line', { x1: m.l, x2: W - m.r, y1: py, y2: py, class: k === 0 ? 'ctsim-zero' : 'ctsim-grid' })
      add('text', { x: m.l - 6, y: py + 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = kf(y, yStep)
    }
    add('text', { x: (m.l + W - m.r) / 2, y: H - 6, class: 'ctsim-axis', 'text-anchor': 'middle' }).textContent = `← compresión · Carga axial real (${uF()}) · tracción →`
    const yl = add('text', { x: 12, y: (m.t + H - m.b) / 2, class: 'ctsim-axis', 'text-anchor': 'middle' })
    yl.setAttribute('transform', `rotate(-90 12 ${(m.t + H - m.b) / 2})`)
    yl.textContent = `← colapso · Δp (${uP()}) · estallido →`
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
      r(`Peso RIH en ${nL(last.depth)} ${uL()}`, last.rih === null ? 'Lock-up' : nF(last.rih), last.rih === null ? '' : uF()),
      r(`Peso POOH en ${nL(last.depth)} ${uL()}`, nF(last.pooh), uF()),
      r('Peso RIH mínimo en el lateral', `${nF(minRih.rih)} ${uF()} @ ${nL(minRih.depth)}`, uL()),
      r('Set-down máx. disponible en fondo', nF(setDown.bottomForce), `${uF()} (indicador ${nF(setDown.surfaceWeight)} ${uF()})`),
      r('Pandeo helicoidal (RIH) desde', helix ? nL(helix.depth) : 'No', helix ? uL() : ''),
      r('Lock-up (RIH)', lock ? `a ${nL(lock.depth)}` : 'No se alcanza', lock ? uL() : ''),
      r('Tensión real máx. / 80 % fluencia', `${nFk(realTop)} / ${nFk(yield80)}`, `${uFk()} ${realTop > yield80 ? '⚠' : '✓'}`),
    ])
  }

  function plugTable() {
    const td = tdOf()
    const plugs = state.plugs.filter((d) => d > 0 && d <= td)
    const p = params(state.muRIH, state.muPOOH)
    const sim = simulateTrip(p, cal.model, plugs)
    const traj = wellTrajectory(state.survey, 10)
    const f = (v) => (v === null || v === undefined ? 'Lock-up' : nF(v))
    const rows = sim.rows.map((r, i) => {
      const pt = pointAtMd(traj, r.depth)
      const sd = r.rih === null ? { bottomForce: 0 } : maxSetDown({ ...p, speedRIH: p.speedAt(r.depth, 'RIH') }, r.depth, cal.model)
      return el('tr', {}, [
        el('td', {}, `T${i + 1}`),
        el('td', {}, nL(r.depth)),
        el('td', {}, fmt(pt.inc, 1)),
        el('td', {}, f(r.rih)),
        el('td', {}, f(r.pooh)),
        el('td', {}, nF(sd.bottomForce)),
      ])
    })
    const skipped = state.plugs.length - plugs.length
    return el('details', { class: 'ctsim-card', open: true }, [
      el('summary', {}, `Pesos en cada tapón (${plugs.length})`),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, el('tr', {}, ['#', `MD (${uL()})`, 'Inc (°)', `RIH (${uF()})`, `POOH (${uF()})`, `Set-down máx. (${uF()})`].map((h) => el('th', {}, h)))),
          el('tbody', {}, rows),
        ]),
      ]),
      el('p', { class: 'note ctsim-pad' }, `Numeración desde el más somero. RIH/POOH con la velocidad del tramo; set-down = fuerza máxima que llega a la herramienta antes del lock-up.${skipped ? ` ${skipped} tapón(es) fuera del survey/sarta no se muestran.` : ''}`),
    ])
  }

  const WELL_VARS = ['--ctsim-w1', '--ctsim-w2', '--ctsim-w3', '--ctsim-w4', '--ctsim-w5', '--ctsim-w6']

  function survey3dPanel() {
    const multi = state.surveys.length > 1
    const sel = (state.wells3d || state.surveys.map((w, i) => i)).filter((i) => i < state.surveys.length)
    const holder = el('div', { class: 'ctsim-3d' })
    const btns = el(
      'div',
      { class: 'ctsim-3d-btns' },
      [
        ['iso', 'Perspectiva'],
        ['plan', 'Planta'],
        ['section', 'Corte'],
        ['iso', 'Centrar'],
      ]
        .map(([k, lab]) => el('button', { class: 'btn-secondary', type: 'button', onClick: () => view3d?.setView(k) }, lab))
        .concat(
          el(
            'button',
            { class: `btn-secondary${state.pin3d ? ' active' : ''}`, type: 'button', title: 'Fijar el gráfico arriba para ver las tablas al mismo tiempo', onClick: () => ((state.pin3d = !state.pin3d), renderResults()) },
            state.pin3d ? '📌 Fijo' : '📌 Fijar'
          ),
          state.pin3d
            ? el(
                'select',
                { class: 'ctsim-3d-size', 'aria-label': 'Alto del gráfico', title: 'Alto del gráfico fijo', onChange: (e) => ((state.size3d = e.target.value), renderResults()) },
                [
                  ['s', 'Alto: chico'],
                  ['m', 'Alto: medio'],
                  ['l', 'Alto: grande'],
                ].map(([v, lab]) => el('option', { value: v, selected: state.size3d === v }, lab))
              )
            : null
        )
    )
    const wellPick = multi
      ? el('div', { class: 'ctsim-chk-row ctsim-3d-toggles' }, [
          el('span', { class: 'field-label' }, 'Pozos'),
          ...state.surveys.map((w, i) =>
            el('label', { class: 'ctsim-chk' }, [
              el('input', {
                type: 'checkbox',
                checked: sel.includes(i),
                onChange: (e) => {
                  const cur = new Set(sel)
                  if (e.target.checked) cur.add(i)
                  else cur.delete(i)
                  state.wells3d = [...cur].sort((x, y) => x - y)
                  renderResults()
                },
              }),
              el('span', { class: `ctsim-swatch ctsim-w${(i % 6) + 1}-bg` }),
              w.name,
            ])
          ),
          el('button', { class: 'btn-link', type: 'button', onClick: () => ((state.wells3d = null), renderResults()) }, 'Todos'),
        ])
      : null
    if (!sel.length) {
      return el('div', { class: 'ctsim-card' }, [el('div', { class: 'ctsim-card-body ctsim-pad-top' }, [wellPick, el('p', { class: 'note' }, 'Elegí al menos un pozo para ver.')])])
    }
    const offs = headOffsets()
    const several = sel.length > 1
    const wells = sel.map((i) => {
      const w = state.surveys[i]
      const traj = wellTrajectory(w.rows, 10)
      const { kop, lp } = kopLp(w.rows)
      const last = traj[traj.length - 1]
      const plugList = (i === state.active ? state.plugs : w.plugs || []).filter((d) => d <= last.md)
      return {
        idx: i,
        name: w.name,
        traj,
        kopMd: kop,
        lpMd: lp,
        offset: offs[i],
        colorVar: WELL_VARS[i % WELL_VARS.length],
        active: i === state.active || sel.length === 1,
        marks: { kop: kop != null ? pointAtMd(traj, kop) : null, lp: lp != null ? pointAtMd(traj, lp) : null },
        plugs: plugList.map((d, k) => ({ ...pointAtMd(traj, d), idx: k + 1 })),
      }
    })
    const missing = several ? wells.filter((w) => !offs[w.idx].known).map((w) => w.name) : []
    const notes = [
      el('p', { class: 'note ctsim-pad' }, 'Arrastrá para girar · clic derecho o Shift + arrastrar para desplazar · rueda o pellizco para zoom (hacia el cursor) · doble clic sobre un pozo para girar alrededor de ese punto · "Centrar" vuelve a la vista inicial. Pasá el cursor (o tocá) una fila o una distancia de las tablas para verla en el gráfico.'),
      missing.length
        ? el('p', { class: 'note ctsim-pad' }, `⚠ Sin coordenadas de boca de pozo: ${missing.join(', ')}. ${missing.length === wells.length ? 'Todos se dibujan' : 'Se dibuja'} desde el mismo punto; cargalas en "1 · Surveys → Coordenadas de boca de pozo".`)
        : null,
    ]
    const pairs = several ? wellPairs(wells) : []
    const pairName = (pr) => `${pr.A.name}–${pr.B.name}`
    const measures = []
    for (const pr of pairs) {
      const id = `${pr.A.idx}-${pr.B.idx}`
      if (pr.curve) measures.push({ id: `c-${id}`, kind: 'curve', shown: pr.adjacent, a: pr.curve.a, b: pr.curve.b, text: `Curva ${pairName(pr)}: ${nL(pr.curve.d)} ${uL()}` })
      if (pr.lat) measures.push({ id: `l-${id}`, kind: 'lateral', shown: pr.adjacent, a: pr.lat.a, b: pr.lat.b, text: `${pairName(pr)}: ${nL(pr.lat.d)} ${uL()} en planta (ΔX ${nL(pr.lat.dx)} · ΔY ${nL(pr.lat.dy)} · ΔTVD ${nL(pr.lat.dz)})` })
      measures.push({ id: `m-${id}`, kind: 'min', shown: false, a: pr.min.a, b: pr.min.b, text: `Mín. 3D ${pairName(pr)}: ${nL(pr.min.d, 1)} ${uL()}` })
    }
    const keyPts = keyPoints(wells)
    const points = keyPts.map((k) => ({ id: k.id, p: k.abs, text: `${k.well.name} ${k.label}: MD ${nL(k.p.md)} · TVD ${nL(k.p.tvd)} ${uL()}` }))
    const LBL = [
      ['names', several ? 'Nombres de pozo' : 'TD'],
      ['heads', 'Bocas de pozo'],
      ['marks', 'KOP / LP'],
      ['tvd', 'Profundidad TVD'],
      ['plugs', 'Tapones'],
      ['north', 'Norte'],
      ...(pairs.length
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
          el('input', { type: 'checkbox', checked: state.labels3d[k] === true, onChange: (e) => ((state.labels3d[k] = e.target.checked), view3d?.setLabels(state.labels3d)) }),
          lab,
        ])
      ),
    ])
    // pinned: buttons + view stay on top (sticky) and the well / label
    // options fold into a compact panel so the tables have room below
    const wide = window.matchMedia('(min-width: 1000px)').matches
    const opts3d = state.pin3d
      ? el('details', { class: 'ctsim-3d-opts', open: state.opts3dOpen ?? false, onToggle: (e) => (state.opts3dOpen = e.target.open) }, [el('summary', {}, multi ? 'Pozos y etiquetas' : 'Etiquetas'), wellPick, toggles])
      : el('div', {}, [wellPick, toggles])
    const wrap = el('div', { class: `ctsim-card${state.pin3d ? ' ctsim-3d-pinned' : ''}` }, [el('div', { class: 'ctsim-card-body ctsim-pad-top' }, [btns, opts3d, holder])])
    const tip = el('div', { class: 'ctsim-pad' }, notes)
    const hover = hoverLinker()
    const out = el('div', {}, [wrap, tip, keyPointsTable(keyPts, hover), pairs.length ? separationTable(pairs, hover) : null])
    holder.textContent = 'Cargando visor 3D…'
    requestAnimationFrame(async () => {
      try {
        const { mountSurvey3D } = await import('./view3d.js')
        if (state.tab !== '3d' || !holder.isConnected) return
        // pinned: the view takes a share of the visible height (of the charts
        // column on wide screens, of the window on phones) so the tables fit
        const frac = { s: 0.3, m: 0.42, l: 0.58 }[state.size3d] * (wide ? 1 : 0.85)
        // window height, not the charts column (that one grows with the tables)
        const visibleH = () => window.innerHeight
        view3d = mountSurvey3D(holder, { wells, measures, points, labels: state.labels3d, lenUnit: { f: U().f.len, label: uL() }, maxHeight: state.pin3d ? () => visibleH() * frac : null })
      } catch (err) {
        holder.textContent = `No se pudo abrir el visor 3D: ${err.message}`
      }
    })
    return out
  }

  // Table cell / row ↔ 3D highlight: hover shows it, a click (or tap) pins it.
  function hoverLinker() {
    let pinned = null
    const cells = []
    const mark = () => cells.forEach((c) => c.classList.toggle('hl-on', c.dataset.hl === pinned))
    return (node, id) => {
      node.dataset.hl = id
      cells.push(node)
      node.addEventListener('mouseenter', () => view3d?.highlight(id))
      node.addEventListener('mouseleave', () => view3d?.highlight(pinned))
      node.addEventListener('click', () => {
        pinned = pinned === id ? null : id
        view3d?.highlight(pinned)
        mark()
      })
      return node
    }
  }

  // Wellhead, KOP, LP and TD of each well: MD, TVD, inclination, position.
  function keyPoints(wells) {
    const out = []
    for (const w of wells) {
      const o = w.offset
      const last = w.traj[w.traj.length - 1]
      const list = [
        ['Boca de pozo', w.traj[0]],
        ['KOP', w.kopMd != null ? pointAtMd(w.traj, w.kopMd) : null],
        ['LP (talón)', w.lpMd != null ? pointAtMd(w.traj, w.lpMd) : null],
        ['TD (punta)', last],
      ]
      for (const [lab, p] of list) {
        if (!p) continue
        out.push({ id: `p-${w.idx}-${lab}`, well: w, label: lab, p, abs: { n: p.n + o.n, e: p.e + o.e, tvd: p.tvd - o.z } })
      }
    }
    return out
  }

  function keyPointsTable(pts, hover) {
    const ne = (h) => (state.coordConv === 'gk' ? { n: h.x, e: h.y } : { n: h.y, e: h.x })
    const sw = (w) => el('span', { class: `ctsim-swatch ctsim-w${(w.idx % 6) + 1}-bg` })
    const gk = state.coordConv === 'gk'
    const anyAbs = pts.some((k) => Number.isFinite(state.surveys[k.well.idx].head?.x))
    const xy = (k) => {
      const h = state.surveys[k.well.idx].head
      if (h && Number.isFinite(h.x) && Number.isFinite(h.y)) {
        const b = ne(h)
        const N = b.n + k.p.n
        const E = b.e + k.p.e
        return gk ? [N, E] : [E, N]
      }
      return gk ? [k.p.n, k.p.e] : [k.p.e, k.p.n]
    }
    return el('details', { class: 'ctsim-card ctsim-head-table ctsim-hover-table' }, [
      el('summary', {}, 'Puntos importantes por pozo'),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, el('tr', {}, ['Pozo', 'Punto', `MD (${uL()})`, `TVD (${uL()})`, 'Inc (°)', 'Az (°)', `X ${gk ? '(N)' : '(E)'} (m)`, `Y ${gk ? '(E)' : '(N)'} (m)`, `Despl. (${uL()})`].map((h) => el('th', {}, h)))),
          el(
            'tbody',
            {},
            pts.map((k) => {
              const [x, y] = xy(k)
              return hover(
                el('tr', {}, [
                  el('td', {}, [sw(k.well), k.well.name]),
                  el('td', {}, k.label),
                  el('td', {}, nL(k.p.md, 1)),
                  el('td', {}, nL(k.p.tvd, 1)),
                  el('td', {}, fmt(k.p.inc, 1)),
                  el('td', {}, fmt(k.p.azi, 1)),
                  el('td', {}, fmt(x, 1)),
                  el('td', {}, fmt(y, 1)),
                  el('td', {}, nL(Math.hypot(k.p.n, k.p.e))),
                ]),
                k.id
              )
            })
          ),
        ]),
      ]),
      el('p', { class: 'note' }, `${anyAbs ? 'X / Y absolutas a partir de las coordenadas de boca de pozo' : 'Sin coordenadas de boca de pozo: X / Y son desplazamientos desde la boca'} (${gk ? 'X = Norte, Y = Este' : 'X = Este, Y = Norte'}). KOP y LP según el criterio del simulador (inicio de la construcción y llegada a ~horizontal). Despl.: desplazamiento horizontal desde la boca.`),
    ])
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

  function separationTable(pairs, hover) {
    const sw = (w) => el('span', { class: `ctsim-swatch ctsim-w${(w.idx % 6) + 1}-bg` })
    const [lx, ly] = state.coordConv === 'gk' ? ['ΔX (N)', 'ΔY (E)'] : ['ΔX (E)', 'ΔY (N)']
    const f0 = (v) => (v === null || v === undefined ? '—' : nL(v))
    return el('details', { class: 'ctsim-card ctsim-head-table ctsim-hover-table' }, [
      el('summary', {}, 'Distancias entre pozos'),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, [
            el('tr', {}, [
              el('th', { rowspan: 2 }, 'Pozos'),
              el('th', { rowspan: 2 }, `Bocas (${uL()})`),
              el('th', { rowspan: 2 }, `Curva mín. (${uL()})`),
              el('th', { colspan: 4 }, `Laterales: menor distancia en planta (${uL()})`),
              el('th', { rowspan: 2 }, `Laterales mediana (${uL()})`),
              el('th', { rowspan: 2 }, `Mín. 3D (${uL()}) @ MD`),
            ]),
            el('tr', {}, ['Dist.', lx, ly, 'ΔTVD'].map((h) => el('th', {}, h))),
          ]),
          el(
            'tbody',
            {},
            pairs.map((r) => {
              const id = `${r.A.idx}-${r.B.idx}`
              const lat = (v) => (r.lat ? hover(el('td', {}, f0(v)), `l-${id}`) : el('td', {}, '—'))
              return el('tr', {}, [
                el('td', {}, [sw(r.A), r.A.name, ' – ', sw(r.B), r.B.name, r.adjacent && pairs.length > 1 ? ' ·' : '']),
                el('td', {}, nL(r.heads, 1)),
                r.curve ? hover(el('td', {}, `${f0(r.curve.d)} @ ${f0(r.curve.a.md)}/${f0(r.curve.b.md)}`), `c-${id}`) : el('td', {}, '—'),
                lat(r.lat?.d),
                lat(r.lat?.dx),
                lat(r.lat?.dy),
                lat(r.lat?.dz),
                el('td', {}, f0(r.latMed)),
                hover(el('td', {}, `${nL(r.min.d, 1)} @ ${f0(r.min.a.md)}/${f0(r.min.b.md)}`), `m-${id}`),
              ])
            })
          ),
        ]),
      ]),
      el('p', { class: 'note' }, `Distancias centro a centro entre trayectorias (cada 10 m de MD), sin elipses de incertidumbre. Curva: puntos más cercanos entre los tramos KOP–LP (3D). Laterales (inclinación > 80°): menor distancia en planta, con sus componentes ΔX / ΔY ${state.coordConv === 'gk' ? '(X = Norte, Y = Este)' : '(X = Este, Y = Norte)'} y la diferencia de TVD en esos puntos; mediana: distancia típica a lo largo del lateral del primer pozo. "@" indica la MD de cada pozo.${pairs.length > 2 ? ' Las etiquetas de distancia del 3D acotan los pozos vecinos (marcados con ·); cualquier distancia de la tabla se ve en el gráfico al pasar el cursor.' : ''}`),
    ])
  }

  // ---- printable report -----------------------------------------------------
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  let reporting = false

  // Copy of the results of the current tab, without controls: inputs and
  // selects become their value, buttons go, collapsed panels open.
  function capture() {
    const out = []
    for (const n of resultsEl.children) {
      if (n.classList.contains('ctsim-tabs')) continue
      const c = n.cloneNode(true)
      if (c.tagName === 'DETAILS') c.open = true
      c.querySelectorAll('details').forEach((d) => (d.open = true))
      c.querySelectorAll('button, .ctsim-3d-btns, .ctsim-3d-opts, .ctsim-3d-toggles, .ctsim-row-btns, .ctsim-tip').forEach((b) => b.remove())
      c.querySelectorAll('input, select').forEach((i) => {
        const orig = i.type === 'checkbox' ? null : i.tagName === 'SELECT' ? i.selectedOptions?.[0]?.textContent : i.value
        if (i.type === 'checkbox' || i.type === 'file') return i.closest('label')?.remove() ?? i.remove()
        i.replaceWith(el('span', { class: 'ctsim-report-val' }, orig ?? ''))
      })
      out.push(c)
    }
    return out
  }

  function inputsSummary() {
    const w = state.surveys[state.active]
    const td = w.rows[w.rows.length - 1][0]
    const { kop, lp } = kopLp(w.rows)
    const preset = STRING_PRESETS.find((p) => p.id === state.stringPreset)
    const grade = findGrade(state.grade)
    const rows = [
      ['Pozo', w.name],
      ['TD del survey / profundidad objetivo', `${nL(td)} ${uL()} / ${nL(tdOf())} ${uL()}`],
      ['KOP / LP', `${kop != null ? nL(kop) : '—'} ${uL()} / ${lp != null ? nL(lp) : '—'} ${uL()}`],
      ['Casing (ID)', `${fmt(state.casingId, 3)} in`],
      ['Sarta / grado', `${preset ? preset.label : 'Personalizada'} · ${grade.id}`],
      ['Fluido', `${fmt(state.fluidPpg, 2)} ppg`],
      ['WHP / presión de circulación', `${nP(state.whp)} / ${nP(state.ctp)} ${uP()}`],
      ['Caudal bombeo / retorno', `${fmt(state.rate, 2)} / ${fmt(state.returnRate, 2)} bpm${['RIH', 'POOH'].filter((d) => state.noPumpAboveKop?.[d]).length ? ` · sin bombeo arriba del KOP en ${['RIH', 'POOH'].filter((d) => state.noPumpAboveKop?.[d]).join(' y ')}` : ''}`],
      ['µ RIH / µ POOH', `${fmt(state.muRIH, 3)} / ${fmt(state.muPOOH, 3)}`],
      ['ERT', `${state.ert ? `${fmt(state.ert, 0)} lbf/bpm` : 'Sin ERT'} · en POOH: ${state.ertInPooh ? 'activo' : 'baypaseado (válvula multiciclo)'}`],
      ['Stripper / reel', `${nF(state.stripper)} ${uF()} / ${nF(state.rbtRIH)} ${uF()}${state.reelTared ? ' (indicador tarado con el reel)' : ''}`],
      ['Corrección del cero del indicador', `${nF(state.indicatorOffset || 0)} ${uF()}`],
      ['Velocidad de tubería RIH (vert / curva / lateral)', `${nS(state.speeds.vert.RIH)} / ${nS(state.speeds.curve.RIH)} / ${nS(state.speeds.lat.RIH)} ${uS()}`],
      ['Velocidad de tubería POOH (vert / curva / lateral)', `${nS(state.speeds.vert.POOH)} / ${nS(state.speeds.curve.POOH)} / ${nS(state.speeds.lat.POOH)} ${uS()}`],
      ['BHA', `${nL(state.bha.length, 2)} ${uL()} · ${nF(state.bha.weight)} ${uF()} · OD ${fmt(state.bha.od, 3)} in`],
      ['Tapones', state.plugs.length ? `${state.plugs.length} (${nL(state.plugs[0])}–${nL(state.plugs[state.plugs.length - 1])} ${uL()})` : '—'],
      ['Carrera real comparada', state.run ? `${state.run.file} · ${fmtStamp(state.run.start)} → ${fmtStamp(state.run.end)}` : '—'],
    ]
    return el('table', { class: 'ctsim-table ctsim-report-inputs' }, el('tbody', {}, rows.map(([k, v]) => el('tr', {}, [el('th', {}, k), el('td', {}, v)]))))
  }

  async function printReport() {
    if (reporting || !state.survey) return
    reporting = true
    const keep = { tab: state.tab, pin: state.pin3d }
    const sections = []
    const add = (title, nodes) => sections.push(el('section', { class: 'ctsim-report-sec' }, [el('h2', {}, title), ...nodes]))
    try {
      for (const [tab, title] of [
        ['pesos', 'Pesos RIH / POOH'],
        ['tiempos', 'Tiempos de operación'],
        ['sens', 'Sensibilidad de la capacidad de asentamiento'],
        ['tri', 'Límites triaxiales'],
      ]) {
        if (tab === 'sens' && !state.sens.result) continue
        state.tab = tab
        renderResults()
        await nextFrame()
        add(title, capture())
      }
      // 3D: unpinned, wait for the viewer and keep a picture of it
      state.tab = '3d'
      state.pin3d = false
      renderResults()
      for (let i = 0; i < 40 && !view3d; i++) await sleep(100)
      await nextFrame()
      const img = view3d?.snapshot()
      const nodes = capture()
      const holder = nodes.map((n) => n.querySelector('.ctsim-3d')).find(Boolean)
      if (holder) holder.replaceWith(img ? el('img', { src: img, class: 'ctsim-report-3d', alt: 'Vista 3D de los surveys' }) : el('p', { class: 'note' }, 'Vista 3D no disponible.'))
      add(state.surveys.length > 1 ? 'Surveys en 3D y distancias entre pozos' : 'Survey 3D', nodes)
    } finally {
      state.tab = keep.tab
      state.pin3d = keep.pin
      renderResults()
      reporting = false
    }
    const now = new Date()
    const report = el('div', { id: 'ctsim-report' }, [
      el('header', { class: 'ctsim-report-head' }, [
        el('h1', {}, `Simulación CT — ${state.projectName || state.surveyName}`),
        el('p', {}, `${state.surveyName} · ${now.toLocaleDateString('es-AR')} ${now.toTimeString().slice(0, 5)} · Simulador CT (pesos RIH/POOH, modelo soft-string calibrado)`),
      ]),
      el('section', { class: 'ctsim-report-sec' }, [el('h2', {}, 'Datos de la simulación'), inputsSummary()]),
      ...sections,
      el('p', { class: 'formula-note' }, cal.note),
    ])
    document.getElementById('ctsim-report')?.remove()
    document.body.appendChild(report)
    const done = () => report.remove()
    window.addEventListener('afterprint', done, { once: true })
    await nextFrame()
    window.print()
  }

  // ---- operation times -----------------------------------------------------
  function timesPanel() {
    const rows = state.survey
    const { kop, lp } = kopLp(rows)
    const target = tdOf()
    const tp = state.timePlan
    const plan = planSegments({ kop, lp, target, plan: tp })
    const act = state.run?.series ? actualTimes(state.run.series, plan) : null
    const real = (list, key) => act?.[list].find((x) => x.key === key)
    const f1 = (v) => (v === null || v === undefined ? '—' : nS(v, U().d.speed))
    const rerender = () => renderResults()
    // speeds are kept in m/min, shown and typed in the display unit
    const speedInput = (value, onSet) =>
      el('input', {
        type: 'number',
        step: 0.1,
        min: 0.1,
        class: 'ctsim-cell-input',
        value: value ? +U().cv.speed(value).toFixed(2) : '',
        'aria-label': `Velocidad promedio esperada (${uS()})`,
        onChange: (e) => {
          const v = Number(e.target.value)
          if (v > 0) onSet(U().inv.speed(v))
          rerender()
        },
      })
    const latFrom = plan.rih.find((x) => x.key.startsWith('lat'))?.from
    const segLabel = (x) => (x.key.startsWith('lat') ? `Lateral ${nL(x.from - latFrom)}–${nL(x.to - latFrom)} ${uL()} desde LP` : x.label)
    const setRih = (key) => (v) => {
      if (key === 'vert' || key === 'curve') tp.rih[key] = v
      else {
        const i = Number(key.slice(3))
        while (tp.rih.lat.length <= i) tp.rih.lat.push(tp.rih.lat[tp.rih.lat.length - 1])
        tp.rih.lat[i] = v
      }
    }
    const setPooh = (key) => (v) => (tp.pooh[{ plat: 'lat', pcurve: 'curve', pvert: 'vert' }[key]] = v)
    const dDelta = (exp, re) => (re === null || re === undefined || exp === null ? '' : `${re > exp ? '+' : '−'}${fmtDuration(Math.abs(re - exp)).replace(' h', '')}`)
    const head = (first) =>
      el('thead', {}, el('tr', {}, [first, `Prof. (${uL()})`, `Long. (${uL()})`, `Vel. esperada (${uS()})`, 'Tiempo esperado', ...(act ? [`Vel. real (${uS()})`, 'Tiempo real', 'Δ tiempo'] : [])].map((h) => el('th', {}, h))))
    const segRow = (s, r, onSet) =>
      el('tr', {}, [
        el('td', {}, segLabel(s)),
        el('td', {}, `${nL(s.from)}–${nL(s.to)}`),
        el('td', {}, nL(s.len)),
        el('td', {}, speedInput(s.v, onSet)),
        el('td', {}, fmtDuration(s.min)),
        ...(act ? [el('td', {}, r?.short ? 'no llegó' : f1(r?.realV)), el('td', {}, fmtDuration(r?.realMin)), el('td', { class: 'ctsim-delta' }, dDelta(s.min, r?.realMin))] : []),
      ])
    const totRow = (label, exp, re, extra) =>
      el('tr', { class: 'ctsim-total' }, [el('td', {}, label), el('td', {}, extra ?? ''), el('td', {}), el('td', {}), el('td', {}, fmtDuration(exp)), ...(act ? [el('td', {}), el('td', {}, fmtDuration(re)), el('td', { class: 'ctsim-delta' }, dDelta(exp, re))] : [])])
    const rihLen = plan.rih.reduce((a, x) => a + x.len, 0)
    const rihTable = el('div', { class: 'ctsim-table-wrap' }, [
      el('div', { class: 'section-label ctsim-subtitle' }, `Bajada (RIH) hasta la profundidad objetivo — ${nL(target)} ${uL()}`),
      el('table', { class: 'ctsim-table ctsim-times' }, [
        head('Tramo'),
        el('tbody', {}, [
          ...plan.rih.map((x) => segRow(x, real('rih', x.key), setRih(x.key))),
          totRow('Total RIH', plan.rihMin, act?.rihMin, `vel. media ${f1(rihLen / (plan.rihMin || 1))} ${uS()}${act?.rihMin ? ` · real ${f1((act.bottom - SURF0) / act.rihMin)}` : ''}`),
        ]),
      ]),
    ])
    const poohTable = el('div', { class: 'ctsim-table-wrap' }, [
      el('div', { class: 'section-label ctsim-subtitle' }, 'Sacada (POOH)'),
      el('table', { class: 'ctsim-table ctsim-times' }, [
        head('Tramo'),
        el('tbody', {}, [...plan.pooh.map((x) => segRow(x, real('pooh', x.key), setPooh(x.key))), totRow('Total POOH', plan.poohMin, act?.poohMin)]),
      ]),
    ])
    const bottomInput = el('input', {
      type: 'number',
      step: 0.5,
      min: 0,
      class: 'ctsim-cell-input',
      value: tp.bottomH,
      'aria-label': 'Tiempo en fondo (h)',
      onChange: (e) => ((tp.bottomH = Math.max(0, Number(e.target.value) || 0)), rerender()),
    })
    const sumTable = el('div', { class: 'ctsim-table-wrap' }, [
      el('div', { class: 'section-label ctsim-subtitle' }, 'Resumen de la operación'),
      el('table', { class: 'ctsim-table ctsim-times' }, [
        el('thead', {}, el('tr', {}, ['', 'Esperado', ...(act ? ['Real', 'Δ'] : [])].map((h) => el('th', {}, h)))),
        el('tbody', {}, [
          el('tr', {}, [el('td', {}, 'Bajada (RIH)'), el('td', {}, fmtDuration(plan.rihMin)), ...(act ? [el('td', {}, fmtDuration(act.rihMin)), el('td', { class: 'ctsim-delta' }, dDelta(plan.rihMin, act.rihMin))] : [])]),
          el('tr', {}, [el('td', {}, ['Tiempo en fondo (h) ', bottomInput]), el('td', {}, fmtDuration(plan.bottomMin)), ...(act ? [el('td', {}, fmtDuration(act.bottomMin)), el('td', { class: 'ctsim-delta' }, dDelta(plan.bottomMin, act.bottomMin))] : [])]),
          el('tr', {}, [el('td', {}, 'Sacada (POOH)'), el('td', {}, fmtDuration(plan.poohMin)), ...(act ? [el('td', {}, fmtDuration(act.poohMin)), el('td', { class: 'ctsim-delta' }, dDelta(plan.poohMin, act.poohMin))] : [])]),
          el('tr', { class: 'ctsim-total' }, [el('td', {}, 'Total en pozo'), el('td', {}, fmtDuration(plan.totalMin)), ...(act ? [el('td', {}, fmtDuration(act.totalMin)), el('td', { class: 'ctsim-delta' }, dDelta(plan.totalMin, act.totalMin))] : [])]),
        ]),
      ]),
    ])
    const notes = [
      act && !act.reachedTarget ? el('p', { class: 'note note-error' }, `La carrera cargada llegó a ${nL(act.maxMd)} ${uL()}, antes de la profundidad objetivo (${nL(target)} ${uL()}): los tramos más profundos quedan sin dato real.`) : null,
      act && act.maxMd > rows[rows.length - 1][0] + 30 ? el('p', { class: 'note note-error' }, `La carrera llega a ${nL(act.maxMd)} ${uL()}, más que la TD de este survey: ¿es del mismo pozo?`) : null,
      el(
        'p',
        { class: 'formula-note' },
        `Velocidades promedio efectivas (distancia / tiempo transcurrido): incluyen paradas, fresado de tapones y viajes cortos. Las de referencia son la mediana de 10 carreras (pads B3A2, C1A y B1B) y se pueden editar en cada tramo. RIH: tiempo entre el primer paso por cada profundidad; el lateral se divide cada 500 m${state.units.len === 'ft' ? ' (1640 ft)' : ''} desde el LP (${lp != null ? nL(lp) : '—'} ${uL()}; KOP ${kop != null ? nL(kop) : '—'} ${uL()}). Tiempo en fondo: desde que llega a la profundidad objetivo hasta que la deja definitivamente. POOH: desde que deja el fondo, primer paso hacia arriba por cada profundidad (la vertical termina a ${nL(SURF0)} ${uL()}).${state.run ? '' : ' Cargá el CSV de la operación en "8 · Comparar con una carrera real" para ver los tiempos reales.'}`
      ),
    ]
    resultsEl.appendChild(timeChart(plannedCurve(plan), act?.curve || [], { kop, lp, target }))
    resultsEl.appendChild(
      el('div', { class: 'ctsim-row-btns' }, [
        el('button', { class: 'btn-secondary', type: 'button', onClick: () => ((state.timePlan = JSON.parse(JSON.stringify(HIST_SPEEDS))), rerender()) }, 'Restablecer velocidades de referencia'),
      ])
    )
    resultsEl.append(rihTable, poohTable, sumTable, ...notes.filter(Boolean))
  }
  const SURF0 = 50

  // Depth (down) vs elapsed time (h): expected and, when a run is loaded, real.
  function timeChart(planned, real, { kop, lp, target }) {
    const W = Math.round(Math.min(760, Math.max(360, (resultsEl.clientWidth || 360) - 18)))
    const H = W > 500 ? 420 : 360
    const m = { l: 50, r: 12, t: 12, b: 34 }
    const h1 = Math.max(1, ...planned.map((p) => p.h), ...real.map((p) => p.h))
    const hStep = h1 > 48 ? 12 : h1 > 24 ? 6 : h1 > 8 ? 2 : 1
    const x1 = Math.ceil(h1 / hStep) * hStep
    const dt = depthTicks(Math.max(target, ...real.map((p) => p.md)))
    const d1 = dt.max
    const sx = (h) => m.l + (h / x1) * (W - m.l - m.r)
    const sy = (d) => m.t + (d / d1) * (H - m.t - m.b)
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('class', 'ctsim-chart')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', 'Profundidad vs tiempo de operación, esperado y real')
    const add = (tag, attrs) => {
      const n = document.createElementNS(ns, tag)
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
      svg.appendChild(n)
      return n
    }
    for (let h = 0; h <= x1; h += hStep) {
      add('line', { x1: sx(h), x2: sx(h), y1: m.t, y2: H - m.b, class: 'ctsim-grid' })
      add('text', { x: sx(h), y: H - m.b + 14, class: 'ctsim-tick', 'text-anchor': 'middle' }).textContent = String(h)
    }
    for (const t of dt.ticks) {
      add('line', { x1: m.l, x2: W - m.r, y1: sy(t.m), y2: sy(t.m), class: 'ctsim-grid' })
      add('text', { x: m.l - 6, y: sy(t.m) + 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = t.label
    }
    for (const [d, lab] of [
      [kop, 'KOP'],
      [lp, 'LP'],
      [target, 'Objetivo'],
    ]) {
      if (d == null) continue
      add('line', { x1: m.l, x2: W - m.r, y1: sy(d), y2: sy(d), class: 'ctsim-ref' })
      add('text', { x: W - m.r - 4, y: sy(d) - 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = `${lab} ${nL(d)} ${uL()}`
    }
    add('text', { x: (m.l + W - m.r) / 2, y: H - 4, class: 'ctsim-axis', 'text-anchor': 'middle' }).textContent = 'Tiempo desde el inicio de la bajada (h)'
    const yl = add('text', { x: 12, y: (m.t + H - m.b) / 2, class: 'ctsim-axis', 'text-anchor': 'middle' })
    yl.setAttribute('transform', `rotate(-90 12 ${(m.t + H - m.b) / 2})`)
    yl.textContent = `MD (${uL()})`
    add('polyline', { points: planned.map((p) => `${sx(p.h)},${sy(p.md)}`).join(' '), class: 'ctsim-line ctsim-rih-stroke ctsim-dashed' })
    if (real.length) add('polyline', { points: real.map((p) => `${sx(p.h)},${sy(p.md)}`).join(' '), class: 'ctsim-line ctsim-pooh-stroke' })
    return el('div', { class: 'ctsim-chart-wrap' }, [
      el('div', { class: 'ctsim-legend' }, [
        el('span', {}, [el('i', { class: 'ctsim-key ctsim-rih-bg' }), 'Esperado']),
        real.length ? el('span', {}, [el('i', { class: 'ctsim-key ctsim-pooh-bg' }), 'Real (CSV)']) : null,
      ]),
      svg,
    ])
  }

  function speedTable() {
    const speeds = [2, 4, 6, 8, 12, 16]
    const rows = speeds.map((v) => {
      const p = params(state.muRIH, state.muPOOH)
      p.speedAt = () => v
      p.speedRIH = v
      p.speedPOOH = v
      const r = simulateTrip(p, cal.model, [tdOf()]).rows[0]
      return [v, r.rih, r.pooh]
    })
    return el('div', { class: 'ctsim-table-wrap' }, [
      el('div', { class: 'section-label ctsim-subtitle' }, 'Sensibilidad a la velocidad en el lateral (peso en TD)'),
      el('table', { class: 'ctsim-table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, `Vel. (${uS()})`), el('th', {}, `RIH (${uF()})`), el('th', {}, `POOH (${uF()})`)])),
        el('tbody', {}, rows.map(([v, a, b]) => el('tr', {}, [el('td', {}, state.units.len === 'ft' ? `${nS(v)} (${v} m/min)` : `${v} (${fmt(v * M_TO_FT, 0)} fpm)`), el('td', {}, a === null ? 'Lock-up' : nF(a)), el('td', {}, nF(b))]))),
      ]),
    ])
  }

  function depthTable(base, lo, hi) {
    const every = 250
    const rows = base.rows.filter((r, i) => r.depth % every === 0 || i === base.rows.length - 1)
    const find = (sim, d) => sim.rows.find((r) => r.depth === d)
    const f = (v) => (v === null || v === undefined ? 'Lock-up' : nF(v))
    return el('details', { class: 'ctsim-card' }, [
      el('summary', {}, `Tabla de pesos por profundidad (${uF()})`),
      el('div', { class: 'ctsim-table-wrap' }, [
        el('table', { class: 'ctsim-table' }, [
          el('thead', {}, el('tr', {}, [`MD (${uL()})`, 'RIH', 'RIH µ−', 'RIH µ+', 'POOH', 'POOH µ−', 'POOH µ+'].map((h) => el('th', {}, h)))),
          el(
            'tbody',
            {},
            rows.map((r) => {
              const l = find(lo, r.depth)
              const h = find(hi, r.depth)
              return el('tr', {}, [nL(r.depth), f(r.rih), f(l?.rih), f(h?.rih), f(r.pooh), f(l?.pooh), f(h?.pooh)].map((c) => el('td', {}, c)))
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
    // axes in display units (data stay in lbf / m)
    const u = U()
    const xsD = xs.map((v) => u.cv.force(v))
    const step = niceStep(Math.max(...xsD) - Math.min(...xsD), 8)
    const x0 = Math.floor(Math.min(...xsD) / step) * step
    const x1 = Math.ceil(Math.max(...xsD) / step) * step
    const dt = depthTicks(Math.max(rows[rows.length - 1].depth, ...run.map((p) => p.md)))
    const d1 = dt.max
    const sx = (v) => m.l + ((u.cv.force(v) - x0) / (x1 - x0)) * (W - m.l - m.r)
    const sy = (d) => m.t + (d / d1) * (H - m.t - m.b)
    const kfmt = (v) => (Math.abs(v) >= 1000 && step >= 1000 ? `${fmt(v / 1000, 1)}k` : fmt(v, step < 1 ? 1 : 0))
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
    for (let k = 0, x = x0; x <= x1 + 1e-9; k++, x = x0 + k * step) {
      const px = m.l + ((x - x0) / (x1 - x0)) * (W - m.l - m.r)
      add('line', { x1: px, x2: px, y1: m.t, y2: H - m.b, class: Math.abs(x) < 1e-9 ? 'ctsim-zero' : 'ctsim-grid' })
      if (k % 2 === 0) add('text', { x: px, y: H - m.b + 14, class: 'ctsim-tick', 'text-anchor': 'middle' }).textContent = kfmt(x)
    }
    for (const t of dt.ticks) {
      add('line', { x1: m.l, x2: W - m.r, y1: sy(t.m), y2: sy(t.m), class: 'ctsim-grid' })
      add('text', { x: m.l - 6, y: sy(t.m) + 4, class: 'ctsim-tick', 'text-anchor': 'end' }).textContent = t.label
    }
    add('text', { x: (m.l + W - m.r) / 2, y: H - 4, class: 'ctsim-axis', 'text-anchor': 'middle' }).textContent = `Peso en indicador (${uF()})`
    const yl = add('text', { x: 12, y: (m.t + H - m.b) / 2, class: 'ctsim-axis', 'text-anchor': 'middle' })
    yl.setAttribute('transform', `rotate(-90 12 ${(m.t + H - m.b) / 2})`)
    yl.textContent = `MD (${uL()})`
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
        el('strong', {}, `${nL(r.depth)} ${uL()}`),
        el('div', {}, [el('i', { class: 'ctsim-key ctsim-rih-bg' }), `RIH ${r.rih === null ? 'lock-up' : nF(r.rih) + ' ' + uF()}${ok(mr) ? ` · medido ${nF(mr.w)}` : ''}`]),
        el('div', {}, [el('i', { class: 'ctsim-key ctsim-pooh-bg' }), `POOH ${nF(r.pooh)} ${uF()}${ok(mp) ? ` · medido ${nF(mp.w)}` : ''}`])
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

  // open the pad used last in this browser (or migrate the project saved by
  // the previous version, which lived in localStorage)
  renderForm()
  renderResults()
  ;(async () => {
    try {
      const id = currentPadId()
      const rec = id ? await getPad(id) : null
      if (rec) {
        state.padId = rec.id
        loadProjectObject(rec.project)
        state.saveStatus = `Pad «${rec.name}» recuperado (guardado ${new Date(rec.savedAt).toLocaleString('es-AR')}).`
      } else {
        const old = loadLocal()
        if (old) {
          state.padId = newPadId()
          setCurrentPadId(state.padId)
          loadProjectObject(old)
          state.saveStatus = 'Proyecto anterior recuperado y guardado como pad.'
          loading = false
          autosave()
        }
      }
      state.pads = await listPads()
    } catch (err) {
      state.saveStatus = `No se pudo leer lo guardado en este navegador: ${err.message}`
    }
    loading = false
    renderForm()
    renderResults()
  })()
}
