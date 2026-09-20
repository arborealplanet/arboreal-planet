"use client";

import { useEffect, useState } from "react";

type ModelVersion = {
  id: string;
  name: string;
  version: string;
  status: "draft" | "training" | "evaluating" | "candidate" | "active" | "retired" | "failed";
  architecture: string | null;
  encoder_name: string | null;
  embedding_dimension: number | null;
  labels: unknown;
  training_animal_count: number | null;
  training_media_count: number | null;
  metrics: Record<string, unknown> | null;
  calibration: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  activated_at: string | null;
};

const statusClass: Record<ModelVersion["status"], string> = {
  draft: "border-white/[.08] text-white/35",
  training: "border-sky-300/15 bg-sky-300/[.04] text-sky-100/60",
  evaluating: "border-violet-300/15 bg-violet-300/[.04] text-violet-100/60",
  candidate: "border-amber-300/15 bg-amber-300/[.04] text-amber-100/65",
  active: "border-emerald-300/20 bg-emerald-300/[.05] text-emerald-100/70",
  retired: "border-white/[.06] text-white/25",
  failed: "border-rose-300/15 bg-rose-300/[.04] text-rose-100/60",
};

function metricValue(metrics: Record<string, unknown> | null, key: string) {
  const raw = metrics?.[key];
  return typeof raw === "number" ? raw : null;
}

export function SnakeSorterModelStatus() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/snake-sorter/models", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setModels(data.models ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/snake-sorter/models", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (active && response.ok) setModels(data.models ?? []);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function activate(model: ModelVersion) {
    setActivating(model.id);
    setMessage("");
    const response = await fetch("/api/snake-sorter/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", model_id: model.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(`${model.name} ${model.version} is now active.`);
      await load();
    } else setMessage(data.error ?? "Could not activate model.");
    setActivating("");
  }

  const activeModel = models.find((model) => model.status === "active");
  const candidates = models.filter((model) => model.status === "candidate");

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Model control</div>
          <h2 className="mt-2 text-2xl font-semibold">Vision model registry</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/30">Model releases are versioned. A candidate must be explicitly promoted before it can replace the active classifier.</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] ${activeModel ? statusClass.active : statusClass.draft}`}>{activeModel ? "Active model" : "No active model"}</span>
      </div>

      {loading ? <div className="mt-5 text-xs text-white/25">Loading model registry…</div> :
      models.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/[.08] bg-black/[.06] p-6">
          <div className="text-sm font-semibold text-white/38">No trained models registered yet.</div>
          <p className="mt-2 text-xs leading-5 text-white/22">That is expected while the reference dataset is being built. Training jobs will register their model version, metrics, calibration and dataset snapshot here.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {models.slice(0,8).map((model) => {
            const accuracy = metricValue(model.metrics, "accuracy");
            const macroF1 = metricValue(model.metrics, "macro_f1");
            return <div key={model.id} className="rounded-2xl border border-white/[.06] bg-black/[.07] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/62">{model.name} <span className="text-white/28">{model.version}</span></div>
                  <div className="mt-1 text-[10px] text-white/23">{model.encoder_name || model.architecture || "Model architecture not recorded"}{model.embedding_dimension ? ` · ${model.embedding_dimension}d embeddings` : ""}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${statusClass[model.status]}`}>{model.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div><div className="text-[8px] uppercase text-white/18">Animals</div><div className="mt-1 text-xs text-white/45">{model.training_animal_count ?? "—"}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Images</div><div className="mt-1 text-xs text-white/45">{model.training_media_count ?? "—"}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Accuracy</div><div className="mt-1 text-xs text-white/45">{accuracy == null ? "—" : `${Math.round(accuracy * 1000) / 10}%`}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Macro F1</div><div className="mt-1 text-xs text-white/45">{macroF1 == null ? "—" : `${Math.round(macroF1 * 1000) / 10}%`}</div></div>
              </div>
              {model.notes && <div className="mt-3 text-[10px] leading-5 text-white/24">{model.notes}</div>}
              {model.status === "candidate" && <button type="button" disabled={Boolean(activating)} onClick={() => void activate(model)} className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[.04] px-3 py-2 text-[10px] font-black text-amber-100/60 disabled:opacity-40">{activating === model.id ? "Activating…" : "Promote candidate to active"}</button>}
            </div>;
          })}
        </div>
      )}

      {candidates.length > 1 && <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-[10px] leading-5 text-amber-50/40">Multiple candidate models are available. Compare held-out metrics and error patterns before promoting one.</div>}
      {message && <div className="mt-3 text-xs text-white/38">{message}</div>}
    </section>
  );
}
