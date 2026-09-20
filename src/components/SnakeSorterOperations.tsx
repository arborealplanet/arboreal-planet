"use client";

import { useEffect, useState } from "react";

type WindowSummary = {
  total:number; completed:number; errors:number; rejected:number;
  success_rate:number|null; rejection_rate:number|null;
  request_p50_ms:number|null; request_p95_ms:number|null;
  inference_p50_ms:number|null; inference_p95_ms:number|null;
  error_codes:Record<string,number>;
};
type OperationsData = {
  last_24h:WindowSummary; last_7d:WindowSummary;
  recent_errors:Array<{error_code:string|null;scan_mode:string;created_at:string}>;
};
const empty:WindowSummary={total:0,completed:0,errors:0,rejected:0,success_rate:null,rejection_rate:null,request_p50_ms:null,request_p95_ms:null,inference_p50_ms:null,inference_p95_ms:null,error_codes:{}};
const duration=(value:number|null)=>value==null?"—":value<1000?`${value} ms`:`${(value/1000).toFixed(1)} s`;

export function SnakeSorterOperations() {
  const [data,setData]=useState<OperationsData>({last_24h:empty,last_7d:empty,recent_errors:[]});
  const [loading,setLoading]=useState(true);
  async function load(){
    const response=await fetch("/api/snake-sorter/operations",{cache:"no-store"});
    const payload=await response.json().catch(()=>({}));
    if(response.ok) setData(payload as OperationsData);
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);
  const summary=data.last_24h;
  return <section className="panel rounded-[28px] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="section-kicker">Operations</div><h2 className="mt-2 text-2xl font-semibold">Inference health</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/30">Measured scan reliability and latency. Original scan media is not stored for these metrics.</p></div>
      <button type="button" onClick={()=>void load()} className="rounded-xl border border-white/[.07] bg-black/[.08] px-3 py-2 text-[10px] font-black text-white/40">Refresh</button>
    </div>
    {loading?<div className="mt-5 text-xs text-white/22">Loading operations…</div>:<>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {[
          ["24h scans",summary.total],
          ["Success",summary.success_rate==null?"—":`${Math.round(summary.success_rate*100)}%`],
          ["Errors",summary.errors],
          ["Unknown/review",summary.rejection_rate==null?"—":`${Math.round(summary.rejection_rate*100)}%`],
          ["Request p50",duration(summary.request_p50_ms)],
          ["Request p95",duration(summary.request_p95_ms)],
          ["Inference p50",duration(summary.inference_p50_ms)],
          ["Inference p95",duration(summary.inference_p95_ms)],
        ].map(([name,value])=><div key={String(name)} className="rounded-2xl border border-white/[.055] bg-black/[.06] p-3"><div className="text-sm font-semibold text-white/55">{value}</div><div className="mt-1 text-[8px] font-black uppercase tracking-[.07em] text-white/20">{name}</div></div>)}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/[.055] bg-black/[.06] p-4"><div className="text-[9px] font-black uppercase tracking-[.09em] text-white/24">Last 7 days</div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><div className="text-lg font-semibold text-white/55">{data.last_7d.total}</div><div className="text-[8px] uppercase text-white/18">Scans</div></div><div><div className="text-lg font-semibold text-white/55">{data.last_7d.errors}</div><div className="text-[8px] uppercase text-white/18">Errors</div></div><div><div className="text-lg font-semibold text-white/55">{data.last_7d.rejected}</div><div className="text-[8px] uppercase text-white/18">Unknown</div></div></div></div>
        <div className="rounded-2xl border border-white/[.055] bg-black/[.06] p-4"><div className="text-[9px] font-black uppercase tracking-[.09em] text-white/24">Recent errors</div>{data.recent_errors.length===0?<div className="mt-3 text-[10px] text-white/20">No measured inference errors yet.</div>:<div className="mt-3 space-y-1">{data.recent_errors.slice(0,6).map((row,index)=><div key={`${row.created_at}-${index}`} className="flex items-center justify-between gap-3 text-[9px]"><span className="truncate text-rose-100/42">{row.error_code||"unknown_error"}</span><span className="shrink-0 text-white/18">{new Date(row.created_at).toLocaleString()}</span></div>)}</div>}</div>
      </div>
    </>}
  </section>;
}
