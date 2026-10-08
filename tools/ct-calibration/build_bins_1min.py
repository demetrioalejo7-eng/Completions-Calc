"""Calibration bins from acquisition exports logged once a minute (pad C1B:
Last / Minimum / Maximum per minute). The weight is the per-minute Last
value: the ERT makes the weight swing ~10 klb inside each minute, so Min /
Max are extremes, not a level. Speed comes from the depth change between
the neighbouring samples (2 min); a sample counts as steady motion when the
speed agrees in the minute before and after. Bins of 25 m, per direction and
per pass. Replaces the pad's rows in field-data/bins.csv.

  python3 tools/ct-calibration/build_bins_1min.py <export.csv> <pad>

Runs (survey, window, ERT working?, ERT k lbf/bpm, pad label): runs with a
pad label other than the pad's are kept out of the training set (anomalies).
"""
import sys, pandas as pd, numpy as np

RUNS = {
    # 1037h run 1: stuck with overpull (excess friction), reference case only
    "BdC-1037h-r1": ("BdC-1037h", "2026-07-08 05:18", "2026-07-10 18:24", 1, 1000, "C1B-X"),
    "BdC-1037h-r2": ("BdC-1037h", "2026-07-11 06:53", "2026-07-12 18:57", 1, 1000, None),
    "BdC-1038h":    ("BdC-1038h", "2026-07-13 06:13", "2026-07-15 00:52", 1, 1000, None),
    "BdC-1039h":    ("BdC-1039h", "2026-07-15 09:58", "2026-07-17 03:53", 1, 1000, None),
    "BdC-1040h":    ("BdC-1040h", "2026-07-17 13:25", "2026-07-19 10:23", 1, 1000, None),
}

src, pad = sys.argv[1], sys.argv[2]
raw = pd.read_csv(src, encoding="utf-8-sig")
col = lambda pat: next(c for c in raw.columns if pat in c and "[Last]" in c)
d = pd.DataFrame({
    "t": pd.to_datetime(raw["DateTime"]),
    "W": raw[col("Peso")], "MD": raw[col("Profundidad")], "WHP": raw[col("Presion en Cabeza")],
    "CTP": raw[col("Presion de Circulacion")], "Q": raw[col("Caudal")],
}).set_index("t")
d = d.mask(np.isclose(d, -999.25))
out = []
for run, (survey, a, b, ert, ertk, label) in RUNS.items():
    r = d.loc[a:b].copy()
    r["v"] = (r.MD.shift(-1) - r.MD.shift(1)) / 2  # m/min, + = RIH
    r["v0"] = r.MD - r.MD.shift(1)
    r["v1"] = r.MD.shift(-1) - r.MD
    st = r[(r.v.abs() > 1.5) & (np.sign(r.v0) == np.sign(r.v1)) & ((r.v0 - r.v1).abs() < np.maximum(3, 0.5 * r.v.abs()))
           & r.W.notna() & r.MD.notna()].copy()
    st["dir"] = np.where(st.v > 0, "RIH", "POOH")
    st["bin"] = st.MD // 25 * 25 + 12.5
    brk = (st["dir"] != st["dir"].shift()) | (st.index.to_series().diff().dt.total_seconds() > 300)
    st["pass"] = brk.cumsum()
    g = st.groupby(["dir", "pass", "bin"]).agg(
        W=("W", "median"), Wp10=("W", lambda x: x.quantile(0.1)), Wp90=("W", lambda x: x.quantile(0.9)),
        v=("v", lambda x: x.abs().median()), Q=("Q", "median"), WHP=("WHP", "median"), CTP=("CTP", "median"),
        n=("W", "size"), t=("MD", lambda x: x.index[0].isoformat())).reset_index()
    g["well"], g["pad"], g["survey"], g["ert"], g["ertK"] = run, label or pad, survey, ert, ertk
    out.append(g)
    print(run, "bins", len(g), "RIH", (g["dir"] == "RIH").sum(), "POOH", (g["dir"] == "POOH").sum(), "passes", st["pass"].nunique())
new = pd.concat(out)
old = pd.read_csv("field-data/bins.csv")
old = old[~old.pad.isin([pad, pad + "-X"])]
if "ertK" not in old.columns:
    old["ertK"] = np.nan
pd.concat([old, new[old.columns]]).to_csv("field-data/bins.csv", index=False)
print("bins.csv rows", len(old) + len(new))
