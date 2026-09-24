import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { PlantDatabaseExplorer } from "@/components/PlantDatabaseExplorer";
import { PlantCollectionRoadmap } from "@/components/PlantCollectionRoadmap";

const arborealLenses = [
  ["Epiphytes", "Bromeliads and orchids fit the vertical, mounted side of arboreal display culture. Their collection pages can focus on identity and cultivation without assuming every species belongs in every enclosure."],
  ["Carnivorous plants", "Nepenthes is the first completed reference collection. Drosera and Sarracenia remain separate roadmap groups so tropical pitcher-plant culture is not flattened into generic carnivorous-plant advice."],
  ["Tropical foliage", "Climbing aroids and other foliage plants can provide visual structure and cover in planted displays when their environmental requirements are compatible with the animals and enclosure."],
  ["Keeper context", "Plant records can connect to community posts and marketplace listings while keeping user-submitted experiences and seller claims separate from reference information."],
] as const;

export default function PlantsPage() {
  return <main>
    <PageIntro
      eyebrow="Plant Database"
      title="Plants belong in the arboreal conversation."
      description="Explore carnivorous plants, epiphytes and tropical foliage through cultivation-focused records built for keepers who think vertically. Reference information stays separate from community posts, seller listings and individual growing claims."
      aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Nepenthes · first reference collection</div>}
    />

    <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
      <div className="mb-6 overflow-hidden rounded-[26px] border border-white/[.07]">
        <img src="/plants/index-banner.jpg" alt="Nepenthes pitcher plants hanging in a misty greenhouse" className="h-52 w-full object-cover sm:h-72" loading="lazy" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["REFERENCE","1","Nepenthes collection"],["ROADMAP","6","Structured plant groups"],["FOCUS","CARE","Identity · cultivation · use"],["CONNECTED","3","Marketplace · Community · Profiles"]].map(([label,value,text])=><div key={label} className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-2xl font-semibold text-white/72">{value}</div><div className="mt-1 text-xs text-white/30">{text}</div></div>)}
      </div>
    </section>

    <PlantCollectionRoadmap />

    <section className="border-y border-white/[.055] bg-black/[.1]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <div className="mb-5 max-w-3xl">
          <div className="section-kicker">Arboreal plant lens</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/82">More than a generic plant catalog.</h2>
          <p className="mt-3 text-sm leading-6 text-white/40">Arboreal Planet organizes plants around the ways reptile keepers, vivarium builders and plant growers actually encounter them while still respecting that different plant groups can require very different care.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {arborealLenses.map(([title, text]) => <article key={title} className="panel-soft rounded-[22px] p-5"><div className="text-sm font-semibold text-white/68">{title}</div><p className="mt-3 text-xs leading-6 text-white/35">{text}</p></article>)}
        </div>
      </div>
    </section>

    <PlantDatabaseExplorer />

    <section className="border-y border-white/[.06] bg-black/[.12]">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="section-kicker">Plant record structure</div>
          <h2 className="mt-3 text-2xl font-semibold">Collections organize species, hybrids and cultivation context.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Nepenthes is the first structured reference collection. As additional records are completed, individual species and hybrids can include identity, growth habit, light, temperature, humidity, substrate, watering, propagation and keeper-relevant cultivation notes.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/marketplace" className="panel-soft rounded-2xl p-5 transition hover:bg-emerald-300/[.025]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/55">Plant inventory</div><div className="mt-2 font-semibold">Marketplace →</div><p className="mt-2 text-xs leading-5 text-white/30">Current plant listings remain separate from reference records.</p></Link>
          <Link href="/community" className="panel-soft rounded-2xl p-5 transition hover:bg-white/[.03]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-white/25">Keeper discussion</div><div className="mt-2 font-semibold">Community →</div><p className="mt-2 text-xs leading-5 text-white/30">Cultivation discussions can link to plant records without becoming reference material.</p></Link>
        </div>
      </div>
    </section>
  </main>;
}
