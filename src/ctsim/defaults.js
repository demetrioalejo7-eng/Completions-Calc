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
