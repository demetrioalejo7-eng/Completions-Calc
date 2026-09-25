import pandas as pd, sys
def load(src,dst):
    df=pd.read_csv(src,encoding="utf-8-sig",na_values=["-999.25","-Infinity","Infinity"])
    df=df.loc[:,~df.columns.str.startswith("Unnamed")]
    last=[c for c in df.columns if c.endswith("[Last]")]
    d=df[["DateTime"]+last].copy()
    d.columns=["t","W","CTP","WHP","MD","V","Q","Qret","WHP_fpdo","FRconc","FRrate","Qtot","DW"]
    d["t"]=pd.to_datetime(d["t"])
    d["Wmin"]=df["CT - Peso (lb) [Minimum]"]; d["Wmax"]=df["CT - Peso (lb) [Maximum]"]
    d.to_parquet(dst); return d
if __name__=="__main__":
    d=load(sys.argv[1],sys.argv[2])
    m=d.set_index("t").resample("1min").median(numeric_only=True)
    m["surf"]=m.MD<50
    chg=m.surf.ne(m.surf.shift()).cumsum()
    for g,s in m.groupby(chg):
        print(s.index[0], s.index[-1], "surf" if s.surf.iloc[0] else "IN-HOLE", "maxMD=%.0f"%s.MD.max(), "dur=%.1fh"%((s.index[-1]-s.index[0]).total_seconds()/3600))
