// Section 8 — Tank and pit capacities.

export function verticalCylinderGalPerFt(diameterFt) {
  const R = diameterFt / 2
  return 23.501 * R * R
}

export function verticalCylinderTotal(diameterFt, heightFt) {
  const R = diameterFt / 2
  return {
    gal: 23.501 * R * R * heightFt,
    bbl: 0.56 * R * R * heightFt,
  }
}

export function horizontalFlatHeadsTotal(diameterFt, lengthFt) {
  return {
    gal: 5.875 * diameterFt * diameterFt * lengthFt,
    bbl: 0.14 * diameterFt * diameterFt * lengthFt,
  }
}

export function horizontalDishedHeadsTotal(diameterFt, lengthFt) {
  const D = diameterFt
  return {
    gal: 5.875 * D * D * lengthFt + 0.806 * D ** 3,
    bbl: 0.14 * D * D * lengthFt + 0.019 * D ** 3,
  }
}

// b = dish height (in), r = dish radius (in, defaults to tank radius)
export function dishedHeadCapacityGal(bIn, rIn) {
  return 0.0045333 * bIn * bIn * (3 * rIn - bIn)
}

export function sphericalTankTotal(diameterFt) {
  const D = diameterFt
  return {
    gal: 3.9168 * D ** 3,
    bbl: 0.093257 * D ** 3,
  }
}

export function rectangularTankGal(lengthFt, widthFt, heightFt) {
  return lengthFt * widthFt * heightFt * 7.4805
}

// Sloped (rectangular frustum) pit. All lengths in ft, returns ft³.
export function slopedPitCuFt(topL, topW, bottomL, bottomW, height) {
  const aTop = topL * topW
  const aBottom = bottomL * bottomW
  return (height / 3) * (aTop + aBottom + Math.sqrt(aTop * aBottom))
}

// Partial fill (from the bottom) of a sloped rectangular pit.
export function slopedPitPartialCuFt(topL, topW, bottomL, bottomW, height, fluidHeight) {
  const frac = fluidHeight / height
  const surfL = bottomL + frac * (topL - bottomL)
  const surfW = bottomW + frac * (topW - bottomW)
  return slopedPitCuFt(surfL, surfW, bottomL, bottomW, fluidHeight)
}

// Sloped (conical frustum) cylindrical tank. Diameters/height in ft, ft³.
export function slopedCylinderCuFt(topDia, bottomDia, height) {
  return ((Math.PI * height) / 12) * (topDia * topDia + topDia * bottomDia + bottomDia * bottomDia)
}

export function slopedCylinderPartialCuFt(topDia, bottomDia, height, fluidHeight) {
  const frac = fluidHeight / height
  const surfDia = bottomDia + frac * (topDia - bottomDia)
  return slopedCylinderCuFt(surfDia, bottomDia, fluidHeight)
}

// Partial fill of a horizontal cylindrical tank with flat heads.
// d, l in inches; h = liquid depth in inches (h <= d/2, i.e. up to half full;
// for more than half full compute the empty portion and subtract from full).
export function horizontalPartialFillGal(dIn, lIn, hIn) {
  const ratio = (dIn - 2 * hIn) / dIn
  const clamped = Math.min(1, Math.max(-1, ratio))
  const angleDeg = (Math.acos(clamped) * 180) / Math.PI
  const term1 = 0.004363 * dIn * dIn * angleDeg
  const term2 = ((dIn - 2 * hIn) / 2) * Math.sqrt(hIn * (dIn - hIn))
  return (lIn / 231) * (term1 - term2)
}
