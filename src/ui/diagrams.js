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

// Flange detail diagram with the ACTUAL dimension values baked into the
// drawing itself (OD/BC/T, and the bore when the size publishes one) —
// like the diagrams above, but driven by a specific flange row's real
// numbers rather than a calculator's symbolic input labels, so it's
// called directly from the flange browser (not through `calc.diagram`).
function fmtIn(v) {
  if (v == null) return '—'
  return v + '"'
}

// Flange cross-section drawing matching the manufacturer's own dimensional
// sheet layout: a welding-neck hub with the RTJ ring groove at its base,
// a tapped stud on one side (screws directly into the body — only one
// nut) and a through stud bolt on the other side (nut at both ends), plus
// the two small bolt-circle indicator holes — framed left/right by the
// same two stacked cotas columns the sheet itself uses (DIA/O.D./I.D./
// GROOVE DEPTH/MAX/DIA on the left; DIA/P.D./GROOVE WIDTH/BORE/MIN/RADIUS
// on the right). All values baked onto it come from the matching
// dimensional-spec entry (inches).
export function flangeSheetDiagram(entry) {
  const { size, spec: s } = entry
  const bodyL = 220,
    bodyR = 380,
    bodyTop = 260,
    bodyBottom = 320
  const hubOuterL = 268,
    hubOuterR = 332,
    hubInnerL = 286,
    hubInnerR = 314,
    hubTop = 128
  const boreL = 293,
    boreR = 307
  const midY = (bodyTop + bodyBottom) / 2
  const inner = `
    <path d="M ${bodyL} ${bodyTop} L ${bodyR} ${bodyTop} L ${bodyR} ${bodyBottom} L ${bodyL} ${bodyBottom} Z" ${STROKE}/>
    <path d="M ${hubOuterL} ${bodyTop} L ${hubInnerL} ${hubTop} L ${hubInnerR} ${hubTop} L ${hubOuterR} ${bodyTop} Z" ${STROKE}/>
    <line x1="${boreL}" y1="${hubTop}" x2="${boreL}" y2="${bodyBottom}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
    <line x1="${boreR}" y1="${hubTop}" x2="${boreR}" y2="${bodyBottom}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>
    <rect x="${hubOuterL - 9}" y="${bodyTop - 6}" width="11" height="8" ${STROKE}/>
    <rect x="${hubOuterR - 2}" y="${bodyTop - 6}" width="11" height="8" ${STROKE}/>
    <circle cx="${bodyL + 22}" cy="${midY}" r="6" ${STROKE}/>
    <circle cx="${bodyR - 22}" cy="${midY}" r="6" ${STROKE}/>
    <line x1="150" y1="70" x2="150" y2="380" ${STROKE}/>
    <rect x="137" y="54" width="26" height="18" ${STROKE}/>
    <text x="150" y="400" font-size="10" text-anchor="middle" fill="currentColor">Tap End Stud</text>
    <line x1="450" y1="50" x2="450" y2="400" ${STROKE}/>
    <rect x="437" y="34" width="26" height="18" ${STROKE}/>
    <rect x="437" y="398" width="26" height="18" ${STROKE}/>
    <text x="450" y="432" font-size="10" text-anchor="middle" fill="currentColor">Stud Bolt</text>
    ${text(30, 60, 'DIA. (OD)', { anchor: 'start', size: 11 })}
    ${text(30, 82, fmtIn(s.od), { anchor: 'start', size: 12 })}
    ${text(30, 110, 'O.D. anillo', { anchor: 'start', size: 11 })}
    ${text(30, 132, fmtIn(s.ringOD), { anchor: 'start', size: 12 })}
    ${text(30, 160, 'I.D. anillo', { anchor: 'start', size: 11 })}
    ${text(30, 182, fmtIn(s.ringID), { anchor: 'start', size: 12 })}
    ${text(30, 210, 'Profundidad de ranura', { anchor: 'start', size: 11 })}
    ${text(30, 232, fmtIn(s.grooveDepth), { anchor: 'start', size: 12 })}
    ${text(30, 260, 'Max.', { anchor: 'start', size: 11 })}
    ${text(30, 282, fmtIn(s.max), { anchor: 'start', size: 12 })}
    ${text(30, 310, 'Diámetro de referencia', { anchor: 'start', size: 11 })}
    ${text(30, 332, fmtIn(s.dia2), { anchor: 'start', size: 12 })}
    ${text(470, 60, 'DIA. (ref.)', { anchor: 'start', size: 11 })}
    ${text(470, 82, fmtIn(s.refDia), { anchor: 'start', size: 12 })}
    ${text(470, 110, 'P.D.', { anchor: 'start', size: 11 })}
    ${text(470, 132, fmtIn(s.pd), { anchor: 'start', size: 12 })}
    ${text(470, 160, 'Ancho de ranura', { anchor: 'start', size: 11 })}
    ${text(470, 182, fmtIn(s.grooveWidth), { anchor: 'start', size: 12 })}
    ${text(470, 210, 'Bore', { anchor: 'start', size: 11 })}
    ${text(470, 232, size + '"', { anchor: 'start', size: 12 })}
    ${text(470, 260, 'Min.', { anchor: 'start', size: 11 })}
    ${text(470, 282, fmtIn(s.min), { anchor: 'start', size: 12 })}
    ${text(470, 310, 'Radio', { anchor: 'start', size: 11 })}
    ${text(470, 332, fmtIn(s.radius), { anchor: 'start', size: 12 })}
  `
  return `<div class="dim-diagram flange-detail-diagram">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 440" class="dim-svg">${inner}</svg>
  </div>`
}

// Dynamic wellbore diagram showing where a hanging string's neutral point
// (zero axial force) falls. Unlike every diagram above — invoked from
// `calc.diagram`'s static input labels before compute() ever runs — this
// one is called directly from a calculator's compute() with the actual
// computed depths, because the picture's shape (heavy string in tension
// throughout, light string in compression throughout, or a genuine
// neutral point splitting the string into both zones) depends on the
// answer itself. Returns the same `.dim-diagram` markup as the rest, but
// with its own taller SVG (a vertical wellbore reads better tall).
function fmtFt(x) {
  return Math.round(x).toLocaleString('es-AR')
}

export function wellboreNeutralPointDiagram({ totalDepthFt, neutralDepthFt, regime, bhaLabel = 'BHA' }) {
  const top = 24,
    bottom = 290,
    cx = 110
  const depthToY = (d) => top + (bottom - top) * (Math.max(0, Math.min(totalDepthFt, d)) / totalDepthFt)
  const neutralY = regime === 'neutral' ? depthToY(neutralDepthFt) : null
  const tensionStroke = 'stroke="currentColor" stroke-width="5" fill="none"'
  const compressionStroke = 'stroke="currentColor" stroke-width="5" stroke-dasharray="3 5" fill="none" opacity="0.65"'

  let inner = `
    <line x1="70" y1="${top}" x2="150" y2="${top}" ${STROKE}/>
    <path d="M70 ${top} l10 -10 M90 ${top} l10 -10 M110 ${top} l10 -10 M130 ${top} l10 -10" stroke="currentColor" stroke-width="1" opacity="0.5"/>
  `
  if (regime === 'heavy') {
    inner += `<line x1="${cx}" y1="${top}" x2="${cx}" y2="${bottom}" ${tensionStroke}/>`
  } else if (regime === 'light') {
    inner += `<line x1="${cx}" y1="${top}" x2="${cx}" y2="${bottom}" ${compressionStroke}/>`
  } else {
    inner += `<line x1="${cx}" y1="${top}" x2="${cx}" y2="${neutralY}" ${tensionStroke}/>`
    inner += `<line x1="${cx}" y1="${neutralY}" x2="${cx}" y2="${bottom}" ${compressionStroke}/>`
    inner += `<line x1="50" y1="${neutralY}" x2="170" y2="${neutralY}" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"/>`
    inner += text(175, neutralY + 3, 'Punto neutro', { anchor: 'start', size: 10 })
    inner += text(175, neutralY + 15, `${fmtFt(neutralDepthFt)} ft`, { anchor: 'start', size: 10 })
  }
  inner += `<rect x="${cx - 10}" y="${bottom}" width="20" height="16" ${STROKE}/>`
  inner += text(cx, bottom + 32, bhaLabel, { size: 10 })
  inner += text(cx + 50, top + 4, '0 ft', { anchor: 'start', size: 10 })
  inner += text(cx + 50, bottom + 4, `${fmtFt(totalDepthFt)} ft`, { anchor: 'start', size: 10 })

  const legendPairs =
    regime === 'neutral'
      ? [
          ['—', 'Tensión (tramo pesado)'],
          ['┄', 'Compresión (tramo liviano, riesgo de pandeo)'],
        ]
      : regime === 'heavy'
        ? [['—', 'Toda la sarta en tensión (pesada): entra por gravedad, sin snubbing']]
        : [['┄', 'Toda la sarta en compresión (liviana): necesita snubbing en toda su longitud']]

  return `<div class="dim-diagram">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 340" class="well-diagram-svg">${inner}</svg>
    <p class="dim-legend">${legend(legendPairs)}</p>
  </div>`
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
}

export function diagramMarkup(spec) {
  if (!spec) return null
  const fn = diagrams[spec.kind]
  if (!fn) return null
  return fn(spec.labels || {})
}
