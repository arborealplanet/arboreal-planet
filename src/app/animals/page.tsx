import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { AnimalDatabaseExplorer } from "@/components/AnimalDatabaseExplorer";

const priorityAreas = [
  ["Green Tree Pythons", "LIVE REFERENCE", "The flagship reference record connects taxonomy, locality structure, Genetics, public pedigrees, marketplace listings and keeper discussion."],
  ["Boiga", "PRIORITY AREA", "Arboreal colubrids belong in the same system with species identity, husbandry context, keeper discussion and marketplace discovery kept separate from unverified claims."],
  ["Emerald Tree Boas", "PRIORITY AREA", "A natural next boa group for an arboreal-first database, with room for taxonomy, distribution, husbandry and market context without flattening individual line or locality claims."],
  ["Tree Monitors", "PRIORITY AREA", "Monitor records can bring arboreal lizards into the same reference structure instead of making Arboreal Planet snake-only."],
  ["Dart Frogs", "PRIORITY AREA", "Amphibian records widen the hub into planted-vivarium species while maintaining clear separation between reference facts and keeper-submitted experience."],
] as const;

const supportedGroups = ["Pythons", "Boas", "Colubrids", "Monitors", "Geckos", "Other lizards", "Turtles & tortoises", "Amphibians", "Other exotics"] as const;

export default function AnimalsPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database"
        title="An arboreal-first animal reference, built to grow far beyond one species."
        description="Species records connect taxonomy, locality, husbandry, breeding, lineage, market structure, listings and keeper discussion while keeping reference information separate from community and seller claims."
        aside={<div className="rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Reference database · expanding</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="mb-6 overflow-hidden rounded-[26px] border border-white/[.07]">
          <img src="/animals/index-banner.jpg" alt="Green tree python, emerald tree boa and tree monitor in a rainforest canopy" className="h-52 w-full object-cover sm:h-72" loading="lazy" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["PUBLISHED", "1", "Green Tree Python reference"], ["PRIORITY", "5", "Core arboreal animal areas"], ["GROUPS", "9", "Supported database groups"], ["CONNECTED", "4", "Genetics · Pedigrees · Market · Community"]].map(([label, value, text]) => <div key={label} className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-2xl font-semibold text-white/72">{value}</div><div className="mt-1 text-xs text-white/30">{text}</div></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><div className="section-kicker">Reference roadmap</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/82">Build depth where arboreal keepers actually need it.</h2></div>
          <p className="max-w-xl text-xs leading-5 text-white/32">Priority areas are not presented as completed species records. They show where the database is designed to expand next.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {priorityAreas.map(([name, status, text]) => <article key={name} className={`rounded-[22px] border p-5 ${status === "LIVE REFERENCE" ? "border-emerald-300/12 bg-emerald-300/[.03]" : "border-white/[.06] bg-white/[.018]"}`}><div className={`text-[8px] font-black uppercase tracking-[.14em] ${status === "LIVE REFERENCE" ? "text-emerald-200/62" : "text-white/25"}`}>{status}</div><h3 className="mt-3 font-semibold text-white/70">{name}</h3><p className="mt-3 text-xs leading-5 text-white/34">{text}</p></article>)}
        </div>
      </section>

      <section className="border-y border-white/[.055] bg-black/[.1]">
        <div className="mx-auto max-w-7xl px-5 py-9 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><div className="section-kicker">Database coverage</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/82">Arboreal-first, not arboreal-only.</h2><p className="mt-3 text-sm leading-6 text-white/38">The reference system is centered on the animals Arboreal Planet knows best, but its structure supports the wider reptile and amphibian hobby without forcing unrelated animals into the same husbandry model.</p></div>
            <div className="flex flex-wrap gap-2">{supportedGroups.map((group) => <span key={group} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-2 text-[10px] font-bold text-white/40">{group}</span>)}</div>
          </div>
        </div>
      </section>

      <AnimalDatabaseExplorer />

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="section-kicker">Connected records</div>
            <h2 className="mt-3 text-2xl font-semibold">One animal record can connect the whole platform.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Reference pages can point to Genetics, public pedigrees, community discussion and marketplace inventory without allowing any one of those sources to overwrite the reference layer.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/genetics" className="panel-soft rounded-2xl p-5 transition hover:bg-emerald-300/[.025]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/55">Education tool</div><div className="mt-2 font-semibold">Genetics Hub →</div><p className="mt-2 text-xs leading-5 text-white/30">Green Tree Python locality, subspecies ancestry and public lineage records.</p></Link>
            <Link href="/genetics/database" className="panel-soft rounded-2xl p-5 transition hover:bg-emerald-300/[.025]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/55">Public records</div><div className="mt-2 font-semibold">Pedigree Database →</div><p className="mt-2 text-xs leading-5 text-white/30">Published lineages stay connected to permanent animal records.</p></Link>
            <Link href="/marketplace" className="panel-soft rounded-2xl p-5 transition hover:bg-white/[.03]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/25">Live inventory</div><div className="mt-2 font-semibold">Marketplace →</div><p className="mt-2 text-xs leading-5 text-white/30">Current listings remain seller-submitted inventory, not reference evidence.</p></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
