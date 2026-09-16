"use client";

import { useEffect,useState } from "react";

type Row={id:string;username:string|null;display_name:string|null;role:"user"|"moderator"|"admin"|"owner";seller_verification_status:string|null;created_at:string};

export function OwnerRoleManager(){
  const [rows,setRows]=useState<Row[]>([]),[query,setQuery]=useState(""),[busy,setBusy]=useState<string|null>(null),[status,setStatus]=useState("Loading users…");

  async function load(search=query){
    setStatus("Loading users…");
    const response=await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`,{cache:"no-store"});
    const data=await response.json().catch(()=>null) as {rows?:Row[];error?:string}|null;
    if(!response.ok){setRows([]);setStatus(data?.error||"Could not load users.");return}
    setRows(data?.rows??[]);setStatus(`${data?.rows?.length??0} account${(data?.rows?.length??0)===1?"":"s"}`);
  }

  useEffect(()=>{
    let active=true;
    void (async()=>{
      const response=await fetch("/api/admin/users?q=",{cache:"no-store"});
      const data=await response.json().catch(()=>null) as {rows?:Row[];error?:string}|null;
      if(!active)return;
      if(!response.ok){setRows([]);setStatus(data?.error||"Could not load users.");return}
      setRows(data?.rows??[]);setStatus(`${data?.rows?.length??0} account${(data?.rows?.length??0)===1?"":"s"}`);
    })();
    return()=>{active=false};
  },[]);

  async function updateRole(userId:string,role:string){
    if(!window.confirm(`Change this account role to ${role}?`))return;
    setBusy(userId);
    const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,role})});
    const data=await response.json().catch(()=>null) as {role?:string;error?:string}|null;
    if(!response.ok){setStatus(data?.error||"Could not update role.");setBusy(null);return}
    setRows(current=>current.map(row=>row.id===userId?{...row,role:(data?.role??role) as Row["role"]}:row));
    setStatus(`Role updated to ${data?.role??role}.`);
    setBusy(null);
  }

  return <div className="panel rounded-[28px] p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="section-kicker">Owner-only access</div><h3 className="mt-2 text-xl font-semibold">User roles</h3><p className="mt-2 max-w-2xl text-xs leading-5 text-white/34">Promote trusted accounts to moderator or admin. The owner tier is protected and cannot be assigned, demoted, or changed here.</p></div>
      <form onSubmit={e=>{e.preventDefault();void load(query)}} className="flex gap-2"><input value={query} onChange={e=>setQuery(e.target.value.slice(0,120))} placeholder="Search name or username" className="rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-xs text-white/70 outline-none placeholder:text-white/20"/><button className="rounded-xl border border-amber-300/15 px-3 py-2.5 text-xs font-black text-amber-100/65">Search</button></form>
    </div>
    <div className="mt-4 text-[10px] text-white/28">{status}</div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left text-xs"><thead className="text-[9px] font-black uppercase tracking-[.1em] text-white/22"><tr><th className="px-3">Account</th><th className="px-3">Seller</th><th className="px-3">Joined</th><th className="px-3">Role</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="bg-white/[.018]"><td className="rounded-l-xl px-3 py-3"><div className="font-semibold text-white/68">{row.display_name||row.username||"Unnamed account"}</div><div className="mt-1 text-[10px] text-white/28">{row.username?`@${row.username}`:"No username"}</div></td><td className="px-3 py-3 text-white/40">{row.seller_verification_status||"unverified"}</td><td className="px-3 py-3 text-white/35">{new Date(row.created_at).toLocaleDateString()}</td><td className="rounded-r-xl px-3 py-3">{row.role==="owner"?<span className="rounded-full border border-amber-300/15 bg-amber-300/[.04] px-3 py-1.5 text-[9px] font-black uppercase text-amber-100/70">Owner · protected</span>:<select disabled={busy===row.id} value={row.role} onChange={e=>void updateRole(row.id,e.target.value)} className="rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-2 text-xs text-white/65 disabled:opacity-40"><option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select>}</td></tr>)}</tbody></table></div>
  </div>;
}
