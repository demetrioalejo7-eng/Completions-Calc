// Oilfield-themed line-art icons for each calculator section, replacing
// generic/mismatched emoji (e.g. a beach umbrella for proppant, a brick
// wall for cement). Single-color stroke art on a 24x24 grid so it inherits
// `color` from CSS and matches the app's navy/teal palette at any size.
const SVG_OPEN = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'

const SECTION_ICONS = {
  // Tubulares (Capacidades y Resistencias) — pipe cross-section with a
  // dimension/caliper mark, combining capacity + strength at a glance.
  tubulares: `<svg ${SVG_OPEN}><circle cx="10" cy="12" r="8"/><circle cx="10" cy="12" r="3.5"/><path d="M20 6v12" stroke-width="1.2"/><path d="M18.6 6h2.8M18.6 18h2.8" stroke-width="1.2"/></svg>`,

  // Cement — casing annulus with cement slurry hatching between strings
  cement: `<svg ${SVG_OPEN}><path d="M5 3v18M19 3v18"/><path d="M9 3v18M15 3v18" stroke-dasharray="0"/><path d="M9 5l6 3M9 9l6 3M9 13l6 3M9 17l6 2.5" stroke-width="1.2"/></svg>`,

  // Acid — lab flask used for acid-treatment concentration/volume jobs
  acid: `<svg ${SVG_OPEN}><path d="M10 3h4M10.5 3v5l-4.3 8.6A2 2 0 0 0 8 19.5h8a2 2 0 0 0 1.8-2.9L13.5 8V3"/><path d="M8.4 15h7.2"/></svg>`,

  // Tanks — vertical storage tank on grade with a gauge line
  tanks: `<svg ${SVG_OPEN}><path d="M5 8h14v12H5z"/><path d="M5 8c0-2.2 3.1-4 7-4s7 1.8 7 4"/><path d="M5 12h14M2 20h20"/></svg>`,

  // Formulas & Conversions — pressure gauge / instrument dial
  general: `<svg ${SVG_OPEN}><circle cx="12" cy="12" r="9"/><path d="M12 12l4-3.2"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M8 6.5l.6 1.1M16 6.5l-.6 1.1M5 12h1.3M17.7 12H19"/></svg>`,

  // Nitrogen — pressurized gas cylinder with valve
  nitrogen: `<svg ${SVG_OPEN}><rect x="8" y="7" width="8" height="14" rx="2"/><path d="M10 7V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V7"/><path d="M9.5 2.5h5"/><path d="M8 12h8"/></svg>`,

  // Coiled Tubing — spooled reel with wound tubing
  'coiled-tubing': `<svg ${SVG_OPEN}><circle cx="12" cy="12" r="9"/><path d="M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0" stroke-dasharray="2.2 2.6"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>`,

  // Fracturing — hydraulic fracture propagating through rock under pressure
  fracturing: `<svg ${SVG_OPEN}><path d="M3 12h5M16 12h5"/><path d="M8 12l2-3 2 6 2-3 2 0" stroke-width="1.8"/><path d="M12 3v3.5M12 17.5V21" stroke-width="1.3"/></svg>`,

  // Contingencias — decision-tree branch, for the interactive flowchart wizards
  contingencias: `<svg ${SVG_OPEN}><circle cx="5" cy="5" r="2.4"/><circle cx="19" cy="7" r="2.4"/><circle cx="19" cy="17" r="2.4"/><path d="M7.3 6.1 16.8 6.9"/><path d="M6.4 7.2 16.8 15.8"/></svg>`,
}

export function sectionIconMarkup(sectionId) {
  return SECTION_ICONS[sectionId] || SECTION_ICONS.general
}
