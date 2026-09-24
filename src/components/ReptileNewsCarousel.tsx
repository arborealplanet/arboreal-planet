"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ReptileStory } from "@/lib/reptile-news";

export function ReptileNewsCarousel({ stories }: { stories: ReptileStory[] }) {
  const track = useRef<HTMLDivElement>(null);
  const visibleStories = stories.slice(0, 5);

  return <section className="border-y border-white/10 bg-[#0c1510]" aria-labelledby="reptile-news-title">
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="section-kicker">Around the reptile world</p><h2 id="reptile-news-title" className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">Reptile news</h2></div>
        <Link href="/news" className="text-sm font-semibold text-emerald-200 hover:text-emerald-100">View all headlines →</Link>
      </div>
      {visibleStories.length ? <>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" aria-label="Previous news stories" onClick={() => track.current?.scrollBy({ left: -310, behavior: "smooth" })} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-300">←</button>
          <button type="button" aria-label="Next news stories" onClick={() => track.current?.scrollBy({ left: 310, behavior: "smooth" })} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-300">→</button>
        </div>
        <div ref={track} role="region" aria-label="Reptile news stories" tabIndex={0} className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 focus-visible:outline-2 focus-visible:outline-emerald-300">
          {visibleStories.map((story) => <article key={story.url} className="panel-soft flex min-h-[300px] w-[min(82vw,320px)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl">
            <div className="relative h-32 shrink-0 overflow-hidden bg-[#14251a]">
              {story.imageUrl ? <>
                {/* Article preview images come from the publisher and can use different CDN hosts. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover object-center opacity-90" />
                <span className="absolute bottom-2 left-3 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-medium text-white/80">Image via {story.publisher}</span>
              </> : <>
                <Image src="/abb-site/assets/animals.png" alt="" fill sizes="320px" className="object-cover object-center opacity-80" />
                <span className="absolute bottom-2 left-3 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-medium text-white/80">Arboreal Planet illustration</span>
              </>}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap justify-between gap-2 text-[10px] font-semibold text-emerald-200/70"><span>{story.publisher}</span><time dateTime={story.publishedAt}>{new Date(story.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</time></div>
              <h3 className="mt-3 text-base font-semibold leading-snug text-white">{story.title}</h3>
              {story.summary && <details className="group mt-4 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5">
                <summary className="cursor-pointer list-none text-xs font-bold text-emerald-200 marker:hidden focus-visible:outline-2 focus-visible:outline-emerald-300">
                  <span className="inline-flex items-center gap-2"><span>Quick read</span><span aria-hidden="true" className="transition group-open:rotate-90">›</span></span>
                </summary>
                <p className="mt-2 text-xs leading-5 text-white/60">{story.summary}</p>
              </details>}
              <a href={story.url} target="_blank" rel="noopener noreferrer" className="mt-auto pt-4 text-xs font-bold text-emerald-200 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-300" aria-label={`Read ${story.title} at ${story.publisher} (opens in a new tab)`}>Read full article at {story.publisher} ↗</a>
            </div>
          </article>)}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-white/40">Five recent stories from reptile news feeds. Open “Quick read” for a short article preview, or go straight to the original publisher for the full story.</p>
      </> : <div className="panel mt-6 rounded-2xl p-6 text-sm leading-7 text-white/65">The live headlines are unavailable right now. Visit the <Link href="/news" className="font-semibold text-emerald-200 underline">news desk</Link> or browse <a href="https://www.sciencedaily.com/news/plants_animals/frogs_and_reptiles/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-200 underline">Science Daily’s reptile stories</a>.</div>}
    </div>
  </section>;
}
