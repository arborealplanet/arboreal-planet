"use client";

import { useEffect, useState } from "react";

type DatasetSnapshot = {
  id: string;
  name: string;
  manifest_sha256: string;
  animal_count: number;
  media_count: number;
  notes: string | null;
  purpose?: "classifier" | "challenge";
  created_at: string;
};

type InferenceStatus = {
  configured: boolean;
  online: boolean;
  modelVersion?: string | null;
  modelRegistryId?: string | null;
  device?: string | null;
  references?: number;
  embeddingDimension?: number | null;
  rejectionPolicySource?: string;
  rejectionPolicyValidated?: boolean;
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
  challenge_snapshot_id?: string | null;
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
  reference_embedding_count?: number | null;
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

function weakestSubgroup(metrics: Record<string, unknown> | null, key: string) {
  const group = objectValue(metrics, key);
  if (!group) return null;
  let weakest: { label: string; macroF1: number; images: number | null } | null = null;
  for (const [label, raw] of Object.entries(group)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const record = raw as Record<string, unknown>;
    const macroF1 = typeof record.macro_f1 === "number" ? record.macro_f1 : null;
    const images = typeof record.images === "number" ? record.images : null;
    if (macroF1 == null) continue;
    if (!weakest || macroF1 < weakest.macroF1) weakest = { label, macroF1, images };
  }
  return weakest;
}

const EVAL_TAXA = [
  "Morelia azurea azurea",
  "Morelia azurea pulcher",
  "Morelia azurea utaraensis",
  "Morelia viridis",
] as const;

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
    if (model.status === "retired" && !window.confirm(`Rollback to ${model.name} ${model.version}? The currently active model will be retired.`)) return;
    setActivating(model.id);
    setMessage("");
    const response = await fetch("/api/snake-sorter/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", model_id: model.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(model.status === "retired" ? `Rolled back to ${model.name} ${model.version}.` : `${model.name} ${model.version} is now active.`);
      await load();
    } else setMessage(data.detail ? `${data.error ?? "Could not activate model."} · ${String(data.detail).slice(0,220)}` : (data.error ?? "Could not activate model."));
    setActivating("");
  }

  async function createSnapshot(purpose: "classifier" | "challenge") {
    setActivating(`snapshot-${purpose}`);
    setMessage("");
    const response = await fetch("/api/snake-sorter/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: snapshotName, purpose }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(`Frozen ${purpose} snapshot created: ${data.animal_count} animals / ${data.media_count} images.`);
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
    (
      (inferenceStatus.modelRegistryId && inferenceStatus.modelRegistryId !== activeModel.id) ||
      (inferenceStatus.modelVersion && inferenceStatus.modelVersion !== activeModel.version)
    )
  );
  const servingWithoutRegistryModel = Boolean(!activeModel && inferenceStatus.online && inferenceStatus.modelVersion);
  const servingReferenceMismatch = Boolean(
    activeModel &&
    inferenceStatus.online &&
    activeModel.reference_embedding_count != null &&
    inferenceStatus.references != null &&
    activeModel.reference_embedding_count !== inferenceStatus.references
  );
  const servingEmbeddingDimensionMismatch = Boolean(
    activeModel &&
    inferenceStatus.online &&
    activeModel.embedding_dimension != null &&
    inferenceStatus.embeddingDimension != null &&
    activeModel.embedding_dimension !== inferenceStatus.embeddingDimension
  );


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
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div><div className="text-[8px] uppercase tracking-[.08em] text-white/18">Service model</div><div className="mt-1 text-[10px] text-white/36">{inferenceStatus.modelVersion || "—"}</div><div className="mt-1 truncate font-mono text-[8px] text-white/18">{inferenceStatus.modelRegistryId || "No registry ID"}</div></div>
          <div><div className="text-[8px] uppercase tracking-[.08em] text-white/18">Device</div><div className="mt-1 text-[10px] text-white/36">{inferenceStatus.device || "—"}</div></div>
          <div><div className="text-[8px] uppercase tracking-[.08em] text-white/18">Reference vectors</div><div className="mt-1 text-[10px] text-white/36">{inferenceStatus.references ?? 0}</div><div className="mt-1 text-[8px] text-white/18">{inferenceStatus.embeddingDimension ? `${inferenceStatus.embeddingDimension} dimensions` : "dimension unavailable"}</div></div>
          <div><div className="text-[8px] uppercase tracking-[.08em] text-white/18">Rejection policy</div><div className={`mt-1 text-[10px] font-semibold ${inferenceStatus.rejectionPolicyValidated ? "text-emerald-100/55" : inferenceStatus.rejectionPolicySource === "challenge_calibrated" ? "text-amber-100/55" : "text-white/32"}`}>{inferenceStatus.rejectionPolicyValidated ? "Challenge validated" : inferenceStatus.rejectionPolicySource === "challenge_calibrated" ? "Calibrated · not yet validated" : "Fallback thresholds"}</div><div className="mt-1 text-[8px] text-white/18">{inferenceStatus.rejectionPolicySource || "fallback"}</div></div>
        </div>
        {inferenceStatus.message && <div className="mt-3 text-[10px] leading-5 text-white/24">{inferenceStatus.message}</div>}
        {servingMismatch && <div className="mt-3 rounded-xl border border-amber-300/12 bg-amber-300/[.035] px-3 py-2 text-[10px] leading-5 text-amber-50/50">Registry / serving mismatch: active registry model is {activeModel?.version} ({activeModel?.id.slice(0,8)}…), while the inference service reports {inferenceStatus.modelVersion || "unknown version"} ({inferenceStatus.modelRegistryId ? `${inferenceStatus.modelRegistryId.slice(0,8)}…` : "no registry ID"}). Do not treat scans as production-current until the service is redeployed.</div>}
        {servingWithoutRegistryModel && <div className="mt-3 rounded-xl border border-amber-300/12 bg-amber-300/[.035] px-3 py-2 text-[10px] leading-5 text-amber-50/50">The inference service is serving model {inferenceStatus.modelVersion}, but no model is marked active in the registry.</div>}
        {servingReferenceMismatch && <div className="mt-3 rounded-xl border border-amber-300/12 bg-amber-300/[.035] px-3 py-2 text-[10px] leading-5 text-amber-50/50">Reference-index mismatch: registry expects {activeModel?.reference_embedding_count ?? 0} vectors but the service has {inferenceStatus.references ?? 0} loaded.</div>}
        {servingEmbeddingDimensionMismatch && <div className="mt-3 rounded-xl border border-rose-300/12 bg-rose-300/[.035] px-3 py-2 text-[10px] leading-5 text-rose-50/50">Embedding-dimension mismatch: registry expects {activeModel?.embedding_dimension ?? "—"} but the service reports {inferenceStatus.embeddingDimension ?? "—"}.</div>}
        {activeModel && inferenceStatus.online && !servingMismatch && !servingReferenceMismatch && !servingEmbeddingDimensionMismatch && inferenceStatus.modelVersion === activeModel.version && <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] px-3 py-2 text-[10px] leading-5 text-emerald-50/45">Registry, serving model and reference index are synchronized at {activeModel.version}.</div>}
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
            const weakestStage = weakestSubgroup(model.metrics, "by_stage");
            const weakestColor = weakestSubgroup(model.metrics, "by_color");
            const weakestView = weakestSubgroup(model.metrics, "by_view");
            const classificationReport = objectValue(model.metrics, "classification_report");
            const rejectionPolicy = objectValue(model.inference_config ?? null, "rejection_policy");
            const challengeSnapshot = model.challenge_snapshot_id
              ? snapshots.find((snapshot) => snapshot.id === model.challenge_snapshot_id)
              : null;
            const rejectionSource = textValue(rejectionPolicy, "source") || "fallback";
            const rejectionValidated = rejectionPolicy?.validated === true;
            const deployMissing = [
              !model.artifact_storage_path || !model.artifact_sha256 ? "artifact" : null,
              !model.dataset_snapshot_id || !model.training_manifest_hash ? "dataset snapshot" : null,
              !model.reference_embedding_count || model.reference_embedding_count <= 0 ? "reference embeddings" : null,
              accuracy == null || macroF1 == null ? "held-out metrics" : null,
              !individualEvaluationReady ? "held-out individual evaluation" : null,
              metricValue(model.calibration, "temperature") == null || calibrationEce == null || !individualCalibrationReady ? "individual-level calibration" : null,
              rejectionSource === "challenge_calibrated" && !model.challenge_snapshot_id ? "challenge snapshot provenance" : null,
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
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-white/[.05] bg-black/[.06] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Artifact</div>
                  <div className={`mt-1 text-[10px] font-semibold ${model.artifact_storage_path ? "text-emerald-100/55" : "text-amber-100/40"}`}>{model.artifact_storage_path ? "Stored" : "Not uploaded"}</div>
                </div>
                <div className="rounded-xl border border-white/[.05] bg-black/[.06] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[.08em] text-white/18">Reference vectors</div>
                  <div className={`mt-1 text-[10px] font-semibold ${model.reference_embedding_count && model.reference_embedding_count > 0 ? "text-emerald-100/55" : "text-amber-100/40"}`}>{model.reference_embedding_count ?? 0}</div>
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
              {(accuracy != null || macroF1 != null) && (
                <details className="mt-3 rounded-xl border border-white/[.05] bg-black/[.05] p-3">
                  <summary className="cursor-pointer text-[9px] font-black uppercase tracking-[.09em] text-white/30">Held-out evaluation details</summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {EVAL_TAXA.map((taxon) => {
                      const row = classificationReport && objectValue(classificationReport, taxon);
                      const f1 = row ? metricValue(row, "f1-score") : null;
                      const support = row ? metricValue(row, "support") : null;
                      return <div key={taxon} className="rounded-xl border border-white/[.045] bg-black/[.05] px-3 py-2"><div className="truncate text-[9px] text-white/28">{taxon}</div><div className="mt-1 flex items-center justify-between gap-3 text-[10px]"><span className="font-semibold text-white/48">F1 {f1 == null ? "—" : `${Math.round(f1 * 1000) / 10}%`}</span><span className="text-white/20">{support == null ? "—" : `${support} animal(s)`}</span></div></div>;
                    })}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[
                      ["Weakest stage", weakestStage],
                      ["Weakest color", weakestColor],
                      ["Weakest view", weakestView],
                    ].map(([label, raw]) => {
                      const item = raw as { label: string; macroF1: number; images: number | null } | null;
                      return <div key={String(label)} className="rounded-xl border border-white/[.045] bg-black/[.05] px-3 py-2"><div className="text-[8px] uppercase tracking-[.08em] text-white/18">{String(label)}</div><div className="mt-1 text-[10px] font-semibold text-white/42">{item ? item.label.replaceAll("_", " ") : "—"}</div><div className="mt-1 text-[9px] text-white/20">{item ? `${Math.round(item.macroF1 * 1000) / 10}% macro F1${item.images == null ? "" : ` · ${item.images} image(s)`}` : "No subgroup data"}</div></div>;
                    })}
                  </div>
                </details>
              )}
              <div className={`mt-3 rounded-xl border px-3 py-2 ${rejectionValidated ? "border-emerald-300/10 bg-emerald-300/[.025]" : rejectionSource === "challenge_calibrated" ? "border-amber-300/10 bg-amber-300/[.025]" : "border-white/[.05] bg-black/[.05]"}`}>
                <div className="text-[8px] font-black uppercase tracking-[.08em] text-white/20">Unknown / Review policy</div>
                <div className="mt-1 text-[10px] font-semibold text-white/42">{rejectionValidated ? "Challenge validated" : rejectionSource === "challenge_calibrated" ? "Challenge calibrated · more challenge data needed" : "Fallback thresholds only"}</div>
                <div className="mt-1 text-[9px] leading-4 text-white/20">{rejectionValidated ? "Difficult-case rejection behavior has passed the challenge-policy validation minimum." : "This does not block experimental model activation, but rejection behavior should be treated as provisional."}</div>
                {rejectionSource === "challenge_calibrated" && (
                  <div className="mt-2 border-t border-white/[.05] pt-2">
                    <div className="text-[8px] uppercase tracking-[.08em] text-white/16">Challenge snapshot</div>
                    <div className="mt-1 text-[9px] text-white/32">{challengeSnapshot?.name || (model.challenge_snapshot_id ? "Linked immutable snapshot" : "Missing challenge snapshot")}</div>
                    {model.challenge_snapshot_id && <div className="mt-1 truncate font-mono text-[8px] text-white/16">{model.challenge_snapshot_id}</div>}
                  </div>
                )}
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
              {model.status === "retired" && (
                <div className="mt-3 rounded-xl border border-sky-300/10 bg-sky-300/[.025] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><div className="text-[9px] font-black uppercase tracking-[.08em] text-sky-100/45">Rollback target</div><div className="mt-1 text-[9px] leading-4 text-white/22">Reactivation runs the same artifact, snapshot, calibration, embedding and challenge-provenance checks as a new candidate.</div></div>
                    <button type="button" disabled={Boolean(activating) || !deployable} onClick={() => void activate(model)} className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-3 py-2 text-[10px] font-black text-sky-100/60 disabled:opacity-35">{activating === model.id ? "Rolling back…" : "Rollback to this model"}</button>
                  </div>
                  {!deployable && <div className="mt-2 text-[9px] leading-4 text-white/24">Rollback blocked: {deployMissing.join(", ")}.</div>}
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
            <p className="mt-2 text-xs leading-5 text-white/22">Freeze classifier and challenge datasets separately so the exact labels and media can be reproduced later. Classifier snapshots feed training; challenge snapshots test rejection and difficult cases only.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} placeholder="Optional snapshot name" className="rounded-xl border border-white/[.07] bg-black/10 px-3 py-2 text-[10px] text-white/55 outline-none placeholder:text-white/18" />
            <button type="button" disabled={Boolean(activating)} onClick={() => void createSnapshot("classifier")} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-3 py-2 text-[10px] font-black text-emerald-100/60 disabled:opacity-40">{activating === "snapshot-classifier" ? "Freezing…" : "Create classifier snapshot"}</button>
            <button type="button" disabled={Boolean(activating)} onClick={() => void createSnapshot("challenge")} className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] px-3 py-2 text-[10px] font-black text-amber-100/60 disabled:opacity-40">{activating === "snapshot-challenge" ? "Freezing…" : "Create challenge snapshot"}</button>
          </div>
        </div>
        {snapshots.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-white/[.07] p-4 text-[10px] text-white/22">No immutable dataset snapshots yet.</div> :
          <div className="mt-4 space-y-2">{snapshots.slice(0,6).map((snapshot) => <div key={snapshot.id} className="rounded-2xl border border-white/[.055] bg-black/[.06] p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><div className="text-xs font-semibold text-white/48">{snapshot.name}</div><span className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[.08em] ${snapshot.purpose === "challenge" ? "border-amber-300/12 text-amber-100/45" : "border-emerald-300/12 text-emerald-100/45"}`}>{snapshot.purpose || "classifier"}</span></div><div className="mt-1 text-[9px] text-white/20">{snapshot.animal_count} animals · {snapshot.media_count} images</div></div><div className="text-right"><div className="font-mono text-[8px] text-white/20">{snapshot.manifest_sha256.slice(0,12)}…</div><div className="mt-1 text-[8px] text-white/18">{new Date(snapshot.created_at).toLocaleDateString()}</div></div></div></div>)}</div>
        }
      </div>

      {candidates.length > 1 && <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-[10px] leading-5 text-amber-50/40">Multiple candidate models are available. Compare held-out metrics and error patterns before promoting one.</div>}
      {message && <div className="mt-3 text-xs text-white/38">{message}</div>}
    </section>
  );
}
