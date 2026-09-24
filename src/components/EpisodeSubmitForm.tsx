"use client";

import { useState } from "react";
import { EPISODE_SUBMISSIONS_EMAIL } from "@/lib/episode-submissions";

export function EpisodeSubmitForm() {
  const [keeperName, setKeeperName] = useState("");
  const [title, setTitle] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [description, setDescription] = useState("");

  function composeEmail() {
    const subject = `Episode submission: ${title.trim() || "Untitled episode"}`;
    const body = [
      "Arboreal Planet TV episode submission",
      "",
      `Keeper name: ${keeperName.trim() || "(not provided)"}`,
      `Episode title: ${title.trim() || "(not provided)"}`,
      `Video link: ${videoLink.trim() || "(not provided)"}`,
      "",
      "Description:",
      description.trim() || "(not provided)",
      "",
      "— sent from arboreal-planet/episodes",
    ].join("\n");
    window.location.href = `mailto:${EPISODE_SUBMISSIONS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const field = "mt-2 w-full rounded-xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white/72 outline-none placeholder:text-white/25 focus:border-emerald-300/25";

  return <div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs font-semibold text-white/45">Your keeper name<input value={keeperName} onChange={(e) => setKeeperName(e.target.value.slice(0, 80))} placeholder="e.g. GTP_Greg" className={field} /></label>
      <label className="text-xs font-semibold text-white/45">Episode title<input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 140))} placeholder="e.g. Setting up my first bioactive" className={field} /></label>
    </div>
    <label className="mt-4 block text-xs font-semibold text-white/45">Video link<input value={videoLink} onChange={(e) => setVideoLink(e.target.value.slice(0, 600))} placeholder="YouTube, Vimeo or direct video URL" inputMode="url" className={field} /></label>
    <label className="mt-4 block text-xs font-semibold text-white/45">What is the episode about?<textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 2000))} placeholder="A few sentences on what keepers will see and learn" className={`${field} min-h-28`} /></label>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button type="button" onClick={composeEmail} className="primary-action">Compose submission email</button>
      <a href={`mailto:${EPISODE_SUBMISSIONS_EMAIL}`} className="text-xs font-semibold text-emerald-200/60 hover:text-emerald-200">or email {EPISODE_SUBMISSIONS_EMAIL} directly →</a>
    </div>
    <p className="mt-4 text-[11px] leading-5 text-white/30">This opens your email app with everything pre-filled — nothing is uploaded to Arboreal Planet until the episode is reviewed and published. By submitting you confirm the footage is yours (or you have permission to share it) and that keepers shown consented to appear.</p>
  </div>;
}
