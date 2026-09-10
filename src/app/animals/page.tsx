import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { AnimalDatabaseExplorer } from "@/components/AnimalDatabaseExplorer";

export default function AnimalsPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database"
        title="Species records with locality, husbandry and breeding context."
        description="Searchable records connect taxonomy, locality, husbandry, breeding, market structure, listings and keeper discussion while keeping reference information separate from community and seller claims."
        aside={<div className="rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Database · expanding</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["PUBLISHED", "1", "Verified reference record"], ["GROUPS", "3", "Snakes · Lizards · Amphibians"], ["REFERENCE", "GTP", "Green Tree Python record"], ["CONNECTED", "3", "Snake Stocks · Marketplace · Community"]].map(([label, value, text]) => <div key={label} className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-2xl font-semibold text-white/72">{value}</div><div className="mt-1 text-xs text-white/30">{text}</div></div>)}
        </div>
      </section>

      <AnimalDatabaseExplorer />

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="section-kicker">Database structure</div>
            <h2 className="mt-3 text-2xl font-semibold">Designed to scale across species and animal groups.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Search and animal groups handle discovery, while individual records contain detailed reference information. Planned species remain clearly marked until their records are complete.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/snake-stocks" className="panel-soft rounded-2xl p-5 transition hover:bg-emerald-300/[.025]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/55">Market intelligence</div><div className="mt-2 font-semibold">Snake Stocks →</div><p className="mt-2 text-xs leading-5 text-white/30">Market observations and pricing analysis remain separate from species facts.</p></Link>
            <Link href="/marketplace" className="panel-soft rounded-2xl p-5 transition hover:bg-white/[.03]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/25">Live inventory</div><div className="mt-2 font-semibold">Marketplace →</div><p className="mt-2 text-xs leading-5 text-white/30">Current listings remain separate from reference records.</p></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
