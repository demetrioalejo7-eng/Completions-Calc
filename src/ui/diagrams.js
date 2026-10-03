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

// Flange dimensional sheet, drawn in the same coordinate system and layout
// as the manufacturer's sheet (940×510): a full section through the flange
// axis (axis vertical), so each wall appears once on either side of the
// white bore — flange plate on top, hub hanging below it, the ring groove
// cut into each wall's top face, a stud with its nut in the left bolt hole
// and the right bolt hole empty. Values sit in boxes that alternate
// between a left and a right column, one dimension per row, each on its
// own dimension line between extension lines dropped from the real
// feature. Black on white regardless of app theme, like the printed sheet.
function fmtIn(v) {
  if (v == null) return '—'
  return v + '"'
}

const FL_INK = '#000'
const FL_GRAY = '#c6c6c6'
const FL_FONT = 'Arial, Helvetica, sans-serif'

function flText(x, y, s, { anchor = 'start', size = 12.5, bold = false } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${FL_INK}"${bold ? ' font-weight="bold"' : ''}>${s}</text>`
}

function flTextW(s, size = 12.5) {
  return String(s).length * size * 0.62
}

function flLine(x1, y1, x2, y2, extra = '') {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${FL_INK}" stroke-width="1"${extra}/>`
}

// Filled arrowhead with its tip at (x, y), pointing l / r / u / d.
function flArrow(x, y, dir) {
  const L = 9,
    W = 3.5
  const pts = {
    l: [[x, y], [x + L, y - W], [x + L, y + W]],
    r: [[x, y], [x - L, y - W], [x - L, y + W]],
    u: [[x, y], [x - W, y + L], [x + W, y + L]],
    d: [[x, y], [x - W, y - L], [x + W, y - L]],
  }[dir]
  return `<path d="M ${pts.map((p) => p.join(' ')).join(' L ')} Z" fill="${FL_INK}"/>`
}

function flBox(x, y, w, h, value, bold = false) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${FL_INK}" stroke-width="1"/>
    ${flText(x + w / 2, y + h / 2 + 4.5, value, { anchor: 'middle', size: 12, bold })}`
}

// Value box + label in the left (box at x=305) or right (box at x=485)
// column, and a horizontal dimension line from x1 to x2 (arrowheads at
// both ends, pointing outward to the features) broken where the box and
// label sit.
const COL_X = { L: 305, R: 485 }
const BOX_W = 90,
  BOX_H = 22
function flDimRow(col, y, value, label, x1, x2, { bold = false } = {}) {
  const bx = COL_X[col]
  const lx = bx + BOX_W + 10
  const gapA = bx
  const gapB = lx + flTextW(label) + 6
  let out = ''
  if (x1 != null && x2 != null) {
    if (x1 < gapA) out += flLine(x1, y, Math.min(x2, gapA), y)
    if (x2 > gapB) out += flLine(Math.max(x1, gapB), y, x2, y)
    out += flArrow(x1, y, 'l') + flArrow(x2, y, 'r')
  }
  out += flBox(bx, y - BOX_H / 2, BOX_W, BOX_H, value, bold)
  out += flText(lx, y + 4.5, label)
  return out
}

function flExt(x, yTop, yBottom) {
  return flLine(x, yTop, x, yBottom)
}

export function flangeSheetDiagram(entry) {
  const { size, pressureLabel, type, row, spec: s } = entry
  const M = (x) => 940 - x // mirror about the flange axis (x = 470)
  // Rows the sheet leaves blank for this flange (6B has no raised-face
  // diameter / max raised-face height) are left off rather than invented.
  const hasRF = s.refDia != null
  const hasMax = s.max != null

  // --- Section geometry (left wall; right wall is its mirror) ---
  const FACE = 155, // top (ring-groove) face
    BACK = 280, // back face of the flange plate
    HUB_BOT = 330, // end of the hub
    GROOVE_BOT = 172
  const OD = 20, // flange outside diameter edge
    BH_L = 62, // bolt hole edges
    BH_R = 108,
    BOLT_C = 85, // bolt centerline
    RF = 122, // raised-face diameter edge
    G_OD = 150, // ring groove O.D.
    G_PD = 167.5, // ring groove pitch diameter
    G_ID = 185, // ring groove I.D.
    HUB = 152, // hub O.D.
    BORE = 237, // bore wall
    THK_X = 130 // plate-thickness dimension

  const leftWall = `M ${OD} 165 L 30 ${FACE} L ${G_OD} ${FACE} L 156 ${GROOVE_BOT} L 179 ${GROOVE_BOT} L ${G_ID} ${FACE}
    L 229 ${FACE} L ${BORE} 163 L ${BORE} ${HUB_BOT} L ${HUB} ${HUB_BOT} L ${HUB} 293 Q ${HUB} ${BACK} 139 ${BACK}
    L 30 ${BACK} L ${OD} 270 Z`
  const rightWall = `M ${M(OD)} 165 L ${M(30)} ${FACE} L ${M(G_OD)} ${FACE} L ${M(156)} ${GROOVE_BOT} L ${M(179)} ${GROOVE_BOT} L ${M(G_ID)} ${FACE}
    L ${M(229)} ${FACE} L ${M(BORE)} 163 L ${M(BORE)} ${HUB_BOT} L ${M(HUB)} ${HUB_BOT} L ${M(HUB)} 293 Q ${M(HUB)} ${BACK} ${M(139)} ${BACK}
    L ${M(30)} ${BACK} L ${M(OD)} 270 Z`

  const section = `
    <path d="${leftWall}" fill="${FL_GRAY}" stroke="${FL_INK}" stroke-width="1.2"/>
    <path d="${rightWall}" fill="${FL_GRAY}" stroke="${FL_INK}" stroke-width="1.2"/>
    ${flLine(BORE, 163, M(BORE), 163)}
    ${flLine(BORE, HUB_BOT, M(BORE), HUB_BOT)}
    <rect x="${BH_L}" y="${FACE}" width="${BH_R - BH_L}" height="${BACK - FACE}" fill="#fff"/>
    ${flLine(BH_L, FACE, BH_L, BACK)}${flLine(BH_R, FACE, BH_R, BACK)}
    <rect x="${M(BH_R)}" y="${FACE}" width="${BH_R - BH_L}" height="${BACK - FACE}" fill="#fff"/>
    ${flLine(M(BH_L), FACE, M(BH_L), BACK)}${flLine(M(BH_R), FACE, M(BH_R), BACK)}
    ${hasRF ? `<path d="M ${OD} 175 L 112 175 Q ${RF} 175 ${RF} 165 L ${RF} ${FACE}" fill="none" stroke="${FL_INK}" stroke-width="1" stroke-dasharray="5 3"/>
    <path d="M ${M(OD)} 175 L ${M(112)} 175 Q ${M(RF)} 175 ${M(RF)} 165 L ${M(RF)} ${FACE}" fill="none" stroke="${FL_INK}" stroke-width="1" stroke-dasharray="5 3"/>` : ''}
  `

  // Stud standing in the left bolt hole (rounded end above the face),
  // nut against the back face; right bolt hole left empty.
  const stud = `
    <path d="M 67 ${BACK} L 67 100 Q 67 90 77 90 L 93 90 Q 103 90 103 100 L 103 ${BACK}" fill="#fff" stroke="${FL_INK}" stroke-width="1.2"/>
    <rect x="49" y="${BACK}" width="72" height="38" fill="#fff" stroke="${FL_INK}" stroke-width="1.2"/>
    ${flLine(67, BACK, 67, BACK + 38)}${flLine(103, BACK, 103, BACK + 38)}
  `
  const centerDash = ' stroke-dasharray="14 3 3 3"'
  const centerlines = `
    ${flLine(BOLT_C, 80, BOLT_C, 497, centerDash)}
    ${flLine(M(BOLT_C), 140, M(BOLT_C), 290, centerDash)}
    ${flLine(M(BOLT_C), 410, M(BOLT_C), 497, centerDash)}
  `

  // --- Dimension rows (same order, column and row spacing as the sheet) ---
  const ext = `
    ${flExt(OD, 44, FACE + 8)}${flExt(M(OD), 44, FACE + 8)}
    ${hasRF ? flExt(RF, 62, FACE) + flExt(M(RF), 62, FACE) : ''}
    ${flExt(G_OD, 80, FACE)}${flExt(M(G_OD), 80, FACE)}
    ${flExt(G_PD, 97, FACE + 6)}${flExt(M(G_PD), 97, FACE + 6)}
    ${flExt(G_ID, 114, FACE)}${flExt(M(G_ID), 114, FACE)}
  `
  const isBX = type === '6bx'
  const dims = `
    ${flDimRow('L', 52, fmtIn(s.od), 'DIA.', OD, M(OD))}
    ${hasRF ? flDimRow('R', 70, fmtIn(s.refDia), 'DIA.', RF, M(RF)) : ''}
    ${flDimRow('L', 88, fmtIn(s.ringOD), 'O.D.', G_OD, M(G_OD))}
    ${flDimRow('R', 105, fmtIn(s.pd), 'P.D.', G_PD, M(G_PD))}
    ${flDimRow('L', 122, fmtIn(s.ringID), 'I.D.', G_ID, M(G_ID))}

    ${flDimRow('R', 140, fmtIn(s.grooveWidth), 'GROOVE WIDTH', null, null)}
    ${flLine(COL_X.R + BOX_W + 10 + flTextW('GROOVE WIDTH') + 6, 140, M(G_ID), 140)}${flArrow(M(G_ID), 140, 'r')}
    ${flLine(M(G_OD) + 22, 140, M(G_OD), 140)}${flArrow(M(G_OD), 140, 'l')}

    ${flDimRow('L', 190, fmtIn(s.grooveDepth), 'GROOVE DEPTH', null, null)}
    ${flLine(COL_X.L + BOX_W + 10 + flTextW('GROOVE DEPTH') + 6, 190, M(G_PD), 190)}
    ${flLine(M(G_PD), 190, M(G_PD), GROOVE_BOT)}${flArrow(M(G_PD), GROOVE_BOT, 'u')}
    ${flLine(M(G_PD) - 16, 146, M(G_PD), FACE)}${flArrow(M(G_PD), FACE, 'd')}

    ${flDimRow('R', 213, `${size}"`, 'BORE', BORE, M(BORE))}

    ${hasMax ? `${flDimRow('L', 241, fmtIn(s.max), 'MAX.', null, null)}
    ${flLine(COL_X.L + BOX_W + 10 + flTextW('MAX.') + 6, 241, 808, 241)}${flLine(808, 241, 845, 202)}
    ${flLine(845, 120, 845, FACE)}${flArrow(845, FACE, 'd')}
    ${flLine(845, 290, 845, 175)}${flArrow(845, 175, 'u')}` : ''}

    ${flDimRow('R', 273, fmtIn(s.min), 'MIN.', null, null)}
    ${flLine(COL_X.R, 273, BORE, 273)}${flLine(BORE, 273, THK_X, 222)}
    ${flLine(THK_X, FACE, THK_X, BACK)}${flArrow(THK_X, FACE, 'u')}${flArrow(THK_X, BACK, 'd')}

    ${flDimRow('L', 305, fmtIn(s.dia2), 'DIA.', HUB, M(HUB))}

    ${flDimRow('R', 345, fmtIn(s.radius), 'RADIUS', null, null)}
    <path d="M ${COL_X.R + BOX_W + 10 + flTextW('RADIUS') + 6} 345 L 810 345 L 810 302 L ${M(HUB) + 5} 286" fill="none" stroke="${FL_INK}" stroke-width="1"/>
    ${flArrow(M(HUB) + 4, 285, 'u')}
  `

  // --- Header ---
  const header = `
    ${flBox(20, 8, 90, 22, s.ringStd ?? '-', true)}
    ${flText(120, 23, 'STANDARD RING NUMBER', { size: 13 })}
    ${flText(148, 39, `Flange Size: ${String(size).replace(' ', '-')}"`, { size: 11 })}
    ${flBox(305, 8, 90, 22, s.ringPE ?? '-', true)}
    ${flText(405, 23, 'PRESSURE ENERGIZED RING NUMBER', { size: 13 })}
    ${flText(660, 39, `Pressure Rating: ${pressureLabel}`, { anchor: 'end', size: 11 })}
    ${flBox(672, 8, 90, 22, fmtIn(s.face))}
    ${flText(772, 21, 'FACE-TO-FACE', { size: 13, bold: true })}
    ${flText(772, 41, 'API GATE VALVE LENGTH', { size: 12 })}
  `

  // --- Lower callouts ---
  const legendBox = `
    <rect x="152" y="337" width="133" height="32" fill="${FL_GRAY}"/>
    ${flText(158, 350, '** NOT API', { size: 12 })}
    ${flText(158, 364, '* OBSOLETE FLANGE', { size: 12 })}
  `
  const raisedFaceNote = isBX
    ? ['1/8" MIN. RAISED', 'FACE ON', 'OPEN-FACED', 'FLANGES WITH', 'BX GROOVES.', 'RAISED FACE', 'MAY BE OMITTED', 'ON STUDDED', 'FLANGES.']
        .map((l, i) => flText(830, 302 + i * 12.5, l, { size: 10.5 }))
        .join('')
    : ''
  const studLeaders = `
    <path d="M 112 323 L 112 377 L 452 377 L 462 391" fill="none" stroke="${FL_INK}" stroke-width="1"/>${flArrow(112, 321, 'u')}
    <path d="M 66 323 L 66 392 L 440 392 L 487 455" fill="none" stroke="${FL_INK}" stroke-width="1"/>${flArrow(66, 321, 'u')}
  `
  const brackets = `
    ${flText(566, 399, 'TAP END STUD', { anchor: 'end', size: 13 })}
    ${flText(570, 405, '{', { size: 32 })}
    ${flBox(595, 373, 90, 22, fmtIn(s.tapStud.dia), true)}
    ${flBox(595, 396, 90, 22, fmtIn(s.tapStud.len), true)}
    ${flText(695, 388, 'DIAMETER')}
    ${flText(695, 411, 'LENGTH')}
    ${flText(690, 429, '(ADD AMOUNT OF RAISED FACE)', { size: 8.5 })}
    ${flText(566, 463, 'STUD BOLT', { anchor: 'end', size: 13 })}
    ${flText(570, 469, '{', { size: 32 })}
    ${flBox(595, 437, 90, 22, fmtIn(s.studBolt.dia), true)}
    ${flBox(595, 460, 90, 22, fmtIn(s.studBolt.len), true)}
    ${flText(695, 452, 'DIAMETER')}
    ${flText(695, 475, 'LENGTH')}
  `
  const boltInfo = `
    ${flText(350, 417, 'HEX NUT SIZE ACROSS FLATS', { anchor: 'end' })}
    ${flBox(360, 403, 70, 22, fmtIn(s.hexNut))}
    ${flText(350, 449, 'NUMBER OF HOLES', { anchor: 'end' })}
    ${flBox(360, 434, 70, 22, row.n != null ? String(row.n) : '—', true)}
    ${flText(350, 472, 'BOLT HOLE SIZE', { anchor: 'end' })}
    ${flBox(360, 457, 70, 22, fmtIn(s.boltHoleSize))}
    ${flText(350, 496, 'BOLT CIRCLE', { anchor: 'end' })}
    ${flBox(360, 480, 70, 22, fmtIn(s.boltCircle))}
    ${flLine(BOLT_C, 491, 350 - flTextW('BOLT CIRCLE') - 6, 491)}${flArrow(BOLT_C, 491, 'l')}
    ${flLine(430, 491, M(BOLT_C), 491)}${flArrow(M(BOLT_C), 491, 'r')}
  `

  const inner =
    `<rect x="0" y="0" width="940" height="510" fill="#fff"/>` +
    section + stud + centerlines + ext + dims + header + legendBox + raisedFaceNote + studLeaders + brackets + boltInfo +
    `<rect x="2" y="2" width="936" height="506" fill="none" stroke="#9a9a9a" stroke-width="1"/>`
  return `<div class="flange-sheet flange-detail-diagram">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 510" class="flange-sheet-svg" font-family="${FL_FONT}">${inner}</svg>
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
function fmtM(ft) {
  return Math.round(ft / 3.28084).toLocaleString('es-AR') + ' m'
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
    inner += text(175, neutralY + 15, fmtM(neutralDepthFt), { anchor: 'start', size: 10 })
  }
  inner += `<rect x="${cx - 10}" y="${bottom}" width="20" height="16" ${STROKE}/>`
  inner += text(cx, bottom + 32, bhaLabel, { size: 10 })
  inner += text(cx + 50, top + 4, '0 m', { anchor: 'start', size: 10 })
  inner += text(cx + 50, bottom + 4, fmtM(totalDepthFt), { anchor: 'start', size: 10 })

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
