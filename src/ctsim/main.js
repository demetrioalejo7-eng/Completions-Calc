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
