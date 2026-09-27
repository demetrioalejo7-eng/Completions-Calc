// Coiled Tubing — tubing forces model (TFM) for RIH / POOH surface weight.
//
// Physics follows the soft-string model described in the CTES Tech Note
// "Basic Tubing Forces Model (TFM) Calculation" (Newman, Bhalla &
// McSpadden, 2003), which is the basis of Orpheus / Cerberus:
//
//   dF/ds = W_B·cosθ ± µ·F_N                        (integrated bottom → surface)
//   F_N   = √[(F·sinθ·dφ/ds)² + (W_B·sinθ − F·dθ/ds)²]   (per unit length, s = MD)
//   W_B   = w_air + ξ_i·A_i − ξ_o·A_o                (buoyed weight, effective force)
//
// with helical buckling in compression (Chen: F_hel = 2√2·√(EI·F_N/r_c)),
// the extra helix wall contact r_c·F²/(4EI) (Lubinski) and the surface
// reading of Eq 15-17:
//
//   Weight = F_E(below stripper) − WHP·A_o ∓ F_stripper − RBT
//
// The stripper term is signed by the physics (friction opposes motion:
// it lowers the reading in RIH and raises it in POOH), which is what the
// field data shows (POOH reads ~2·F_stripper above RIH at surface).
//
// On top of the textbook model this adds the empirical terms calibrated
// against field runs (see tools/ct-calibration): a pipe-speed dependence
// of the friction factor, and the ERT (extended-reach tool) friction
// reduction expressed as lbf per bpm pumped.
//
// Units: inputs in field units as labelled (m, in, ppg, psi, bpm, m/min,
// lbf). Internally lengths are in ft, forces in lbf.

const M_TO_FT = 3.28084
const STEEL_DENSITY = 0.2836 // lb/in³
const STEEL_E = 27e6 // psi (CT steel, same value used by CTES)
const PSI_PER_FT_PER_PPG = 0.051948
const DEG = Math.PI / 180

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

// Parse survey rows ([md, inc, azi] in m / deg) into a clean, sorted list
// starting at MD 0. Duplicated MDs keep the last row.
export function normalizeSurvey(rows) {
  const clean = rows
    .map((r) => (Array.isArray(r) ? r : [r.md, r.inc, r.azi]).map(Number))
    .filter((r) => r.length >= 3 && r.every(Number.isFinite))
    .sort((a, b) => a[0] - b[0])
  const out = []
  for (const r of clean) {
    if (out.length && Math.abs(out[out.length - 1][0] - r[0]) < 1e-6) out[out.length - 1] = r
    else out.push(r)
  }
  if (!out.length) throw new Error('El survey no tiene estaciones válidas (MD, Inc, Az).')
  if (out[0][0] > 0) out.unshift([0, 0, out[0][2]])
  return out
}

function unitVector(inc, azi) {
  const i = inc * DEG
  const a = azi * DEG
  return [Math.sin(i) * Math.cos(a), Math.sin(i) * Math.sin(a), Math.cos(i)]
}

// Minimum-curvature interpolation of inclination/azimuth at MD (m).
function interpStation(s1, s2, md) {
  const [md1, inc1, az1] = s1
  const [md2, inc2, az2] = s2
  if (md2 - md1 < 1e-9) return [md, inc2, az2]
  const f = (md - md1) / (md2 - md1)
  const t1 = unitVector(inc1, az1)
  const t2 = unitVector(inc2, az2)
  const dot = Math.min(1, Math.max(-1, t1[0] * t2[0] + t1[1] * t2[1] + t1[2] * t2[2]))
  const dl = Math.acos(dot)
  let t
  if (dl < 1e-6) {
    t = t1.map((v, k) => v + f * (t2[k] - v))
  } else {
    const a = Math.sin((1 - f) * dl) / Math.sin(dl)
    const b = Math.sin(f * dl) / Math.sin(dl)
    t = t1.map((v, k) => a * v + b * t2[k])
  }
  const n = Math.hypot(t[0], t[1], t[2])
  const inc = Math.acos(Math.min(1, Math.max(-1, t[2] / n))) / DEG
  let azi = Math.atan2(t[1], t[0]) / DEG
  if (azi < 0) azi += 360
  // keep azimuth of the upper station while the hole is vertical
  if (inc < 1e-4) azi = az1
  return [md, inc, azi]
}

// Resample the survey on a uniform MD grid (step in m) and precompute per
// segment: mid inclination, dθ/ds and sinθ·dφ/ds (rad/ft), cosθ, TVD.
export function buildWellPath(surveyRows, stepM = 10) {
  const st = normalizeSurvey(surveyRows)
  const tdM = st[st.length - 1][0]
  const nodes = []
  let j = 0
  for (let md = 0; md <= tdM + 1e-9; md += stepM) {
    while (j < st.length - 2 && st[j + 1][0] < md) j++
    nodes.push(interpStation(st[j], st[j + 1] || st[j], md))
  }
  if (nodes[nodes.length - 1][0] < tdM - 1e-6) nodes.push(st[st.length - 1])
  const segs = []
  let tvd = 0
  for (let k = 0; k < nodes.length - 1; k++) {
    const [md1, inc1, az1] = nodes[k]
    const [md2, inc2, az2] = nodes[k + 1]
    const dsFt = (md2 - md1) * M_TO_FT
    let dAz = az2 - az1
    if (dAz > 180) dAz -= 360
    if (dAz < -180) dAz += 360
    const incMid = ((inc1 + inc2) / 2) * DEG
    const t1 = unitVector(inc1, az1)
    const t2 = unitVector(inc2, az2)
    tvd += ((t1[2] + t2[2]) / 2) * (md2 - md1)
    segs.push({
      top: md1,
      bot: md2,
      dsFt,
      sinI: Math.sin(incMid),
      cosI: Math.cos(incMid),
      dIncDs: ((inc2 - inc1) * DEG) / dsFt,
      dAzDs: (dAz * DEG) / dsFt,
      tvdBot: tvd,
      incDeg: (inc1 + inc2) / 2,
    })
  }
  return { tdM, segs, stations: st }
}

// Landing point (first station with inc ≥ 80°) and kick-off point (last
// station above the LP with inc < 10°), in m MD.
export function kopLp(surveyRows) {
  const st = normalizeSurvey(surveyRows)
  const iLp = st.findIndex((r) => r[1] >= 80)
  if (iLp < 0) return { kop: null, lp: null }
  let iKop = iLp
  while (iKop > 0 && st[iKop][1] >= 10) iKop--
  return { kop: st[iKop][0], lp: st[iLp][0] }
}

// ---------------------------------------------------------------------------
// String
// ---------------------------------------------------------------------------

// sections: [{ length (m), wallStart (in), wallEnd (in) }] listed from the
// CORE end (reel) to the FREE end (downhole). Tapered transitions are linear.
// Returns a lookup by distance from the free end (m).
export function buildString({ od, sections }) {
  if (!sections || !sections.length) throw new Error('La sarta no tiene secciones.')
  const fromFree = [...sections].reverse().map((s) => ({
    length: Number(s.length),
    // walking from the free end the taper is reversed
    wA: Number(s.wallEnd ?? s.wallStart),
    wB: Number(s.wallStart),
  }))
  const total = fromFree.reduce((a, s) => a + s.length, 0)
  function wallAt(xFromFree) {
    let acc = 0
    for (const s of fromFree) {
      if (xFromFree <= acc + s.length) {
        const f = s.length > 0 ? (xFromFree - acc) / s.length : 0
        return s.wA + f * (s.wB - s.wA)
      }
      acc += s.length
    }
    return fromFree[fromFree.length - 1].wB
  }
  return { od: Number(od), totalLength: total, wallAt }
}

export function tubeProps(od, wall) {
  const id = od - 2 * wall
  const Ao = (Math.PI / 4) * od * od
  const Ai = (Math.PI / 4) * id * id
  const As = Ao - Ai
  const I = (Math.PI / 64) * (od ** 4 - id ** 4)
  return { od, id, Ao, Ai, As, I, wAir: As * STEEL_DENSITY * 12 }
}

// ---------------------------------------------------------------------------
// Hydraulics (only what the force balance needs)
// ---------------------------------------------------------------------------

// Frictional pressure gradient of water-like fluid in the CT–casing annulus
// (psi/ft), Fanning friction (Blasius turbulent / 16/Re laminar) on the
// hydraulic diameter, reduced by the friction-reducer drag reduction.
export function annularFrictionGradient({ rateBpm, casingId, od, densityPpg, viscosityCp = 1, dragReduction = 0 }) {
  if (!(rateBpm > 0)) return 0
  const dh = casingId - od // in
  if (dh <= 0) return 0
  const areaIn2 = (Math.PI / 4) * (casingId ** 2 - od ** 2)
  const qFt3s = (rateBpm * 5.614583) / 60
  const v = qFt3s / (areaIn2 / 144) // ft/s
  const rho = densityPpg * 7.48052 // lbm/ft³
  const mu = viscosityCp * 6.7197e-4 // lbm/(ft·s)
  const re = (rho * v * (dh / 12)) / mu
  const f = re < 2100 ? 16 / re : 0.0791 / Math.pow(re, 0.25)
  const dpdl = (2 * f * rho * v * v) / (32.174 * (dh / 12)) / 144 // psi/ft
  return dpdl * (1 - dragReduction)
}

// ---------------------------------------------------------------------------
// Tubing forces
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL = {
  // Empirical terms (overwritten by the calibrated set in ctsim/calibration.js)
  speedRef: 5, // m/min at which µ equals the input value
  speedCoefRIH: 0, // dµ/µ per ln(v/vRef)
  speedCoefPOOH: 0,
  // speed-dependent drag (opposes motion): lbf per (m/min) per 1000 m of CT
  // in the hole (viscous / dynamic-friction like), plus a surface term in
  // lbf per (m/min) (stripper / injector dynamics).
  speedDragRIH: 0,
  speedDragPOOH: 0,
  speedSurfRIH: 0,
  speedSurfPOOH: 0,
  lateralMuFactorRIH: 1, // µ multiplier where inclination > lateralIncDeg
  lateralMuFactorPOOH: 1,
  lateralIncDeg: 80,
  ertPoohEfficiency: 0.5, // fraction of the RIH ERT benefit also felt in POOH
  ertZoneM: 1500, // length above the BHA over which the ERT reduces drag
  frDragReduction: 0.5, // slickwater friction reducer, annular hydraulics only
  lockupForce: 150000, // lbf compression treated as numerical lock-up
}

function frictionFactor(mu, dir, speedMmin, model) {
  const k = dir === 'RIH' ? model.speedCoefRIH : model.speedCoefPOOH
  if (!k || !(speedMmin > 0)) return mu
  return mu * Math.max(0.2, 1 + k * Math.log(speedMmin / model.speedRef))
}

// Effective force profile for the CT end at depth `depthM`, moving `dir`.
// Returns surface effective force (below stripper) and diagnostics.
export function forcesAtDepth(ctx, depthM, dir, bottomForce = 0) {
  const { path, string, casing, p, model } = ctx
  const sign = dir === 'POOH' ? 1 : -1
  const mu = frictionFactor(dir === 'POOH' ? p.muPOOH : p.muRIH, dir, dir === 'POOH' ? p.speedPOOH : p.speedRIH, model)
  const ertLbf = (p.ertLbfPerBpm || 0) * (p.rateBpm || 0) * (dir === 'POOH' ? model.ertPoohEfficiency : 1)
  const ertZoneFt = model.ertZoneM * M_TO_FT
  const ertPerFt = ertZoneFt > 0 ? ertLbf / ertZoneFt : 0
  const bhaLenM = p.bha?.length || 0
  const bhaWairPerFt = bhaLenM > 0 ? (p.bha.weight || 0) / (bhaLenM * M_TO_FT) : 0
  const bf = 1 - p.fluidPpg / 65.5 // steel buoyancy factor (same fluid in & out)
  const gAnn = p.annularGradient || 0 // psi/ft, frictional, annulus
  const speed = (dir === 'POOH' ? p.speedPOOH : p.speedRIH) || 0
  const speedDragPerFt = ((dir === 'POOH' ? model.speedDragPOOH : model.speedDragRIH) * speed) / (1000 * M_TO_FT)
  let F = bottomForce
  let helixFt = 0
  let maxCompression = 0
  let lockup = false
  // walk the segments from the bottom up
  let k = path.segs.findIndex((sg) => sg.bot >= depthM - 1e-9)
  if (k < 0) k = path.segs.length - 1
  let fromBottomFt = 0
  for (; k >= 0; k--) {
    const sg = path.segs[k]
    const segBot = Math.min(sg.bot, depthM)
    if (segBot <= sg.top) continue
    const dsFt = (segBot - sg.top) * M_TO_FT
    const midFromFreeM = (fromBottomFt + dsFt / 2) / M_TO_FT
    const inBha = midFromFreeM < bhaLenM
    const wall = string.wallAt(Math.max(0, midFromFreeM - bhaLenM))
    const tp = tubeProps(string.od, wall)
    const wB = (inBha ? bhaWairPerFt : tp.wAir) * bf
    const rc = Math.max(0.05, (casing.idAt(sg.top) - (inBha ? p.bha.od || string.od : string.od)) / 2) // in
    // normal force per ft (weight + curvature, Eq 19)
    const nv = wB * sg.sinI - F * sg.dIncDs
    const nh = F * sg.sinI * sg.dAzDs
    let N = Math.hypot(nv, nh)
    // helical buckling (compression only, not inside the stiff BHA)
    if (F < 0 && !inBha) {
      const EI = STEEL_E * tp.I
      const nPerIn = N / 12
      const fHel = 2 * Math.SQRT2 * Math.sqrt((EI * Math.max(nPerIn, 1e-6)) / rc)
      if (-F > fHel) {
        N += ((rc * F * F) / (4 * EI)) * 12
        helixFt += dsFt
      }
    }
    // ERT drag reduction, spread over the zone above the tool
    const muSeg = sg.incDeg > model.lateralIncDeg ? mu * (dir === 'POOH' ? model.lateralMuFactorPOOH : model.lateralMuFactorRIH) : mu
    let fric = muSeg * N
    if (ertPerFt > 0 && fromBottomFt < ertZoneFt) fric = Math.max(0.1 * fric, fric - ertPerFt)
    // annular flow shear drags the CT upward (both directions)
    const annDrag = gAnn > 0 ? gAnn * ((Math.PI / 4) * (casing.idAt(sg.top) ** 2 - string.od ** 2)) * (string.od / (string.od + casing.idAt(sg.top))) : 0
    F += (wB * sg.cosI + sign * (fric + speedDragPerFt) - annDrag) * dsFt
    fromBottomFt += dsFt
    if (F < maxCompression) maxCompression = F
    if (-F > model.lockupForce || !Number.isFinite(F)) {
      lockup = true
      break
    }
  }
  return { surfaceForce: F, helixM: helixFt / M_TO_FT, maxCompression: -maxCompression, lockup }
}

// Surface weight-indicator reading from the effective force below the stripper.
export function surfaceWeight(Fsurf, dir, p, string, model = DEFAULT_MODEL) {
  const Ao = (Math.PI / 4) * string.od * string.od
  const speed = (dir === 'POOH' ? p.speedPOOH : p.speedRIH) || 0
  const stripDyn = (dir === 'POOH' ? model.speedSurfPOOH || 0 : model.speedSurfRIH || 0) * speed
  const strip = dir === 'POOH' ? p.stripperLbf + stripDyn : -(p.stripperLbf + stripDyn)
  const rbt = dir === 'POOH' ? p.reelTensionPOOH : p.reelTensionRIH
  return Fsurf - p.whp * Ao + strip - rbt
}

export function makeCasing(casingList) {
  // casingList: [{ top (m), bottom (m), id (in) }]
  const list = [...casingList].sort((a, b) => a.top - b.top)
  return {
    idAt(mdM) {
      for (const c of list) if (mdM >= c.top && mdM < c.bottom) return c.id
      return list[list.length - 1].id
    },
  }
}

export function buildContext(p, model = DEFAULT_MODEL, path = null) {
  const m = { ...DEFAULT_MODEL, ...model }
  const pth = path || buildWellPath(p.survey, p.stepM || 10)
  const string = buildString(p.string)
  const casing = makeCasing(p.casing)
  const annularGradient = annularFrictionGradient({
    rateBpm: p.returnRateBpm ?? p.rateBpm,
    casingId: casing.idAt(pth.tdM),
    od: string.od,
    densityPpg: p.fluidPpg,
    dragReduction: m.frDragReduction,
  })
  return { path: pth, string, casing, model: m, p: { ...p, annularGradient } }
}

// Weight at the surface for RIH and POOH at each depth of `depthsM`.
export function simulateTrip(p, model = DEFAULT_MODEL, depthsM = null) {
  const ctx = buildContext(p, model)
  const td = Math.min(ctx.path.tdM, ctx.string.totalLength)
  const depths = depthsM || Array.from({ length: Math.floor(td / (p.outStepM || 50)) + 1 }, (_, i) => i * (p.outStepM || 50))
  if (depths[depths.length - 1] < td - 1 && !depthsM) depths.push(td)
  const rows = depths.map((d) => {
    // pipe speed is uniform along the string and set by where the tool is:
    // p.speedAt(depth, dir) gives a per-section speed plan (m/min)
    const c = p.speedAt ? { ...ctx, p: { ...ctx.p, speedRIH: p.speedAt(d, 'RIH'), speedPOOH: p.speedAt(d, 'POOH') } } : ctx
    const rih = forcesAtDepth(c, d, 'RIH')
    const pooh = forcesAtDepth(c, d, 'POOH')
    return {
      depth: d,
      rih: rih.lockup ? null : surfaceWeight(rih.surfaceForce, 'RIH', c.p, c.string, c.model),
      pooh: surfaceWeight(pooh.surfaceForce, 'POOH', c.p, c.string, c.model),
      helixM: rih.helixM,
      lockup: rih.lockup,
      maxCompression: rih.maxCompression,
    }
  })
  return { rows, tdM: ctx.path.tdM, stringLength: ctx.string.totalLength }
}

// Maximum set-down force available at the tool (compression delivered at the
// end of the string) for the CT at depth `depthM`, found by increasing the
// bottom compression until the surface weight stops responding (lock-up
// criterion of CTES Lockup 2.0: weight transfer dF_bottom/dW_surface < 2 %).
export function maxSetDown(p, depthM, model = DEFAULT_MODEL) {
  const ctx = buildContext(p, model)
  let prevW = surfaceWeight(forcesAtDepth(ctx, depthM, 'RIH', 0).surfaceForce, 'RIH', ctx.p, ctx.string, ctx.model)
  let best = { bottomForce: 0, surfaceWeight: prevW }
  const weightAt = (fb) => {
    const r = forcesAtDepth(ctx, depthM, 'RIH', -fb)
    return r.lockup ? null : surfaceWeight(r.surfaceForce, 'RIH', ctx.p, ctx.string, ctx.model)
  }
  let failed = false
  for (let fb = 250; fb <= 40000; fb += 250) {
    const w = weightAt(fb)
    if (w === null || 250 / Math.max(1e-6, prevW - w) < 0.02) {
      failed = true
      break
    }
    best = { bottomForce: fb, surfaceWeight: w }
    prevW = w
  }
  if (!failed) return best
  // refine the limit inside the last 250 lbf step (local transfer over 25 lbf)
  let lo = best.bottomForce
  let hi = best.bottomForce + 250
  for (let i = 0; i < 4; i++) {
    const mid = (lo + hi) / 2
    const w0 = weightAt(mid)
    const w1 = weightAt(mid + 25)
    if (w0 !== null && w1 !== null && 25 / Math.max(1e-6, w0 - w1) >= 0.02) {
      lo = mid
      best = { bottomForce: Math.round(mid), surfaceWeight: w0 }
    } else hi = mid
  }
  return best
}

// 3-D trajectory by minimum curvature at the survey stations plus a resample
// every `stepM` (for drawing): [{ md, inc, azi, n, e, tvd, dls }] in m,
// dls in °/30 m.
export function wellTrajectory(surveyRows, stepM = 10) {
  const st = normalizeSurvey(surveyRows)
  const pts = [{ md: st[0][0], inc: st[0][1], azi: st[0][2], n: 0, e: 0, tvd: 0, dls: 0 }]
  for (let k = 1; k < st.length; k++) {
    const [md1, i1, a1] = st[k - 1]
    const [md2, i2, a2] = st[k]
    const dmd = md2 - md1
    const nSub = Math.max(1, Math.ceil(dmd / stepM))
    let prev = pts[pts.length - 1]
    const t1 = unitVector(i1, a1)
    const t2 = unitVector(i2, a2)
    const dogleg = Math.acos(Math.min(1, Math.max(-1, t1[0] * t2[0] + t1[1] * t2[1] + t1[2] * t2[2])))
    for (let j = 1; j <= nSub; j++) {
      const md = md1 + (dmd * j) / nSub
      const [, inc, azi] = interpStation(st[k - 1], st[k], md)
      const ta = unitVector(prev.inc, prev.azi)
      const tb = unitVector(inc, azi)
      const dl = Math.acos(Math.min(1, Math.max(-1, ta[0] * tb[0] + ta[1] * tb[1] + ta[2] * tb[2])))
      const rf = dl > 1e-9 ? (2 / dl) * Math.tan(dl / 2) : 1
      const ds = md - prev.md
      const p = {
        md,
        inc,
        azi,
        n: prev.n + (ds / 2) * (ta[0] + tb[0]) * rf,
        e: prev.e + (ds / 2) * (ta[1] + tb[1]) * rf,
        tvd: prev.tvd + (ds / 2) * (ta[2] + tb[2]) * rf,
        dls: dmd > 0 ? (dogleg / DEG / dmd) * 30 : 0,
      }
      pts.push(p)
      prev = p
    }
  }
  return pts
}

// Point on the trajectory at MD (linear between resampled points).
export function pointAtMd(traj, md) {
  if (md <= traj[0].md) return traj[0]
  for (let k = 1; k < traj.length; k++) {
    if (traj[k].md >= md) {
      const a = traj[k - 1]
      const b = traj[k]
      const f = (md - a.md) / (b.md - a.md || 1)
      const lerp = (x, y) => x + f * (y - x)
      return { md, inc: lerp(a.inc, b.inc), azi: b.azi, n: lerp(a.n, b.n), e: lerp(a.e, b.e), tvd: lerp(a.tvd, b.tvd), dls: b.dls }
    }
  }
  return traj[traj.length - 1]
}
