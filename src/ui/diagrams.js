// Small labeled technical-drawing diagrams shown above a calculator's
// inputs, so the user can see which physical dimension (D, d, h, t...)
// corresponds to which field. Diagrams use short symbols on the drawing
// (standard technical-drawing convention) plus a text legend below that
// maps each symbol to the calculator's actual field names.
const SVG_OPEN = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 150" class="dim-svg"'
const STROKE = 'stroke="currentColor" stroke-width="1.4" fill="none"'
const DIM_STROKE = 'stroke="currentColor" stroke-width="1" fill="none" opacity="0.6"'

function text(x, y, s, opts = {}) {
  const anchor = opts.anchor || 'middle'
  const size = opts.size || 11
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="currentColor">${s}</text>`
}

// Horizontal dimension line with arrow ticks at both ends and a label above.
function hDim(x1, x2, y, label) {
  const tick = 4
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" ${DIM_STROKE}/>
    <line x1="${x1}" y1="${y - tick}" x2="${x1}" y2="${y + tick}" ${DIM_STROKE}/>
    <line x1="${x2}" y1="${y - tick}" x2="${x2}" y2="${y + tick}" ${DIM_STROKE}/>
    ${text((x1 + x2) / 2, y - 6, label)}
  `
}

// Vertical dimension line with arrow ticks and a label to the right.
function vDim(x, y1, y2, label) {
  const tick = 4
  return `
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" ${DIM_STROKE}/>
    <line x1="${x - tick}" y1="${y1}" x2="${x + tick}" y2="${y1}" ${DIM_STROKE}/>
    <line x1="${x - tick}" y1="${y2}" x2="${x + tick}" y2="${y2}" ${DIM_STROKE}/>
    ${text(x + 12, (y1 + y2) / 2 + 4, label)}
  `
}

function legend(pairs) {
  return pairs.map(([sym, desc]) => `<strong>${sym}</strong> = ${desc}`).join(' &nbsp;·&nbsp; ')
}

function frame(svgInner, legendPairs) {
  return `<div class="dim-diagram">
    <svg ${SVG_OPEN}>${svgInner}</svg>
    <p class="dim-legend">${legend(legendPairs)}</p>
  </div>`
}

// Pipe / hole cross-section, viewed end-on. Optionally two concentric
// circles (OD + ID) or a single circle (hole diameter).
export function pipeCrossSection({ od = 'OD', id = 'ID' } = {}) {
  const cx = 70,
    cy = 68
  const rOuter = 46,
    rInner = id ? 24 : 0
  let inner = `<circle cx="${cx}" cy="${cy}" r="${rOuter}" ${STROKE}/>`
  if (id) inner += `<circle cx="${cx}" cy="${cy}" r="${rInner}" ${STROKE}/>`
  inner += `<line x1="${cx}" y1="${cy}" x2="${cx + rOuter}" y2="${cy}" ${DIM_STROKE}/>`
  inner += hDim(cx - rOuter, cx + rOuter, cy + rOuter + 16, od)
  if (id) {
    inner += `<line x1="${cx}" y1="${cy}" x2="${cx + rInner}" y2="${cy - 2}" ${DIM_STROKE}/>`
    inner += text(cx + rInner / 2 + 20, cy - 10, id)
  }
  const legendPairs = id ? [[od, 'Diámetro exterior'], [id, 'Diámetro interior']] : [[od, 'Diámetro']]
  return frame(inner, legendPairs)
}

// Annulus between two pipes / pipe and hole, viewed end-on, with the
// annular gap shaded.
export function annulusCrossSection({ outer = 'D', inner: innerSym = 'd' } = {}) {
  const cx = 70,
    cy = 68
  const rOuter = 46,
    rInner = 26
  const ring = `<path d="M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 0 ${cx + rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 0 ${cx - rOuter} ${cy} Z
    M ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 1 1 ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 1 1 ${cx - rInner} ${cy} Z"
    fill="currentColor" opacity="0.14" fill-rule="evenodd"/>`
  let inner = ring
  inner += `<circle cx="${cx}" cy="${cy}" r="${rOuter}" ${STROKE}/>`
  inner += `<circle cx="${cx}" cy="${cy}" r="${rInner}" ${STROKE}/>`
  inner += hDim(cx - rOuter, cx + rOuter, cy + rOuter + 16, outer)
  inner += `<line x1="${cx}" y1="${cy}" x2="${cx + rInner}" y2="${cy - 3}" ${DIM_STROKE}/>`
  inner += text(cx + rInner + 14, cy - 8, innerSym)
  return frame(inner, [[outer, 'Diámetro exterior (pozo/casing)'], [innerSym, 'Diámetro interior (tubería/casing interno)']])
}

// Vertical cylinder / tank, side view, with diameter and height dimensions.
export function verticalCylinder({ d = 'D', h = 'h', partial = false } = {}) {
  const left = 70,
    right = 140,
    top = 20,
    bottom = 118
  const rx = (right - left) / 2
  let inner = `
    <ellipse cx="${(left + right) / 2}" cy="${top}" rx="${rx}" ry="8" ${STROKE}/>
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" ${STROKE}/>
    <line x1="${right}" y1="${top}" x2="${right}" y2="${bottom}" ${STROKE}/>
    <path d="M ${left} ${bottom} A ${rx} 8 0 0 0 ${right} ${bottom}" ${STROKE}/>
    <path d="M ${left} ${bottom} A ${rx} 8 0 0 1 ${right} ${bottom}" ${DIM_STROKE}/>
  `
  if (partial) {
    const fillY = bottom - (bottom - top) * 0.4
    inner += `<path d="M ${left} ${fillY} A ${rx} 8 0 0 0 ${right} ${fillY}" ${DIM_STROKE}/>`
    inner += `<line x1="${left}" y1="${fillY}" x2="${right}" y2="${fillY}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>`
  }
  inner += hDim(left, right, top - 12, d)
  inner += vDim(right + 14, top, bottom, h)
  const legendPairs = [[d, 'Diámetro'], [h, partial ? 'Altura total' : 'Altura / longitud']]
  return frame(inner, legendPairs)
}

// Horizontal cylindrical tank, side view.
export function horizontalCylinder({ d = 'D', l = 'L', partial = false } = {}) {
  const left = 55,
    right = 165,
    top = 40,
    bottom = 96
  const ry = (bottom - top) / 2
  let inner = `
    <ellipse cx="${left}" cy="${(top + bottom) / 2}" rx="10" ry="${ry}" ${STROKE}/>
    <line x1="${left}" y1="${top}" x2="${right}" y2="${top}" ${STROKE}/>
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" ${STROKE}/>
    <path d="M ${right} ${top} A 10 ${ry} 0 0 1 ${right} ${bottom}" ${STROKE}/>
  `
  if (partial) {
    const fillY = bottom - (bottom - top) * 0.35
    inner += `<line x1="${left}" y1="${fillY}" x2="${right}" y2="${fillY}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>`
  }
  inner += hDim(left, right, top - 14, l)
  inner += vDim(left - 22, top, bottom, d)
  return frame(inner, [[d, 'Diámetro'], [l, 'Longitud']])
}

// Truncated cone (sloped cylindrical tank), different top/bottom diameter.
export function slopedCylinder({ top: topSym = 'D top', bottom: bottomSym = 'D bottom', h = 'h' } = {}) {
  const cx = 110,
    yTop = 30,
    yBottom = 118
  const rxTop = 55,
    rxBottom = 32,
    ry = 8
  let inner = `
    <ellipse cx="${cx}" cy="${yTop}" rx="${rxTop}" ry="${ry}" ${STROKE}/>
    <line x1="${cx - rxTop}" y1="${yTop}" x2="${cx - rxBottom}" y2="${yBottom}" ${STROKE}/>
    <line x1="${cx + rxTop}" y1="${yTop}" x2="${cx + rxBottom}" y2="${yBottom}" ${STROKE}/>
    <path d="M ${cx - rxBottom} ${yBottom} A ${rxBottom} ${ry} 0 0 0 ${cx + rxBottom} ${yBottom}" ${STROKE}/>
    <path d="M ${cx - rxBottom} ${yBottom} A ${rxBottom} ${ry} 0 0 1 ${cx + rxBottom} ${yBottom}" ${DIM_STROKE}/>
  `
  inner += hDim(cx - rxTop, cx + rxTop, yTop - 12, topSym)
  inner += hDim(cx - rxBottom, cx + rxBottom, yBottom + 16, bottomSym)
  inner += vDim(cx + rxTop + 14, yTop, yBottom, h)
  return frame(inner, [[topSym, 'Diámetro superior'], [bottomSym, 'Diámetro inferior'], [h, 'Altura total']])
}

// Rectangular tank / pit, simple front view with a depth cue.
export function rectTank({ l = 'L', w = 'W', h = 'H' } = {}) {
  const left = 55,
    right = 150,
    top = 40,
    bottom = 110,
    depth = 22
  let inner = `
    <path d="M ${left} ${top} L ${right} ${top} L ${right} ${bottom} L ${left} ${bottom} Z" ${STROKE}/>
    <path d="M ${left} ${top} L ${left + depth} ${top - depth * 0.6} L ${right + depth} ${top - depth * 0.6} L ${right} ${top} Z" ${DIM_STROKE}/>
    <path d="M ${right} ${top} L ${right + depth} ${top - depth * 0.6} L ${right + depth} ${bottom - depth * 0.6} L ${right} ${bottom} Z" ${DIM_STROKE}/>
  `
  inner += hDim(left, right, bottom + 16, l)
  inner += vDim(left - 14, top, bottom, h)
  inner += text(right + depth + 6, top - depth * 0.3, w, { anchor: 'start' })
  return frame(inner, [[l, 'Largo'], [w, 'Ancho'], [h, 'Alto']])
}

// Sloped-wall pit / tank, trapezoidal cross-section.
export function slopedTrapezoid({ top: topSym = 'Wt', bottom: bottomSym = 'Wb', h = 'h', l = 'L' } = {}) {
  const midTop = 60,
    yTop = 34,
    yBottom = 112
  const topHalf = 60,
    bottomHalf = 30
  let inner = `
    <path d="M ${midTop - topHalf} ${yTop} L ${midTop + topHalf} ${yTop} L ${midTop + bottomHalf} ${yBottom} L ${midTop - bottomHalf} ${yBottom} Z" ${STROKE}/>
  `
  inner += hDim(midTop - topHalf, midTop + topHalf, yTop - 12, topSym)
  inner += hDim(midTop - bottomHalf, midTop + bottomHalf, yBottom + 16, bottomSym)
  inner += vDim(midTop + topHalf + 14, yTop, yBottom, h)
  inner += text(midTop, yTop + (yBottom - yTop) / 2, l, { anchor: 'middle', size: 10 })
  return frame(inner, [[topSym, 'Ancho superior'], [bottomSym, 'Ancho inferior'], [h, 'Profundidad'], [l, 'Largo (perpendicular)']])
}

// Sphere / spherical tank.
export function sphere({ d = 'D' } = {}) {
  const cx = 70,
    cy = 68,
    r = 46
  let inner = `<circle cx="${cx}" cy="${cy}" r="${r}" ${STROKE}/>`
  inner += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.32}" ${DIM_STROKE}/>`
  inner += hDim(cx - r, cx + r, cy + r + 16, d)
  return frame(inner, [[d, 'Diámetro']])
}

// Pipe wall cross-section (half-section) showing OD, ID and wall thickness.
export function wallThickness({ od = 'OD', id = 'ID', t = 't' } = {}) {
  const cx = 70,
    cy = 68
  const rOuter = 46,
    rInner = 32
  let inner = `<circle cx="${cx}" cy="${cy}" r="${rOuter}" ${STROKE}/>`
  inner += `<circle cx="${cx}" cy="${cy}" r="${rInner}" ${STROKE}/>`
  inner += `<path d="M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 0 ${cx + rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 0 ${cx - rOuter} ${cy} Z
    M ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 1 1 ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 1 1 ${cx - rInner} ${cy} Z"
    fill="currentColor" opacity="0.14" fill-rule="evenodd"/>`
  inner += hDim(cx - rOuter, cx + rOuter, cy + rOuter + 16, od)
  inner += `<line x1="${cx + rInner}" y1="${cy}" x2="${cx + rOuter}" y2="${cy}" stroke="currentColor" stroke-width="2.4" opacity="0.9"/>`
  inner += text(cx + rOuter + 10, cy + 4, t, { anchor: 'start' })
  inner += `<line x1="${cx}" y1="${cy}" x2="${cx - rInner + 2}" y2="${cy - 3}" ${DIM_STROKE}/>`
  inner += text(cx - rInner / 2 - 6, cy - 10, id)
  return frame(inner, [[od, 'Diámetro exterior'], [id, 'Diámetro interior'], [t, 'Espesor de pared']])
}

// Gooseneck bend arc: chord width C, sagitta height h, radius R.
export function goosenecArc({ c = 'C', h = 'h', r = 'R' } = {}) {
  const x1 = 30,
    x2 = 190,
    yBase = 110
  const sagitta = 55
  const cx2 = (x1 + x2) / 2
  let inner = `<path d="M ${x1} ${yBase} Q ${cx2} ${yBase - sagitta * 1.7} ${x2} ${yBase}" ${STROKE}/>`
  inner += `<line x1="${x1}" y1="${yBase}" x2="${x2}" y2="${yBase}" ${DIM_STROKE}/>`
  inner += hDim(x1, x2, yBase + 16, c)
  inner += vDim(cx2 + 6, yBase - sagitta, yBase, h)
  inner += text(cx2, yBase - sagitta - 12, r)
  return frame(inner, [[c, 'Ancho del arco'], [h, 'Altura del arco'], [r, 'Radio calculado']])
}

// Coiled-tubing reel, side view: spool OD, core diameter, and width (as a
// secondary end-view rectangle).
export function reelSide({ spool = 'OD carrete', core = 'Core', width = 'Ancho' } = {}) {
  const cx = 78,
    cy = 68,
    rOuter = 46,
    rInner = 16
  let inner = `<circle cx="${cx}" cy="${cy}" r="${rOuter}" ${STROKE}/>`
  inner += `<circle cx="${cx}" cy="${cy}" r="${rInner}" ${STROKE}/>`
  inner += `<path d="M ${cx} ${cy} m ${rInner + 4} 0 a ${rInner + 10} ${rInner + 10} 0 0 1 -6 22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>`
  inner += hDim(cx - rOuter, cx + rOuter, cy + rOuter + 16, spool)
  inner += text(cx, cy + 3, core, { size: 9 })
  inner += `<rect x="${cx + rOuter + 18}" y="${cy - 26}" width="14" height="52" ${STROKE}/>`
  inner += text(cx + rOuter + 25, cy + 42, width, { size: 9 })
  return frame(inner, [[spool, 'Diámetro exterior del carrete (bridas)'], [core, 'Diámetro del núcleo'], [width, 'Ancho interior útil']])
}

// Several small strings (tubing) inside one outer bore, end-on view.
export function multiStringCrossSection({ outer = 'D', inner: innerSym = 'd' } = {}) {
  const cx = 70,
    cy = 68,
    rOuter = 46,
    rSmall = 13
  let inner = `<circle cx="${cx}" cy="${cy}" r="${rOuter}" ${STROKE}/>`
  const positions = [
    [cx - 18, cy - 14],
    [cx + 16, cy - 10],
    [cx - 6, cy + 18],
  ]
  for (const [px, py] of positions) {
    inner += `<circle cx="${px}" cy="${py}" r="${rSmall}" ${STROKE}/>`
  }
  inner += hDim(cx - rOuter, cx + rOuter, cy + rOuter + 16, outer)
  inner += `<line x1="${positions[0][0]}" y1="${positions[0][1]}" x2="${positions[0][0] + rSmall}" y2="${positions[0][1]}" ${DIM_STROKE}/>`
  inner += text(positions[0][0] + rSmall + 12, positions[0][1] + 4, innerSym)
  return frame(inner, [[outer, 'Diámetro exterior (pozo / ID de casing)'], [innerSym, 'OD de cada sarta (n sartas iguales)']])
}

// RTJ flange, side (elevation) view: flange body with a raised welding
// neck/hub, bore straight through, bolt holes on the flange face, and a
// small RTJ ring-groove notch on the face (schematic, not to scale).
export function flangeSection({ od = 'OD', bc = 'BC', b = 'B', t = 'T', h = 'H' } = {}) {
  const left = 28,
    right = 192,
    flangeTop = 86,
    flangeBottom = 120
  const neckOuterL = 84,
    neckOuterR = 136,
    neckInnerL = 92,
    neckInnerR = 128,
    neckTop = 20
  const boreL = 100,
    boreR = 120
  const midY = (flangeTop + flangeBottom) / 2
  let inner = `
    <path d="M ${left} ${flangeTop} L ${right} ${flangeTop} L ${right} ${flangeBottom} L ${left} ${flangeBottom} Z" ${STROKE}/>
    <path d="M ${neckOuterL} ${flangeTop} L ${neckInnerL} ${neckTop} L ${neckInnerR} ${neckTop} L ${neckOuterR} ${flangeTop} Z" ${STROKE}/>
    <line x1="${boreL}" y1="${neckTop}" x2="${boreL}" y2="${flangeBottom}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
    <line x1="${boreR}" y1="${neckTop}" x2="${boreR}" y2="${flangeBottom}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
    <line x1="${(boreL + boreR) / 2}" y1="${neckTop - 8}" x2="${(boreL + boreR) / 2}" y2="${flangeBottom + 2}" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1 3" opacity="0.4"/>
    <rect x="${neckOuterL - 7}" y="${flangeTop - 4}" width="9" height="6" ${STROKE}/>
    <rect x="${neckOuterR - 2}" y="${flangeTop - 4}" width="9" height="6" ${STROKE}/>
    <circle cx="${left + 16}" cy="${midY}" r="4.5" ${STROKE}/>
    <circle cx="${right - 16}" cy="${midY}" r="4.5" ${STROKE}/>
  `
  inner += hDim(left, right, flangeBottom + 16, od)
  inner += hDim(left + 16, right - 16, flangeTop - 10, bc)
  inner += hDim(boreL, boreR, neckTop - 8, b)
  inner += vDim(right + 14, flangeTop, flangeBottom, t)
  inner += vDim(left - 14, neckTop, flangeBottom, h)
  return frame(inner, [
    [od, 'Diámetro exterior'],
    [bc, 'Diámetro de círculo de bulones (BC)'],
    [b, 'Diámetro de paso / bore'],
    [t, 'Espesor del cuerpo'],
    [h, 'Altura total'],
  ])
}

export const diagrams = {
  pipeCrossSection,
  annulusCrossSection,
  multiStringCrossSection,
  verticalCylinder,
  horizontalCylinder,
  slopedCylinder,
  rectTank,
  slopedTrapezoid,
  sphere,
  wallThickness,
  goosenecArc,
  reelSide,
  flangeSection,
}

export function diagramMarkup(spec) {
  if (!spec) return null
  const fn = diagrams[spec.kind]
  if (!fn) return null
  return fn(spec.labels || {})
}
