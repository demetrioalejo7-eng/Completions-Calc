"""Calibration bins from 1 s acquisition exports where the speed channel is
not reliable in every run (e.g. pad B1B: BdC-1030h run 1 logs speed ×0.1).
Speed comes from the depth change over 20 s; each run carries its own survey
and ERT state. Replaces the pad's rows in field-data/bins.csv.

  python3 tools/ct-calibration/build_bins_1s.py <clean parquet> <pad>

The parquet has t, W, WHP, MD, Q, CTP (Last values, -99999 sentinels removed).
"""
import sys, pandas as pd, numpy as np

RUNS = {
    # run id: (survey, start, end, ERT working?, directions to use)
    "BdC-1028h":    ("BdC-1028h", "2026-08-09 06:00", "2026-08-11 02:52", 1, "RIH"),  # POOH offset by a transmission error
    "BdC-1029h":    ("BdC-1029h", "2026-08-17 11:12", "2026-08-19 18:00", 1, "RIH,POOH"),
    "BdC-1030h-r1": ("BdC-1030h", "2026-08-20 03:32", "2026-08-21 03:28", 0, "RIH,POOH"),  # ERT failed
    "BdC-1030h-r2": ("BdC-1030h", "2026-08-21 13:24", "2026-08-22 15:32", 1, "RIH,POOH"),
    "BdC-1031h":    ("BdC-1031h", "2026-08-23 03:24", "2026-08-24 14:28", 1, "RIH,POOH"),
}

src, pad = sys.argv[1], sys.argv[2]
d = pd.read_parquet(src)
if "t" in d.columns:
    d = d.set_index("t")
out = []
for run, (survey, a, b, ert, dirs) in RUNS.items():
    r = d.loc[a:b].copy()
    r = r[~r.index.duplicated()].resample("1s").mean().interpolate(limit=5)
    r["v"] = (r.MD.shift(-10) - r.MD.shift(10)) / 20 * 60  # m/min, + = RIH
    r["vs"] = r.v.rolling(60, center=True).std()
    r["Wr"] = r.W.rolling(15, center=True).median()
    st = r[(r.v.abs() > 1.5) & (r.vs < 3.0) & r.Wr.notna() & r.MD.notna()].copy()
    st["dir"] = np.where(st.v > 0, "RIH", "POOH")
    st = st[st["dir"].isin(dirs.split(","))]
    st["bin"] = st.MD // 25 * 25 + 12.5
    brk = (st["dir"] != st["dir"].shift()) | (st.index.to_series().diff().dt.total_seconds() > 120)
    st["pass"] = brk.cumsum()
    g = st.groupby(["dir", "pass", "bin"]).agg(
        W=("Wr", "median"), Wp10=("Wr", lambda x: x.quantile(0.1)), Wp90=("Wr", lambda x: x.quantile(0.9)),
        v=("v", lambda x: x.abs().median()), Q=("Q", "median"), WHP=("WHP", "median"), CTP=("CTP", "median"),
        n=("W", "size"), t=("MD", lambda x: x.index[0].isoformat())).reset_index()
    g = g[g.n >= 8]
    g["well"], g["pad"], g["survey"], g["ert"] = run, pad, survey, ert
    out.append(g)
    print(run, "bins", len(g), "RIH", (g["dir"] == "RIH").sum(), "POOH", (g["dir"] == "POOH").sum(), "passes", st["pass"].nunique())
new = pd.concat(out)
old = pd.read_csv("field-data/bins.csv")
old = old[old.pad != pad]
pd.concat([old, new[old.columns]]).to_csv("field-data/bins.csv", index=False)
print("bins.csv rows", len(old) + len(new))
