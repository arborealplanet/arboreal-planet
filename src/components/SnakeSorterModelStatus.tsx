"use client";

import { useEffect, useState } from "react";

type DatasetSnapshot = {
  id: string;
  name: string;
  manifest_sha256: string;
  animal_count: number;
  media_count: number;
  notes: string | null;
  created_at: string;
};

type InferenceStatus = {
  configured: boolean;
  online: boolean;
  modelVersion?: string | null;
  device?: string | null;
  references?: number;
  message?: string;
};

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
  dataset_snapshot_id?: string | null;
  training_manifest_hash?: string | null;
  metrics: Record<string, unknown> | null;
  calibration: Record<string, unknown> | null;
  notes: string | null;
  artifact_storage_path?: string | null;
  artifact_sha256?: string | null;
  artifact_size_bytes?: number | null;
  artifact_format?: string | null;
  rules_version?: string | null;
  inference_config?: Record<string, unknown> | null;
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

function objectValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

export function SnakeSorterModelStatus() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [snapshots, setSnapshots] = useState<DatasetSnapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState("");
  const [message, setMessage] = useState("");
  const [inferenceStatus, setInferenceStatus] = useState<InferenceStatus>({ configured: false, online: false });

  async function load() {
    const [modelsResponse, snapshotsResponse, inferenceResponse] = await Promise.all([
      fetch("/api/snake-sorter/models", { cache: "no-store" }),
      fetch("/api/snake-sorter/snapshots", { cache: "no-store" }),
      fetch("/api/snake-sorter/inference-status", { cache: "no-store" }),
    ]);
    const [modelsData, snapshotsData, inferenceData] = await Promise.all([
      modelsResponse.json().catch(() => ({})),
      snapshotsResponse.json().catch(() => ({})),
      inferenceResponse.json().catch(() => ({})),
    ]);
    if (modelsResponse.ok) setModels(modelsData.models ?? []);
    if (snapshotsResponse.ok) setSnapshots(snapshotsData.snapshots ?? []);
    if (inferenceResponse.ok) setInferenceStatus(inferenceData as InferenceStatus);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/snake-sorter/models", { cache: "no-store" }),
      fetch("/api/snake-sorter/snapshots", { cache: "no-store" }),
      fetch("/api/snake-sorter/inference-status", { cache: "no-store" }),
    ])
      .then(async ([modelsResponse, snapshotsResponse, inferenceResponse]) => {
        const [modelsData, snapshotsData, inferenceData] = await Promise.all([
          modelsResponse.json().catch(() => ({})),
          snapshotsResponse.json().catch(() => ({})),
          inferenceResponse.json().catch(() => ({})),
        ]);
        if (!active) return;
        if (modelsResponse.ok) setModels(modelsData.models ?? []);
        if (snapshotsResponse.ok) setSnapshots(snapshotsData.snapshots ?? []);
        if (inferenceResponse.ok) setInferenceStatus(inferenceData as InferenceStatus);
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
    } else setMessage(data.detail ? `${data.error ?? "Could not activate model."} · ${String(data.detail).slice(0,220)}` : (data.error ?? "Could not activate model."));
    setActivating("");
  }

  async function createSnapshot() {
    setActivating("snapshot");
    setMessage("");
    const response = await fetch("/api/snake-sorter/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: snapshotName }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(`Frozen dataset snapshot created: ${data.animal_count} animals / ${data.media_count} images.`);
      setSnapshotName("");
      await load();
    } else {
      const extra = data.unassigned_animals ? ` ${data.unassigned_animals} animal(s) still need dataset splits.` : data.animals_without_accepted_media ? ` ${data.animals_without_accepted_media} animal(s) need an accepted image.` : "";
      setMessage((data.error ?? "Could not create dataset snapshot.") + extra);
    }
    setActivating("");
  }

  const activeModel = models.find((model) => model.status === "active");
  const candidates = models.filter((model) => model.status === "candidate");
  const servingMismatch = Boolean(
    activeModel &&
    inferenceStatus.online &&
    inferenceStatus.modelVersion &&
    inferenceStatus.modelVersion !== activeModel.version
  );
  const servingWithoutRegistryModel = Boolean(!activeModel && inferenceStatus.online && inferenceStatus.modelVersion);


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

      <div className={`mt-5 rounded-2xl border p-4 ${inferenceStatus.online ? "border-emerald-300/12 bg-emerald-300/[.025]" : inferenceStatus.configured ? "border-amber-300/12 bg-amber-300/[.025]" : "border-white/[.06] bg-black/[.06]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.1em] text-white/24">Inference service</div>
            <div className="mt-1 text-sm font-semibold text-white/55">{inferenceStatus.online ? "Online" : inferenceStatus.configured ? "Configured · offline" : "Not configured"}</div>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${inferenceStatus.online ? "border-emerald-300/15 text-emerald-100/60" : inferenceStatus.configured ? "border-amber-300/15 text-amber-100/55" : "border-white/[.07] text-white/28"}`}>{inferenceStatus.online ? "Ready" : "Unavailable"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div><div className="text-[8px] uppercase tracking-[.08em] text-white/18">Service model</div><div className="mt-1 text-[10px] text-white/36">{inferenceStatus.modelVersion || "—"}</div></div>
          <div><div className="text-[8px] uppercase tracking-[.08em] text-white/18">Device</div><div className="mt-1 text-[10px] text-white/36">{inferenceStatus.device || "—"}</div></div>
          <div><div className="text-[8px] uppercase tracking-[.08em] text-white/18">Reference vectors</div><div className="mt-1 text-[10px] text-white/36">{inferenceStatus.references ?? 0}</div></div>
        </div>
        {inferenceStatus.message && <div className="mt-3 text-[10px] leading-5 text-white/24">{inferenceStatus.message}</div>}
        {servingMismatch && <div className="mt-3 rounded-xl border border-amber-300/12 bg-amber-300/[.035] px-3 py-2 text-[10px] leading-5 text-amber-50/50">Registry / serving mismatch: active registry model is {activeModel?.version}, while the inference service reports {inferenceStatus.modelVersion}. Do not treat scans as production-current until the service is redeployed.</div>}
        {servingWithoutRegistryModel && <div className="mt-3 rounded-xl border border-amber-300/12 bg-amber-300/[.035] px-3 py-2 text-[10px] leading-5 text-amber-50/50">The inference service is serving model {inferenceStatus.modelVersion}, but no model is marked active in the registry.</div>}
        {activeModel && inferenceStatus.online && !servingMismatch && inferenceStatus.modelVersion === activeModel.version && <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] px-3 py-2 text-[10px] leading-5 text-emerald-50/45">Registry and serving model are synchronized at {activeModel.version}.</div>}
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
            const individualLevel = objectValue(model.metrics, "individual_level");
            const notes = objectValue(model.metrics, "notes");
            const heldOutAnimals = metricValue(individualLevel, "animals");
            const calibrationEce = metricValue(model.calibration, "expected_calibration_error");
            const individualEvaluationReady =
              heldOutAnimals != null &&
              heldOutAnimals > 0 &&
              textValue(notes, "primary_metric_unit") === "held-out individual animal";
            const individualCalibrationReady =
              textValue(model.calibration, "calibration_unit") === "held-out individual animal";
            const deployMissing = [
              !model.artifact_storage_path || !model.artifact_sha256 ? "artifact" : null,
              !model.dataset_snapshot_id || !model.training_manifest_hash ? "dataset snapshot" : null,
              accuracy == null || macroF1 == null ? "held-out metrics" : null,
              !individualEvaluationReady ? "held-out individual evaluation" : null,
              metricValue(model.calibration, "temperature") == null || calibrationEce == null || !individualCalibrationReady ? "individual-level calibration" : null,
            ].filter((item): item is string => Boolean(item));
            const deployable = deployMissing.length === 0;
            return <div key={model.id} className="rounded-2xl border border-white/[.06] bg-black/[.07] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/62">{model.name} <span className="text-white/28">{model.version}</span></div>
                  <div className="mt-1 text-[10px] text-white/23">{model.encoder_name || model.architecture || "Model architecture not recorded"}{model.embedding_dimension ? ` · ${model.embedding_dimension}d embeddings` : ""}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${statusClass[model.status]}`}>{model.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <div><div className="text-[8px] uppercase text-white/18">Train animals</div><div className="mt-1 text-xs text-white/45">{model.training_animal_count ?? "—"}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Train images</div><div className="mt-1 text-xs text-white/45">{model.training_media_count ?? "—"}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Held-out animals</div><div className="mt-1 text-xs text-white/45">{heldOutAnimals ?? "—"}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Accuracy</div><div className="mt-1 text-xs text-white/45">{accuracy == null ? "—" : `${Math.round(accuracy * 1000) / 10}%`}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Macro F1</div><div className="mt-1 text-xs text-white/45">{macroF1 == null ? "—" : `${Math.round(macroF1 * 1000) / 10}%`}</div></div>
                <div><div className="text-[8px] uppercase text-white/18">Calibration ECE</div><div className="mt-1 text-xs text-white/45">{calibrationEce == null ? "—" : `${Math.round(calibrationEce * 1000) / 10}%`}</div></div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[.05] bg-black/[.06] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Artifact</div>
                  <div className={`mt-1 text-[10px] font-semibold ${model.artifact_storage_path ? "text-emerald-100/55" : "text-amber-100/40"}`}>{model.artifact_storage_path ? "Stored" : "Not uploaded"}</div>
                </div>
                <div className="rounded-xl border border-white/[.05] bg-black/[.06] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Artifact hash</div>
                  <div className="mt-1 truncate font-mono text-[9px] text-white/34">{model.artifact_sha256 ? `${model.artifact_sha256.slice(0,16)}…` : "—"}</div>
                </div>
                <div className="rounded-xl border border-white/[.05] bg-black/[.06] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Rules version</div>
                  <div className="mt-1 text-[10px] text-white/34">{model.rules_version || "—"}</div>
                </div>
              </div>
              {model.notes && <div className="mt-3 text-[10px] leading-5 text-white/24">{model.notes}</div>}
              {model.status === "candidate" && (
                <div className="mt-3 rounded-xl border border-white/[.05] bg-black/[.05] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${deployable ? "border-emerald-300/15 bg-emerald-300/[.035] text-emerald-100/60" : "border-amber-300/15 bg-amber-300/[.035] text-amber-100/55"}`}>{deployable ? "Deployable" : "Not deployable"}</span>
                    <button type="button" disabled={Boolean(activating) || !deployable} onClick={() => void activate(model)} className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] px-3 py-2 text-[10px] font-black text-amber-100/60 disabled:opacity-35">{activating === model.id ? "Activating…" : "Promote candidate to active"}</button>
                  </div>
                  {!deployable && <div className="mt-2 text-[9px] leading-4 text-white/24">Missing: {deployMissing.join(", ")}.</div>}
                </div>
              )}
            </div>;
          })}
        </div>
      )}

      <div className="mt-6 border-t border-white/[.06] pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.12em] text-white/26">Training snapshots</div>
            <p className="mt-2 text-xs leading-5 text-white/22">Freeze the currently approved dataset before training so the exact labels, splits and image set can be reproduced later.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} placeholder="Optional snapshot name" className="rounded-xl border border-white/[.07] bg-black/10 px-3 py-2 text-[10px] text-white/55 outline-none placeholder:text-white/18" />
            <button type="button" disabled={Boolean(activating)} onClick={() => void createSnapshot()} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-3 py-2 text-[10px] font-black text-emerald-100/60 disabled:opacity-40">{activating === "snapshot" ? "Freezing…" : "Create training snapshot"}</button>
          </div>
        </div>
        {snapshots.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-white/[.07] p-4 text-[10px] text-white/22">No immutable dataset snapshots yet.</div> :
          <div className="mt-4 space-y-2">{snapshots.slice(0,6).map((snapshot) => <div key={snapshot.id} className="rounded-2xl border border-white/[.055] bg-black/[.06] p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold text-white/48">{snapshot.name}</div><div className="mt-1 text-[9px] text-white/20">{snapshot.animal_count} animals · {snapshot.media_count} images</div></div><div className="text-right"><div className="font-mono text-[8px] text-white/20">{snapshot.manifest_sha256.slice(0,12)}…</div><div className="mt-1 text-[8px] text-white/18">{new Date(snapshot.created_at).toLocaleDateString()}</div></div></div></div>)}</div>
        }
      </div>

      {candidates.length > 1 && <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-[10px] leading-5 text-amber-50/40">Multiple candidate models are available. Compare held-out metrics and error patterns before promoting one.</div>}
      {message && <div className="mt-3 text-xs text-white/38">{message}</div>}
    </section>
  );
}
