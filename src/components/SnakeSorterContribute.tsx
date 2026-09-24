"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Contribution = {
  id: string;
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
  promoted_reference_animal_id: string | null;
  created_at: string;
  preview_url: string;
};

const TAXA = ["", "Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis", "Unknown / review"];
const STAGES = ["", "hatchling", "neonate", "juvenile", "subadult", "adult", "unknown"];
const VIEWS = ["", "full_body", "head", "dorsal", "left_lateral", "right_lateral", "tail", "other", "mixed"];

const field = "w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/18 focus:border-emerald-300/20";
const label = "mb-1 block text-[9px] font-black uppercase tracking-[.1em] text-white/38";
const button = "rounded-xl border px-3 py-2 text-[9px] font-black transition disabled:opacity-35";

const statusStyle: Record<Contribution["status"], string> = {
  pending_review: "border-amber-300/15 bg-amber-300/[.04] text-amber-100/60",
  approved: "border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/60",
  rejected: "border-rose-300/12 bg-rose-300/[.025] text-rose-100/50",
  withdrawn: "border-white/[.06] text-white/24",
};

const statusLabel: Record<Contribution["status"], string> = {
  pending_review: "In review",
  approved: "Accepted",
  rejected: "Not used",
  withdrawn: "Withdrawn",
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function SnakeSorterContribute() {
  const [files, setFiles] = useState<File[]>([]);
  const [taxonGuess, setTaxonGuess] = useState("");
  const [lifeStageGuess, setLifeStageGuess] = useState("");
  const [viewTypeGuess, setViewTypeGuess] = useState("");
  const [provenanceHint, setProvenanceHint] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState("");
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/snake-sorter/contributions", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setContributions(data.contributions ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = useMemo(
    () => contributions.filter((c) => c.status === "pending_review").length,
    [contributions],
  );

  function addFiles(next: File[]) {
    const accepted = next
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .slice(0, Math.max(0, 12 - files.length));
    if (accepted.length !== next.length) {
      setMessage("Only images and videos can be contributed.");
    }
    setFiles((current) => [...current, ...accepted]);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!files.length) {
      setMessage("Add at least one image or video first.");
      return;
    }
    if (!consent) {
      setMessage("Please grant dataset-use permission before uploading.");
      return;
    }
    setBusy(true);
    setUploading(0);
    setMessage("");

    const accepted: string[] = [];
    const rejected: string[] = [];
    const batches: File[][] = [];
    for (let i = 0; i < files.length; i += 6) batches.push(files.slice(i, i + 6));

    for (const batch of batches) {
      const form = new FormData();
      batch.forEach((file) => form.append("files", file, file.name));
      form.set("consent", "true");
      if (taxonGuess) form.set("taxon_guess", taxonGuess);
      if (lifeStageGuess) form.set("life_stage_guess", lifeStageGuess);
      if (viewTypeGuess) form.set("view_type_guess", viewTypeGuess);
      if (provenanceHint.trim()) form.set("provenance_hint", provenanceHint.trim());
      if (notes.trim()) form.set("notes", notes.trim());

      const response = await fetch("/api/snake-sorter/contributions", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      for (const item of (data.accepted ?? []) as Array<{ name: string }>) accepted.push(item.name);
      for (const item of (data.rejected ?? []) as Array<{ name: string; reason: string }>) rejected.push(`${item.name}: ${item.reason}`);
      if (!response.ok && !data.accepted?.length) {
        rejected.push(data.error ?? "Upload failed.");
      }
      setUploading((n) => n + batch.length);
    }

    setFiles([]);
    setBusy(false);
    setUploading(0);
    await load();
    setMessage(
      accepted.length
        ? `${accepted.length} file(s) submitted for review.${rejected.length ? ` ${rejected.length} rejected: ${rejected.join(" · ")}` : ""}`
        : rejected.join(" · ") || "Upload failed.",
    );
  }

  async function withdraw(id: string) {
    const response = await fetch("/api/snake-sorter/contributions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "withdraw" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not withdraw.");
    else setMessage("Contribution withdrawn.");
    await load();
  }

  return (
    <div className="space-y-4">
      <section className="panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker">Contribute media</div>
            <h2 className="mt-2 text-2xl font-semibold">Help train Snake Sorter</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">
              Upload photos and videos of green tree pythons. Everything lands in an owner review queue — nothing enters the reference or training library until it is explicitly approved. Videos are especially valuable: the reviewer can sample key frames from different angles and life stages.
            </p>
          </div>
          {loaded && (
            <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[.02] px-4 py-3 text-center">
              <div className="text-xl font-semibold text-amber-100/65">{pendingCount}</div>
              <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/20">In review</div>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-white/[.1] bg-black/[.08] p-6 text-center transition hover:border-emerald-300/25 hover:bg-emerald-300/[.02]"
            >
              <span className="text-2xl">◈</span>
              <span className="text-sm font-semibold text-white/60">Choose photos or videos</span>
              <span className="text-[10px] text-white/24">Images up to 15 MB · videos up to 100 MB · JPEG, PNG, WebP, MP4, WebM, MOV</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />

            {files.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20">
                    {file.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(file)} alt={file.name} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="grid h-28 w-full place-items-center text-2xl text-white/30">▷</div>
                    )}
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <span className="truncate text-[9px] text-white/34">{file.name} · {formatBytes(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="shrink-0 rounded-lg border border-white/[.08] px-1.5 py-0.5 text-[9px] font-black text-white/40"
                        aria-label={`Remove ${file.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <span className={label}>Your best guess at taxon (optional)</span>
              <select value={taxonGuess} onChange={(e) => setTaxonGuess(e.target.value)} className={field}>
                {TAXA.map((taxon) => (
                  <option key={taxon} value={taxon}>{taxon || "Unknown / not sure"}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={label}>Life stage</span>
                <select value={lifeStageGuess} onChange={(e) => setLifeStageGuess(e.target.value)} className={field}>
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage || "Unknown"}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className={label}>View</span>
                <select value={viewTypeGuess} onChange={(e) => setViewTypeGuess(e.target.value)} className={field}>
                  {VIEWS.map((view) => (
                    <option key={view} value={view}>{view ? view.replace("_", " ") : "Mixed / not sure"}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className={label}>Provenance / locality hint (optional)</span>
              <input value={provenanceHint} onChange={(e) => setProvenanceHint(e.target.value)} className={field} placeholder="e.g. Biak, Jayapura, breeder name…" maxLength={200} />
            </div>
            <div>
              <span className={label}>Notes (optional)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${field} min-h-[70px]`} placeholder="Anything the reviewer should know about this animal…" maxLength={2000} />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/[.06] bg-black/[.06] p-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-300" />
              <span className="text-[10px] leading-4 text-white/40">
                I grant Arboreal Planet permission to use these media in the Snake Sorter reference and training dataset if approved.
              </span>
            </label>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !files.length}
              className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-[10px] font-black uppercase tracking-[.08em] text-[#06100c] transition disabled:opacity-35"
            >
              {busy ? `Uploading ${uploading}/${files.length}…` : `Submit ${files.length ? `${files.length} file(s)` : "files"} for review`}
            </button>
          </div>
        </div>

        {message && <div className="mt-4 rounded-xl border border-white/[.06] bg-black/[.05] px-3 py-2 text-[10px] text-white/38">{message}</div>}
      </section>

      <section className="panel rounded-[28px] p-5 sm:p-6">
        <div className="section-kicker">Your contributions</div>
        <h2 className="mt-2 text-2xl font-semibold">Submission history</h2>
        {!loaded ? (
          <p className="mt-4 text-sm text-white/28">Loading…</p>
        ) : contributions.length === 0 ? (
          <p className="mt-4 text-sm text-white/28">Nothing submitted yet. Your uploads will appear here with their review status.</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {contributions.map((contribution) => (
              <div key={contribution.id} className="overflow-hidden rounded-2xl border border-white/[.055] bg-black/[.06]">
                <div className="relative h-36 bg-black/30">
                  {contribution.media_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contribution.preview_url} alt={contribution.original_name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <video src={contribution.preview_url} className="h-full w-full object-cover" preload="metadata" playsInline />
                  )}
                  <span className={`absolute left-2 top-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${statusStyle[contribution.status]}`}>
                    {statusLabel[contribution.status]}
                  </span>
                </div>
                <div className="p-3">
                  <div className="truncate text-xs font-semibold text-white/60" title={contribution.original_name}>{contribution.original_name}</div>
                  <div className="mt-1 text-[9px] text-white/24">
                    {contribution.media_type === "video" ? "Video" : "Image"} · {formatBytes(contribution.file_size_bytes)} · {new Date(contribution.created_at).toLocaleDateString()}
                  </div>
                  {contribution.taxon_guess && contribution.taxon_guess !== "Unknown / review" && (
                    <div className="mt-1 text-[9px] text-white/30 italic">{contribution.taxon_guess}{contribution.life_stage_guess ? ` · ${contribution.life_stage_guess}` : ""}</div>
                  )}
                  {contribution.status === "rejected" && contribution.review_notes && (
                    <div className="mt-2 rounded-lg border border-rose-300/10 bg-rose-300/[.02] p-2 text-[9px] leading-4 text-rose-100/45">
                      Reviewer: {contribution.review_notes}
                    </div>
                  )}
                  {contribution.status === "approved" && (
                    <div className="mt-2 text-[9px] text-emerald-100/45">Accepted into the reference review pipeline.</div>
                  )}
                  {contribution.status === "pending_review" && (
                    <button
                      type="button"
                      onClick={() => void withdraw(contribution.id)}
                      className={`${button} mt-2 border-white/[.07] bg-black/[.06] text-white/40`}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
