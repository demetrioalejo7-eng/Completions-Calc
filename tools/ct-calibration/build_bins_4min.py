"""Calibration points from low-rate acquisition exports (one Min/Max/Last row
every few minutes, e.g. the B1B pad). Each steady-motion sample becomes one
point; speed comes from the depth change (the speed channel is not reliable
in every run). Appends to field-data/bins.csv with survey / ert columns.

  python3 tools/ct-calibration/build_bins_4min.py <parquet> <pad> [--replace]
"""
import sys, pandas as pd, numpy as np

RUNS = {
    # run id: (survey, start, end, ERT working?, directions to use)
    "BdC-1028h":    ("BdC-1028h", "2026-08-09 06:00", "2026-08-11 02:52", 1, "RIH"),   # POOH offset by transmission error
    "BdC-1029h":    ("BdC-1029h", "2026-08-17 11:12", "2026-08-19 18:00", 1, "RIH,POOH"),
    "BdC-1030h-r1": ("BdC-1030h", "2026-08-20 03:32", "2026-08-21 03:28", 0, "RIH,POOH"),  # ERT failed
    "BdC-1030h-r2": ("BdC-1030h", "2026-08-21 13:24", "2026-08-22 15:32", 1, "RIH,POOH"),
    "BdC-1031h":    ("BdC-1031h", "2026-08-23 03:24", "2026-08-24 14:28", 1, "RIH,POOH"),
}

src, pad = sys.argv[1], sys.argv[2]
d = pd.read_parquet(src).set_index("t")
out = []
for run, (survey, a, b, ert, dirs) in RUNS.items():
    r = d.loc[a:b].copy()
    dt = r.index.to_series().diff().dt.total_seconds() / 60
    r["v_prev"] = r.Profundidad_Last.diff() / dt
    r["v_next"] = r.Profundidad_Last.diff(-1).mul(-1) / dt.shift(-1)
    same = np.sign(r.v_prev) == np.sign(r.v_next)
    steady = same & (r.v_prev.abs() > 0.8) & (r.v_next.abs() > 0.8) & ((r.v_prev - r.v_next).abs() < 0.6 * r.v_prev.abs() + 2)
    spread = (r.Peso_Maximum - r.Peso_Minimum) < 12000  # plug milling / stalls inside the window
    s = r[steady & spread & r.Peso_Last.notna()].copy()
    s["dir"] = np.where(s.v_prev > 0, "RIH", "POOH")
    s = s[s["dir"].isin(dirs.split(","))]
    q = s["Caudal linea_Last"]
    out.append(pd.DataFrame({
        "dir": s["dir"], "pass": 0, "bin": s.Profundidad_Last, "W": s.Peso_Last, "Wp10": s.Peso_Minimum, "Wp90": s.Peso_Maximum,
        "v": (s.v_prev.abs() + s.v_next.abs()) / 2, "Q": q.fillna(4.0).where(q.notna(), 4.0), "WHP": s["Presion en Cabeza_Last"],
        "CTP": s["Presion de Circulacion_Last"], "n": 1, "t": s.index.astype(str), "well": run, "pad": pad, "survey": survey, "ert": ert,
    }))
    print(run, "RIH", (s["dir"] == "RIH").sum(), "POOH", (s["dir"] == "POOH").sum(), "v RIH med %.1f" % s[s["dir"] == "RIH"].v_prev.abs().median())
new = pd.concat(out)
old = pd.read_csv("field-data/bins.csv")
if "survey" not in old: old["survey"] = old["well"]
if "ert" not in old: old["ert"] = 1
old = old[old.pad != pad]
pd.concat([old, new]).to_csv("field-data/bins.csv", index=False)
print("total bins", len(old) + len(new))
