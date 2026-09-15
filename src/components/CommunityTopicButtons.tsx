"use client";

export function CommunityTopicButtons({ topics }: { topics: readonly string[] }) {
  function choose(topic: string) {
    window.dispatchEvent(new CustomEvent("community-topic-filter", { detail: { topic } }));
    document.querySelector("[data-community-feed]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <div className="flex flex-wrap gap-2">{topics.map((topic) => <button type="button" key={topic} onClick={() => choose(topic)} className="rounded-full border border-white/[.07] bg-white/[.025] px-3 py-2 text-[11px] font-medium text-white/52 transition hover:border-emerald-300/20 hover:bg-emerald-300/[.035] hover:text-emerald-100/70">{topic}</button>)}</div>;
}
