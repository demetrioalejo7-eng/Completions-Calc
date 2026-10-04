// Visor 3D de surveys (three.js, cargado bajo demanda).
// Ejes: x = Este, y = −TVD (arriba), z = −Norte (el Norte se aleja de la cámara).
// Varios pozos se ubican por la posición de su boca de pozo (offset en m
// respecto del primero) y la cota (las bocas más altas quedan más arriba).
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

function cssVar(el, name, fallback) {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}

function label(text, cls = '', color) {
  const div = document.createElement('div')
  div.className = `ctsim-3d-label ${cls}`
  div.textContent = text
  if (color) div.style.color = color
  return new CSS2DObject(div)
}

// wells: [{ name, traj: [{md,n,e,tvd}], offset: { n, e, z }, colorVar,
//           marks: { kop, lp }, plugs: [{ md, n, e, tvd, idx }], active }]
// (single-well callers may pass { traj, marks, plugs } instead)
// measures: [{ kind: 'curve' | 'lateral', a, b: {n,e,tvd} (offsets applied),
//              text }] → dimension lines between wells
// labels: { names, heads, marks, tvd, plugs, north, curve, lateral } → initial
//         visibility of each label group (setLabels() changes it later)
export const LABEL_GROUPS = ['names', 'heads', 'marks', 'tvd', 'plugs', 'north', 'curve', 'lateral']

export function mountSurvey3D(container, opts) {
  const vScale = opts.vScale || 1
  const wells = opts.wells || [{ name: '', traj: opts.traj, marks: opts.marks || {}, plugs: opts.plugs || [], offset: { n: 0, e: 0, z: 0 }, active: true }]
  const multi = wells.length > 1
  container.innerHTML = ''
  const width = container.clientWidth || 600
  const height = Math.max(320, Math.min(560, Math.round(width * 0.75)))
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(width, height)
  container.appendChild(renderer.domElement)
  const labels = new CSS2DRenderer()
  labels.setSize(width, height)
  labels.domElement.className = 'ctsim-3d-labels'
  container.appendChild(labels.domElement)

  const scene = new THREE.Scene()
  const colPlug = cssVar(container, '--ctsim-pooh', '#eb6834')
  const colGrid = cssVar(container, '--border', '#333333')
  const colText = cssVar(container, '--text-dim', '#9a9a9a')

  const P = (p, o) => new THREE.Vector3(p.e + o.e, -(p.tvd - o.z) * vScale, -(p.n + o.n))
  const all = wells.flatMap((w) => w.traj.map((p) => P(p, w.offset)))
  const box = new THREE.Box3().setFromPoints(all)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const span = Math.max(size.x, size.y, size.z, 100)

  const sphere = (pos, color, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshLambertMaterial({ color }))
    m.position.copy(pos)
    scene.add(m)
  }
  const groups = Object.fromEntries(LABEL_GROUPS.map((k) => [k, new THREE.Group()]))
  for (const g of Object.values(groups)) scene.add(g)
  const add = (pos, text, cls, color, cat) => {
    const l = label(text, cls, color)
    l.position.copy(pos)
    groups[cat].add(l)
  }

  // surface grid at the reference elevation
  const grid = new THREE.GridHelper(span * 1.2, 12, colGrid, colGrid)
  grid.position.set(center.x, 0, center.z)
  scene.add(grid)

  for (const w of wells) {
    const o = w.offset || { n: 0, e: 0, z: 0 }
    const color = cssVar(container, w.colorVar || '--ctsim-rih', '#2a78d6')
    const pts = w.traj.map((p) => P(p, o))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    const r = span * (multi && !w.active ? 0.003 : 0.004)
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(2000, pts.length * 2), r, 8, false), new THREE.MeshLambertMaterial({ color })))
    // plan projection (shadow of the well at the reference elevation)
    const shadow = new THREE.BufferGeometry().setFromPoints(w.traj.map((p) => new THREE.Vector3(p.e + o.e, 0, -(p.n + o.n))))
    const shadowLine = new THREE.Line(shadow, new THREE.LineDashedMaterial({ color: multi ? color : colText, dashSize: span * 0.01, gapSize: span * 0.01, transparent: true, opacity: multi ? 0.5 : 1 }))
    shadowLine.computeLineDistances()
    scene.add(shadowLine)
    const head = w.traj[0]
    const td = w.traj[w.traj.length - 1]
    sphere(P(head, o), color, span * 0.006)
    if (multi) {
      // wellheads of a pad are a few metres apart: one shared label (below),
      // each well is named at its TD
      add(P(td, o), w.name, 'well', color, 'names')
    } else {
      add(P(head, o), 'Boca de pozo', '', null, 'heads')
      add(P(td, o), `TD ${Math.round(td.md)} m`, '', null, 'names')
    }
    if (w.active || !multi) {
      if (w.marks?.kop) add(P(w.marks.kop, o), `KOP ${Math.round(w.marks.kop.md)} m`, '', null, 'marks')
      if (w.marks?.lp) add(P(w.marks.lp, o), `LP ${Math.round(w.marks.lp.md)} m`, '', null, 'marks')
    }
    const plugs = w.plugs || []
    for (const pl of plugs) {
      sphere(P(pl, o), multi ? color : colPlug, span * (multi ? 0.006 : 0.009))
      if (!multi || w.active) {
        const every = plugs.length <= 12 ? 1 : width < 600 ? 10 : plugs.length <= 25 ? 1 : 5
        if (pl.idx === 1 || pl.idx % every === 0) add(P(pl, o), `T${pl.idx}`, 'plug', null, 'plugs')
      }
    }
  }

  if (multi) {
    // label the wellheads once per cluster (heads within 3 % of the scene)
    const heads = wells.map((w) => P(w.traj[0], w.offset || { n: 0, e: 0, z: 0 }))
    const done = []
    for (const h of heads) {
      if (done.some((d) => d.distanceTo(h) < span * 0.03)) continue
      done.push(h)
      add(h, 'Bocas de pozo', '', null, 'heads')
    }
  }

  // vertical depth reference at the first (or active) wellhead
  const refW = wells.find((w) => w.active) || wells[0]
  const ro = refW.offset || { n: 0, e: 0, z: 0 }
  const tdTvd = Math.max(...wells.map((w) => w.traj[w.traj.length - 1].tvd - (w.offset?.z || 0) + ro.z))
  const ref = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ro.e, ro.z * vScale, -ro.n), new THREE.Vector3(ro.e, -(tdTvd - ro.z) * vScale, -ro.n)])
  scene.add(new THREE.Line(ref, new THREE.LineBasicMaterial({ color: colGrid })))
  for (let d = 1000; d < tdTvd; d += 1000) add(new THREE.Vector3(ro.e, -(d - ro.z) * vScale, -ro.n), `${d} m TVD`, 'dim', null, 'tvd')
  add(new THREE.Vector3(center.x, 0, center.z - span * 0.65), 'N', 'north', null, 'north')

  // dimension lines between wells (closest points in the curve / laterals)
  const Z = { n: 0, e: 0, z: 0 }
  const colMeasure = { curve: cssVar(container, '--text', '#222222'), lateral: cssVar(container, '--text', '#222222') }
  for (const m of opts.measures || []) {
    const a = P(m.a, Z)
    const b = P(m.b, Z)
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineDashedMaterial({ color: colMeasure[m.kind], dashSize: span * 0.006, gapSize: span * 0.004 }))
    line.computeLineDistances()
    groups[m.kind].add(line)
    for (const q of [a, b]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(span * 0.004, 12, 8), new THREE.MeshBasicMaterial({ color: colMeasure[m.kind] }))
      dot.position.copy(q)
      groups[m.kind].add(dot)
    }
    add(a.clone().add(b).multiplyScalar(0.5), m.text, `measure ${m.kind}`, null, m.kind)
  }
  function setLabels(vis) {
    for (const k of LABEL_GROUPS) groups[k].visible = vis?.[k] !== false
  }
  setLabels(opts.labels)

  scene.add(new THREE.AmbientLight(0xffffff, 1.4))
  const dir = new THREE.DirectionalLight(0xffffff, 1.6)
  dir.position.set(1, 2, 1)
  scene.add(dir)

  const camera = new THREE.PerspectiveCamera(40, width / height, span * 0.001, span * 20)
  camera.position.set(center.x + span * 1.45, center.y + span * 0.7, center.z + span * 1.45)
  const controls = new OrbitControls(camera, labels.domElement)
  controls.target.copy(center)
  controls.enableDamping = true
  controls.update()

  let raf = 0
  const loop = () => {
    controls.update()
    renderer.render(scene, camera)
    labels.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  loop()

  const views = {
    iso: () => camera.position.set(center.x + span * 1.45, center.y + span * 0.7, center.z + span * 1.45),
    plan: () => camera.position.set(center.x, span * 2.2, center.z + 0.001),
    section: () => {
      // look perpendicular to the average azimuth of the laterals
      let n = 0
      let e = 0
      for (const w of wells) {
        const last = w.traj[w.traj.length - 1]
        n += last.n
        e += last.e
      }
      const az = Math.atan2(e, n)
      camera.position.set(center.x + Math.cos(az) * span * 1.8, center.y, center.z + Math.sin(az) * span * 1.8)
    },
  }
  function setView(name) {
    views[name]()
    controls.target.copy(center)
    controls.update()
  }

  const onResize = () => {
    const w = container.clientWidth
    if (!w) return
    const h = Math.max(320, Math.min(560, Math.round(w * 0.75)))
    renderer.setSize(w, h)
    labels.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  return {
    setView,
    setLabels,
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      scene.traverse((o) => {
        o.geometry?.dispose?.()
        o.material?.dispose?.()
      })
    },
  }
}
