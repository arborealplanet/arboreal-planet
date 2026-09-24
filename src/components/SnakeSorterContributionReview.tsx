"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SnakeReferenceAnimal } from "@/components/SnakeSorterReferenceManager";

type Contribution = {
  id: string;
  contributor_user_id: string;
  contributor_name: string | null;
  media_type: "image" | "video";
  original_name: string;
  mime_type: string;
  file_size_bytes: number;
  status: "pending_review" | "approved" | "rejected" | "withdrawn";
  taxon_guess: string | null;
  life_stage_guess: string | null;
  view_type_guess: string | null;
  provenance_hint: string | null;
  notes: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  promoted_reference_animal_id: string | null;
  created_at: string;
  preview_url: string;
};

const TAXA = ["Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis", "Unknown / review"];
const STAGES = ["hatchling", "neonate", "juvenile", "subadult", "adult", "unknown"];
const COLORS = ["red", "yellow", "not_applicable", "unknown"];
const VIEWS = ["unknown", "full_body", "head", "dorsal", "left_lateral", "right_lateral", "tail", "other"];
const CONFIDENCE = ["confirmed", "strong", "provisional", "uncertain"];
const PURITY = ["known_pure", "believed_pure", "possible_mixed", "hybrid", "unknown"];

const field = "w-full rounded-xl border border-white/[.08] bg-black/15 px-3 py-2 text-xs text-white outline-none placeholder:text-white/18 focus:border-emerald-300/20";
const label = "mb-1 block text-[8px] font-black uppercase tracking-[.1em] text-white/34";
const button = "rounded-xl border px-3 py-2 text-[9px] font-black transition disabled:opacity-35";

function ApproveForm({
  contribution,
  animals,
  onDone,
}: {
  contribution: Contribution;
  animals: SnakeReferenceAnimal[];
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taxon, setTaxon] = useState(contribution.taxon_guess && contribution.taxon_guess !== "Unknown / review" ? contribution.taxon_guess : "Unknown / review");
  const [lifeStage, setLifeStage] = useState(contribution.life_stage_guess || "unknown");
  const [neonateColor, setNeonateColor] = useState("unknown");
  const [viewType, setViewType] = useState(contribution.view_type_guess && VIEWS.includes(contribution.view_type_guess) ? contribution.view_type_guess : "unknown");
  const [locality, setLocality] = useState("");
  const [labelConfidence, setLabelConfidence] = useState("provisional");
  const [purityStatus, setPurityStatus] = useState("unknown");
  const [trainingEligible, setTrainingEligible] = useState(true);
  const [animalId, setAnimalId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  async function approve() {
    setBusy(true);
    const response = await fetch("/api/snake-sorter/contributions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: contribution.id,
        action: "approve",
        taxon,
        life_stage: lifeStage,
        neonate_color: neonateColor,
        view_type: viewType,
        locality: locality.trim(),
        label_confidence: labelConfidence,
        purity_status: purityStatus,
        training_eligible: trainingEligible,
        animal_id: animalId || undefined,
        review_notes: reviewNotes.trim() || undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      onDone(data.error ?? "Approval failed.");
      return;
    }
    setOpen(false);
    onDone(`Approved${contribution.media_type === "image" ? " — image copied into the reference library" : " — video retained for future frame sampling"}.`);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${button} border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/60`}>
        Approve…
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.015] p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className={label}>Taxon</span>
          <select value={taxon} onChange={(e) => setTaxon(e.target.value)} className={field}>
            {TAXA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Life stage</span>
          <select value={lifeStage} onChange={(e) => setLifeStage(e.target.value)} className={field}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Neonate color</span>
          <select value={neonateColor} onChange={(e) => setNeonateColor(e.target.value)} className={field}>
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>View</span>
          <select value={viewType} onChange={(e) => setViewType(e.target.value)} className={field}>
            {VIEWS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Label confidence</span>
          <select value={labelConfidence} onChange={(e) => setLabelConfidence(e.target.value)} className={field}>
            {CONFIDENCE.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>Purity</span>
          <select value={purityStatus} onChange={(e) => setPurityStatus(e.target.value)} className={field}>
            {PURITY.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <span className={label}>Locality (optional)</span>
          <input value={locality} onChange={(e) => setLocality(e.target.value)} className={field} placeholder="e.g. Biak, Jayapura…" maxLength={100} />
        </div>
        <div className="col-span-2">
          <span className={label}>Attach to reference animal</span>
          <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} className={field}>
            <option value="">Create new animal</option>
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {(animal.animal_code || animal.id.slice(0, 8))} · {animal.taxon} · {animal.life_stage}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <span className={label}>Review notes (optional)</span>
          <input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className={field} placeholder="Why this media is useful…" maxLength={2000} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[10px] text-white/40">
        <input type="checkbox" checked={trainingEligible} onChange={(e) => setTrainingEligible(e.target.checked)} className="h-4 w-4 accent-emerald-300" />
        Training eligible (still gated by confidence/purity rules server-side)
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void approve()} className={`${button} border-emerald-300/15 bg-emerald-300/[.06] text-emerald-100/65`}>
          {busy ? "Approving…" : "Confirm approval"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${button} border-white/[.07] bg-black/[.06] text-white/40`}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SnakeSorterContributionReview({
  animals,
  onPromoted,
}: {
  animals: SnakeReferenceAnimal[];
  onPromoted?: () => void;
}) {
  const [status, setStatus] = useState("pending_review");
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/snake-sorter/contributions?status=${encodeURIComponent(status)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setContributions(data.contributions ?? []);
    setLoaded(true);
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const done = useCallback(async (msg: string) => {
    setMessage(msg);
    setBusyId("");
    await load();
    onPromoted?.();
  }, [load, onPromoted]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contributions) map[c.status] = (map[c.status] ?? 0) + 1;
    return map;
  }, [contributions]);

  async function reject(contribution: Contribution, reviewNotes: string) {
    setBusyId(contribution.id);
    const response = await fetch("/api/snake-sorter/contributions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contribution.id, action: "reject", review_notes: reviewNotes || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Rejection failed.");
      setBusyId("");
      return;
    }
    await done("Contribution rejected.");
  }

  async function purge(contribution: Contribution) {
    if (!window.confirm(`Permanently delete "${contribution.original_name}" and its stored bytes?`)) return;
    setBusyId(contribution.id);
    const response = await fetch(`/api/snake-sorter/contributions?id=${encodeURIComponent(contribution.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Purge failed.");
      setBusyId("");
      return;
    }
    await done("Contribution purged.");
  }

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Owner review</div>
          <h2 className="mt-2 text-2xl font-semibold">Member contributions</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">
            Review uploads from members before anything enters the reference library. Approving an image copies it into the curated library with your labels. Approving a video stores the original alongside the new animal record so key frames can be sampled later.
          </p>
        </div>
        <div className="flex gap-2">
          {(["pending_review", "approved", "rejected", "withdrawn"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`${button} ${status === value ? "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100/65" : "border-white/[.07] bg-black/[.06] text-white/40"}`}
            >
              {value.replace("_", " ")}{counts[value] ? ` (${counts[value]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {message && <div className="mt-4 rounded-xl border border-white/[.06] bg-black/[.05] px-3 py-2 text-[10px] text-white/38">{message}</div>}

      {!loaded ? (
        <p className="mt-6 text-sm text-white/28">Loading…</p>
      ) : contributions.length === 0 ? (
        <p className="mt-6 text-sm text-white/28">No contributions with this status.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {contributions.map((contribution) => (
            <ContributionCard
              key={contribution.id}
              contribution={contribution}
              animals={animals}
              busy={busyId === contribution.id}
              onDone={done}
              onReject={(notes) => void reject(contribution, notes)}
              onPurge={() => void purge(contribution)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Owner-side key-frame extraction for approved video contributions: sample
// stills in the browser and attach them to the promoted reference animal.
async function sampleVideoFrames(url: string, count: number): Promise<File[]> {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not load video"));
    video.src = url;
  });
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
  const frames: File[] = [];
  for (let i = 0; i < count; i++) {
    const time = duration * ((i + 1) / (count + 1));
    await new Promise<void>((resolve) => {
      const done = () => {
        video.onseeked = null;
        resolve();
      };
      video.onseeked = done;
      video.currentTime = Math.min(Math.max(time, 0), Math.max(0, duration - 0.05));
      window.setTimeout(done, 2500);
    });
    if (!video.videoWidth || !video.videoHeight) continue;
    const scale = Math.min(1, 1280 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (blob) frames.push(new File([blob], `contribution-frame-${i + 1}.jpg`, { type: "image/jpeg" }));
  }
  video.src = "";
  return frames;
}

function FrameSampler({
  contribution,
  animalId,
  onDone,
}: {
  contribution: Contribution;
  animalId: string;
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sampling, setSampling] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [frames, setFrames] = useState<Array<{ file: File; url: string; selected: boolean }>>([]);

  useEffect(() => {
    return () => {
      frames.forEach((frame) => URL.revokeObjectURL(frame.url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sample() {
    setSampling(true);
    try {
      const sampled = await sampleVideoFrames(contribution.preview_url, 6);
      setFrames(sampled.map((file) => ({ file, url: URL.createObjectURL(file), selected: true })));
      if (!sampled.length) onDone("No frames could be sampled from this video.");
    } catch {
      onDone("Could not sample frames from this video.");
    }
    setSampling(false);
  }

  function toggle(index: number) {
    setFrames((current) => current.map((frame, i) => (i === index ? { ...frame, selected: !frame.selected } : frame)));
  }

  async function attach() {
    const selected = frames.filter((frame) => frame.selected);
    if (!selected.length) {
      onDone("Select at least one frame to attach.");
      return;
    }
    setAttaching(true);
    const form = new FormData();
    selected.forEach((frame) => form.append("images", frame.file, frame.file.name));
    const response = await fetch(`/api/snake-sorter/references/${encodeURIComponent(animalId)}`, {
      method: "POST",
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    setAttaching(false);
    if (!response.ok) {
      onDone(data.error ?? "Could not attach frames.");
      return;
    }
    const duplicates = Array.isArray(data.duplicates) && data.duplicates.length ? ` ${data.duplicates.length} duplicate(s) skipped.` : "";
    onDone(`${data.uploaded ?? 0} key frame(s) added to the reference animal.${duplicates}`);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setOpen(true); void sample(); }} className={`${button} border-sky-300/15 bg-sky-300/[.04] text-sky-100/60`}>
        Sample key frames
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-300/10 bg-sky-300/[.015] p-3">
      <div className="text-[9px] font-black uppercase tracking-[.1em] text-sky-100/50">Key-frame sampling</div>
      {sampling && <div className="mt-2 text-[10px] text-white/30">Sampling frames from the video…</div>}
      {!sampling && frames.length > 0 && (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {frames.map((frame, index) => (
              <button
                key={frame.url}
                type="button"
                onClick={() => toggle(index)}
                className={`relative overflow-hidden rounded-xl border transition ${frame.selected ? "border-emerald-300/30" : "border-white/[.07] opacity-45"}`}
                aria-pressed={frame.selected}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frame.url} alt={`Frame ${index + 1}`} className="h-20 w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] font-black text-white/70">
                  {frame.selected ? "✓" : "+"}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={attaching}
              onClick={() => void attach()}
              className={`${button} border-emerald-300/15 bg-emerald-300/[.06] text-emerald-100/65`}
            >
              {attaching ? "Attaching…" : `Attach ${frames.filter((f) => f.selected).length} frame(s)`}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={`${button} border-white/[.07] bg-black/[.06] text-white/40`}>
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ContributionCard({  contribution,
  animals,
  busy,
  onDone,
  onReject,
  onPurge,
}: {
  contribution: Contribution;
  animals: SnakeReferenceAnimal[];
  busy: boolean;
  onDone: (message: string) => void;
  onReject: (notes: string) => void;
  onPurge: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[.055] bg-black/[.06]">
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div className="min-h-[180px] bg-black/40">
          {contribution.media_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contribution.preview_url} alt={contribution.original_name} className="h-full max-h-[320px] w-full object-contain" loading="lazy" />
          ) : (
            <video src={contribution.preview_url} className="h-full max-h-[320px] w-full object-contain" controls preload="metadata" playsInline />
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white/65" title={contribution.original_name}>{contribution.original_name}</div>
              <div className="mt-1 text-[9px] text-white/24">
                {contribution.contributor_name || "Member"} · {contribution.media_type === "video" ? "Video" : "Image"} · {new Date(contribution.created_at).toLocaleString()}
              </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${
              contribution.status === "approved" ? "border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/60"
              : contribution.status === "rejected" ? "border-rose-300/12 bg-rose-300/[.025] text-rose-100/50"
              : contribution.status === "withdrawn" ? "border-white/[.06] text-white/24"
              : "border-amber-300/15 bg-amber-300/[.04] text-amber-100/60"
            }`}>
              {contribution.status.replace("_", " ")}
            </span>
          </div>

          {(contribution.taxon_guess || contribution.life_stage_guess || contribution.view_type_guess || contribution.provenance_hint || contribution.notes) && (
            <div className="mt-3 rounded-xl border border-white/[.05] bg-black/[.05] p-3 text-[10px] leading-5 text-white/38">
              {contribution.taxon_guess && <div><span className="text-white/22">Taxon guess:</span> {contribution.taxon_guess}</div>}
              {contribution.life_stage_guess && <div><span className="text-white/22">Stage:</span> {contribution.life_stage_guess}</div>}
              {contribution.view_type_guess && <div><span className="text-white/22">View:</span> {contribution.view_type_guess.replace("_", " ")}</div>}
              {contribution.provenance_hint && <div><span className="text-white/22">Provenance:</span> {contribution.provenance_hint}</div>}
              {contribution.notes && <div><span className="text-white/22">Notes:</span> {contribution.notes}</div>}
            </div>
          )}

          {contribution.review_notes && (
            <div className="mt-2 text-[10px] text-white/30"><span className="text-white/20">Review:</span> {contribution.review_notes}</div>
          )}

          {(contribution.status === "approved" || contribution.status === "rejected") && contribution.reviewer_name && (
            <div className="mt-2 text-[9px] text-white/22">
              {contribution.status === "approved" ? "Approved" : "Rejected"} by {contribution.reviewer_name}
              {contribution.reviewed_at && ` · ${new Date(contribution.reviewed_at).toLocaleString()}`}
            </div>
          )}

          {contribution.status === "pending_review" && !rejecting && (
            <div className="mt-3 flex flex-wrap gap-2">
              <ApproveForm contribution={contribution} animals={animals} onDone={onDone} />
              <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${button} border-rose-300/12 bg-rose-300/[.025] text-rose-100/50`}>
                Reject…
              </button>
            </div>
          )}

          {contribution.status === "pending_review" && rejecting && (
            <div className="mt-3 space-y-2 rounded-2xl border border-rose-300/10 bg-rose-300/[.015] p-3">
              <input
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className={field}
                placeholder="Reason (optional — shown to the contributor)"
                maxLength={2000}
              />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => onReject(rejectNotes.trim())} className={`${button} border-rose-300/14 bg-rose-300/[.05] text-rose-100/55`}>
                  Confirm rejection
                </button>
                <button type="button" onClick={() => setRejecting(false)} className={`${button} border-white/[.07] bg-black/[.06] text-white/40`}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(contribution.status === "rejected" || contribution.status === "withdrawn") && (
            <div className="mt-3">
              <button type="button" disabled={busy} onClick={onPurge} className={`${button} border-white/[.07] bg-black/[.06] text-white/30`}>
                Purge bytes
              </button>
            </div>
          )}

          {contribution.status === "approved" && contribution.promoted_reference_animal_id && (
            <div className="mt-3 space-y-2">
              <div className="text-[10px] text-emerald-100/45">
                Linked to reference animal {contribution.promoted_reference_animal_id.slice(0, 8)}.
              </div>
              {contribution.media_type === "video" && (
                <FrameSampler
                  contribution={contribution}
                  animalId={contribution.promoted_reference_animal_id}
                  onDone={onDone}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
