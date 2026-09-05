import './style.css'
import { renderHome, renderSection, renderCalculator } from './views.js'

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
  } else if (parts[0] === 's' && parts[1] && parts[2]) {
    renderCalculator(app, parts[1], parts[2])
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
