"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const reasons = [
  ["possible_duplicate", "Possible duplicate"],
  ["parentage_issue", "Parentage issue"],
  ["animal_details", "Animal details are wrong"],
  ["ownership_issue", "Ownership / stewardship issue"],
  ["other", "Other correction"],
] as const;

export function GtpRecordReportForm({ animalId, animalName }: { animalId: string; animalName: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("possible_duplicate");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/genetics/pedigree/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId, reason, details }),
      });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/genetics/database/${animalId}/report`)}`);
        return;
      }
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not submit report.");
      setMessage("Report submitted. The pedigree record was not changed automatically.");
      setDetails("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit report.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="panel rounded-[26px] p-5 sm:p-7">
    <div className="section-kicker">Lineage database quality</div>
    <h1 className="mt-3 text-2xl font-semibold text-white/82">Report a problem with {animalName}.</h1>
    <p className="mt-3 max-w-2xl text-xs leading-6 text-white/42">Reports are review requests only. They do not delete, merge, change ownership, or rewrite somebody else&apos;s pedigree automatically.</p>

    <label className="mt-6 block text-xs text-white/45">Reason
      <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-[#08130e] p-3 text-white/70">
        {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>

    <label className="mt-4 block text-xs text-white/45">What should we review?
      <textarea value={details} onChange={(event) => setDetails(event.target.value.slice(0, 2000))} rows={6} placeholder="For example: this appears to be the same animal as AP-GTP-…, or the listed sire may be incorrect." className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 p-3 text-white/70" />
      <span className="mt-1 block text-[10px] text-white/24">{details.length}/2000</span>
    </label>

    {message ? <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/52">{message}</div> : null}
    <div className="mt-5 flex flex-wrap gap-2">
      <button disabled={busy} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c] disabled:opacity-40">{busy ? "Submitting…" : "Submit report"}</button>
      <button type="button" onClick={() => router.push(`/genetics/database/${animalId}`)} className="rounded-xl border border-white/[.08] px-4 py-2.5 text-xs font-bold text-white/55">Back to record</button>
    </div>
  </form>;
}
