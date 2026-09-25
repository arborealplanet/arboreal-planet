"use client";

import { useRef, useState } from "react";

type ImportSummary = {
  ok?: boolean;
  harvest_id?: string;
  source_platform?: string;
  received?: number;
  stored_in_this_chunk?: number;
  failed_in_this_chunk?: number;
  qualified_in_this_chunk?: number;
  review_in_this_chunk?: number;
  new_snake_sorter_candidates?: number;
  possible_relists_flagged?: number;
  possible_reposts_flagged?: number;
  error?: string;
};

export function HarvestImportRunner() {
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadFile(file: File) {
    const text = await file.text();
    setPayload(text);
    setError(null);
  }

  async function runImport() {
    setBusy(true);
    setError(null);
    setSummary(null);
    setRaw("");
    setStatus(null);
    try {
      const response = await fetch("/api/gtp-harvest/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      setStatus(response.status);
      const text = await response.text();
      setRaw(text);
      try {
        setSummary(JSON.parse(text) as ImportSummary);
      } catch {
        setSummary(null);
      }
      if (!response.ok) {
        try {
          const parsed = JSON.parse(text) as { error?: string };
          setError(parsed.error ?? `Import failed (HTTP ${response.status}).`);
        } catch {
          setError(`Import failed (HTTP ${response.status}).`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/[.07] bg-white/[.02] p-6">
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Step 1 — Harvest records</div>
      <h3 className="mt-2 text-xl font-semibold text-white">Import harvest JSON</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
        Paste a harvest payload (<span className="text-white/60">harvest_id</span>, <span className="text-white/60">source_platform</span>,{" "}
        <span className="text-white/60">items[]</span>) or load it from a .json file, then import. The request runs with this
        browser&apos;s owner session. MorphMarket payloads use <span className="text-white/60">HARVEST_MM_GTP_…</span> ids;
        Facebook payloads use <span className="text-white/60">source_platform: &quot;facebook&quot;</span> with{" "}
        <span className="text-white/60">HARVEST_FB_GTP_…</span> ids.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-white/60 transition hover:bg-white/[.07]"
        >
          Load .json file
        </button>
        <button
          type="button"
          disabled={busy || !payload.trim()}
          onClick={() => void runImport()}
          className="rounded-xl bg-emerald-400/90 px-5 py-2 text-xs font-black uppercase tracking-[.08em] text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Importing…" : "Import"}
        </button>
        {payload.trim() && (
          <span className="text-xs text-white/35">{payload.length.toLocaleString()} characters staged</span>
        )}
      </div>
      <textarea
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        spellCheck={false}
        placeholder='{"harvest_id":"HARVEST_FB_GTP_20260924_001","source_platform":"facebook","captured_at":"…","items":[…]}'
        className="mt-4 h-56 w-full resize-y rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-5 text-emerald-100/80 placeholder:text-white/20 focus:border-emerald-300/40 focus:outline-none"
      />
      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/[.06] p-4 text-sm text-red-200">{error}</div>
      )}
      {summary && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            {status !== null && (
              <span>HTTP <span className="font-bold text-white">{status}</span></span>
            )}
            {summary.harvest_id && (
              <span>harvest <span className="font-mono text-xs text-white">{summary.harvest_id}</span></span>
            )}
            {summary.received !== undefined && (
              <span>received <span className="font-bold text-white">{summary.received}</span></span>
            )}
            {summary.stored_in_this_chunk !== undefined && (
              <span>stored <span className="font-bold text-emerald-300">{summary.stored_in_this_chunk}</span></span>
            )}
            {summary.failed_in_this_chunk !== undefined && summary.failed_in_this_chunk > 0 && (
              <span>failed <span className="font-bold text-red-300">{summary.failed_in_this_chunk}</span></span>
            )}
            {summary.new_snake_sorter_candidates !== undefined && (
              <span>new candidates <span className="font-bold text-white">{summary.new_snake_sorter_candidates}</span></span>
            )}
            {summary.qualified_in_this_chunk !== undefined && (
              <span>qualified <span className="font-bold text-white">{summary.qualified_in_this_chunk}</span></span>
            )}
            {summary.review_in_this_chunk !== undefined && summary.review_in_this_chunk > 0 && (
              <span>needs review <span className="font-bold text-amber-300">{summary.review_in_this_chunk}</span></span>
            )}
            {(summary.possible_relists_flagged ?? summary.possible_reposts_flagged) !== undefined &&
              ((summary.possible_relists_flagged ?? summary.possible_reposts_flagged ?? 0) > 0) && (
                <span>
                  possible reposts <span className="font-bold text-amber-300">{summary.possible_relists_flagged ?? summary.possible_reposts_flagged}</span>
                </span>
              )}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.08em] text-white/40">Full response JSON</summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-black/50 p-4 font-mono text-[11px] leading-5 text-white/60">{raw}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export function HarvestMediaUpload() {
  const [candidateId, setCandidateId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [galleryIndex, setGalleryIndex] = useState("");
  const [galleryTotal, setGalleryTotal] = useState("");
  const [perceptualHash, setPerceptualHash] = useState("");
  const [imageSubject, setImageSubject] = useState("listed_animal");
  const [sourceCaptureKind, setSourceCaptureKind] = useState("screenshot");
  const [sourceMediaUrl, setSourceMediaUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function runUpload() {
    if (!file) {
      setError("Choose an image file first.");
      return;
    }
    setBusy(true);
    setError(null);
    setRaw("");
    setStatus(null);
    try {
      const form = new FormData();
      form.set("candidate_id", candidateId.trim());
      form.set("file", file);
      if (galleryIndex.trim()) form.set("gallery_index", galleryIndex.trim());
      if (galleryTotal.trim()) form.set("gallery_total", galleryTotal.trim());
      form.set("perceptual_hash", perceptualHash.trim().toLowerCase());
      form.set("image_subject", imageSubject.trim() || "listed_animal");
      form.set("source_capture_kind", sourceCaptureKind.trim() || "screenshot");
      if (sourceMediaUrl.trim()) form.set("source_media_url", sourceMediaUrl.trim());
      const response = await fetch("/api/snake-sorter/acquisition/media-upload", {
        method: "POST",
        body: form,
      });
      setStatus(response.status);
      const text = await response.text();
      setRaw(text);
      if (!response.ok) {
        try {
          const parsed = JSON.parse(text) as { error?: string };
          setError(parsed.error ?? `Upload failed (HTTP ${response.status}).`);
        } catch {
          setError(`Upload failed (HTTP ${response.status}).`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload request failed.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-emerald-300/40 focus:outline-none";

  return (
    <div className="mt-6 rounded-3xl border border-white/[.07] bg-white/[.02] p-6">
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Step 2 — Screenshots</div>
      <h3 className="mt-2 text-xl font-semibold text-white">Upload staged media</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
        Upload one screenshot per submission against a <span className="text-white/60">candidate_id</span> returned by the
        import. Uploads stay <span className="text-white/60">staged pending review</span> — nothing here promotes media.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">candidate_id *</span>
          <input value={candidateId} onChange={(e) => setCandidateId(e.target.value)} placeholder="uuid" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">image file * (JPEG/PNG/WebP, ≤ 15 MB)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-white/60 file:mr-3 file:rounded-xl file:border file:border-white/10 file:bg-white/[.04] file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-[.08em] file:text-white/60"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">gallery_index *</span>
          <input value={galleryIndex} onChange={(e) => setGalleryIndex(e.target.value)} placeholder="1" inputMode="numeric" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">gallery_total *</span>
          <input value={galleryTotal} onChange={(e) => setGalleryTotal(e.target.value)} placeholder="7" inputMode="numeric" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">perceptual_hash * (16 lowercase hex chars)</span>
          <input value={perceptualHash} onChange={(e) => setPerceptualHash(e.target.value)} placeholder="381ada5a7a3a3a9a" spellCheck={false} className={`${field} font-mono`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">source_media_url (post permalink)</span>
          <input value={sourceMediaUrl} onChange={(e) => setSourceMediaUrl(e.target.value)} placeholder="https://facebook.com/…/permalink/…" spellCheck={false} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">image_subject</span>
          <input value={imageSubject} onChange={(e) => setImageSubject(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">source_capture_kind</span>
          <input value={sourceCaptureKind} onChange={(e) => setSourceCaptureKind(e.target.value)} className={field} />
        </label>
      </div>
      <div className="mt-4">
        <button
          type="button"
          disabled={busy || !candidateId.trim() || !file}
          onClick={() => void runUpload()}
          className="rounded-xl bg-emerald-400/90 px-5 py-2 text-xs font-black uppercase tracking-[.08em] text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Uploading…" : "Upload screenshot"}
        </button>
        {file && <span className="ml-3 text-xs text-white/35">{file.name}</span>}
      </div>
      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/[.06] p-4 text-sm text-red-200">{error}</div>
      )}
      {raw && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm text-white/60">
            {status !== null && (
              <span>HTTP <span className="font-bold text-white">{status}</span></span>
            )}
          </div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-black/50 p-4 font-mono text-[11px] leading-5 text-white/60">{raw}</pre>
        </div>
      )}
    </div>
  );
}
