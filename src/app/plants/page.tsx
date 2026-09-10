import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { PlantDatabaseExplorer } from "@/components/PlantDatabaseExplorer";

export default function PlantsPage() {
  return <main>
    <PageIntro eyebrow="Plant Database" title="Plant records for cultivation, identity and terrarium use." description="Searchable collections connect species identity, growing conditions, terrarium use, keeper discussion and marketplace discovery while keeping reference information separate from community posts and listings." aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Nepenthes · reference collection</div>} />

    <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["REFERENCE","1","Nepenthes collection"],["COLLECTIONS","6","Planned plant groups"],["FOCUS","CARE","Cultivation records"],["CONNECTED","3","Marketplace · Community · Profiles"]].map(([label,value,text])=><div key={label} className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-2xl font-semibold text-white/72">{value}</div><div className="mt-1 text-xs text-white/30">{text}</div></div>)}</div></section>

    <PlantDatabaseExplorer />

    <section className="border-y border-white/[.06] bg-black/[.12]"><div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
      <div><div className="section-kicker">Plant record structure</div><h2 className="mt-3 text-2xl font-semibold">Collections organize species and hybrid records.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Nepenthes is the first structured collection. Individual species and hybrids can include identity, growth habit, light, temperature, humidity, substrate, watering and cultivation notes as records are completed.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><Link href="/marketplace" className="panel-soft rounded-2xl p-5 transition hover:bg-emerald-300/[.025]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/55">Plant inventory</div><div className="mt-2 font-semibold">Marketplace →</div><p className="mt-2 text-xs leading-5 text-white/30">Current plant listings remain separate from reference records.</p></Link><Link href="/community" className="panel-soft rounded-2xl p-5 transition hover:bg-white/[.03]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/25">Keeper discussion</div><div className="mt-2 font-semibold">Community →</div><p className="mt-2 text-xs leading-5 text-white/30">Cultivation discussions can link to plant records without becoming reference material.</p></Link></div>
    </div></section>
  </main>;
}
