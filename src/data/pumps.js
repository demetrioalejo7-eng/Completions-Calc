// Reciprocating plunger-pump performance data, transcribed directly from
// manufacturer service manuals (performance chart tables) — not formula
// estimates. Pressure values are the pump's own rated max (the lower of
// rod-load-limited and horsepower-limited pressure at each speed).
//
// Weir SPM QWS2500 "SD" — intermittent-duty quintuplex plunger pump.
// Source: QWS2500 SD Service Manual, "QWS2500 Pump Performance Chart"
// (QWS2500 SD Performance.xls, 10/5/2005). Based on 90% ME / 100% VE.
export const QWS2500_SD = {
  id: 'qws2500-sd',
  label: 'Weir SPM QWS2500 "SD" (Quintuplex)',
  maxBhp: 2500,
  strokeIn: 8,
  gearRatio: 6.353,
  maxRodLoadLbf: 192325,
  speedColumns: [
    { spm: 100, rpm: 635, bhp: 2159 },
    { spm: 116, rpm: 736, bhp: 2500 },
    { spm: 150, rpm: 953, bhp: 2500 },
    { spm: 200, rpm: 1271, bhp: 2500 },
    { spm: 250, rpm: 1588, bhp: 2500 },
    { spm: 330, rpm: 2096, bhp: 2500 },
  ],
  // gpm/psi per speed column, in the same order as speedColumns above.
  plungerRows: [
    { plungerIn: 3.5, gpr: 1.67, gpm: [167, 193, 250, 333, 416, 550], psi: [19990, 19990, 15432, 11574, 9259, 7015] },
    { plungerIn: 3.75, gpr: 1.91, gpm: [191, 221, 287, 382, 478, 631], psi: [17413, 17413, 13443, 10082, 8066, 6111] },
    { plungerIn: 4, gpr: 2.18, gpm: [218, 252, 326, 435, 544, 718], psi: [15305, 15305, 11815, 8861, 7089, 5371] },
    { plungerIn: 4.5, gpr: 2.75, gpm: [275, 319, 413, 551, 688, 909], psi: [12093, 12093, 9336, 7002, 5601, 4243] },
    { plungerIn: 5, gpr: 3.4, gpm: [340, 394, 510, 680, 850, 1122], psi: [9795, 9795, 7562, 5671, 4537, 3437] },
    { plungerIn: 5.5, gpr: 4.11, gpm: [411, 476, 617, 823, 1028, 1358], psi: [8095, 8095, 6249, 4687, 3750, 2841] },
    { plungerIn: 5.75, gpr: 4.5, gpm: [450, 521, 674, 899, 1124, 1484], psi: [7406, 7406, 5718, 4288, 3431, 2599] },
    { plungerIn: 6, gpr: 4.9, gpm: [490, 567, 734, 979, 1224, 1616], psi: [6802, 6802, 5251, 3938, 3151, 2387] },
    { plungerIn: 6.5, gpr: 5.75, gpm: [575, 665, 862, 1149, 1436, 1896], psi: [5796, 5796, 4474, 3356, 2685, 2034] },
    { plungerIn: 6.75, gpr: 6.2, gpm: [620, 718, 929, 1239, 1549, 2045], psi: [5375, 5375, 4149, 3112, 2489, 1886] },
  ],
}

export const PUMP_MODELS = [QWS2500_SD]
