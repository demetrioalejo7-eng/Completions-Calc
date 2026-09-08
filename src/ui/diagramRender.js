import dagre from 'dagre'

const FONT_SIZE = 13
const LINE_HEIGHT = 1.35
const RANK_SEP = 64
const NODE_SEP = 26
const EDGE_LABEL_W = 30
const EDGE_LABEL_H = 18

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function measureText(text, width, weight) {
  const div = document.createElement('div')
  div.style.position = 'fixed'
  div.style.visibility = 'hidden'
  div.style.left = '-9999px'
  div.style.top = '0'
  div.style.width = width + 'px'
  div.style.fontSize = FONT_SIZE + 'px'
  div.style.lineHeight = String(LINE_HEIGHT)
  div.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  div.style.fontWeight = weight
  div.style.textAlign = 'center'
  div.textContent = text
  document.body.appendChild(div)
  const h = div.offsetHeight
  document.body.removeChild(div)
  return h
}

function sizeForNode(node) {
  if (node.type === 'decision') {
    const textW = 190
    const textH = measureText(node.text, textW, '600')
    return { textW, textH, w: Math.max(200, textW * 1.65), h: Math.max(120, textH * 2.5) }
  }
  if (node.type === 'start' || node.type === 'end') {
    const textW = 200
    const textH = measureText(node.text, textW, '600')
    return { textW, textH, w: textW + 44, h: Math.max(60, textH + 30) }
  }
  const textW = 210
  const textH = measureText(node.text, textW, '500')
  return { textW, textH, w: textW + 28, h: Math.max(52, textH + 24) }
}

function polylinePath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

function shapeMarkup(node, cx, cy, w, h) {
  const toneStroke = node.type === 'end' && node.tone === 'escalate' ? 'var(--text)' : 'var(--border)'
  const strokeWidth = node.type === 'end' && node.tone === 'escalate' ? 2.5 : 1.5
  const dash = node.type === 'decision' ? ' stroke-dasharray="5 4"' : ''
  if (node.type === 'decision') {
    const pts = [
      [cx, cy - h / 2],
      [cx + w / 2, cy],
      [cx, cy + h / 2],
      [cx - w / 2, cy],
    ]
      .map((p) => p.join(','))
      .join(' ')
    return `<polygon points="${pts}" fill="var(--bg-card)" stroke="${toneStroke}" stroke-width="${strokeWidth}"${dash}/>`
  }
  if (node.type === 'start' || node.type === 'end') {
    const r = h / 2
    return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="var(--bg-card)" stroke="${toneStroke}" stroke-width="${strokeWidth}"/>`
  }
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="8" ry="8" fill="var(--bg-card)" stroke="${toneStroke}" stroke-width="${strokeWidth}"/>`
}

export function buildDiagramSVG(contingency) {
  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({ rankdir: 'TB', nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 24, marginy: 24 })
  g.setDefaultEdgeLabel(() => ({}))

  const nodeIds = Object.keys(contingency.nodes)
  const sizes = {}
  for (const id of nodeIds) {
    const node = contingency.nodes[id]
    const size = sizeForNode(node)
    sizes[id] = size
    g.setNode(id, { width: size.w, height: size.h })
  }

  let edgeIdx = 0
  const edgeList = []
  for (const id of nodeIds) {
    const node = contingency.nodes[id]
    if (node.type === 'decision') {
      for (const branch of node.branches) {
        const name = `e${edgeIdx++}`
        g.setEdge(id, branch.to, { label: branch.label, width: EDGE_LABEL_W, height: EDGE_LABEL_H }, name)
        edgeList.push({ from: id, to: branch.to, label: branch.label, name })
      }
    } else if ((node.type === 'process' || node.type === 'start') && node.next) {
      const name = `e${edgeIdx++}`
      g.setEdge(id, node.next, {}, name)
      edgeList.push({ from: id, to: node.next, label: null, name })
    }
  }

  dagre.layout(g)
  const gi = g.graph()
  const totalW = Math.ceil(gi.width || 400)
  const totalH = Math.ceil(gi.height || 300)

  let markup = ''
  markup += `<marker id="cw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--text-dim)"/></marker>`

  // Edges (drawn first so nodes sit on top)
  for (const e of edgeList) {
    const edge = g.edge(e.from, e.to, e.name)
    const pts = edge.points
    markup += `<path d="${polylinePath(pts)}" fill="none" stroke="var(--text-dim)" stroke-width="1.4" marker-end="url(#cw-arrow)"/>`
    if (e.label) {
      const lx = edge.x
      const ly = edge.y
      markup += `<rect x="${lx - EDGE_LABEL_W / 2}" y="${ly - EDGE_LABEL_H / 2}" width="${EDGE_LABEL_W}" height="${EDGE_LABEL_H}" fill="var(--bg)"/>`
      markup += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text)">${escapeHtml(e.label)}</text>`
    }
  }

  // Nodes
  for (const id of nodeIds) {
    const node = contingency.nodes[id]
    const pos = g.node(id)
    const size = sizes[id]
    markup += shapeMarkup(node, pos.x, pos.y, pos.width, pos.height)
    const fx = pos.x - size.textW / 2
    const fy = pos.y - size.textH / 2
    const weight = node.type === 'decision' || node.type === 'end' ? 600 : 500
    markup += `<foreignObject x="${fx}" y="${fy}" width="${size.textW}" height="${size.textH}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:${FONT_SIZE}px;line-height:${LINE_HEIGHT};font-weight:${weight};color:var(--text);text-align:center;">${escapeHtml(node.text)}</div></foreignObject>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">${markup}</svg>`
  return { svg, width: totalW, height: totalH }
}
