import './style.css'
import { renderHome, renderSection, renderGroup, renderCalculator } from './views.js'
import { findGroup } from './calculators/index.js'

const app = document.getElementById('app')

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const parts = hash.split('/').filter(Boolean)
  return parts
}

function route() {
  const parts = parseHash()
  window.scrollTo(0, 0)
  if (parts.length === 0) {
    renderHome(app)
  } else if (parts[0] === 's' && parts[1] && !parts[2]) {
    renderSection(app, parts[1])
  } else if (parts[0] === 's' && parts[1] && parts[2] && !parts[3]) {
    // parts[2] is either a calculator id (flat section) or a group id
    // (grouped section, e.g. Contingencias > Fractura / Coiled Tubing).
    if (findGroup(parts[1], parts[2])) {
      renderGroup(app, parts[1], parts[2])
    } else {
      renderCalculator(app, parts[1], parts[2])
    }
  } else if (parts[0] === 's' && parts[1] && parts[2] && parts[3]) {
    renderCalculator(app, parts[1], parts[3])
  } else {
    renderHome(app)
  }
}

window.addEventListener('hashchange', route)
window.addEventListener('DOMContentLoaded', route)
route()

if (__ENABLE_PWA__ && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {})
}
