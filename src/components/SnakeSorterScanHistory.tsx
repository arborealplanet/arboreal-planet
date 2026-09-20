"use client";

import { useEffect, useMemo, useState } from "react";

type ScanModel = {
  id: string;
  name: string;
  version: string;
  status: string;
};

type ScanFeedback = {
  id: string;
  feedback_type: "confirmed" | "corrected" | "uncertain" | "insufficient_media";
  predicted_taxon: string | null;
  corrected_taxon: string | null;
  corrected_life_stage: string | null;
  corrected_neonate_color: string | null;
  notes: string | null;
  created_at: string;
};

type ScanRun = {
  id: string;
  model_version_id: string | null;
  evidence_frame_count: number;
  source_asset_count: number;
  source_image_count: number;
  source_video_count: number;
  life_stage_hint: string | null;
  color_hint: string | null;
  scan_mode: "quick" | "deep" | "live";
  result_taxon: string | null;
  result_confidence: number | null;
  status: "prepared" | "completed" | "rejected" | "error";
  error_code: string | null;
  confirmed_by_owner: boolean | null;
  created_at: string;
  model: ScanModel | null;
  feedback: ScanFeedback | null;
};

type Summary = {
  total: number;
  completed: number;
  confirmed: number;
  corrected: number;
  uncertain: number;
  insufficient: number;
};

const emptySummary: Summary = {
  total: 0,
  completed: 0,
  confirmed: 0,
  corrected: 0,
  uncertain: 0,
  insufficient: 0,
};

function badge(value: string) {
  if (value === "confirmed" || value === "completed") return "border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/60";
  if (value === "corrected" || value === "error") return "border-rose-300/15 bg-rose-300/[.04] text-rose-100/60";
  if (value === "uncertain" || value === "insufficient_media" || value === "rejected") return "border-amber-300/15 bg-amber-300/[.04] text-amber-100/60";
  return "border-white/[.07] bg-white/[.02] text-white/30";
}

export function SnakeSorterScanHistory() {
  const [runs, setRuns] = useState<ScanRun[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "confirmed" | "corrected" | "needs_review">("all");

  async function load() {
    const response = await fetch("/api/snake-sorter/history", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setRuns(data.runs ?? []);
      setSummary(data.summary ?? emptySummary);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/snake-sorter/history", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!active || !response.ok) return;
        setRuns(data.runs ?? []);
        setSummary(data.summary ?? emptySummary);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return runs;
    if (filter === "confirmed") return runs.filter((run) => run.feedback?.feedback_type === "confirmed");
    if (filter === "corrected") return runs.filter((run) => run.feedback?.feedback_type === "corrected");
    return runs.filter((run) => !run.feedback || run.feedback.feedback_type === "uncertain" || run.feedback.feedback_type === "insufficient_media");
  }, [filter, runs]);

  const reviewed = summary.confirmed + summary.corrected + summary.uncertain + summary.insufficient;
  const agreement = summary.confirmed + summary.corrected > 0
    ? summary.confirmed / (summary.confirmed + summary.corrected)
    : null;

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Model review</div>
          <h2 className="mt-2 text-2xl font-semibold">Recent scans</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/30">Review real-world identification performance without storing the original scan media.</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-xl border border-white/[.07] bg-black/[.08] px-3 py-2 text-[10px] font-black text-white/40 transition hover:text-white/65">Refresh</button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Recent runs", summary.total],
          ["Reviewed", reviewed],
          ["Confirmed", summary.confirmed],
          ["Corrected", summary.corrected],
          ["Uncertain", summary.uncertain],
          ["Agreement", agreement == null ? "—" : `${Math.round(agreement * 100)}%`],
        ].map(([name, value]) => (
          <div key={String(name)} className="rounded-2xl border border-white/[.055] bg-black/[.07] p-3">
            <div className="text-lg font-semibold text-white/60">{value}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/20">{name}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["all","All"],
          ["confirmed","Confirmed"],
          ["corrected","Corrected"],
          ["needs_review","Needs review"],
        ].map(([value,label]) => (
          <button key={value} type="button" onClick={() => setFilter(value as typeof filter)} className={`rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[.08em] transition ${filter===value?"border-sky-300/18 bg-sky-300/[.05] text-sky-100/60":"border-white/[.06] bg-black/[.06] text-white/28 hover:text-white/48"}`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/[.07] p-8 text-center text-xs text-white/24">Loading scan history…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/[.07] p-8 text-center">
          <div className="text-sm font-semibold text-white/34">No matching scan runs yet.</div>
          <div className="mt-2 text-xs text-white/20">Completed model scans and owner feedback will appear here once the vision model is connected.</div>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {filtered.slice(0,20).map((run) => {
            const feedback = run.feedback?.feedback_type;
            const result = run.result_taxon || (run.status === "prepared" ? "Model not connected" : "No result");
            return (
              <div key={run.id} className="rounded-2xl border border-white/[.055] bg-black/[.06] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white/55">{result}</span>
                      {run.result_confidence != null && <span className="text-[10px] font-semibold text-white/28">{Math.round(run.result_confidence*100)}%</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-[.06em] text-white/20">
                      <span>{run.scan_mode} scan</span>
                      <span>{run.evidence_frame_count} frames</span>
                      <span>{run.source_image_count} photos</span>
                      <span>{run.source_video_count} videos</span>
                      <span>{new Date(run.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${badge(run.status)}`}>{run.status}</span>
                    {feedback && <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${badge(feedback)}`}>{feedback.replace("_"," ")}</span>}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[.045] bg-black/[.06] px-3 py-2">
                    <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Model</div>
                    <div className="mt-1 text-[10px] text-white/34">{run.model ? `${run.model.name} ${run.model.version}` : "No active model"}</div>
                  </div>
                  <div className="rounded-xl border border-white/[.045] bg-black/[.06] px-3 py-2">
                    <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Stage / color hint</div>
                    <div className="mt-1 text-[10px] text-white/34">{run.life_stage_hint || "auto"} · {run.color_hint || "auto"}</div>
                  </div>
                  <div className="rounded-xl border border-white/[.045] bg-black/[.06] px-3 py-2">
                    <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Owner review</div>
                    <div className="mt-1 text-[10px] text-white/34">{run.feedback?.corrected_taxon ? `Corrected to ${run.feedback.corrected_taxon}` : feedback ? feedback.replace("_"," ") : "Not reviewed"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
