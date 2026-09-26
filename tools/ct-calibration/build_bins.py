import pandas as pd, numpy as np, json
RUNS={
 "BdC-1126h":("b3a2/b3a2.parquet","2026-04-20 13:54","2026-04-22 22:49","B3A2"),
 "BdC-1127h":("b3a2/b3a2.parquet","2026-04-23 12:59","2026-04-24 21:44","B3A2"),
 "BdC-1128h":("b3a2/b3a2.parquet","2026-04-25 14:21","2026-04-27 13:43","B3A2"),
 "BdC-1034h":("c1a/c1a.parquet","2026-05-28 19:29","2026-05-30 15:57","C1A"),
 "BdC-1035h":("c1a/c1a.parquet","2026-05-31 03:15","2026-06-02 00:09","C1A"),
 "BdC-1036h":("c1a/c1a.parquet","2026-06-02 07:28","2026-06-03 22:25","C1A"),
}
cache={}
out={}
allpts=[]
for w,(f,a,b,pad) in RUNS.items():
    if f not in cache: cache[f]=pd.read_parquet(f).set_index("t")
    r=cache[f].loc[a:b].copy()
    sgn=np.sign(r.MD.diff(30).rolling(31,center=True).median())
    r["v"]=r.V.abs()*sgn                    # m/min signed (speed channel, direction from depth)
    r["vs"]=r.V.rolling(60,center=True).std()
    r["Wr"]=r.W.rolling(15,center=True).median()
    # steady moving: |v|>1.5, speed stable over 1 min, not reversing
    st=r[(r.v.abs()>1.5)&(r.vs<3.0)&r.Wr.notna()&r.MD.notna()]
    st=st.assign(dir=np.where(st.v>0,"RIH","POOH"))
    # continuous passes: new pass id each time direction changes or gap
    st["bin"]=(st.MD//25*25+12.5)
    # pass id to allow speed comparisons at same depth
    brk=(st.dir!=st.dir.shift())|(st.index.to_series().diff().dt.total_seconds()>120)
    st["pass"]=brk.cumsum()
    g=st.groupby(["dir","pass","bin"]).agg(W=("Wr","median"),Wp10=("Wr",lambda x:x.quantile(.1)),Wp90=("Wr",lambda x:x.quantile(.9)),
        v=("v",lambda x:abs(x).median()),Q=("Q","median"),WHP=("WHP","median"),CTP=("CTP","median"),n=("W","size"),t=("MD",lambda x:x.index[0].isoformat())).reset_index()
    g=g[g.n>=8]
    g["well"]=w; g["pad"]=pad
    allpts.append(g)
    print(w,pad,"steady rows",len(st),"bins",len(g),"RIH",(g.dir=="RIH").sum(),"POOH",(g.dir=="POOH").sum(),"passes",st["pass"].nunique())
df=pd.concat(allpts)
df.to_csv("bins.csv",index=False)
