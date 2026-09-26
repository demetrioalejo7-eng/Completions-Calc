// Visor 3D del survey (three.js, cargado bajo demanda).
// Ejes: x = Este, y = −TVD (arriba), z = −Norte (el Norte se aleja de la cámara).
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

function cssVar(el, name, fallback) {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}

function label(text, cls = '') {
  const div = document.createElement('div')
  div.className = `ctsim-3d-label ${cls}`
  div.textContent = text
  return new CSS2DObject(div)
}

// traj: [{md,n,e,tvd}] ; marks: { kop, lp } (points) ; plugs: [{ md, n, e, tvd, idx }]
export function mountSurvey3D(container, { traj, marks = {}, plugs = [], vScale = 1 }) {
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
  const colWell = cssVar(container, '--ctsim-rih', '#2a78d6')
  const colPlug = cssVar(container, '--ctsim-pooh', '#eb6834')
  const colGrid = cssVar(container, '--border', '#333333')
  const colText = cssVar(container, '--text-dim', '#9a9a9a')

  const P = (p) => new THREE.Vector3(p.e, -p.tvd * vScale, -p.n)
  const pts = traj.map(P)
  const box = new THREE.Box3().setFromPoints(pts)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const span = Math.max(size.x, size.y, size.z, 100)

  // trajectory as a tube (visible at any zoom)
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const tube = new THREE.TubeGeometry(curve, Math.min(2000, pts.length * 2), span * 0.004, 8, false)
  scene.add(new THREE.Mesh(tube, new THREE.MeshLambertMaterial({ color: colWell })))

  // surface grid & plan projection (shadow of the well at surface)
  const grid = new THREE.GridHelper(span * 1.2, 12, colGrid, colGrid)
  grid.position.set(center.x, 0, center.z)
  scene.add(grid)
  const shadow = new THREE.BufferGeometry().setFromPoints(traj.map((p) => new THREE.Vector3(p.e, 0, -p.n)))
  const shadowLine = new THREE.Line(shadow, new THREE.LineDashedMaterial({ color: colText, dashSize: span * 0.01, gapSize: span * 0.01 }))
  shadowLine.computeLineDistances()
  scene.add(shadowLine)

  // vertical depth reference at the wellhead
  const tdTvd = traj[traj.length - 1].tvd
  const ref = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -tdTvd * vScale, 0)])
  scene.add(new THREE.Line(ref, new THREE.LineBasicMaterial({ color: colGrid })))
  for (let d = 1000; d < tdTvd; d += 1000) {
    const l = label(`${d} m TVD`, 'dim')
    l.position.set(0, -d * vScale, 0)
    scene.add(l)
  }

  // markers
  const sphere = (p, color, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshLambertMaterial({ color }))
    m.position.copy(P(p))
    scene.add(m)
    return m
  }
  const add = (p, text, cls) => {
    const l = label(text, cls)
    l.position.copy(P(p))
    scene.add(l)
  }
  add(traj[0], 'Boca de pozo')
  if (marks.kop) add(marks.kop, `KOP ${Math.round(marks.kop.md)} m`)
  if (marks.lp) add(marks.lp, `LP ${Math.round(marks.lp.md)} m`)
  add(traj[traj.length - 1], `TD ${Math.round(traj[traj.length - 1].md)} m`)
  const nLabel = label('N', 'north')
  nLabel.position.set(center.x, 0, center.z - span * 0.65)
  scene.add(nLabel)
  for (const pl of plugs) {
    sphere(pl, colPlug, span * 0.009)
    const every = plugs.length <= 12 ? 1 : width < 600 ? 10 : plugs.length <= 25 ? 1 : 5
    if (pl.idx === 1 || pl.idx % every === 0) add(pl, `T${pl.idx}`, 'plug')
  }

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
      // look perpendicular to the average azimuth of the lateral
      const last = traj[traj.length - 1]
      const az = Math.atan2(last.e, last.n)
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
