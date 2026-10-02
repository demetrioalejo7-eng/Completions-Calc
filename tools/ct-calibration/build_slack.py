"""Set-down (slack-off) events from 1 s data: while the tool advances slowly
at new depth in the lateral (milling / tagging), slack = free RIH weight at
that depth − indicator weight. Surface offsets (stripper, reel) cancel, so
the slack is a direct measure of the load the string transferred. Writes
field-data/slack.csv (one row per run and 100 m band: p50 / p90 slack).

  python3 tools/ct-calibration/build_slack.py <dir with b3a2/, c1a/, b1b2/ parquets>
"""
import sys, json, pandas as pd, numpy as np

base = sys.argv[1]
RUNS = {
    "BdC-1126h": ("b3a2/b3a2.parquet", "BdC-1126h", "2026-04-20 13:54", "2026-04-22 22:49", 1),
    "BdC-1127h": ("b3a2/b3a2.parquet", "BdC-1127h", "2026-04-23 12:59", "2026-04-24 21:44", 1),
    "BdC-1128h": ("b3a2/b3a2.parquet", "BdC-1128h", "2026-04-25 14:21", "2026-04-27 13:43", 1),
    "BdC-1034h": ("c1a/c1a.parquet", "BdC-1034h", "2026-05-28 19:29", "2026-05-30 15:57", 1),
    "BdC-1035h": ("c1a/c1a.parquet", "BdC-1035h", "2026-05-31 03:15", "2026-06-02 00:09", 1),
    "BdC-1036h": ("c1a/c1a.parquet", "BdC-1036h", "2026-06-02 07:28", "2026-06-03 22:25", 1),
    "BdC-1028h": ("b1b2/b1b_clean.parquet", "BdC-1028h", "2026-08-09 06:00", "2026-08-11 02:52", 1),
    "BdC-1029h": ("b1b2/b1b_clean.parquet", "BdC-1029h", "2026-08-17 11:12", "2026-08-19 18:00", 1),
    "BdC-1030h-r1": ("b1b2/b1b_clean.parquet", "BdC-1030h", "2026-08-20 03:32", "2026-08-21 03:28", 0),
    "BdC-1030h-r2": ("b1b2/b1b_clean.parquet", "BdC-1030h", "2026-08-21 13:24", "2026-08-22 15:32", 1),
    "BdC-1031h": ("b1b2/b1b_clean.parquet", "BdC-1031h", "2026-08-23 03:24", "2026-08-24 14:28", 1),
}
surveys = json.load(open("field-data/surveys.json"))
bins = pd.read_csv("field-data/bins.csv")
cache, out = {}, []
for run, (f, survey, a, b, ert) in RUNS.items():
    if f not in cache:
        d = pd.read_parquet(f"{base}/{f}")
        if "t" in d.columns:
            d = d.set_index("t")
        for c in ["W", "MD", "WHP", "Q"]:
            d.loc[d[c] <= -99999, c] = np.nan
        cache[f] = d[~d.index.duplicated()]
    r = cache[f].loc[a:b, ["W", "MD", "WHP", "Q"]].resample("30s").median()
    lp = next(s[0] for s in surveys[survey] if s[1] > 85)
    r["rate"] = (r.MD.shift(-2) - r.MD.shift(2)) / 2.0  # m/min over 2 min
    r["front"] = r.MD.cummax()
    mill = r[(r.MD > lp) & (r.rate > 0.03) & (r.rate < 1.5) & (r.MD > r.front - 3)].copy()
    free = bins[(bins.well == run) & (bins.dir == "RIH")].groupby("bin").W.median()
    if free.empty or mill.empty:
        continue
    fr = free.rolling(9, center=True, min_periods=3).median()
    mill["Wfree"] = np.interp(mill.MD, fr.index, fr.values)
    mill = mill[(mill.MD < fr.index.max() + 150)]
    mill["slack"] = mill.Wfree - mill.W
    mill["band"] = (mill.MD // 100 * 100 + 50)
    g = mill.groupby("band").agg(slack50=("slack", "median"), slack90=("slack", lambda x: x.quantile(0.9)), n=("slack", "size"),
                                 Wfree=("Wfree", "median"), WHP=("WHP", "median"), Q=("Q", "median")).reset_index()
    g = g[g.n >= 6]
    g["well"], g["survey"], g["ert"] = run, survey, ert
    out.append(g)
    print(f"{run:13s} LP {lp:5.0f}  bands {len(g):3d}  slack p90 median {g.slack90.median():6.0f}  max {g.slack90.max():6.0f}")
pd.concat(out).to_csv("field-data/slack.csv", index=False)
