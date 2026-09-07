"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ListingOwnerControls({id,status}:{id:string;status:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function update(next:string){
    if(busy)return;
    setBusy(true);
    setError("");
    const r=await fetch(`/api/marketplace/listings/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});
    if(!r.ok){
      const data=await r.json().catch(()=>null);
      setError(data?.error||"Could not update listing");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  async function remove(){
    if(!confirm("Remove this listing from the marketplace? You can reactivate it later."))return;
    await update("REMOVED");
  }

  return <div>
    <div className="flex flex-wrap gap-2">
      {status==="ACTIVE"&&<button disabled={busy} onClick={()=>update("SOLD")} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c] disabled:opacity-50">Mark sold</button>}
      {status==="SOLD"&&<button disabled={busy} onClick={()=>update("ACTIVE")} className="rounded-xl border border-emerald-300/20 px-4 py-2.5 text-xs font-bold text-emerald-200 disabled:opacity-50">Relist</button>}
      {status==="REMOVED"&&<button disabled={busy} onClick={()=>update("ACTIVE")} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c] disabled:opacity-50">Reactivate</button>}
      {status!=="REMOVED"&&<button disabled={busy} onClick={remove} className="rounded-xl border border-red-300/15 px-4 py-2.5 text-xs font-bold text-red-200/70 disabled:opacity-50">Remove</button>}
    </div>
    {error&&<p className="mt-2 text-[11px] text-red-200/70">{error}</p>}
  </div>;
}
