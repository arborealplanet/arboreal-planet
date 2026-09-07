import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GreenTreePythonArt } from "@/components/ArborealArt";

const achievements = ["First Clutch", "First Red Neo", "First Yellow Neo", "Three Generations", "Lineage Keeper", "Genetics Student"];

export default function HatcheryPage() {
  return (
    <main>
      <PageIntro
        eyebrow="The Hatchery"
        title="Breed. Learn. Collect."
        description="A lightweight educational game area where virtual breeding teaches lineage, locality, phenotype and responsible interpretation of genetics. Nothing here affects real animals, marketplace listings or Snake Stocks."
        aside={<div className="rounded-full border border-amber-200/15 bg-amber-200/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">Virtual animals only</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <div className="panel relative overflow-hidden rounded-[30px] border-amber-200/10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-amber-200/[.07] bg-amber-200/[.025]" />
          <div className="absolute right-16 top-20 h-24 w-24 rounded-full bg-emerald-300/[.04] blur-2xl" />
          <div className="relative grid gap-8 p-7 sm:p-9 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-100/55">First game</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Chondro Breeder</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/42">Start with the Start Your Dream sweepstakes, choose a breeding strategy, build your first colony and begin shaping the lines that follow.</p>
              <div className="mt-7 flex flex-wrap gap-2">{["Pairing", "Incubation", "Hatching", "Lineage", "Collection", "Education"].map((item) => <span key={item} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-xs text-white/38">{item}</span>)}</div>
              <Link href="/hatchery/chondro-breeder" className="mt-8 inline-flex rounded-xl bg-amber-200 px-5 py-3 text-sm font-bold text-[#17130a]">Enter Chondro Breeder</Link>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="relative overflow-hidden rounded-[26px] border border-amber-200/15 bg-gradient-to-b from-emerald-300/[.07] to-black/20 p-5 shadow-2xl shadow-black/25">
                <div className="flex items-center justify-between"><span className="rounded-full border border-amber-200/15 bg-amber-200/[.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.15em] text-amber-100/60">Virtual</span><span className="text-[9px] font-bold uppercase tracking-[.15em] text-white/22">Collection card</span></div>
                <div className="grid-surface mt-5 h-52 overflow-hidden rounded-2xl border border-white/[.06] bg-emerald-300/[.018]"><GreenTreePythonArt compact /></div>
                <div className="mt-5"><div className="text-xl font-semibold">Wamena #01</div><div className="mt-1 text-xs text-white/30">Female · Red neonate · Generation 1</div></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-white/35"><div className="rounded-xl border border-white/[.06] p-3"><div className="text-white/20">LINEAGE</div><div className="mt-1 font-semibold text-white/48">Starter pair</div></div><div className="rounded-xl border border-white/[.06] p-3"><div className="text-white/20">GAME RARITY</div><div className="mt-1 font-semibold text-white/48">Uncommon</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[["1 · SELECT", "Receive or choose two virtual animals with lineage, locality and phenotype information."],["2 · PAIR", "Build a pairing and see which traits are simple, polygenic, line-bred, locality-linked or unknown."],["3 · HATCH", "Generate individual virtual offspring with parents and generation preserved."],["4 · LEARN", "A Why did this happen? card explains outcomes without pretending every GTP trait is simple Mendelian genetics."]].map(([title, text]) => <div key={title} className="panel-soft rounded-3xl p-5"><div className="text-[10px] font-bold tracking-[.16em] text-emerald-300/55">{title}</div><p className="mt-3 text-sm leading-6 text-white/38">{text}</p></div>)}
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-6 lg:grid-cols-[1fr_1fr]">
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">My Hatchery</div>
            <h2 className="mt-3 text-2xl font-semibold">A collection book with lineage.</h2>
            <p className="mt-3 text-sm leading-6 text-white/38">Virtual animals can keep parents, grandparents, hatch year, hatch color, phenotype, generation, breeding history and achievements across multiple generations.</p>
            <div className="mt-6 grid grid-cols-3 gap-3">{["Collection", "Lineages", "Completion"].map((item) => <div key={item} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="text-[9px] uppercase tracking-[.13em] text-white/22">{item}</div><div className="mt-3 text-xl font-semibold text-white/45">—</div></div>)}</div>
          </div>
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Hatchery achievements</div>
            <h2 className="mt-3 text-2xl font-semibold">Progress without gambling mechanics.</h2>
            <div className="mt-5 flex flex-wrap gap-2">{achievements.map((item) => <span key={item} className="rounded-full border border-amber-200/10 bg-amber-200/[.025] px-3 py-2 text-[11px] font-semibold text-amber-100/45">{item}</span>)}</div>
            <p className="mt-5 text-xs leading-5 text-white/28">No paid randomized packs, betting, cash-out or real-money breeding outcomes. Game rarity never represents real biological rarity or market value.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel-soft rounded-3xl p-6"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-white/24">Coming later</div><h3 className="mt-3 text-xl font-semibold text-white/55">Genetics Lab</h3><p className="mt-2 text-sm text-white/28">Reserved for a later build.</p></div>
          <div className="panel-soft rounded-3xl p-6"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-white/24">Coming later</div><h3 className="mt-3 text-xl font-semibold text-white/55">Locality Challenge</h3><p className="mt-2 text-sm text-white/28">Reserved for a later build.</p></div>
        </div>
      </section>
    </main>
  );
}
