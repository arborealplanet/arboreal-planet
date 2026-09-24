"use client";

import { useRef } from "react";
import Link from "next/link";
import type { ReptileStory } from "@/lib/reptile-news";

export function ReptileNewsCarousel({ stories }: { stories: ReptileStory[] }) {
  const track = useRef<HTMLDivElement>(null);
  return <section className="border-y border-white/10 bg-[#0c1510]" aria-labelledby="reptile-news-title">
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="section-kicker">Around the reptile world</p><h2 id="reptile-news-title" className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Fresh discoveries, real stories.</h2></div>
        <Link href="/news" className="text-sm font-semibold text-emerald-200 hover:text-emerald-100">Visit the news desk →</Link>
      </div>
      {stories.length ? <>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" aria-label="Previous news stories" onClick={() => track.current?.scrollBy({ left: -340, behavior: "smooth" })} className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-300">←</button>
          <button type="button" aria-label="Next news stories" onClick={() => track.current?.scrollBy({ left: 340, behavior: "smooth" })} className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-300">→</button>
        </div>
        <div ref={track} role="region" aria-label="Reptile news stories" tabIndex={0} className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 focus-visible:outline-2 focus-visible:outline-emerald-300">
          {stories.map((story) => <article key={story.url} className="flex min-h-64 w-[min(82vw,340px)] shrink-0 snap-start flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-[#1b3023] to-[#101b16] p-6 sm:p-7">
            <div className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-emerald-200/75"><span>{story.publisher}</span><time dateTime={story.publishedAt}>{new Date(story.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></div>
            <h3 className="mt-6 text-xl font-semibold leading-snug text-white">{story.title}</h3>
            <a href={story.url} target="_blank" rel="noopener noreferrer" className="mt-auto pt-7 text-sm font-bold text-emerald-200 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-300" aria-label={`Read ${story.title} at ${story.publisher} (opens in a new tab)`}>Read at {story.publisher} ↗</a>
          </article>)}
        </div>
        <p className="mt-2 text-xs text-white/50">Headlines from Science Daily, REPTILES Magazine, Phys.org, Mongabay and USARK. Select a story to read the original article. Feeds refresh every six hours when visited; new stories are not guaranteed every day.</p>
      </> : <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.03] p-7 text-sm leading-7 text-white/65">The live headlines are unavailable right now. Visit the <Link href="/news" className="font-semibold text-emerald-200 underline">news desk</Link> or browse <a href="https://www.sciencedaily.com/news/plants_animals/frogs_and_reptiles/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-200 underline">Science Daily’s reptile stories</a>.</div>}
    </div>
  </section>;
}
