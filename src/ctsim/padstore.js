// Pads guardados en el navegador (IndexedDB: entra el CSV de todo el pad).
// Cada pad es { id, name, savedAt, wells, project }.
const DB = 'ctsim'
const STORE = 'pads'
const CURRENT_KEY = 'ctsim-current-pad'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Este navegador no permite guardar datos (IndexedDB).'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('No se pudo abrir el almacenamiento del navegador.'))
  })
}

async function tx(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const out = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(out?.result ?? out)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error || new Error('Sin espacio en el navegador para guardar el pad.'))
  })
}

export const newPadId = () => `pad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function putPad(rec) {
  return tx('readwrite', (s) => s.put(rec))
}

export function getPad(id) {
  return tx('readonly', (s) => s.get(id))
}

export function deletePad(id) {
  return tx('readwrite', (s) => s.delete(id))
}

// Summary list (without the heavy project), newest first.
export async function listPads() {
  const all = await tx('readonly', (s) => s.getAll())
  return (all || []).map(({ id, name, savedAt, wells, runs }) => ({ id, name, savedAt, wells, runs })).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
}

export function currentPadId() {
  try {
    return localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

export function setCurrentPadId(id) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id)
    else localStorage.removeItem(CURRENT_KEY)
  } catch {
    /* ignore */
  }
}
