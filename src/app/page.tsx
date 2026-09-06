import Link from "next/link";

const sections = [
  ["Animal Database", "Species, localities, husbandry and keeper knowledge.", "/animals"],
  ["Snake Stocks", "Market intelligence built from observable reptile listings.", "/snake-stocks"],
  ["Marketplace", "Animals, plants, enclosures, supplies and feeders.", "/marketplace"],
  ["Community", "Posts, discussions and keeper activity.", "/community"],
  ["The Hatchery", "Educational breeding simulators and virtual collections.", "/hatchery"],
];

export default function Home() {
  return <main>
    <section className="mx-auto grid min-h-[72vh] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-400">The arboreal keeper network</div>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">Keepers, animals and market data in one ecosystem.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-white/60">Explore species, follow keepers, discover available animals, analyze reptile markets with Snake Stocks and learn through The Hatchery.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/community" className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-[#07110d] hover:bg-emerald-300">Explore Arboreal Planet</Link><Link href="/snake-stocks" className="rounded-xl border border-white/15 px-6 py-3 font-semibold hover:border-emerald-400/60 hover:text-emerald-300">Explore Snake Stocks</Link></div>
      </div>
      <div className="rounded-3xl border border-emerald-400/15 bg-white/[.035] p-4 shadow-2xl shadow-black/30">
        <div className="px-2 pb-3 text-xs uppercase tracking-[.24em] text-white/35">Explore the platform</div>
        <div className="space-y-2">{sections.map(([title, desc, href]) => <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border border-white/[.07] bg-black/20 px-5 py-4 transition hover:border-emerald-400/30 hover:bg-emerald-400/[.04]"><div><div className="font-medium">{title}</div><div className="mt-1 text-sm text-white/40">{desc}</div></div><span className="ml-4 text-emerald-400 transition group-hover:translate-x-1">→</span></Link>)}</div>
      </div>
    </section>
    <section className="border-y border-white/10 bg-black/15"><div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 md:grid-cols-3"><div><div className="text-sm font-semibold text-emerald-300">SOURCE-FIRST DATA</div><p className="mt-2 text-sm leading-6 text-white/45">Asking prices, sold-listing observations and confirmed transaction data remain distinct.</p></div><div><div className="text-sm font-semibold text-emerald-300">KEEPER-FIRST COMMUNITY</div><p className="mt-2 text-sm leading-6 text-white/45">Built around animals, plants, husbandry, breeding and the people doing the work.</p></div><div><div className="text-sm font-semibold text-emerald-300">EARLY ACCESS</div><p className="mt-2 text-sm leading-6 text-white/45">Core systems are being built carefully before the platform expands.</p></div></div></section>
  </main>;
}
