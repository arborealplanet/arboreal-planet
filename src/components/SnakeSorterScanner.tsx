"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SNAKE_SORTER_TAXA, type SnakeSorterAnalysisResult } from "@/lib/snake-sorter/types";

type ScanAsset = {
  id: string;
  file: File;
  kind: "image" | "video";
  source: "upload" | "camera" | "recording";
  previewUrl: string;
};

type AnalysisStatus = "idle" | "preparing" | "running" | "ready" | "error";

const buttonBase = "rounded-2xl border px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35";
const field = "w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white outline-none focus:border-sky-300/25";

function humanBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


async function canvasToFile(canvas: HTMLCanvasElement, name: string, quality = 0.86) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not encode analysis frame");
  return new File([blob], name, { type: "image/jpeg" });
}

function fitSize(width: number, height: number, maxDimension = 1800) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function normalizeImage(file: File, index: number) {
  const bitmap = await createImageBitmap(file);
  const size = fitSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvasToFile(canvas, `evidence-image-${index + 1}.jpg`);
}

async function sampleVideo(file: File, mode: string, sourceIndex: number) {
  const requested = mode === "dense" ? 8 : mode === "keyframes" ? 3 : 5;
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video metadata"));
    });
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const times = Array.from({ length: requested }, (_, i) => duration * ((i + 1) / (requested + 1)));
    const frames: File[] = [];
    for (let i = 0; i < times.length; i++) {
      video.currentTime = Math.min(Math.max(times[i], 0), Math.max(0, duration - 0.05));
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.onseeked = done;
        window.setTimeout(done, 1200);
      });
      if (!video.videoWidth || !video.videoHeight) continue;
      const size = fitSize(video.videoWidth, video.videoHeight);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.drawImage(video, 0, 0, size.width, size.height);
      frames.push(await canvasToFile(canvas, `video-${sourceIndex + 1}-frame-${i + 1}.jpg`));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SnakeSorterScanner() {
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<SnakeSorterAnalysisResult | null>(null);
  const [stageHint, setStageHint] = useState("auto");
  const [colorHint, setColorHint] = useState("auto");
  const [localityMode, setLocalityMode] = useState(true);
  const [nearestNeighbors, setNearestNeighbors] = useState(true);
  const [conservativeMode, setConservativeMode] = useState(true);
  const [frameSampling, setFrameSampling] = useState("balanced");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const assetsRef = useRef<ScanAsset[]>([]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      assetsRef.current.forEach((asset) => URL.revokeObjectURL(asset.previewUrl));
    };
  }, []);

  const totals = useMemo(() => ({
    images: assets.filter((a) => a.kind === "image").length,
    videos: assets.filter((a) => a.kind === "video").length,
    size: assets.reduce((sum, a) => sum + a.file.size, 0),
  }), [assets]);


  function invalidateAnalysis() {
    setAnalysisResult(null);
    setAnalysisStatus("idle");
    setAnalysisMessage("");
  }

  function addFiles(files: File[], source: ScanAsset["source"]) {
    const accepted = files
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .slice(0, Math.max(0, 20 - assets.length))
      .map((file): ScanAsset => ({
        id: crypto.randomUUID(),
        file,
        kind: file.type.startsWith("video/") ? "video" : "image",
        source,
        previewUrl: URL.createObjectURL(file),
      }));
    setAssets((current) => [...current, ...accepted]);
    setAnalysisStatus("idle");
    setAnalysisMessage("");
    setAnalysisResult(null);
  }

  function removeAsset(id: string) {
    setAssets((current) => {
      const target = current.find((asset) => asset.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((asset) => asset.id !== id);
    });
    invalidateAnalysis();
  }

  function clearAssets() {
    assets.forEach((asset) => URL.revokeObjectURL(asset.previewUrl));
    setAssets([]);
    setAnalysisStatus("idle");
    setAnalysisMessage("");
    setAnalysisResult(null);
  }

  async function openCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setCameraError("Camera access was not available. Check browser permission and try again.");
      setCameraOpen(false);
    }
  }

  function closeCamera() {
    if (recording) stopRecording();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  async function captureStill() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
    if (!blob) return;
    addFiles([new File([blob], `snake-capture-${Date.now()}.jpg`, { type: "image/jpeg" })], "camera");
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setCameraError("Video recording is not supported in this browser.");
      return;
    }
    chunksRef.current = [];
    const preferred = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const type = recorder.mimeType || "video/webm";
      const extension = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size) addFiles([new File([blob], `snake-live-${Date.now()}.${extension}`, { type })], "recording");
      chunksRef.current = [];
    };
    recorder.start(500);
    setRecording(true);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function runAnalysis() {
    if (!assets.length) return;
    setAnalysisStatus("preparing");
    setAnalysisMessage("Extracting and normalizing evidence frames in your browser…");

    try {
      const evidence: File[] = [];
      for (let i = 0; i < assets.length && evidence.length < 24; i++) {
        const asset = assets[i];
        if (asset.kind === "image") {
          evidence.push(await normalizeImage(asset.file, evidence.length));
        } else {
          const frames = await sampleVideo(asset.file, frameSampling, i);
          evidence.push(...frames.slice(0, Math.max(0, 24 - evidence.length)));
        }
      }

      if (!evidence.length) throw new Error("No usable analysis frames could be prepared.");

      const form = new FormData();
      evidence.forEach((file) => form.append("evidence", file, file.name));
      form.set("source_assets", String(assets.length));
      form.set("source_images", String(totals.images));
      form.set("source_videos", String(totals.videos));
      form.set("life_stage_hint", stageHint);
      form.set("color_hint", colorHint);
      form.set("locality_mode", String(localityMode));
      form.set("nearest_neighbors", String(nearestNeighbors));
      form.set("conservative_mode", String(conservativeMode));
      form.set("frame_sampling", frameSampling);

      setAnalysisStatus("running");
      setAnalysisMessage(`Prepared ${evidence.length} evidence frame(s). Running the private analysis pipeline…`);
      const response = await fetch("/api/snake-sorter/analyze", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.result) {
        setAnalysisResult(data.result as SnakeSorterAnalysisResult);
        setAnalysisStatus("ready");
        setAnalysisMessage("Analysis complete.");
      } else {
        setAnalysisResult(null);
        setAnalysisStatus("error");
        setAnalysisMessage(data.message ?? data.error ?? "The analysis engine is not connected yet.");
      }
    } catch (error) {
      setAnalysisStatus("error");
      setAnalysisMessage(error instanceof Error ? error.message : "The analysis request could not be completed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-sky-300/14 bg-[radial-gradient(circle_at_80%_0%,rgba(125,211,252,.08),transparent_32%),rgba(125,211,252,.025)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-sky-100/60">Identification lab</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.03em]">Analyze a snake</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Feed Snake Sorter photographs, existing video, or live camera footage. Scan media is analysis-only and is never promoted into the reference/training library automatically.</p>
          </div>
          <div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-2 text-[10px] font-black uppercase tracking-[.12em] text-emerald-100/60">Non-persistent scans</div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <label className={`${buttonBase} cursor-pointer border-sky-300/16 bg-sky-300/[.05] text-sky-100/75 hover:bg-sky-300/[.09]`}>
            <span className="block text-lg">▧</span>
            <span className="mt-2 block">Upload photos</span>
            <span className="mt-1 block text-[10px] font-medium text-white/28">Multiple angles encouraged</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []), "upload")} />
          </label>

          <label className={`${buttonBase} cursor-pointer border-violet-300/16 bg-violet-300/[.045] text-violet-100/75 hover:bg-violet-300/[.08]`}>
            <span className="block text-lg">▶</span>
            <span className="mt-2 block">Upload video</span>
            <span className="mt-1 block text-[10px] font-medium text-white/28">Video is sampled locally into evidence frames</span>
            <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []), "upload")} />
          </label>

          <button type="button" onClick={cameraOpen ? closeCamera : openCamera} className={`${buttonBase} border-amber-300/16 bg-amber-300/[.045] text-amber-100/75 hover:bg-amber-300/[.08]`}>
            <span className="block text-lg">◉</span>
            <span className="mt-2 block">{cameraOpen ? "Close live camera" : "Open live camera"}</span>
            <span className="mt-1 block text-[10px] font-medium text-white/28">Record video or capture stills</span>
          </button>
        </div>

        {cameraError && <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-300/[.04] p-4 text-xs text-rose-100/65">{cameraError}</div>}

        {cameraOpen && (
          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/[.08] bg-black/30">
            <div className="relative aspect-video bg-black">
              <video ref={videoRef} muted playsInline className="h-full w-full object-contain" />
              {recording && <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-rose-200"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Recording</div>}
              <div className="pointer-events-none absolute inset-6 rounded-[24px] border border-white/10">
                <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/20" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-white/[.06] p-4">
              <button type="button" onClick={() => void captureStill()} className={`${buttonBase} border-sky-300/15 bg-sky-300/[.05] text-sky-100/70`}>Capture photo</button>
              {!recording ? (
                <button type="button" onClick={startRecording} className={`${buttonBase} border-rose-300/15 bg-rose-300/[.05] text-rose-100/70`}>Start recording</button>
              ) : (
                <button type="button" onClick={stopRecording} className={`${buttonBase} border-rose-300/25 bg-rose-300/[.12] text-rose-100`}>Stop recording</button>
              )}
              <span className="ml-auto self-center text-[10px] text-white/24">Camera footage stays local; Analyze sends sampled evidence frames only.</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="panel rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="section-kicker">Analysis media</div>
              <h3 className="mt-2 text-2xl font-semibold">Current snake</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/28">
              <span>{totals.images} photos</span><span>{totals.videos} videos</span><span>{humanBytes(totals.size)}</span>
              {assets.length > 0 && <button type="button" onClick={clearAssets} className="font-bold text-rose-200/50 hover:text-rose-200/80">Clear</button>}
            </div>
          </div>

          {assets.length === 0 ? (
            <div className="mt-5 grid min-h-52 place-items-center rounded-[24px] border border-dashed border-white/[.09] bg-black/[.08] p-8 text-center">
              <div><div className="text-3xl text-white/18">◇</div><div className="mt-3 text-sm font-semibold text-white/38">Add media of one snake to begin</div><div className="mt-2 text-xs leading-5 text-white/22">Use several angles when possible: head, dorsal pattern, lateral pattern, full body and tail.</div></div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <div key={asset.id} className="group overflow-hidden rounded-2xl border border-white/[.07] bg-black/15">
                  <div className="relative aspect-[4/3] bg-black/25">
                    {asset.kind === "image" ? <img src={asset.previewUrl} alt="" className="h-full w-full object-contain" /> : <video src={asset.previewUrl} controls preload="metadata" className="h-full w-full object-contain" />}
                    <button type="button" onClick={() => removeAsset(asset.id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-sm text-white/65 opacity-80 hover:text-white">×</button>
                  </div>
                  <div className="p-3">
                    <div className="truncate text-[11px] font-semibold text-white/55">{asset.file.name}</div>
                    <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[.08em] text-white/22"><span>{asset.source}</span><span>{asset.kind} · {humanBytes(asset.file.size)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-[24px] border border-white/[.06] bg-black/[.08] p-4">
            <div className="text-[10px] font-black uppercase tracking-[.12em] text-white/28">Capture guide</div>
            <div className="mt-3 grid gap-2 text-xs text-white/38 sm:grid-cols-2">
              {["Entire snake / overall proportions", "Clear head and facial markings", "Dorsal pattern from above", "Lateral pattern from both sides", "Tail and posterior markings", "Neutral lighting when possible"].map((item) => <div key={item} className="flex gap-2"><span className="text-emerald-200/45">✓</span><span>{item}</span></div>)}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="panel rounded-[28px] p-5 sm:p-6">
            <div className="section-kicker">Analysis controls</div>
            <h3 className="mt-2 text-xl font-semibold">Tell the model what you know</h3>
            <p className="mt-2 text-xs leading-5 text-white/28">Hints narrow the comparison pool; leave them on Auto when you want the model to infer them.</p>

            <div className="mt-5 space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[.1em] text-white/28">Life stage
                <select value={stageHint} onChange={(e) => { setStageHint(e.target.value); invalidateAnalysis(); }} className={`${field} mt-2`}>
                  <option value="auto">Auto-detect</option><option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option>
                </select>
              </label>
              <label className="block text-[10px] font-black uppercase tracking-[.1em] text-white/28">Neonate color
                <select value={colorHint} onChange={(e) => { setColorHint(e.target.value); invalidateAnalysis(); }} className={`${field} mt-2`}>
                  <option value="auto">Auto-detect</option><option value="red">Red</option><option value="yellow">Yellow</option><option value="not_applicable">Not applicable</option>
                </select>
              </label>
              <label className="block text-[10px] font-black uppercase tracking-[.1em] text-white/28">Video frame sampling
                <select value={frameSampling} onChange={(e) => { setFrameSampling(e.target.value); invalidateAnalysis(); }} className={`${field} mt-2`}>
                  <option value="balanced">Balanced · representative frames</option><option value="dense">Dense · more frames</option><option value="keyframes">Key frames only</option>
                </select>
              </label>
            </div>

            <div className="mt-5 space-y-2">
              {[
                ["Locality estimate", localityMode, setLocalityMode, "Attempt locality only when evidence supports it."],
                ["Nearest reference animals", nearestNeighbors, setNearestNeighbors, "Show the closest known examples in the dataset."],
                ["Conservative confidence", conservativeMode, setConservativeMode, "Prefer Unknown / Review instead of forcing a weak answer."],
              ].map(([name, checked, setter, description]) => (
                <label key={String(name)} className="flex cursor-pointer gap-3 rounded-2xl border border-white/[.055] bg-black/[.08] p-3">
                  <input type="checkbox" checked={Boolean(checked)} onChange={(e) => { (setter as (value:boolean)=>void)(e.target.checked); invalidateAnalysis(); }} className="mt-0.5 h-4 w-4 accent-sky-300" />
                  <span><span className="block text-xs font-semibold text-white/55">{String(name)}</span><span className="mt-1 block text-[10px] leading-4 text-white/23">{String(description)}</span></span>
                </label>
              ))}
            </div>

            <button type="button" disabled={!assets.length || analysisStatus === "running" || analysisStatus === "preparing"} onClick={() => void runAnalysis()} className="mt-5 w-full rounded-2xl bg-sky-200 px-5 py-4 text-sm font-black text-[#06100c] transition hover:bg-sky-100 disabled:opacity-35">
              {analysisStatus === "running" || analysisStatus === "preparing" ? "Analyzing…" : "Run Snake Sorter identification"}
            </button>
            {analysisMessage && <div className={`mt-3 rounded-2xl border p-3 text-xs leading-5 ${analysisStatus === "error" ? "border-amber-300/12 bg-amber-300/[.035] text-amber-100/55" : "border-sky-300/12 bg-sky-300/[.035] text-sky-100/55"}`}>{analysisMessage}</div>}
          </div>

          <div className="panel rounded-[28px] p-5 sm:p-6">
            <div className="section-kicker">Result design</div>
            <h3 className="mt-2 text-xl font-semibold">What Snake Sorter will return</h3>
            <div className="mt-4 space-y-3 text-xs">
              {[
                ["Primary classification", "Taxon + calibrated confidence"],
                ["Alternatives", "Runner-up taxa and probability spread"],
                ["Life stage / color", "Detected or user-assisted"],
                ["Locality", "Only when sufficiently supported"],
                ["Closest references", "Visually similar known animals"],
                ["Evidence quality", "Angle / visibility / frame coverage"],
                ["Conflict flags", "Mixed ancestry, label mismatch, biological rule conflicts"],
                ["Unknown / Review", "Explicit rejection when confidence is weak"],
              ].map(([name, value]) => <div key={name} className="flex items-start justify-between gap-4 border-b border-white/[.05] pb-3 last:border-0 last:pb-0"><span className="font-semibold text-white/45">{name}</span><span className="max-w-[54%] text-right text-white/24">{value}</span></div>)}
            </div>
          </div>
        </aside>
      </div>

      <section className="panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker">Identification result</div>
            <h3 className="mt-2 text-2xl font-semibold">Snake Sorter decision</h3>
          </div>
          <span className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] ${analysisResult ? "border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/60" : "border-white/[.07] bg-white/[.02] text-white/25"}`}>
            {analysisResult ? "Result ready" : "Awaiting model result"}
          </span>
        </div>

        {!analysisResult ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-white/[.08] bg-black/[.06] p-8 text-center">
            <div className="text-sm font-semibold text-white/34">No classification result yet</div>
            <div className="mt-2 text-xs leading-5 text-white/20">The capture/preprocessing pipeline is active. This panel will populate automatically when the production vision model is connected.</div>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-[24px] border border-emerald-300/12 bg-emerald-300/[.025] p-5">
              <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/25">Most consistent with</div>
              <div className="mt-3 text-2xl font-semibold text-white/80">{analysisResult.taxon}</div>
              <div className="mt-2 text-4xl font-semibold tracking-[-.04em] text-emerald-200/75">{Math.round(analysisResult.confidence * 100)}%</div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/[.055] bg-black/[.08] p-3"><div className="text-[8px] uppercase tracking-[.08em] text-white/20">Life stage</div><div className="mt-1 capitalize text-white/55">{analysisResult.lifeStage}</div></div>
                <div className="rounded-2xl border border-white/[.055] bg-black/[.08] p-3"><div className="text-[8px] uppercase tracking-[.08em] text-white/20">Color</div><div className="mt-1 capitalize text-white/55">{analysisResult.neonateColor.replace("_"," ")}</div></div>
              </div>
              {analysisResult.locality && <div className="mt-3 rounded-2xl border border-white/[.055] bg-black/[.08] p-3"><div className="text-[8px] uppercase tracking-[.08em] text-white/20">Locality estimate</div><div className="mt-1 text-sm font-semibold text-white/55">{analysisResult.locality.label}</div><div className="mt-1 text-[10px] text-white/24">{Math.round(analysisResult.locality.confidence*100)}% confidence</div></div>}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/[.06] bg-black/[.06] p-4">
                <div className="text-[9px] font-black uppercase tracking-[.1em] text-white/24">Taxon score spread</div>
                <div className="mt-3 space-y-3">
                  {SNAKE_SORTER_TAXA.map((taxon) => {
                    const score = analysisResult.scores[taxon] ?? 0;
                    return <div key={taxon}><div className="flex justify-between gap-3 text-[10px]"><span className="text-white/40">{taxon}</span><span className="font-semibold text-white/55">{Math.round(score*100)}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-emerald-200/45" style={{width:`${Math.max(0,Math.min(100,score*100))}%`}} /></div></div>;
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/[.06] bg-black/[.06] p-4">
                <div className="flex items-center justify-between gap-3"><div className="text-[9px] font-black uppercase tracking-[.1em] text-white/24">Evidence quality</div><div className="text-sm font-semibold text-white/55">{Math.round(analysisResult.evidenceQuality.score*100)}%</div></div>
                <div className="mt-2 text-[10px] text-white/25">{analysisResult.evidenceQuality.usableFrames} usable of {analysisResult.evidenceQuality.requestedFrames} prepared frames</div>
                {analysisResult.evidenceQuality.notes.length > 0 && <div className="mt-3 space-y-1">{analysisResult.evidenceQuality.notes.map((note) => <div key={note} className="text-[10px] leading-4 text-white/24">• {note}</div>)}</div>}
              </div>

              {analysisResult.nearestReferences.length > 0 && <div className="rounded-[24px] border border-white/[.06] bg-black/[.06] p-4"><div className="text-[9px] font-black uppercase tracking-[.1em] text-white/24">Closest reference animals</div><div className="mt-3 space-y-2">{analysisResult.nearestReferences.slice(0,5).map((neighbor) => <div key={`${neighbor.animalId}-${neighbor.mediaId ?? "animal"}`} className="flex items-center justify-between gap-3 text-[10px]"><div><div className="font-semibold text-white/45">{neighbor.locality || neighbor.animalId}</div><div className="text-white/20">{neighbor.taxon}</div></div><span className="text-white/40">{Math.round(neighbor.similarity*100)}%</span></div>)}</div></div>}

              {analysisResult.flags.length > 0 && <div className="rounded-[24px] border border-amber-300/12 bg-amber-300/[.025] p-4"><div className="text-[9px] font-black uppercase tracking-[.1em] text-amber-100/45">Flags</div><div className="mt-3 space-y-2">{analysisResult.flags.map((flag) => <div key={flag} className="text-[10px] leading-5 text-amber-50/45">• {flag}</div>)}</div></div>}
            </div>
          </div>
        )}
      </section>

      <section className="panel rounded-[28px] p-5 sm:p-6">
        <div className="section-kicker">Identification pipeline</div>
        <h3 className="mt-2 text-2xl font-semibold">How each scan will be evaluated</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">The interface is being built around multiple checks rather than one raw classifier score. Each stage can later be versioned and improved independently.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Media quality", "Reject unusable frames; score sharpness, exposure and snake visibility."],
            ["02", "Snake detection", "Find the animal, crop background noise and retain full-body context."],
            ["03", "Frame selection", "Sample distinct, useful frames from video instead of counting duplicates."],
            ["04", "Stage & color", "Infer life stage and neonate phase, or apply your supplied hints."],
            ["05", "Visual encoder", "Extract morphology and pattern features from each useful view."],
            ["06", "Reference search", "Compare embeddings against known individual animals, not just class averages."],
            ["07", "Taxon classifier", "Combine multi-view evidence for Azurea, Pulcher, Utaraensis and Viridis."],
            ["08", "Rules + confidence", "Apply biological consistency checks, calibrate confidence and allow Unknown."],
          ].map(([step, name, description]) => (
            <div key={step} className="rounded-2xl border border-white/[.06] bg-black/[.08] p-4">
              <div className="text-[9px] font-black tracking-[.14em] text-sky-200/40">{step}</div>
              <div className="mt-2 text-sm font-semibold text-white/58">{name}</div>
              <div className="mt-2 text-[10px] leading-5 text-white/24">{description}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
