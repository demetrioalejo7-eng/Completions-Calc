// Shorthand builders for unit-selectable number inputs, so calculator
// files stay concise. Each returns a `unitNumber` input spec: the field
// shows a value + unit dropdown, but `values[id]` is always delivered to
// compute() already converted to the canonical unit named here — so
// compute() bodies are written exactly as if the field were fixed-unit.

export function lengthIn(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Longitud', canonicalUnit: 'Pulgadas (in)', step: 0.001, ...opts }
}

export function lengthFt(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Longitud', canonicalUnit: 'Pies (ft)', step: 1, ...opts }
}

// Well depth / length along the string: computed in feet, shown in meters
// by default. `defaultM` gives the starting value in meters.
const FT_PER_M = 3.28084
export function depth(id, label, { defaultM, ...opts } = {}) {
  return lengthFt(id, label, { defaultUnit: 'Metros (m)', ...(defaultM != null ? { default: defaultM * FT_PER_M } : {}), ...opts })
}

// Temperature: computed in °F, shown in °C by default. `defaultC` in °C.
export function temperature(id, label, { defaultC, ...opts } = {}) {
  return { type: 'temperature', id, label, step: 1, ...(defaultC != null ? { default: (defaultC * 9) / 5 + 32 } : {}), ...opts }
}

export function pressure(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Presión', canonicalUnit: 'PSI', step: 1, ...opts }
}

export function weight(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Peso / Masa', canonicalUnit: 'Libras (lb)', step: 1, ...opts }
}

export function weightPerLength(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Peso / Longitud', canonicalUnit: 'Lb/ft', step: 0.01, ...opts }
}

export function density(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Densidad', canonicalUnit: 'Lb/galón (ppg)', step: 0.01, ...opts }
}

export function volume(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Volumen', canonicalUnit: 'Barriles (bbl)', step: 0.1, ...opts }
}

export function flow(id, label, opts = {}) {
  return { type: 'unitNumber', id, label, category: 'Caudal', canonicalUnit: 'Barriles/min (bpm)', step: 0.1, ...opts }
}

// Result-row helpers mirroring the above, for switchable output units.
export function lengthInResult(label, value, opts = {}) {
  return { label, value, category: 'Longitud', canonicalUnit: 'Pulgadas (in)', unit: 'in', ...opts }
}
export function lengthFtResult(label, value, opts = {}) {
  return { label, value, category: 'Longitud', canonicalUnit: 'Pies (ft)', unit: 'ft', ...opts }
}
export function depthResult(label, value, opts = {}) {
  return lengthFtResult(label, value, { defaultUnit: 'Metros (m)', ...opts })
}
export function temperatureResult(label, valueF, opts = {}) {
  return { label, value: valueF, category: 'Temperatura', ...opts }
}
export function temperatureDiffResult(label, valueF, opts = {}) {
  return { label, value: valueF, category: 'Diferencia de temperatura', canonicalUnit: '°F', unit: '°F', ...opts }
}
export function pressureResult(label, value, opts = {}) {
  return { label, value, category: 'Presión', canonicalUnit: 'PSI', unit: 'psi', ...opts }
}
export function weightResult(label, value, opts = {}) {
  return { label, value, category: 'Peso / Masa', canonicalUnit: 'Libras (lb)', unit: 'lb', ...opts }
}
export function volumeResult(label, value, opts = {}) {
  return { label, value, category: 'Volumen', canonicalUnit: 'Barriles (bbl)', unit: 'bbl', ...opts }
}
export function weightPerLengthResult(label, value, opts = {}) {
  return { label, value, category: 'Peso / Longitud', canonicalUnit: 'Lb/ft', unit: 'lb/ft', ...opts }
}
export function densityResult(label, value, opts = {}) {
  return { label, value, category: 'Densidad', canonicalUnit: 'Lb/galón (ppg)', unit: 'lb/gal', ...opts }
}
