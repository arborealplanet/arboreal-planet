"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReportRow = {
  report_id: string;
  animal_id: string;
  registry_code: string | null;
  animal_name: string;
  reason: string;
  details: string;
  report_status: string;
  created_at: string;
  reporter_username: string | null;
  reporter_display_name: string | null;
  record_status: string;
};

const reasonLabel: Record<string, string> = {
  possible_duplicate: "Possible duplicate",
  parentage_issue: "Parentage issue",
  animal_details: "Animal details",
  ownership_issue: "Ownership / stewardship",
  other: "Other correction",
};

export function AdminGtpPedigreeReports() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [status, setStatus] = useState("Loading lineage reports…");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/genetics/reports", { cache: "no-store" });
    const data = await response.json().catch(() => null) as { reports?: ReportRow[]; error?: string } | null;
    if (!response.ok) {
      setStatus(data?.error || "Could not load lineage reports.");
      return;
    }
    const rows = Array.isArray(data?.reports) ? data.reports : [];
    setReports(rows);
    setStatus(rows.length ? `${rows.filter((row) => row.report_status === "open").length} open lineage report${rows.filter((row) => row.report_status === "open").length === 1 ? "" : "s"}.` : "No lineage reports yet.");
  }

  useEffect(() => { void load(); }, []);

  async function review(reportId: string, action: "dismiss" | "resolve" | "mark_reviewed") {
    setBusyId(reportId);
    const response = await fetch("/api/admin/genetics/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) setStatus(data?.error || "Could not review lineage report.");
    else await load();
    setBusyId(null);
  }

  const openReports = reports.filter((row) => row.report_status === "open");
  const history = reports.filter((row) => row.report_status !== "open").slice(0, 20);

  return <div className="space-y-4">
    <div role="status" className="panel-soft rounded-2xl p-4 text-xs text-white/48">{status}</div>
    {openReports.length ? <div className="grid gap-4 lg:grid-cols-2">{openReports.map((row) => <article key={row.report_id} className="panel rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.13em] text-amber-200/65">{reasonLabel[row.reason] || row.reason}</div><Link href={`/genetics/database/${encodeURIComponent(row.animal_id)}`} className="mt-2 block text-lg font-semibold text-white/76 hover:text-emerald-100">{row.animal_name}</Link><div className="mt-1 font-mono text-[10px] text-emerald-200/45">{row.registry_code || row.animal_id}</div></div><span className="rounded-full border border-white/[.08] px-2.5 py-1 text-[9px] font-bold text-white/42">{row.record_status?.replaceAll("_", " ")}</span></div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/52">{row.details || "No additional details supplied."}</p>
      <div className="mt-4 text-[10px] text-white/28">Reported by {row.reporter_display_name || row.reporter_username || "member"} · {new Date(row.created_at).toLocaleDateString()}</div>
      <div className="mt-5 flex flex-wrap gap-2"><button disabled={busyId === row.report_id} onClick={() => void review(row.report_id, "mark_reviewed")} className="rounded-xl bg-emerald-300 px-3 py-2 text-[10px] font-black text-[#06100c] disabled:opacity-40">Resolve + mark reviewed</button><button disabled={busyId === row.report_id} onClick={() => void review(row.report_id, "resolve")} className="rounded-xl border border-white/[.08] px-3 py-2 text-[10px] font-bold text-white/55 disabled:opacity-40">Resolve only</button><button disabled={busyId === row.report_id} onClick={() => void review(row.report_id, "dismiss")} className="rounded-xl border border-red-300/10 px-3 py-2 text-[10px] font-bold text-red-200/60 disabled:opacity-40">Dismiss</button></div>
    </article>)}</div> : <div className="panel rounded-3xl py-10 text-center text-sm text-white/35">No open lineage reports.</div>}

    {history.length ? <details className="panel rounded-3xl p-5"><summary className="cursor-pointer text-sm font-semibold text-white/58">Recent reviewed reports</summary><div className="mt-4 space-y-2">{history.map((row) => <div key={row.report_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[.055] p-3 text-xs"><div><span className="font-semibold text-white/55">{row.animal_name}</span><span className="ml-2 text-white/25">{reasonLabel[row.reason] || row.reason}</span></div><span className="uppercase text-white/28">{row.report_status}</span></div>)}</div></details> : null}
  </div>;
}
