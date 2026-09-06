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
            <h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-white sm:text-4xl">Lock the market layout before loading the next dataset.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/48 sm:text-base">Green Tree Python market records are intentionally cleared for now. The page is being organized around stable locality groupings, paired Captive Bred / Import charts and compact slideshow navigation before clean records are imported.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-white/45">
            <span className="rounded-full border border-white/[.07] px-3 py-2">USA market</span>
            <span className="rounded-full border border-emerald-300/12 bg-emerald-300/[.035] px-3 py-2 text-emerald-200/65">Captive Bred left</span>
            <span className="rounded-full border border-cyan-300/12 bg-cyan-300/[.035] px-3 py-2 text-cyan-200/65">Import right</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <SnakeStocksExplorer />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <LocalitySubspeciesCarousel />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <WamenaAnalysisCarousel />
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="panel rounded-3xl p-6">
              <div className="section-kicker">Dataset status</div>
              <h2 className="mt-3 text-2xl font-semibold">Green Tree Python market data reset.</h2>
              <p className="mt-3 text-sm leading-6 text-white/38">The prior GTP evidence batches, observations and snapshots are no longer being used. Snake Stocks is holding an intentionally empty market state while the layout and grouping logic are finalized.</p>
              <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-4 text-xs leading-5 text-emerald-100/55">Next clean import can enter the same schema without carrying forward any of the discarded GTP pricing evidence.</div>
            </div>

            <div className="panel rounded-3xl p-6">
              <div className="section-kicker">Origin normalization</div>
              <h2 className="mt-3 text-2xl font-semibold">Two public origin categories.</h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-4"><div className="font-semibold text-emerald-200">Captive Bred</div><p className="mt-1.5 text-xs leading-5 text-white/35">CBB, CB, USCBB, US CBB, captive produced and other unambiguous captive-produced terms.</p></div>
                <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-4"><div className="font-semibold text-cyan-200">Import</div><p className="mt-1.5 text-xs leading-5 text-white/35">Import, farm bred, farm raised, ranched, wild caught, wild collected and LTC. Internal subtypes remain preserved.</p></div>
                <div className="rounded-2xl border border-white/[.06] p-4"><div className="font-semibold text-white/60">Unknown</div><p className="mt-1.5 text-xs leading-5 text-white/30">Internal review state only. Unknown records do not get guessed into a public pricing segment.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/[.07] bg-white/[.018] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="section-kicker">Grouping reference</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/38">Designer / line projects stay outside the locality subspecies deck. Batanta remains visibly review-flagged instead of being silently treated as a locked permanent line.</p>
          </div>
          <Link href="/animals/green-tree-python" className="w-fit rounded-xl border border-emerald-300/15 bg-emerald-300/[.055] px-4 py-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-300/[.09]">OPEN GREEN TREE PYTHON RECORD →</Link>
        </div>
      </section>
    </main>
  );
}
