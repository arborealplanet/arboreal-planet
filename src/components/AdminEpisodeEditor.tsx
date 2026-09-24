"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Episode = {
  id: string; slug: string; title: string; description: string | null; video_url: string;
  thumbnail_url: string | null; duration_seconds: number | null; episode_number: number | null;
  submitted_by: string | null; featured: boolean; status: string; published_at: string | null; updated_at: string;
};
type Form = {
  id?: string; slug: string; title: string; description: string; video_url: string; thumbnail_url: string;
  duration_seconds: string; episode_number: string; submitted_by: string; featured: boolean; status: string;
};
const blank: Form = { slug: "", title: "", description: "", video_url: "", thumbnail_url: "", duration_seconds: "", episode_number: "", submitted_by: "", featured: false, status: "DRAFT" };

function toForm(episode: Episode): Form {
  return {
    id: episode.id, slug: episode.slug, title: episode.title, description: episode.description ?? "",
    video_url: episode.video_url, thumbnail_url: episode.thumbnail_url ?? "",
    duration_seconds: episode.duration_seconds ? String(episode.duration_seconds) : "",
    episode_number: episode.episode_number ? String(episode.episode_number) : "",
    submitted_by: episode.submitted_by ?? "", featured: episode.featured, status: episode.status,
  };
}

export function AdminEpisodeEditor() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("ALL");

  async function refresh() {
    const response = await fetch("/api/admin/episodes", { cache: "no-store" });
    const data = await response.json().catch(() => null) as { episodes?: Episode[]; error?: string } | null;
    if (!response.ok) throw new Error(data?.error || "Could not load Episodes workspace.");
    setEpisodes(data?.episodes ?? []);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try { await refresh(); } catch (error) { if (active) setMessage(error instanceof Error ? error.message : "Could not load Episodes workspace."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => filter === "ALL" ? episodes : episodes.filter((episode) => episode.status === filter), [episodes, filter]);
  function update<K extends keyof Form>(key: K, value: Form[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function choose(episode: Episode) { setForm(toForm(episode)); setMessage(""); }
  function createNew() { setForm(blank); setMessage(""); }

  async function save(action: "save" | "publish" | "archive") {
    if (busy) return;
    if (action === "publish" && !window.confirm("Publish this episode to the public Episodes station?")) return;
    if (action === "archive" && !window.confirm("Archive this episode? It will stop appearing publicly.")) return;
    setBusy(true); setMessage(action === "publish" ? "Publishing…" : action === "archive" ? "Archiving…" : "Saving draft…");
    try {
      const episode = {
        ...form,
        duration_seconds: form.duration_seconds.trim() === "" ? null : Number(form.duration_seconds),
        episode_number: form.episode_number.trim() === "" ? null : Number(form.episode_number),
      };
      const response = await fetch("/api/admin/episodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, episode }) });
      const data = await response.json().catch(() => null) as { episode?: Episode | null; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not save episode.");
      if (data?.episode) setForm(toForm(data.episode));
      await refresh();
      setMessage(action === "publish" ? "Published." : action === "archive" ? "Archived." : "Draft saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save episode."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="panel rounded-3xl p-8 text-sm text-white/38">Loading Episodes workspace…</div>;

  const input = "mt-2 w-full rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-sm text-white/70 outline-none";

  return <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
    <aside className="panel rounded-[26px] p-4 xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-center justify-between gap-3"><div><div className="section-kicker">Episode library</div><div className="mt-1 text-xs text-white/30">{episodes.length} episode{episodes.length === 1 ? "" : "s"}</div></div><button type="button" onClick={createNew} className="rounded-xl border border-emerald-300/15 px-3 py-2 text-[10px] font-black text-emerald-100/65">New episode</button></div>
      <div className="mt-4 flex flex-wrap gap-1.5">{["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"].map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black ${filter === value ? "border-emerald-300/20 bg-emerald-300/[.05] text-emerald-100/70" : "border-white/[.06] text-white/30"}`}>{value}</button>)}</div>
      <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">{visible.map((episode) => <button type="button" key={episode.id} onClick={() => choose(episode)} className={`w-full rounded-2xl border p-3 text-left transition ${form.id === episode.id ? "border-emerald-300/18 bg-emerald-300/[.035]" : "border-white/[.055] bg-black/10 hover:bg-white/[.02]"}`}><div className="flex items-start justify-between gap-2"><div className="line-clamp-2 text-xs font-semibold text-white/62">{episode.title}</div><span className="shrink-0 text-[8px] font-black text-white/25">{episode.status}</span></div><div className="mt-2 text-[9px] text-white/24">{episode.episode_number ? `Ep. ${episode.episode_number} · ` : ""}{episode.submitted_by ?? "No credit"}</div></button>)}</div>
    </aside>

    <section className="panel rounded-[26px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-kicker">Station workspace</div><h3 className="mt-2 text-2xl font-semibold">{form.id ? "Edit episode" : "New episode"}</h3></div>{form.id && form.status === "PUBLISHED" ? <Link href={`/episodes/${form.slug}`} target="_blank" className="secondary-action !min-h-0 !px-3 !py-2 !text-[10px]">Open public ↗</Link> : null}</div>
      {message ? <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/42">{message}</div> : null}

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-semibold text-white/45">Title<input value={form.title} onChange={(e) => update("title", e.target.value)} className={input} /></label><label className="text-xs font-semibold text-white/45">Slug<input value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="auto-generated from title if blank" className={input} /></label></div>
        <label className="text-xs font-semibold text-white/45">Video URL <span className="font-normal text-white/22">YouTube, Vimeo or direct mp4 link</span><input value={form.video_url} onChange={(e) => update("video_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={input} /></label>
        <label className="text-xs font-semibold text-white/45">Description<textarea value={form.description} onChange={(e) => update("description", e.target.value)} className={`${input} min-h-28`} /></label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-white/45">Episode #<input value={form.episode_number} onChange={(e) => update("episode_number", e.target.value)} inputMode="numeric" placeholder="1" className={input} /></label>
          <label className="text-xs font-semibold text-white/45">Duration <span className="font-normal text-white/22">seconds</span><input value={form.duration_seconds} onChange={(e) => update("duration_seconds", e.target.value)} inputMode="numeric" placeholder="600" className={input} /></label>
          <label className="text-xs font-semibold text-white/45">Submitted by<input value={form.submitted_by} onChange={(e) => update("submitted_by", e.target.value)} placeholder="Keeper credit" className={input} /></label>
          <label className="flex items-end gap-3 pb-1 text-xs font-semibold text-white/45"><input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} className="h-5 w-5 accent-emerald-400" />Featured on station</label>
        </div>
        <label className="text-xs font-semibold text-white/45">Thumbnail URL <span className="font-normal text-white/22">optional — station banner is the fallback</span><input value={form.thumbnail_url} onChange={(e) => update("thumbnail_url", e.target.value)} placeholder="https://…" className={input} />{form.thumbnail_url ? <img src={form.thumbnail_url} alt="Thumbnail preview" className="mt-3 h-28 w-full rounded-lg object-cover" /> : null}</label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[.055] pt-5"><button type="button" disabled={busy} onClick={() => void save("save")} className="primary-action !min-h-0 !px-4 !py-2.5 !text-xs">Save draft</button><button type="button" disabled={busy} onClick={() => void save("publish")} className="rounded-xl border border-emerald-300/18 bg-emerald-300/[.04] px-4 py-2.5 text-xs font-black text-emerald-100/70 disabled:opacity-40">Publish</button>{form.id && form.status !== "ARCHIVED" ? <button type="button" disabled={busy} onClick={() => void save("archive")} className="rounded-xl border border-amber-300/15 px-4 py-2.5 text-xs font-black text-amber-100/55 disabled:opacity-40">Archive</button> : null}<span className="ml-auto self-center text-[10px] font-black uppercase tracking-[.12em] text-white/24">{form.status}</span></div>
    </section>
  </div>;
}
