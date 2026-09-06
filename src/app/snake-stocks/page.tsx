import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { MarketChartFrame } from "@/components/MarketChartFrame";
import { SnakeStocksExplorer } from "@/components/SnakeStocksExplorer";
import { SnakeStocksBrandBanner } from "@/components/BrandVisuals";

const localityRows = [
  ["Wamena", "Morelia azurea utaraensis", "Captive Bred + Import"],
  ["Lereh", "Morelia azurea utaraensis", "Captive Bred + Import"],
  ["Cyclops", "Morelia azurea utaraensis", "Captive Bred + Import"],
  ["Jayapura", "Morelia azurea utaraensis", "Captive Bred + Import"],
  ["Manokwari", "Morelia azurea pulcher", "Captive Bred + Import"],
  ["Aru", "Morelia viridis", "Captive Bred + Import"],
];

export default function SnakeStocksPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Snake Stocks"
        title="Market intelligence built like a data product."
        description="Track reptile asking markets, sold-listing evidence and locality segments with transparent methodology. Median is primary, sample size stays visible, and empty data never becomes a fake trend line."
        aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Track · Compare · Discover</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <SnakeStocksBrandBanner />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <SnakeStocksExplorer />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="section-kicker">Wamena analysis</div><h2 className="mt-2 text-2xl font-semibold">Separate graphs for the comparisons that matter.</h2></div>
          <span className="text-xs text-white/30">No universal multipliers · intersections matter</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <MarketChartFrame compact title="Wamena · Males vs females" subtitle="Comparable age, origin and neonate-color filters." legends={["Female", "Male"]} />
          <MarketChartFrame compact title="Wamena · Red vs yellow neonates" subtitle="Comparable sex and age filters." legends={["Red neo", "Yellow neo"]} />
          <MarketChartFrame compact title="Wamena · Age classes" subtitle="Neonate, juvenile, subadult and adult segments only when sample sizes support them." legends={["Neo", "Juvenile", "Adult"]} />
          <MarketChartFrame compact title="Wamena · Red neonates by sex" subtitle="Female vs male within the same red-neonate segment." legends={["Female", "Male"]} />
          <MarketChartFrame compact title="Wamena · Yellow neonates by sex" subtitle="Female vs male within the same yellow-neonate segment." legends={["Female", "Male"]} />
          <MarketChartFrame compact title="Locality comparison" subtitle="Wamena vs Lereh vs Cyclops vs Jayapura under the same active filters." legends={["Wamena", "Lereh", "Cyclops"]} />
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <div className="panel rounded-3xl p-6">
              <div className="section-kicker">Evidence inventory</div>
              <h2 className="mt-3 text-2xl font-semibold">Current and sold evidence stay separate.</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="panel-soft rounded-2xl p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/65">Current asking market</div>
                  <div className="mt-3 text-3xl font-semibold">131</div>
                  <p className="mt-2 text-xs leading-5 text-white/35">USA-cleaned single-animal asking-price records from the current MorphMarket video extraction.</p>
                </div>
                <div className="panel-soft rounded-2xl p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300/65">Sold-listing evidence</div>
                  <div className="mt-3 text-3xl font-semibold">340</div>
                  <p className="mt-2 text-xs leading-5 text-white/35">Readable USA sold-listing observations captured Sep 5, 2026. Capture date is not treated as sold date.</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200/10 bg-amber-200/[.035] p-4 text-xs leading-5 text-amber-100/55">Sold-card price means the last displayed listing price when marked sold. It does not mean confirmed final transaction amount.</div>
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

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4"><div><div className="section-kicker">Locality market map</div><h2 className="mt-2 text-2xl font-semibold">Built to drill down, not flatten.</h2></div><Link href="/animals/green-tree-python" className="hidden text-xs font-bold text-emerald-300 sm:block">OPEN ANIMAL RECORD →</Link></div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/[.07]">
          {localityRows.map(([name, group, origin], index) => (
            <div key={name} className={`grid gap-2 bg-white/[.018] px-5 py-4 sm:grid-cols-[.7fr_1.5fr_.8fr_auto] sm:items-center ${index ? "border-t border-white/[.055]" : ""}`}>
              <div className="font-semibold">{name}</div>
              <div className="text-xs italic text-white/32">{group}</div>
              <div className="text-xs text-white/34">{origin}</div>
              <div className="text-[10px] font-bold uppercase tracking-[.12em] text-white/26">Market pending</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
