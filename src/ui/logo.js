// ATD mark: the letters stand at surface and the T's stem runs on down as
// the tubing string inside a cased wellbore — through a packer — to the
// perforations, where a bi-wing fracture opens into the formation. Letters
// are drawn as strokes (not a font) so the mark is identical everywhere.
// `animated` adds a pulse travelling down the string and the fracture
// flaring with it; the PNG app icons use the static version.
export function atdLogoSvg({ animated = false } = {}) {
  const pulse = animated
    ? `<circle cx="32" cy="31" r="1.9" fill="#ecfeff" filter="url(#atdGlow)">
        <animate attributeName="cy" values="31;51" dur="2.4s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1"/>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="2.4s" repeatCount="indefinite"/>
      </circle>`
    : ''
  const flare = animated
    ? `<animate attributeName="opacity" values="0.8;0.8;1;0.8" keyTimes="0;0.7;0.85;1" dur="2.4s" repeatCount="indefinite"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-label="ATD">
    <defs>
      <filter id="atdGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M5 31H59" stroke="#ffffff" stroke-width="1.2" opacity="0.45"/>
    <path d="M27 31V58M37 31V58" stroke="#ffffff" stroke-width="1.4" opacity="0.7"/>
    <g fill="#ffffff" opacity="0.85">
      <rect x="27.6" y="42.5" width="2.9" height="3.2" rx="0.6"/>
      <rect x="33.5" y="42.5" width="2.9" height="3.2" rx="0.6"/>
    </g>
    <g fill="#67e8f9" filter="url(#atdGlow)" opacity="0.8">
      ${flare}
      <path d="M27 50.3 11 52 27 53.7Z"/>
      <path d="M37 50.3 53 52 37 53.7Z"/>
    </g>
    <path d="M32 29V51" stroke="#ffffff" stroke-width="2.6"/>
    <g stroke="#ffffff" stroke-width="4.2">
      <path d="M8 29 14.5 11 21 29M10.8 22.6H18.2"/>
      <path d="M24 11H40M32 11V29"/>
      <path d="M43.5 11V29H47A9 9 0 0 0 47 11Z"/>
    </g>
    ${pulse}
  </svg>`
}

// Full square app icon (gradient tile + mark) for rasterising the PNGs.
// `inset` shrinks the mark toward the centre for maskable icons, whose
// outer ring may be cropped by the launcher.
export function atdIconSvg({ size = 512, rounded = true, inset = 1 } = {}) {
  const r = rounded ? size * 0.22 : 0
  const markSize = size * 0.78 * inset
  const off = (size - markSize) / 2
  const mark = atdLogoSvg().replace('<svg ', `<svg x="${off}" y="${off}" width="${markSize}" height="${markSize}" `)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="atdBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1d4ed8"/>
        <stop offset="0.5" stop-color="#3b82f6"/>
        <stop offset="1" stop-color="#22d3ee"/>
      </linearGradient>
      <radialGradient id="atdShine" cx="0.25" cy="0.15" r="0.8">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#atdBg)"/>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#atdShine)"/>
    ${mark}
  </svg>`
}
