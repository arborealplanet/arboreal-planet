"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DeletionStatus = "pending" | "reviewing" | "ready_for_processing" | "cancelled" | "completed";
type DeletionRequest = {
  id: string;
  status: DeletionStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function statusLabel(value:DeletionStatus){return value==="ready_for_processing"?"Ready for processing":value==="reviewing"?"Reviewing":value.charAt(0).toUpperCase()+value.slice(1)}

export function AccountDeletionRequestPanel() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Checking your account…");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/account-deletion", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          setSignedIn(false);
          setRequest(null);
          setStatus("Sign in to submit or review an account deletion request.");
          return;
        }
        const data = await response.json().catch(() => null) as { request?: DeletionRequest | null; error?: string } | null;
        if (!response.ok) throw new Error(data?.error || "Could not load deletion request.");
        if (!active) return;
        setSignedIn(true);
        setRequest(data?.request ?? null);
        setStatus(data?.request ? `Latest request: ${statusLabel(data.request.status)}.` : "No account deletion request is currently on file.");
      } catch (error) {
        if (!active) return;
        setSignedIn(null);
        setStatus(error instanceof Error ? error.message : "Could not load deletion request.");
      }
    })();
    return () => { active = false; };
  }, []);

  async function submit() {
    if (!window.confirm("Submit an account deletion request? This does not delete the account immediately. You can cancel while the request is still pending.")) return;
    setBusy(true);
    setStatus("Submitting deletion request…");
    try {
      const response = await fetch("/api/account-deletion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const data = await response.json().catch(() => null) as { request?: DeletionRequest | null; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not submit deletion request.");
      setRequest(data?.request ?? null);
      setReason("");
      setStatus("Deletion request submitted. Your account remains active while the request is pending.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not submit deletion request."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!window.confirm("Cancel your pending account deletion request?")) return;
    setBusy(true); setStatus("Cancelling deletion request…");
    try {
      const response = await fetch("/api/account-deletion", { method: "DELETE" });
      const data = await response.json().catch(() => null) as { request?: DeletionRequest | null; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not cancel deletion request.");
      setRequest(data?.request ?? null);
      setStatus("Deletion request cancelled. Your account remains active.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not cancel deletion request."); }
    finally { setBusy(false); }
  }

  const badgeClass=request?.status==="pending"?"border-amber-200/15 text-amber-100/65":request?.status==="reviewing"?"border-sky-300/15 text-sky-100/65":request?.status==="ready_for_processing"?"border-orange-300/15 text-orange-100/65":request?.status==="completed"?"border-emerald-300/15 text-emerald-100/65":"border-white/[.08] text-white/35";

  return <section className="mx-auto max-w-5xl px-5 pb-8 sm:px-6"><div className="panel rounded-[28px] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-kicker">Deletion request</div><h2 className="mt-2 text-2xl font-semibold text-white/82">Request account deletion</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-white/40">Submitting a request does not immediately erase the account. It creates a reviewable request so identity, public content and linked lineage records can be handled correctly.</p></div><span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] ${badgeClass}`}>{signedIn===false?"Sign in required":request?statusLabel(request.status):(signedIn?"No request":"Checking")}</span></div>
    <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>
    {signedIn===false?<div className="mt-4"><Link href="/login?next=%2Faccount-deletion" className="primary-action !min-h-0 !px-4 !py-2.5 !text-xs">Sign in to continue</Link></div>:null}
    {signedIn&&request?<div className="mt-5 grid gap-3 md:grid-cols-3"><div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Status</div><div className="mt-2 text-sm font-semibold text-white/68">{statusLabel(request.status)}</div></div><div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Submitted</div><div className="mt-2 text-xs text-white/48">{formatDate(request.created_at)}</div></div><div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Last updated</div><div className="mt-2 text-xs text-white/48">{formatDate(request.updated_at)}</div></div>{request.reason?<div className="md:col-span-3 rounded-2xl border border-white/[.06] bg-black/10 p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Your note</div><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-white/42">{request.reason}</p></div>:null}{request.status==="pending"?<div className="md:col-span-3"><button type="button" disabled={busy} onClick={()=>void cancel()} className="rounded-xl border border-red-300/15 px-4 py-2.5 text-xs font-bold text-red-100/60 disabled:opacity-40">Cancel pending request</button></div>:null}</div>:null}
    {signedIn&&(!request||request.status==="cancelled")?<div className="mt-5 rounded-2xl border border-white/[.06] bg-black/10 p-4"><label className="text-xs font-semibold text-white/48">Optional note<textarea value={reason} onChange={event=>setReason(event.target.value.slice(0,1000))} maxLength={1000} placeholder="Anything you want Arboreal Planet to know about the request…" className="mt-2 min-h-28 w-full rounded-xl border border-white/[.08] bg-black/20 p-3 text-sm text-white/72 outline-none placeholder:text-white/20" /></label><div className="mt-2 text-right text-[9px] text-white/22">{reason.length}/1000</div><button type="button" disabled={busy} onClick={()=>void submit()} className="mt-3 rounded-xl border border-red-300/18 bg-red-300/[.035] px-4 py-2.5 text-xs font-black text-red-100/70 disabled:opacity-40">Submit deletion request</button></div>:null}
  </div></section>;
}
