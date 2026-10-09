// Proyecto del simulador (un pad): surveys con tapones, coordenadas y
// profundidad objetivo, todos los parámetros del formulario y las carreras
// del CSV del pad, cada una asignada a su pozo. Se guarda solo en el navegador (localStorage)
// y se puede exportar / abrir como archivo .json.
//
// Plantillas: el "equipo" (sarta, casing, fluido, presiones, fricción, ERT,
// stripper, reel, velocidades, tiempos) guardado con un nombre para
// reutilizarlo en otros pads.

export const PROJECT_VERSION = 2
export const LOCAL_KEY = 'ctsim-project-v1'
export const TEMPLATES_KEY = 'ctsim-templates-v1'

// Parameters saved with a project (everything but the wells and the run).
const PROJECT_KEYS = [
  'coordConv', 'wells3d', 'pin3d', 'size3d', 'labels3d', 'timePlan',
  'casingId', 'string', 'grade', 'stringPreset', 'fluidPpg', 'whp', 'whpNoPump', 'ctp', 'rate', 'returnRate',
  'muLevel', 'muRIH', 'muPOOH', 'stripper', 'rbtRIH', 'rbtPOOH', 'reelTared', 'ertInPooh', 'indicatorOffset',
  'speeds', 'ertLevel', 'ert', 'readings', 'bha', 'tab', 'tri', 'units', 'noPumpAboveKop', 'useRunCond',
]

// Equipment / job settings reused between pads.
export const TEMPLATE_KEYS = [
  'casingId', 'string', 'grade', 'stringPreset', 'fluidPpg', 'whp', 'whpNoPump', 'ctp', 'rate', 'returnRate',
  'muLevel', 'muRIH', 'muPOOH', 'stripper', 'rbtRIH', 'rbtPOOH', 'reelTared', 'ertInPooh', 'indicatorOffset',
  'speeds', 'ertLevel', 'ert', 'bha', 'timePlan', 'coordConv', 'units', 'noPumpAboveKop',
]

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

function pick(state, keys) {
  const out = {}
  for (const k of keys) if (state[k] !== undefined) out[k] = clone(state[k])
  return out
}

// Project as a plain object. The active well's plugs live in state.plugs:
// they are written back to its survey first.
export function toProject(state, { includeRun = true } = {}) {
  const surveys = state.surveys.map((w, i) => ({
    name: w.name,
    rows: w.rows,
    plugs: i === state.active ? state.plugs : w.plugs || [],
    plugsText: i === state.active ? state.plugsText : w.plugsText || '',
    head: w.head || null,
    target: w.target ?? null,
  }))
  const proj = {
    app: 'simulador-ct',
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    name: state.projectName || '',
    active: state.active,
    surveys,
    settings: pick(state, PROJECT_KEYS),
    sens: { mus: state.sens.mus, erts: state.sens.erts, required: state.sens.required, wells: state.sens.wells },
  }
  if (includeRun) {
    proj.runs = state.runs || []
    proj.runSel = state.runSel || {}
  }
  return proj
}

// Checks a parsed project file; throws a readable error.
export function validateProject(p) {
  if (!p || typeof p !== 'object' || p.app !== 'simulador-ct') throw new Error('El archivo no es un proyecto del simulador CT.')
  if (!(p.version <= PROJECT_VERSION)) throw new Error('El proyecto es de una versión más nueva del simulador: actualizá la página.')
  if (!Array.isArray(p.surveys)) throw new Error('El proyecto no tiene surveys.')
  for (const w of p.surveys) if (!Array.isArray(w.rows) || w.rows.length < 2) throw new Error(`Survey inválido en el proyecto: ${w.name || '?'}`)
  return p
}

// Loads a project into the simulator state (mutates it). Unknown / missing
// settings keep their current value.
export function applyProject(state, p) {
  validateProject(p)
  state.projectName = p.name || ''
  state.surveys = p.surveys.map((w) => ({
    name: w.name,
    rows: w.rows,
    plugs: w.plugs || [],
    plugsText: w.plugsText || '',
    head: w.head || { x: null, y: null, z: null },
    target: w.target ?? null,
  }))
  for (const [k, v] of Object.entries(p.settings || {})) if (PROJECT_KEYS.includes(k)) state[k] = clone(v)
  if (p.sens) Object.assign(state.sens, clone(p.sens), { result: null, key: '' })
  const a = Number.isInteger(p.active) && p.active >= 0 && p.active < state.surveys.length ? p.active : state.surveys.length ? 0 : -1
  if (Array.isArray(p.runs)) {
    state.runs = clone(p.runs)
    state.runSel = clone(p.runSel || {})
  } else if (p.run?.run) {
    // version 1: a single run, of the active well
    const r = p.run.run
    state.runs = [{ uid: `r-v1-${r.start}`, file: p.run.name || '', hasTime: p.run.hasTime, hasWHP: p.run.hasWHP, hasQ: p.run.hasQ, well: state.surveys[a]?.name ?? null, start: r.start, end: r.end, maxMd: r.maxMd, tMax: r.tMax, points: r.points, series: r.series }]
    state.runSel = {}
  } else {
    state.runs = []
    state.runSel = {}
  }
  state.run = null
  state.match = null
  return a // the caller activates it (setActive) to load its plugs
}

// ---- browser storage --------------------------------------------------------
function storage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// Saves the project; if it doesn't fit (quota), retries without the run.
// Returns 'full' | 'no-run' | false.
export function saveLocal(state) {
  const ls = storage()
  if (!ls) return false
  try {
    ls.setItem(LOCAL_KEY, JSON.stringify(toProject(state)))
    return 'full'
  } catch {
    try {
      ls.setItem(LOCAL_KEY, JSON.stringify(toProject(state, { includeRun: false })))
      return 'no-run'
    } catch {
      return false
    }
  }
}

export function loadLocal() {
  const ls = storage()
  if (!ls) return null
  try {
    const raw = ls.getItem(LOCAL_KEY)
    return raw ? validateProject(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function clearLocal() {
  try {
    storage()?.removeItem(LOCAL_KEY)
  } catch {
    /* ignore */
  }
}

// ---- templates ----------------------------------------------------------------
export function listTemplates() {
  try {
    const raw = storage()?.getItem(TEMPLATES_KEY)
    const t = raw ? JSON.parse(raw) : {}
    return t && typeof t === 'object' ? t : {}
  } catch {
    return {}
  }
}

function writeTemplates(t) {
  try {
    storage()?.setItem(TEMPLATES_KEY, JSON.stringify(t))
    return true
  } catch {
    return false
  }
}

export function saveTemplate(state, name) {
  const t = listTemplates()
  t[name] = { savedAt: new Date().toISOString(), settings: pick(state, TEMPLATE_KEYS) }
  return writeTemplates(t)
}

export function applyTemplate(state, name) {
  const tpl = listTemplates()[name]
  if (!tpl) throw new Error(`No existe la plantilla "${name}".`)
  for (const [k, v] of Object.entries(tpl.settings || {})) if (TEMPLATE_KEYS.includes(k)) state[k] = clone(v)
}

export function deleteTemplate(name) {
  const t = listTemplates()
  delete t[name]
  return writeTemplates(t)
}

// File name for an exported project: "Pad B1B" → "pad-b1b.ctsim.json".
export function projectFileName(state) {
  const base = (state.projectName || state.surveys.map((w) => w.name).join('_') || 'proyecto')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60)
  return `${base || 'proyecto'}.ctsim.json`
}
