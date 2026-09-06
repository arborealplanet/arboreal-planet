"use client";

import { useMemo, useState } from "react";

const postTypes = ["Post", "Question", "Poll", "Breeding update"];
const tags = ["Green Tree Python", "Boiga", "Tree Monitors", "Nepenthes", "Breeding", "Husbandry", "Enclosures"];

export function CommunityComposer() {
  const [type, setType] = useState("Post");
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Green Tree Python"]);

  const ready = text.trim().length > 0;
  const count = useMemo(() => text.length, [text]);

  function toggleTag(tag: string) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 4));
  }

  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="flex flex-wrap gap-1 border-b border-white/[.06] p-3">
        {postTypes.map((item) => <button key={item} onClick={() => setType(item)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${type === item ? "bg-emerald-300 text-[#06100c]" : "text-white/36 hover:bg-white/[.035] hover:text-white/60"}`}>{item}</button>)}
      </div>
      <div className="p-5">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[.07] bg-white/[.025] text-xs text-emerald-300/45">AP</div>
          <div className="min-w-0 flex-1">
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1200))} rows={4} placeholder={type === "Question" ? "Ask the keeper community something useful..." : type === "Breeding update" ? "Share a pairing, clutch, hatch or breeding observation..." : "Share an update with the keeper community..."} className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/22" />
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => <button key={tag} onClick={() => toggleTag(tag)} className={`rounded-full border px-3 py-1.5 text-[10px] transition ${selectedTags.includes(tag) ? "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200" : "border-white/[.07] text-white/30"}`}>{tag}</button>)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/[.06] bg-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-white/27"><span>＋ Photo</span><span>▶ Video URL</span><span>◇ Animal</span><span>⌁ Plant</span></div>
        <div className="flex items-center gap-3"><span className="text-[9px] text-white/20">{count}/1200</span><button disabled={!ready} className={`rounded-lg px-4 py-2 text-[11px] font-bold ${ready ? "bg-emerald-300 text-[#06100c]" : "bg-white/[.04] text-white/18"}`}>{ready ? "Preview post" : "Write something"}</button></div>
      </div>
      {ready ? <div className="border-t border-amber-200/10 bg-amber-200/[.02] px-5 py-3 text-[10px] leading-5 text-amber-100/40">Composer interaction is local-only until authentication and post storage are connected. Nothing is being published yet.</div> : null}
    </div>
  );
}
