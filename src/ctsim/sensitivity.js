// Análisis de sensibilidad de la capacidad de asentamiento (set-down) en
// función del coeficiente de fricción y del ERT.
//
// Capacidad de asentamiento = fuerza de compresión máxima que llega a la
// herramienta antes del lock-up (criterio CTES Lockup 2.0: la transferencia
// dF_fondo / dW_superficie cae por debajo del 2 %).
import { maxSetDown, simulateTrip } from './forces.js'

// Depth grid: every `stepM` from the LP (or 60 % of TD) to TD, plus extra depths.
export function sensitivityDepths(tdM, lpM, stepM = 250, extra = []) {
  const start = Math.max(0, Math.floor((lpM ?? tdM * 0.6) / stepM) * stepM)
  const out = []
  for (let d = start; d < tdM; d += stepM) out.push(d)
  out.push(tdM)
  for (const d of extra) if (d > 0 && d <= tdM) out.push(d)
  return [...new Set(out.map((d) => Math.round(d)))].sort((a, b) => a - b)
}

// One scenario: set-down capacity at each depth + first lock-up depth (RIH).
export function scenario(params, model, depths, requiredLbf) {
  const profile = depths.map((d) => {
    const p = { ...params, speedRIH: params.speedAt ? params.speedAt(d, 'RIH') : params.speedRIH }
    const r = maxSetDown(p, d, model)
    return { depth: d, setDown: r.bottomForce, surfaceWeight: r.surfaceWeight }
  })
  const trip = simulateTrip(params, model)
  const lock = trip.rows.find((r) => r.lockup)
  const below = profile.find((r) => r.setDown < requiredLbf)
  return {
    profile,
    atTD: profile[profile.length - 1],
    lockupDepth: lock ? lock.depth : null,
    // first depth where the capacity drops below the required set-down
    limitDepth: below ? below.depth : null,
  }
}

// Grid of scenarios: µ list × ERT list (lbf/bpm). Keeps the POOH/RIH µ ratio.
export function sensitivityGrid(params, model, { mus, erts, depths, requiredLbf }) {
  const ratio = params.muPOOH / params.muRIH
  const grid = []
  for (const mu of mus) {
    for (const ert of erts) {
      const p = { ...params, muRIH: mu, muPOOH: mu * ratio, ertLbfPerBpm: ert }
      grid.push({ mu, ert, ...scenario(p, model, depths, requiredLbf) })
    }
  }
  return grid
}
