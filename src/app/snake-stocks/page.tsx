import Link from "next/link";
import { SnakeStocksExplorer } from "@/components/SnakeStocksExplorer";
import { SnakeStocksBrandBanner } from "@/components/BrandVisuals";
import { LocalitySubspeciesCarousel, WamenaAnalysisCarousel } from "@/components/SnakeStocksChartDeck";

export default function SnakeStocksPage() {
  return (
    <main>
      <section className="border-b border-white/[.06] bg-black/10">
        <div className="mx-auto max-w-[1560px] px-0 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="sm:overflow-hidden sm:rounded-[30px] sm:border sm:border-white/[.06]">
            <SnakeStocksBrandBanner />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-6 border-b border-white/[.06] pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="section-kicker">Snake Stocks</div>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl lg:text-5xl">Reptile market data by origin, locality and subspecies.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55 sm:text-base">Compare Captive Bred and Import markets while keeping locality and subspecies structure intact. Public charts only use records that have passed source review and normalization.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.14em]">
            <span className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-2 text-white/52">USA market</span>
            <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-2 text-emerald-200/75">Captive Bred</span>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[.05] px-3 py-2 text-cyan-200/75">Import</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><div className="section-kicker">Subspecies & locality</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Market structure</h2></div>
          <div className="text-xs text-white/40">Browse grouped views without flattening locality data.</div>
        </div>
        <LocalitySubspeciesCarousel />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="mb-4"><div className="section-kicker">Market explorer</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Price history & comparisons</h2></div>
        <SnakeStocksExplorer />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <div className="mb-4"><div className="section-kicker">Focused analysis</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Locality detail</h2></div>
        <WamenaAnalysisCarousel />
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr_auto] lg:items-center">
            <div className="rounded-[24px] border border-white/[.06] bg-white/[.018] p-5">
              <div className="section-kicker">Dataset status</div>
              <h2 className="mt-2 text-xl font-semibold">Green Tree Python pricing data is being rebuilt.</h2>
              <p className="mt-2 text-xs leading-5 text-white/46">Previous pricing records have been removed. New records will appear after source review and normalization.</p>
            </div>
            <div className="rounded-[24px] border border-white/[.06] bg-white/[.018] p-5">
              <div className="section-kicker">Origin categories</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-emerald-300/12 bg-emerald-300/[.035] px-3 py-2 text-emerald-200/70">Captive Bred</span>
                <span className="rounded-full border border-cyan-300/12 bg-cyan-300/[.035] px-3 py-2 text-cyan-200/70">Import</span>
                <span className="rounded-full border border-white/[.07] px-3 py-2 text-white/46">Unknown · review</span>
              </div>
            </div>
            <Link href="/animals/green-tree-python" className="btn-secondary w-fit">Open GTP record →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
