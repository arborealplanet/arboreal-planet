import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { AnimalDatabaseExplorer } from "@/components/AnimalDatabaseExplorer";

export default function AnimalsPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database"
        title="Explore animals without losing the details that matter."
        description="Searchable species records connect taxonomy, locality, husbandry, breeding, market structure, listings and keeper discussion while keeping each kind of information in its proper place."
        aside={<div className="rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Database · growing</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["PUBLISHED", "1", "Verified reference record"], ["GROUPS", "3", "Snakes · Lizards · Amphibians · expanding"], ["REFERENCE", "GTP", "Green Tree Python pipeline"], ["CONNECTED", "3", "Snake Stocks · Marketplace · Community"]].map(([label, value, text]) => <div key={label} className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-2xl font-semibold text-white/72">{value}</div><div className="mt-1 text-xs text-white/30">{text}</div></div>)}
        </div>
      </section>

      <AnimalDatabaseExplorer />

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="section-kicker">Database architecture</div>
            <h2 className="mt-3 text-2xl font-semibold">Built for hundreds of records, not five giant cards.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">The discovery layer can scale through search and animal groups while individual records carry the deeper information. Planned species are visible as roadmap entries, but they are never presented as finished database records.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/snake-stocks" className="panel-soft rounded-2xl p-5 transition hover:bg-emerald-300/[.025]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/55">Market intelligence</div><div className="mt-2 font-semibold">Snake Stocks →</div><p className="mt-2 text-xs leading-5 text-white/30">Market evidence remains a dedicated system.</p></Link>
            <Link href="/marketplace" className="panel-soft rounded-2xl p-5 transition hover:bg-white/[.03]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/25">Live inventory</div><div className="mt-2 font-semibold">Marketplace →</div><p className="mt-2 text-xs leading-5 text-white/30">Available animals remain separate from species facts.</p></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
