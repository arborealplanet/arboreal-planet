"use client";

import { SubjectFollowButton } from "@/components/SubjectFollowButton";

export function CommunityTopicButtons({ topics }: { topics: readonly string[] }) {
  function choose(topic: string) {
    window.dispatchEvent(new CustomEvent("community-topic-filter", { detail: { topic } }));
    document.querySelector("[data-community-feed]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <div className="grid gap-2">{topics.map((topic) => <div key={topic} className="flex items-center gap-2"><button type="button" onClick={() => choose(topic)} className="min-w-0 flex-1 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2 text-left text-[11px] font-medium text-white/52 transition hover:border-emerald-300/20 hover:bg-emerald-300/[.035] hover:text-emerald-100/70">{topic}</button><SubjectFollowButton type="TOPIC" subjectKey={topic} label="Follow" /></div>)}</div>;
}
