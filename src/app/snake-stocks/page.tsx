import Link from "next/link";
import { SnakeStocksExplorer } from "@/components/SnakeStocksExplorer";
import { SnakeStocksBrandBanner } from "@/components/BrandVisuals";
import { LocalitySubspeciesCarousel, WamenaAnalysisCarousel } from "@/components/SnakeStocksChartDeck";

export default function SnakeStocksPage() {
  return (
    <main>
      <section className="border-b border-white/[.06] bg-black/10">
        <div className="mx-auto max-w-[1560px] px-0 py-0 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="sm:overflow-hidden sm:rounded-[30px]">
            <SnakeStocksBrandBanner />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-5 border-b border-white/[.06] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="section-kicker">Snake Stocks market intelligence</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-white sm:text-4xl">Reptile market data organized by origin, locality and subspecies.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/48 sm:text-base">Green Tree Python market views are organized by subspecies and locality, with separate Captive Bred and Import comparisons. Market records are reviewed before being included in public analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-white/45">
            <span className="rounded-full border border-white/[.07] px-3 py-2">USA market</span>
            <span className="rounded-full border border-emerald-300/12 bg-emerald-300/[.035] px-3 py-2 text-emerald-200/65">Captive Bred</span>
            <span className="rounded-full border border-cyan-300/12 bg-cyan-300/[.035] px-3 py-2 text-cyan-200/65">Import</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <LocalitySubspeciesCarousel />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <SnakeStocksExplorer />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <WamenaAnalysisCarousel />
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
            <div>
              <div className="section-kicker">Dataset status</div>
              <h2 className="mt-2 text-xl font-semibold">Green Tree Python pricing data is being rebuilt.</h2>
              <p className="mt-2 text-xs leading-5 text-white/34">Previous pricing records have been removed. New records will be added after source review and normalization.</p>
            </div>
            <div>
              <div className="section-kicker">Public origin categories</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-emerald-300/12 bg-emerald-300/[.035] px-3 py-2 text-emerald-200/65">Captive Bred</span>
                <span className="rounded-full border border-cyan-300/12 bg-cyan-300/[.035] px-3 py-2 text-cyan-200/65">Import</span>
                <span className="rounded-full border border-white/[.07] px-3 py-2 text-white/38">Unknown · internal review</span>
              </div>
            </div>
            <Link href="/animals/green-tree-python" className="w-fit rounded-xl border border-emerald-300/15 bg-emerald-300/[.055] px-4 py-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-300/[.09]">OPEN GTP RECORD →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
