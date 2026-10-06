// Standalone entry: Simulador de pesos RIH / POOH para coiled tubing.
import '../style.css'
import './style.css'
import { el } from '../ui/dom.js'
import { mountCtSimulator } from './simulator.js'

const app = document.getElementById('app')
app.appendChild(
  el('header', { class: 'app-header' }, [
    el('div', { class: 'header-titles' }, [
      el('h1', {}, 'Simulador CT — Pesos RIH / POOH'),
      el('p', { class: 'header-subtitle' }, 'Lavado post-frac · modelo de fuerzas soft-string (base Orpheus/Cerberus) calibrado con carreras reales'),
    ]),
  ])
)
const body = el('div', { class: 'ctsim-app-body' })
app.appendChild(body)
mountCtSimulator(body)

// Keep the installed (offline) copy up to date: the app's service worker
// (sw.js at the site root, one level up) also serves this page. Register it
// from here too so opening only the simulator picks up new versions; the
// worker activates at once (autoUpdate) and the page reloads when it takes
// over.
if (__ENABLE_PWA__ && 'serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    location.reload()
  })
  navigator.serviceWorker.register(new URL('../sw.js', location.href), { scope: new URL('../', location.href).pathname }).then((reg) => reg.update()).catch(() => {})
}
