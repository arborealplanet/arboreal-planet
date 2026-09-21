"use client";

import { useEffect, useMemo, useState } from "react";

type CandidateMedia = {
  id: string;
  source_media_url: string | null;
  source_page_url: string | null;
  media_order: number;
  capture_method: string;
  rights_status: string;
  review_status: string;
  view_type: string;
  quality_status: string;
  staged_storage_path: string | null;
  acquisition_error: string | null;
  live_reference_status?: "unknown" | "available" | "unavailable" | "blocked" | "expired";
  last_verified_at?: string | null;
  last_verified_http_status?: number | null;
};

type CaptureJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "blocked" | "failed" | "cancelled";
  requested_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  captured_media_count?: number;
  discovered_media_count?: number;
  last_http_status?: number | null;
  last_error?: string | null;
};

type Candidate = {
  id: string;
  source_type: string;
  source_key: string;
  source_url: string;
  media_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  seller_or_observer: string | null;
  photographer: string | null;
  license: string | null;
  attribution: string | null;
  taxon_raw: string | null;
  locality_raw: string | null;
  provisional_taxon: string | null;
  provisional_locality: string | null;
  life_stage_hint: string | null;
  neonate_color_hint: string | null;
  rights_status: string;
  review_status: string;
  exclusion_reason: string | null;
  staged_storage_path: string | null;
  staged_mime_type: string | null;
  staged_bytes: number | null;
  staged_at: string | null;
  acquisition_error: string | null;
  promoted_reference_animal_id: string | null;
  promoted_at: string | null;
  discovered_at: string;
  acquisition_stage?: string;
  biological_review_status?: string;
  rights_review_status?: string;
  rights_review_note?: string | null;
  duplicate_of_candidate_id?: string | null;
  media?: CandidateMedia[];
  media_count?: number;
  accepted_media_count?: number;
  latest_capture_job?: CaptureJob | null;
};

type Profile = {
  id: string;
  name: string;
  source_type: string;
  target_locality: string | null;
  enabled: boolean;
  region?: string | null;
  availability?: string | null;
  no_additional_traits?: boolean;
  negative_keywords?: string[] | null;
};

type Balance = {
  by_locality?: Array<{ locality: string; candidate_count: number; approved_count: number; media_count: number }>;
  by_stage?: Array<{ stage: string; candidate_count: number }>;
  by_color?: Array<{ color: string; candidate_count: number }>;
  media?: { total?: number; accepted?: number; staged?: number; live_refs?: number; live_available?: number; live_unavailable?: number; rendered_capture?: number; manual_upload?: number };
  capture_jobs?: { queued?: number; processing?: number; completed?: number; blocked?: number; failed?: number };
};

type BackfillPlan = {
  live_collection_started?: boolean;
  morphmarket_candidates?: number;
  candidates_with_media?: number;
  candidates_missing_media?: number;
  eligible_for_future_backfill?: number;
  excluded_from_backfill?: number;
  candidates_with_preview_thumbnail?: number;
  by_locality?: Array<{ locality: string; count: number }>;
  suggested_priority?: Array<{
    id: string;
    source_key: string;
    title: string | null;
    locality: string;
    neonate_color_hint: string | null;
    life_stage_hint: string | null;
    review_status: string;
    priority_score: number;
  }>;
};

type CollectorControl = {
  is_armed?: boolean;
  effective_armed?: boolean;
  armed_until?: string | null;
  note?: string | null;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  permission_required: number;
  staged: number;
  open_license: number;
  metadata_only: number;
  media_total?: number;
  animals_with_multiple_media?: number;
};

const button = "rounded-xl border border-white/[.07] bg-black/[.06] px-3 py-2 text-[9px] font-black text-white/42 disabled:opacity-35";
const select = "rounded-xl border border-white/[.07] bg-black/15 px-3 py-2 text-[10px] text-white/48 outline-none";

function sourceLabel(value: string) {
  if (value === "morphmarket") return "MorphMarket";
  if (value === "wikimedia") return "Wikimedia";
  if (value === "smithsonian") return "Smithsonian";
  if (value === "inaturalist") return "iNaturalist";
  if (value === "gbif") return "GBIF";
  return value.replaceAll("_"," ");
}

function statusClass(value: string) {
  if (value === "approved") return "border-emerald-300/12 text-emerald-100/50";
  if (value === "rejected") return "border-rose-300/12 text-rose-100/45";
  if (value === "permission_required") return "border-amber-300/12 text-amber-100/50";
  return "border-white/[.07] text-white/30";
}

export function SnakeSorterAcquisitionQueue({
  onPromoted,
  canHarvest = true,
  canPromote = true,
}: {
  onPromoted?: () => Promise<void> | void;
  canHarvest?: boolean;
  canPromote?: boolean;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ total:0,pending:0,approved:0,rejected:0,permission_required:0,staged:0,open_license:0,metadata_only:0,media_total:0,animals_with_multiple_media:0 });
  const [balance, setBalance] = useState<Balance>({});
  const [backfillPlan, setBackfillPlan] = useState<BackfillPlan>({});
  const [collectorControl, setCollectorControl] = useState<CollectorControl>({});
  const [armConfirmation, setArmConfirmation] = useState("");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [locality, setLocality] = useState("all");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [previewById, setPreviewById] = useState<Record<string, { image_url?: string; description?: string; error?: string }>>({});
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [rightsNoteById, setRightsNoteById] = useState<Record<string, string>>({});
  const [activeMediaIndex, setActiveMediaIndex] = useState<Record<string, number>>({});
  const [reportedMediaHealth, setReportedMediaHealth] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch("/api/snake-sorter/acquisition", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not load acquisition queue.");
      return;
    }
    setCandidates(data.candidates ?? []);
    setProfiles(data.profiles ?? []);
    setStats(data.stats ?? stats);
    void fetch("/api/snake-sorter/acquisition/balance", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => { if (ok) setBalance(data ?? {}); });
    void fetch("/api/snake-sorter/acquisition/backfill-plan", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => { if (ok) setBackfillPlan(data ?? {}); });
    void fetch("/api/snake-sorter/acquisition/collector-control", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => { if (ok) setCollectorControl(data ?? {}); });
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/snake-sorter/acquisition", { cache:"no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ok,data}) => {
        if (cancelled) return;
        if (!ok) {
          setMessage(data.error ?? "Could not load acquisition queue.");
          return;
        }
        setCandidates(data.candidates ?? []);
        setProfiles(data.profiles ?? []);
        setStats(data.stats ?? stats);
        void fetch("/api/snake-sorter/acquisition/balance", { cache: "no-store" })
          .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
          .then(({ ok, data: balanceData }) => { if (ok) setBalance(balanceData ?? {}); });
        void fetch("/api/snake-sorter/acquisition/backfill-plan", { cache: "no-store" })
          .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
          .then(({ ok, data: planData }) => { if (ok) setBackfillPlan(planData ?? {}); });
        void fetch("/api/snake-sorter/acquisition/collector-control", { cache: "no-store" })
          .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
          .then(({ ok, data: controlData }) => { if (ok) setCollectorControl(controlData ?? {}); });
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => candidates.filter((candidate) => {
    if (source !== "all" && candidate.source_type !== source) return false;
    if (status !== "all" && candidate.review_status !== status) return false;
    if (locality !== "all" && (candidate.provisional_locality || candidate.locality_raw || "") !== locality) return false;
    const needle = query.trim().toLowerCase();
    if (needle) {
      const haystack = [
        candidate.title,
        candidate.source_key,
        candidate.provisional_locality,
        candidate.locality_raw,
        candidate.seller_or_observer,
        candidate.taxon_raw,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [candidates, source, status, locality, query]);

  async function reportMediaHealth(mediaId: string, health: "available" | "unavailable") {
    const key = `${mediaId}:${health}`;
    if (reportedMediaHealth[mediaId] === key) return;
    setReportedMediaHealth((current) => ({ ...current, [mediaId]: key }));
    await fetch("/api/snake-sorter/acquisition/media-health", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mediaId, status: health }),
    }).catch(() => undefined);
  }

  async function queueFallbackBatch(limit = 5) {
    setBusy("queue-fallbacks");
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/capture-jobs/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not queue fallback gallery captures.");
    } else {
      setMessage(`Queued ${Number(data.queued ?? 0)} fallback capture job(s). The live worker remains disarmed until explicitly armed.`);
    }
    await load();
    setBusy("");
  }

  async function stageOpenMedia() {
    setBusy("stage");
    setMessage("");
    let staged = 0;
    let duplicates = 0;
    let errors = 0;
    let batches = 0;

    try {
      while (batches < 10) {
        const response = await fetch("/api/snake-sorter/acquisition/stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 20 }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(data.error ?? "Could not stage open-license media.");
          return;
        }

        const batchStaged = Number(data.staged ?? 0);
        const batchDuplicates = Number(data.duplicates ?? 0);
        const batchErrors = Number(data.errors ?? 0);
        staged += batchStaged;
        duplicates += batchDuplicates;
        errors += batchErrors;
        batches += 1;

        if (batchStaged + batchDuplicates === 0) break;
        if (batchStaged + batchDuplicates + batchErrors < 20) break;
      }

      setMessage(`Open-license staging complete: ${staged} staged, ${duplicates} duplicates, ${errors} errors across ${batches} batch(es).`);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function harvestOpenSources() {
    setBusy("harvest");
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/harvest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 40, source: "open_sources" }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const openAdded = Number(data.open_sources?.added ?? 0);
      setMessage(`Open-source harvest complete: ${openAdded} new candidate(s). MorphMarket was not contacted by this action.`);
      await load();
    } else {
      setMessage(data.error ?? "Could not harvest open sources.");
    }
    setBusy("");
  }

  async function review(id: string, reviewStatus: "approved" | "rejected" | "permission_required" | "pending", exclusionReason?: string) {
    setBusy(id);
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, review_status: reviewStatus, exclusion_reason: exclusionReason || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not update candidate.");
    await load();
    setBusy("");
  }

  async function promote(candidate: Candidate, formData: FormData) {
    setBusy(`promote-${candidate.id}`);
    setMessage("");

    const payload = {
      candidate_id: candidate.id,
      taxon: String(formData.get("taxon") ?? "Unknown / review"),
      locality: String(formData.get("locality") ?? ""),
      life_stage: String(formData.get("life_stage") ?? "unknown"),
      neonate_color: String(formData.get("neonate_color") ?? "unknown"),
      label_confidence: String(formData.get("label_confidence") ?? "provisional"),
      purity_status: String(formData.get("purity_status") ?? "unknown"),
      view_type: String(formData.get("view_type") ?? "unknown"),
      animal_code: String(formData.get("animal_code") ?? ""),
      split_group: String(formData.get("split_group") ?? ""),
      training_eligible: formData.get("training_eligible") === "true",
      challenge_eligible: formData.get("challenge_eligible") === "true",
      challenge_expectation: String(formData.get("challenge_expectation") ?? "review"),
    };

    const response = await fetch("/api/snake-sorter/acquisition/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      setMessage(`Candidate promoted into the reference library as animal ${data.animal_id}.`);
      await load();
      await onPromoted?.();
    } else {
      setMessage(data.error ?? "Could not promote candidate.");
    }
    setBusy("");
  }

  async function armCollector() {
    setBusy("collector-arm");
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/collector-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "arm",
        confirmation: armConfirmation,
        minutes: 15,
        note: "Owner armed collector from Snake Sorter acquisition queue.",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not arm collector.");
    else {
      setMessage("Collector armed for 15 minutes. It will still do nothing until the capture workflow is explicitly started.");
      setArmConfirmation("");
    }
    await load();
    setBusy("");
  }

  async function disarmCollector() {
    setBusy("collector-disarm");
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/collector-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "disarm",
        note: "Owner manually disarmed collector from Snake Sorter acquisition queue.",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not disarm collector.");
    else setMessage("Collector disarmed.");
    await load();
    setBusy("");
  }

  async function queueCapture(candidateId: string) {
    setBusy(`capture-${candidateId}`);
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/capture-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not queue gallery capture.");
    else setMessage(data.already_queued ? "Gallery capture is already queued." : "Gallery capture queued. It will remain idle until the capture worker is run.");
    await load();
    setBusy("");
  }

  async function updateRights(candidateId: string, rightsReviewStatus: "unreviewed" | "cleared" | "permission_required" | "restricted", mediaRightsStatus: "open_license" | "permission_required" | "permission_granted" | "metadata_only" | "unknown") {
    setBusy(`rights-${candidateId}`);
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/rights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: candidateId,
        rights_review_status: rightsReviewStatus,
        media_rights_status: mediaRightsStatus,
        rights_note: rightsNoteById[candidateId] ?? candidates.find((candidate) => candidate.id === candidateId)?.rights_review_note ?? "",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not update rights review.");
    else setMessage("Rights review updated.");
    await load();
    setBusy("");
  }

  async function uploadCandidateMedia(candidateId: string, file: File) {
    setBusy(`upload-${candidateId}`);
    setMessage("");
    const form = new FormData();
    form.set("candidate_id", candidateId);
    form.set("file", file);
    const response = await fetch("/api/snake-sorter/acquisition/media-upload", {
      method: "POST",
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not attach candidate image.");
    else setMessage("Candidate image attached for review.");
    await load();
    setBusy("");
  }

  async function reviewMedia(mediaId: string, changes: Partial<Pick<CandidateMedia, "review_status" | "quality_status" | "view_type">>) {
    setBusy(`media-${mediaId}`);
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/media-review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mediaId, ...changes }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not update candidate image.");
    await load();
    setBusy("");
  }

  function mediaFor(candidate: Candidate) {
    return Array.isArray(candidate.media) ? candidate.media : [];
  }

  function promotableMediaCount(candidate: Candidate) {
    return mediaFor(candidate).filter((media) =>
      media.review_status === "accepted" &&
      media.quality_status === "accepted" &&
      Boolean(media.staged_storage_path) &&
      ["open_license","permission_granted"].includes(media.rights_status)
    ).length;
  }

  function selectedMedia(candidate: Candidate) {
    const media = mediaFor(candidate);
    if (!media.length) return null;
    const raw = activeMediaIndex[candidate.id] ?? 0;
    const index = Math.max(0, Math.min(raw, media.length - 1));
    return media[index] ?? null;
  }

  function moveMedia(candidate: Candidate, delta: number) {
    const media = mediaFor(candidate);
    if (!media.length) return;
    setActiveMediaIndex((current) => {
      const raw = current[candidate.id] ?? 0;
      const next = (raw + delta + media.length) % media.length;
      return { ...current, [candidate.id]: next };
    });
  }

  async function loadPreview(candidate: Candidate) {
    setBusy(`preview-${candidate.id}`);
    setPreviewById((current) => ({ ...current, [candidate.id]: {} }));
    const response = await fetch("/api/snake-sorter/acquisition/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_url: candidate.source_url }),
    });
    const data = await response.json().catch(() => ({}));
    setPreviewById((current) => ({
      ...current,
      [candidate.id]: response.ok
        ? { image_url: data.image_url, description: data.description }
        : { error: data.error ?? "Preview unavailable." },
    }));
    setBusy("");
  }

  const sources = [...new Set(candidates.map((candidate) => candidate.source_type))].sort();
  const localities = [...new Set(candidates.map((candidate) => candidate.provisional_locality || candidate.locality_raw).filter(Boolean) as string[])].sort();

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Acquisition queue</div>
          <h2 className="mt-2 text-2xl font-semibold">Harvested reference candidates</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">Open-license sources and MorphMarket discovery are intentionally separated. MorphMarket live image references are used for review first; rendered capture is only a fallback. Nothing becomes training data until deliberate promotion and rights clearance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className={button}>Refresh</button>
          {canHarvest && <button type="button" disabled={Boolean(busy)} onClick={() => void harvestOpenSources()} className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-3 py-2 text-[9px] font-black text-sky-100/60 disabled:opacity-35">{busy === "harvest" ? "Harvesting…" : "Harvest open sources"}</button>}
          {canHarvest && <button type="button" disabled={Boolean(busy)} onClick={() => void stageOpenMedia()} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-3 py-2 text-[9px] font-black text-emerald-100/60 disabled:opacity-35">{busy === "stage" ? "Staging all…" : "Stage all open-license media"}</button>}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
        {[
          ["Total", stats.total],
          ["Pending", stats.pending],
          ["Staged", stats.staged],
          ["Approved", stats.approved],
          ["Rejected", stats.rejected],
          ["Permission", stats.permission_required],
          ["Open license", stats.open_license],
          ["Metadata only", stats.metadata_only],
          ["Media refs", stats.media_total ?? 0],
          ["Multi-image", stats.animals_with_multiple_media ?? 0],
        ].map(([name,value]) => <div key={String(name)} className="rounded-2xl border border-white/[.055] bg-black/[.06] p-3"><div className="text-lg font-semibold text-white/55">{value}</div><div className="mt-1 text-[8px] font-black uppercase tracking-[.07em] text-white/20">{name}</div></div>)}
      </div>

      {canHarvest && (
        <div className="mt-4 rounded-2xl border border-rose-300/10 bg-rose-300/[.018] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.08em] text-rose-100/48">Live collector control</div>
              <div className="mt-1 text-[9px] leading-4 text-white/22">
                Two keys are required: this app-side arm plus an explicitly armed GitHub capture workflow. Either one being off blocks live capture.
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${collectorControl.effective_armed ? "border-amber-300/15 text-amber-100/60" : "border-emerald-300/12 text-emerald-100/50"}`}>
              {collectorControl.effective_armed ? "Armed temporarily" : "Disarmed"}
            </span>
          </div>
          {collectorControl.effective_armed ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="text-[9px] text-amber-100/45">
                Expires {collectorControl.armed_until ? new Date(collectorControl.armed_until).toLocaleTimeString() : "soon"}.
              </div>
              <button
                type="button"
                disabled={busy === "collector-disarm"}
                onClick={() => void disarmCollector()}
                className="rounded-lg border border-rose-300/12 px-3 py-1.5 text-[8px] font-black text-rose-100/55 disabled:opacity-35"
              >
                {busy === "collector-disarm" ? "Disarming…" : "Disarm now"}
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
              <input
                value={armConfirmation}
                onChange={(event) => setArmConfirmation(event.target.value)}
                placeholder='Type "ARM SNAKE SORTER" only when ready for a controlled live test'
                className="rounded-xl border border-white/[.07] bg-black/15 px-3 py-2 text-[9px] text-white/45 outline-none placeholder:text-white/16"
              />
              <button
                type="button"
                disabled={busy === "collector-arm" || armConfirmation !== "ARM SNAKE SORTER"}
                onClick={() => void armCollector()}
                className="rounded-xl border border-amber-300/12 bg-amber-300/[.025] px-3 py-2 text-[9px] font-black text-amber-100/50 disabled:opacity-25"
              >
                {busy === "collector-arm" ? "Arming…" : "Arm for 15 min"}
              </button>
            </div>
          )}
        </div>
      )}

      {(backfillPlan.morphmarket_candidates ?? 0) > 0 && (
        <div className="mt-4 rounded-2xl border border-violet-300/10 bg-violet-300/[.02] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.08em] text-violet-100/45">MorphMarket media plan · browser-assisted live refs</div>
              <div className="mt-1 text-[9px] leading-4 text-white/22">
                {backfillPlan.morphmarket_candidates ?? 0} existing listing candidates · {backfillPlan.candidates_with_media ?? 0} with media · {backfillPlan.candidates_missing_media ?? 0} missing media.
              </div>
            </div>
            <div className="rounded-full border border-violet-300/10 px-2.5 py-1 text-[8px] font-black uppercase text-violet-100/45">
              Collector disarmed
            </div>
          </div>
          <div className="mt-2 text-[9px] text-white/24">
            {backfillPlan.eligible_for_future_backfill ?? 0} candidate(s) are currently eligible for a future controlled media backfill; {backfillPlan.excluded_from_backfill ?? 0} are excluded by review state or filtering.
          </div>
          {(backfillPlan.suggested_priority?.length ?? 0) > 0 && (
            <div className="mt-3">
              <div className="text-[8px] font-black uppercase tracking-[.08em] text-white/22">Priority candidates for browser-helper import / fallback</div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {(backfillPlan.suggested_priority ?? []).slice(0, 8).map((item) => (
                  <div key={item.id} className="min-w-40 rounded-xl border border-white/[.05] bg-black/[.05] px-3 py-2">
                    <div className="truncate text-[9px] font-semibold text-white/42">{item.title || item.source_key}</div>
                    <div className="mt-1 text-[8px] text-white/24">{item.locality} · {item.neonate_color_hint || "color ?"} · {item.life_stage_hint || "stage ?"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(balance.by_locality?.length ?? 0) > 0 && (
        <div className="mt-4 rounded-2xl border border-white/[.05] bg-black/[.04] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.08em] text-white/26">Dataset balance</div>
              <div className="mt-1 text-[9px] text-white/18">Counts are animals first, images second. This helps prevent one heavily photographed animal from inflating the dataset.</div>
            </div>
            <div className="flex flex-wrap gap-2 text-[8px] text-white/24">
              <span>{balance.media?.total ?? 0} media refs</span>
              <span>{balance.media?.staged ?? 0} staged</span>
              <span>{balance.media?.live_refs ?? 0} live refs</span>
              <span>{balance.media?.live_available ?? 0} live OK</span>
              <span>{balance.media?.live_unavailable ?? 0} live broken</span>
              <span>{balance.media?.accepted ?? 0} accepted</span>
              <span>{balance.capture_jobs?.queued ?? 0} capture queued</span>
              <span>{balance.capture_jobs?.blocked ?? 0} blocked</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {(balance.by_locality ?? []).slice(0, 14).map((item) => (
              <div key={item.locality} className="min-w-28 rounded-xl border border-white/[.05] bg-black/[.05] px-3 py-2">
                <div className="truncate text-[9px] font-semibold text-white/40">{item.locality}</div>
                <div className="mt-1 text-[8px] text-white/22">{item.candidate_count} animals · {item.media_count} images</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canHarvest && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <a
            href="/downloads/snake-sorter-browser-helper.zip"
            className="rounded-xl border border-violet-300/12 bg-violet-300/[.025] px-3 py-2 text-center text-[9px] font-black text-violet-100/48"
          >
            Download browser helper
          </a>
          <button
            type="button"
            disabled={busy === "queue-fallbacks"}
            onClick={() => void queueFallbackBatch(5)}
            className="rounded-xl border border-sky-300/12 bg-sky-300/[.025] px-3 py-2 text-[9px] font-black text-sky-100/48 disabled:opacity-35"
          >
            {busy === "queue-fallbacks" ? "Queueing fallbacks…" : "Queue capture fallbacks"}
          </button>
          <div className="rounded-xl border border-white/[.05] bg-black/[.04] px-3 py-2 text-[8px] leading-4 text-white/20">
            Preferred order: browser helper live reference → rendered gallery fallback → manual attachment. Server-side MorphMarket requests are not used for live refs because the controlled probe returns HTTP 403.
          </div>
        </div>
      )}

      {canHarvest && (
        <div className="mt-4 rounded-2xl border border-violet-300/10 bg-violet-300/[.018] p-3">
          <div className="text-[9px] font-black uppercase tracking-[.08em] text-violet-100/45">Owner browser helper</div>
          <div className="mt-1 text-[9px] leading-4 text-white/22">
            MorphMarket returns HTTP 403 to our server-side probe, so live gallery references are imported from a listing you already opened normally in your browser. Download the helper, extract it, load that folder as an unpacked Chrome extension, then open a MorphMarket GTP listing and press the helper button. It sends only exposed image references into Snake Sorter; it does not download the images.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href="/downloads/snake-sorter-browser-helper.zip" className="rounded-lg border border-violet-300/12 px-2.5 py-1.5 text-[8px] font-black text-violet-100/50">
              Download helper ZIP
            </a>
            <a href="chrome://extensions/" className="rounded-lg border border-white/[.06] px-2.5 py-1.5 text-[8px] font-black text-white/35">
              Chrome extensions page
            </a>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto] sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, locality, seller, source ID…"
          className="w-full rounded-xl border border-white/[.07] bg-black/15 px-3 py-2.5 text-[10px] text-white/55 outline-none placeholder:text-white/18 focus:border-emerald-300/20"
        />
        <select value={source} onChange={(event) => setSource(event.target.value)} className={select}>
          <option value="all">All sources</option>
          {sources.map((value) => <option key={value} value={value}>{sourceLabel(value)}</option>)}
        </select>
        <select value={locality} onChange={(event) => setLocality(event.target.value)} className={select}>
          <option value="all">All localities</option>
          {localities.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={select}>
          <option value="all">All review states</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="permission_required">Permission required</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-[9px] text-white/18">{filtered.length} shown · {profiles.filter((profile) => profile.enabled).length} profile(s)</span>
      </div>

      {profiles.some((profile) => profile.enabled && profile.source_type === "morphmarket") && (
        <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[.07em]">
          <span className="rounded-full border border-sky-300/10 bg-sky-300/[.025] px-2.5 py-1 text-sky-100/45">MorphMarket · Region All</span>
          <span className="rounded-full border border-sky-300/10 bg-sky-300/[.025] px-2.5 py-1 text-sky-100/45">Availability Any</span>
          <span className="rounded-full border border-rose-300/10 bg-rose-300/[.025] px-2.5 py-1 text-rose-100/45">Designer excluded</span>
          <span className="rounded-full border border-amber-300/10 bg-amber-300/[.025] px-2.5 py-1 text-amber-100/45">Single locality only</span>
        </div>
      )}

      {message && <div className="mt-4 rounded-xl border border-white/[.06] bg-black/[.05] px-3 py-2 text-[10px] leading-5 text-white/36">{message}</div>}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {filtered.length === 0 && <div className="lg:col-span-2 rounded-2xl border border-white/[.05] bg-black/[.04] p-4 text-[10px] text-white/20">No candidates match these filters.</div>}
        {filtered.map((candidate) => (
          <article key={candidate.id} className="overflow-hidden rounded-[22px] border border-white/[.055] bg-black/[.06]">
            <div className="flex min-h-36">
              <div className="w-40 shrink-0 bg-black/20">
                {candidate.staged_storage_path ? (
                  <img src={`/api/snake-sorter/acquisition/media/${encodeURIComponent(candidate.id)}`} alt="" loading="lazy" className="h-36 w-full object-cover" />
                ) : selectedMedia(candidate) && (selectedMedia(candidate)?.source_media_url || selectedMedia(candidate)?.staged_storage_path) ? (
                  <div>
                    <img
                      src={selectedMedia(candidate)?.staged_storage_path
                        ? `/api/snake-sorter/acquisition/media-file/${encodeURIComponent(selectedMedia(candidate)!.id)}`
                        : selectedMedia(candidate)?.source_media_url || ""}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-36 w-full object-cover"
                      onLoad={() => {
                        const media = selectedMedia(candidate);
                        if (media?.source_media_url && !media.staged_storage_path) void reportMediaHealth(media.id, "available");
                      }}
                      onError={(event) => {
                        const media = selectedMedia(candidate);
                        if (media?.source_media_url && !media.staged_storage_path) {
                          event.currentTarget.style.display = "none";
                          void reportMediaHealth(media.id, "unavailable");
                        }
                      }}
                    />
                    <div className="border-t border-white/[.05] p-2">
                      <div className="flex items-center justify-between gap-1 text-[8px] text-white/26">
                        <button type="button" onClick={() => moveMedia(candidate, -1)} className={button} disabled={(candidate.media_count ?? 0) < 2}>‹</button>
                        <span>{(activeMediaIndex[candidate.id] ?? 0) + 1} / {candidate.media_count ?? mediaFor(candidate).length}</span>
                        <button type="button" onClick={() => moveMedia(candidate, 1)} className={button} disabled={(candidate.media_count ?? 0) < 2}>›</button>
                      </div>
                      {selectedMedia(candidate) && (
                        <>
                          <div className="mt-2 flex flex-wrap gap-1 text-[7px] font-black uppercase tracking-[.06em]">
                            <span className="rounded-full border border-white/[.06] px-1.5 py-0.5 text-white/28">
                              {selectedMedia(candidate)!.staged_storage_path ? "stored" : "live ref"}
                            </span>
                            <span className="rounded-full border border-white/[.06] px-1.5 py-0.5 text-white/24">
                              {selectedMedia(candidate)!.capture_method.replaceAll("_"," ")}
                            </span>
                            {selectedMedia(candidate)!.source_media_url && !selectedMedia(candidate)!.staged_storage_path && (
                              <span className="rounded-full border border-violet-300/10 px-1.5 py-0.5 text-violet-100/38">
                                {selectedMedia(candidate)!.live_reference_status || "unknown"}
                              </span>
                            )}
                          </div>
                          <select
                            value={selectedMedia(candidate)?.view_type || "unknown"}
                            onChange={(event) => void reviewMedia(selectedMedia(candidate)!.id, { view_type: event.target.value })}
                            className={`${select} mt-2 w-full`}
                          >
                            <option value="unknown">Unknown view</option>
                            <option value="full_body">Full body</option>
                            <option value="head">Head</option>
                            <option value="dorsal">Dorsal</option>
                            <option value="left_lateral">Left lateral</option>
                            <option value="right_lateral">Right lateral</option>
                            <option value="tail">Tail</option>
                            <option value="other">Other</option>
                          </select>
                          <div className="mt-2 flex gap-1">
                            <button type="button" disabled={busy === `media-${selectedMedia(candidate)!.id}`} onClick={() => void reviewMedia(selectedMedia(candidate)!.id, { review_status: "accepted", quality_status: "accepted" })} className="flex-1 rounded-lg border border-emerald-300/12 px-2 py-1.5 text-[8px] text-emerald-100/50 disabled:opacity-35">Keep</button>
                            <button type="button" disabled={busy === `media-${selectedMedia(candidate)!.id}`} onClick={() => void reviewMedia(selectedMedia(candidate)!.id, { review_status: "rejected", quality_status: "rejected" })} className="flex-1 rounded-lg border border-rose-300/12 px-2 py-1.5 text-[8px] text-rose-100/45 disabled:opacity-35">Reject</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : candidate.thumbnail_url ? (
                  <img
                    src={candidate.thumbnail_url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                ) : previewById[candidate.id]?.image_url ? (
                  <img src={previewById[candidate.id].image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full min-h-36 place-items-center px-3 text-center text-[9px] leading-4 text-white/16">
                    <div>
                      <div>{candidate.source_type === "morphmarket" ? "No listing media collected yet" : candidate.rights_status === "open_license" ? "Open media not staged yet" : "No staged media"}</div>
                      {candidate.source_type === "morphmarket" && (
                        <button
                          type="button"
                          disabled={busy === `preview-${candidate.id}`}
                          onClick={() => void loadPreview(candidate)}
                          className="mt-2 rounded-lg border border-sky-300/12 bg-sky-300/[.03] px-2 py-1.5 text-[8px] font-black text-sky-100/50 disabled:opacity-35"
                        >
                          {busy === `preview-${candidate.id}` ? "Loading…" : "Load preview"}
                        </button>
                      )}
                      {previewById[candidate.id]?.error && <div className="mt-2 text-[8px] leading-3 text-rose-100/35">{previewById[candidate.id].error}</div>}
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/55">{candidate.title || candidate.locality_raw || candidate.source_key}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-white/[.06] px-2 py-0.5 text-[8px] text-white/28">{sourceLabel(candidate.source_type)}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[8px] ${statusClass(candidate.review_status)}`}>{candidate.review_status.replaceAll("_"," ")}</span>
                      <span className="rounded-full border border-white/[.06] px-2 py-0.5 text-[8px] text-white/24">{candidate.rights_status.replaceAll("_"," ")}</span>
                      {(candidate.media_count ?? 0) > 0 && <span className="rounded-full border border-sky-300/10 px-2 py-0.5 text-[8px] text-sky-100/40">{candidate.media_count} image{candidate.media_count === 1 ? "" : "s"}</span>}
                      {candidate.acquisition_stage && <span className="rounded-full border border-white/[.06] px-2 py-0.5 text-[8px] text-white/22">{candidate.acquisition_stage.replaceAll("_"," ")}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {candidate.staged_storage_path && <span className="rounded-full border border-emerald-300/12 px-2 py-1 text-[8px] font-black uppercase text-emerald-100/45">Staged</span>}
                    {candidate.latest_capture_job && (
                      <span className="rounded-full border border-violet-300/12 px-2 py-1 text-[8px] font-black uppercase text-violet-100/45">
                        Capture {candidate.latest_capture_job.status}
                        {candidate.latest_capture_job.captured_media_count ? ` · ${candidate.latest_capture_job.captured_media_count}` : ""}
                      </span>
                    )}
                    {candidate.promoted_reference_animal_id && <span className="rounded-full border border-sky-300/12 px-2 py-1 text-[8px] font-black uppercase text-sky-100/45">Promoted</span>}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[9px]">
                  <div><div className="uppercase tracking-[.07em] text-white/16">Locality claim</div><div className="mt-0.5 text-white/34">{candidate.provisional_locality || candidate.locality_raw || "—"}</div></div>
                  <div><div className="uppercase tracking-[.07em] text-white/16">Taxon raw</div><div className="mt-0.5 text-white/34">{candidate.taxon_raw || "—"}</div></div>
                  <div><div className="uppercase tracking-[.07em] text-white/16">Source / observer</div><div className="mt-0.5 truncate text-white/34">{candidate.seller_or_observer || candidate.photographer || "—"}</div></div>
                  <div><div className="uppercase tracking-[.07em] text-white/16">License</div><div className="mt-0.5 truncate text-white/34">{candidate.license || "—"}</div></div>
                </div>

                {previewById[candidate.id]?.description && <div className="mt-3 line-clamp-3 rounded-xl border border-sky-300/8 bg-sky-300/[.015] px-3 py-2 text-[9px] leading-4 text-white/28">{previewById[candidate.id].description}</div>}
                {candidate.acquisition_error && <div className="mt-3 rounded-xl border border-rose-300/10 bg-rose-300/[.025] px-3 py-2 text-[9px] leading-4 text-rose-50/40">{candidate.acquisition_error}</div>}
                {candidate.latest_capture_job?.last_error && (
                  <div className="mt-3 rounded-xl border border-violet-300/10 bg-violet-300/[.02] px-3 py-2 text-[9px] leading-4 text-violet-50/40">
                    Capture {candidate.latest_capture_job.status}: {candidate.latest_capture_job.last_error}
                    {candidate.latest_capture_job.last_http_status ? ` (HTTP ${candidate.latest_capture_job.last_http_status})` : ""}
                  </div>
                )}
                {candidate.exclusion_reason && <div className="mt-3 text-[9px] leading-4 text-white/22">Excluded: {candidate.exclusion_reason}</div>}

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={candidate.source_url} target="_blank" rel="noreferrer" className={button}>Open source</a>
                  <button type="button" disabled={busy === candidate.id} onClick={() => void review(candidate.id,"approved")} className="rounded-xl border border-emerald-300/12 bg-emerald-300/[.025] px-3 py-2 text-[9px] font-black text-emerald-100/50 disabled:opacity-35">Approve candidate</button>
                  <button type="button" disabled={busy === candidate.id} onClick={() => void review(candidate.id,"permission_required")} className="rounded-xl border border-amber-300/12 bg-amber-300/[.025] px-3 py-2 text-[9px] font-black text-amber-100/48 disabled:opacity-35">Permission needed</button>
                  {canHarvest && candidate.source_type === "morphmarket" && (
                    <>
                      <a
                        href={candidate.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-violet-300/12 bg-violet-300/[.025] px-3 py-2 text-[9px] font-black text-violet-100/48"
                        title="Open the listing normally, then use the Snake Sorter Browser Helper to import its exposed gallery references."
                      >
                        Open listing for helper
                      </a>
                      <button
                        type="button"
                        disabled={
                          busy === `capture-${candidate.id}` ||
                          candidate.latest_capture_job?.status === "queued" ||
                          candidate.latest_capture_job?.status === "processing" ||
                          mediaFor(candidate).some((media) =>
                            Boolean(media.staged_storage_path) ||
                            (Boolean(media.source_media_url) && !["unavailable","blocked","expired"].includes(media.live_reference_status || "unknown"))
                          )
                        }
                        onClick={() => void queueCapture(candidate.id)}
                        className="rounded-xl border border-sky-300/12 bg-sky-300/[.025] px-3 py-2 text-[9px] font-black text-sky-100/48 disabled:opacity-35"
                        title="Fallback capture is enabled only when no usable live or staged image exists."
                      >
                        {busy === `capture-${candidate.id}`
                          ? "Queueing…"
                          : candidate.latest_capture_job?.status === "queued"
                            ? "Capture queued"
                            : candidate.latest_capture_job?.status === "processing"
                              ? "Capturing…"
                              : "Queue capture fallback"}
                      </button>
                    </>
                  )}
                  {canHarvest && (
                    <label className="cursor-pointer rounded-xl border border-sky-300/12 bg-sky-300/[.025] px-3 py-2 text-[9px] font-black text-sky-100/48">
                      {busy === `upload-${candidate.id}` ? "Attaching…" : "Attach review image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={busy === `upload-${candidate.id}`}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) void uploadCandidateMedia(candidate.id, file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                {canHarvest && candidate.review_status === "approved" && (
                  <div className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[.02] p-3">
                    <div className="text-[8px] font-black uppercase tracking-[.08em] text-amber-100/45">Rights review</div>
                    {candidate.rights_status !== "open_license" && (
                      <textarea
                        value={rightsNoteById[candidate.id] ?? candidate.rights_review_note ?? ""}
                        onChange={(event) => setRightsNoteById((current) => ({ ...current, [candidate.id]: event.target.value }))}
                        placeholder="Permission / rights basis (required before clearing non-open-license images)"
                        className="mt-2 min-h-16 w-full rounded-xl border border-white/[.07] bg-black/15 px-3 py-2 text-[9px] leading-4 text-white/45 outline-none placeholder:text-white/18"
                      />
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy === `rights-${candidate.id}`}
                        onClick={() => void updateRights(candidate.id, "cleared", candidate.rights_status === "open_license" ? "open_license" : "permission_granted")}
                        className="rounded-lg border border-emerald-300/12 px-2.5 py-1.5 text-[8px] font-black text-emerald-100/50 disabled:opacity-35"
                      >
                        Mark rights cleared
                      </button>
                      <button
                        type="button"
                        disabled={busy === `rights-${candidate.id}`}
                        onClick={() => void updateRights(candidate.id, "permission_required", "permission_required")}
                        className="rounded-lg border border-amber-300/12 px-2.5 py-1.5 text-[8px] font-black text-amber-100/48 disabled:opacity-35"
                      >
                        Permission required
                      </button>
                      <button
                        type="button"
                        disabled={busy === `rights-${candidate.id}`}
                        onClick={() => void updateRights(candidate.id, "restricted", "metadata_only")}
                        className="rounded-lg border border-rose-300/12 px-2.5 py-1.5 text-[8px] font-black text-rose-100/45 disabled:opacity-35"
                      >
                        Review only
                      </button>
                    </div>
                    <div className="mt-2 text-[8px] text-white/20">Current: {(candidate.rights_review_status || "unreviewed").replaceAll("_"," ")} · {promotableMediaCount(candidate)} image(s) currently eligible for promotion.</div>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={rejectReasonById[candidate.id] ?? ""}
                    onChange={(event) => setRejectReasonById((current) => ({ ...current, [candidate.id]: event.target.value }))}
                    className={select}
                    aria-label="Rejection reason"
                  >
                    <option value="">Reject reason…</option>
                    <option value="designer">Designer</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="mixed locality">Mixed locality</option>
                    <option value="unknown locality">Unknown locality</option>
                    <option value="conflicting lineage">Conflicting lineage</option>
                    <option value="wrong life stage">Wrong life stage</option>
                    <option value="wrong color phase">Wrong color phase</option>
                    <option value="group listing">Group listing</option>
                    <option value="not actual animal photo">Not actual animal photo</option>
                    <option value="media unusable">Media unusable</option>
                    <option value="duplicate animal">Duplicate animal</option>
                    <option value="insufficient information">Insufficient information</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    disabled={busy === candidate.id || !(rejectReasonById[candidate.id] ?? "")}
                    onClick={() => void review(candidate.id, "rejected", rejectReasonById[candidate.id])}
                    className="rounded-xl border border-rose-300/12 bg-rose-300/[.025] px-3 py-2 text-[9px] font-black text-rose-100/45 disabled:opacity-25"
                  >
                    Reject with reason
                  </button>
                </div>
                {canPromote && candidate.review_status === "approved" && !candidate.promoted_reference_animal_id && (
                  (
                    candidate.rights_status === "open_license" && candidate.staged_storage_path
                  ) || (
                    candidate.rights_review_status === "cleared" && promotableMediaCount(candidate) > 0
                  )
                ) && (
                  <form onSubmit={(event) => { event.preventDefault(); void promote(candidate, new FormData(event.currentTarget)); }} className="mt-4 rounded-2xl border border-sky-300/10 bg-sky-300/[.02] p-3">
                    <div className="text-[9px] font-black uppercase tracking-[.09em] text-sky-100/45">Promote one animal + approved images</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Taxon
                        <select name="taxon" defaultValue="Unknown / review" className={`${select} mt-1 w-full`}>
                          <option>Unknown / review</option>
                          <option>Morelia azurea azurea</option>
                          <option>Morelia azurea pulcher</option>
                          <option>Morelia azurea utaraensis</option>
                          <option>Morelia viridis</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Locality
                        <input name="locality" defaultValue={candidate.provisional_locality || candidate.locality_raw || ""} className={`${select} mt-1 w-full`} />
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Life stage
                        <select name="life_stage" defaultValue={["hatchling","neonate","juvenile","subadult","adult","unknown"].includes(candidate.life_stage_hint || "") ? candidate.life_stage_hint || "unknown" : "unknown"} className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="hatchling">Hatchling</option><option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Color phase
                        <select name="neonate_color" defaultValue={candidate.neonate_color_hint || "unknown"} className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="red">Red</option><option value="yellow">Yellow</option><option value="not_applicable">Not applicable</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Label confidence
                        <select name="label_confidence" defaultValue="provisional" className={`${select} mt-1 w-full`}>
                          <option value="provisional">Provisional</option><option value="uncertain">Uncertain</option><option value="strong">Strong</option><option value="confirmed">Confirmed</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Ancestry / purity
                        <select name="purity_status" defaultValue="unknown" className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="possible_mixed">Possible mixed</option><option value="believed_pure">Believed pure</option><option value="known_pure">Known pure</option><option value="hybrid">Hybrid</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Image view
                        <select name="view_type" defaultValue="unknown" className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="full_body">Full body</option><option value="head">Head</option><option value="dorsal">Dorsal</option><option value="left_lateral">Left lateral</option><option value="right_lateral">Right lateral</option><option value="tail">Tail</option><option value="other">Other</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Animal code
                        <input name="animal_code" placeholder="Optional" className={`${select} mt-1 w-full`} />
                      </label>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-xl border border-white/[.05] px-3 py-2 text-[9px] text-white/28"><input type="checkbox" name="training_eligible" value="true" className="accent-emerald-300" />Training eligible after normal reference review</label>
                      <label className="flex items-center gap-2 rounded-xl border border-white/[.05] px-3 py-2 text-[9px] text-white/28"><input type="checkbox" name="challenge_eligible" value="true" className="accent-amber-300" />Challenge / OOD candidate</label>
                    </div>
                    <input type="hidden" name="challenge_expectation" value="review" />
                    <input type="hidden" name="split_group" value="" />
                    <button type="submit" disabled={busy === `promote-${candidate.id}`} className="mt-3 rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-3 py-2 text-[9px] font-black text-sky-100/60 disabled:opacity-35">{busy === `promote-${candidate.id}` ? "Promoting…" : "Promote with these labels"}</button>
                    <div className="mt-2 text-[8px] leading-4 text-white/18">Defaults are intentionally conservative. Choosing a clean taxon does not bypass the normal reference review/split/snapshot rules.</div>
                  </form>
                )}
                {candidate.promoted_reference_animal_id && <div className="mt-3 rounded-xl border border-sky-300/10 bg-sky-300/[.02] px-3 py-2 text-[9px] text-sky-100/40">Promoted to reference animal {candidate.promoted_reference_animal_id}.</div>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/[.05] bg-black/[.04] px-3 py-2 text-[9px] leading-4 text-white/20">
        One listing is treated as one animal. Its approved images stay grouped with that individual through reference promotion and dataset splitting. Biological approval, image review, and rights clearance remain separate deliberate steps.
      </div>
    </section>
  );
}
