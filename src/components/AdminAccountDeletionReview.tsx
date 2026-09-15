"use client";

import { useEffect,useState } from "react";

type Row={
  id:string;user_id:string;status:"pending"|"reviewing"|"ready_for_processing";reason:string|null;staff_note:string|null;created_at:string;updated_at:string;
  profile:{username:string|null;display_name:string|null}|null;
};

function label(status:Row["status"]){return status==="ready_for_processing"?"Ready for processing":status==="reviewing"?"Reviewing":"Pending"}

export function AdminAccountDeletionReview(){
  const [rows,setRows]=useState<Row[]>([]);
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  async function refresh(){
    const response=await fetch("/api/admin/account-deletions",{cache:"no-store"});
    const data=await response.json().catch(()=>null) as {rows?:Row[];error?:string}|null;
    if(!response.ok)throw new Error(data?.error||"Could not load deletion requests.");
    const next=data?.rows??[];
    setRows(next);
    setNotes(Object.fromEntries(next.map(row=>[row.id,row.staff_note??""])));
  }

  useEffect(()=>{let active=true;void fetch("/api/admin/account-deletions",{cache:"no-store"}).then(async response=>({response,data:await response.json().catch(()=>null) as {rows?:Row[];error?:string}|null})).then(({response,data})=>{if(!active)return;if(!response.ok)throw new Error(data?.error||"Could not load deletion requests.");const next=data?.rows??[];setRows(next);setNotes(Object.fromEntries(next.map(row=>[row.id,row.staff_note??""])))}).catch(error=>{if(active)setMessage(error instanceof Error?error.message:"Could not load deletion requests.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);

  async function act(row:Row,action:Row["status"]){
    if(busy)return;
    setBusy(row.id);setMessage("Saving review state…");
    try{
      const response=await fetch("/api/admin/account-deletions",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,action,note:notes[row.id]??""})});
      const data=await response.json().catch(()=>null) as {error?:string}|null;
      if(!response.ok)throw new Error(data?.error||"Could not update deletion request.");
      await refresh();setMessage("Review state updated.");
    }catch(error){setMessage(error instanceof Error?error.message:"Could not update deletion request.")}finally{setBusy(null)}
  }

  if(loading)return <div className="panel rounded-3xl p-8 text-sm text-white/35">Loading deletion requests…</div>;
  return <div className="space-y-4">
    {message?<div role="status" className="rounded-xl border border-white/[.06] bg-black/10 px-4 py-3 text-xs text-white/40">{message}</div>:null}
    {!rows.length?<div className="panel rounded-3xl py-12 text-center"><div className="font-semibold text-white/58">No active deletion requests.</div><p className="mt-2 text-xs text-white/28">Pending, reviewing and ready-for-processing requests will appear here.</p></div>:rows.map(row=>{
      const name=row.profile?.display_name||row.profile?.username||"Account holder";
      return <article key={row.id} className="panel rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[9px] font-black uppercase tracking-[.13em] text-red-200/45">Account deletion request</div><h3 className="mt-2 text-lg font-semibold text-white/72">{name}</h3>{row.profile?.username?<div className="mt-1 text-xs text-white/30">@{row.profile.username}</div>:null}</div><span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] ${row.status==="ready_for_processing"?"border-amber-300/20 text-amber-100/65":row.status==="reviewing"?"border-sky-300/20 text-sky-100/65":"border-white/[.08] text-white/35"}`}>{label(row.status)}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/22">Requested</div><div className="mt-2 text-xs text-white/44">{new Date(row.created_at).toLocaleString()}</div></div><div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/22">Last updated</div><div className="mt-2 text-xs text-white/44">{new Date(row.updated_at).toLocaleString()}</div></div></div>
        {row.reason?<div className="mt-3 rounded-2xl border border-white/[.06] bg-black/10 p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/22">User note</div><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-white/40">{row.reason}</p></div>:null}
        <label className="mt-4 block text-xs font-semibold text-white/42">Staff processing note<textarea value={notes[row.id]??""} onChange={event=>setNotes(current=>({...current,[row.id]:event.target.value.slice(0,2000)}))} maxLength={2000} placeholder="Record checks needed before processing: public posts, lineage attribution, marketplace history, etc." className="mt-2 min-h-24 w-full rounded-xl border border-white/[.08] bg-black/15 p-3 text-sm text-white/65 outline-none placeholder:text-white/18"/></label>
        <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy===row.id} onClick={()=>void act(row,"reviewing")} className="rounded-xl border border-sky-300/15 px-3 py-2 text-[10px] font-black text-sky-100/60 disabled:opacity-40">Start review</button><button disabled={busy===row.id} onClick={()=>void act(row,"ready_for_processing")} className="rounded-xl border border-amber-300/15 px-3 py-2 text-[10px] font-black text-amber-100/60 disabled:opacity-40">Ready for processing</button><button disabled={busy===row.id} onClick={()=>void act(row,"pending")} className="rounded-xl border border-white/[.08] px-3 py-2 text-[10px] font-black text-white/35 disabled:opacity-40">Return to pending</button></div>
        <p className="mt-4 text-[10px] leading-5 text-white/22">This queue does not delete authentication records. “Ready for processing” means the request has been reviewed and the account/data handling step still needs to be completed deliberately.</p>
      </article>;
    })}
  </div>;
}
