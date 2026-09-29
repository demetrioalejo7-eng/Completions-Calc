// Default inputs for the CT weight simulator (Simulador de pesos RIH/POOH).

// Standard 2 3/8" tapered string, listed from the CORE end (reel) to the
// FREE end (downhole). Lengths in m, wall in in. A "a-b" transition is a
// linear taper over the section length.
export const STANDARD_STRING_2375 = {
  od: 2.375,
  grade: 'DC-120',
  sections: [
    { length: 1970, wallStart: 0.224, wallEnd: 0.224 },
    { length: 400, wallStart: 0.224, wallEnd: 0.25 },
    { length: 435, wallStart: 0.25, wallEnd: 0.276 },
    { length: 1500, wallStart: 0.276, wallEnd: 0.276 },
    { length: 335, wallStart: 0.276, wallEnd: 0.25 },
    { length: 180, wallStart: 0.25, wallEnd: 0.224 },
    { length: 240, wallStart: 0.224, wallEnd: 0.204 },
    { length: 230, wallStart: 0.204, wallEnd: 0.175 },
    { length: 2370, wallStart: 0.175, wallEnd: 0.175 },
  ],
}

// 5" 21.4 lb/ft P-110 production casing (ID 4.126 in) from surface to TD.
export const CASING_5_21_4 = [{ top: 0, bottom: 99999, id: 4.126 }]

// Typical BHA for post-frac plug clean-out (CT connector, DFCV, disconnect,
// PBL valve, ERT, motor, mill): ~11.7 m, 3 1/8" OD.
export const DEFAULT_BHA = { length: 11.67, weight: 1500, od: 3.125 }

// Tenaris 2 3/8" string from the shipping-spool weld log (25 strips,
// 8337.8 m, 137,852 lb), ordered here from the CORE end to the FREE end.
// The weld log lists the 0.175" strips first; they are taken as the free
// (downhole) end, same layout as the standard design (thin at the tool,
// thick at the top). Consecutive strips of the same wall are merged.
export const TENARIS_WELDLOG_2375 = {
  od: 2.375,
  sections: [
    { length: 1833.99, wallStart: 0.224, wallEnd: 0.224 },
    { length: 235.0, wallStart: 0.224, wallEnd: 0.25 },
    { length: 3108.63, wallStart: 0.25, wallEnd: 0.25 },
    { length: 225.86, wallStart: 0.25, wallEnd: 0.224 },
    { length: 230.12, wallStart: 0.224, wallEnd: 0.204 },
    { length: 285.9, wallStart: 0.204, wallEnd: 0.175 },
    { length: 2418.27, wallStart: 0.175, wallEnd: 0.175 },
  ],
}

export const STRING_PRESETS = [
  { id: 'standard', label: 'Sarta estándar 2 3/8" (7.660 m)', string: STANDARD_STRING_2375, grade: 'global-duracoil|DC-120' },
  { id: 'tenaris-weldlog', label: 'Tenaris weld log 2 3/8" HT-125 (8.338 m)', string: TENARIS_WELDLOG_2375, grade: 'tenaris-bluecoil|HT-125' },
]
