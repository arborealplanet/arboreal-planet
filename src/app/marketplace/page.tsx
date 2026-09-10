import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { MarketplaceExplorer } from "@/components/MarketplaceExplorer";

const categories=[
  ["Animals","Reptiles and other permitted animals","◇"],
  ["Plants","Nepenthes, bromeliads and terrarium plants","⌁"],
  ["Enclosures","Caging, racks, perches and habitat systems","▤"],
  ["Supplies","Lighting, controls, tools and husbandry gear","＋"],
  ["Feeders","Feeder listings and breeder supplies","◌"]
];

export default function MarketplacePage(){
  return <main>
    <PageIntro eyebrow="Marketplace" title="Browse listings from Arboreal Planet sellers." description="Find animals, plants, enclosures, supplies and feeders. Listings stay separate from reference records and Snake Stocks market analysis." aside={<div className="flex gap-2"><Link href="/marketplace/mine" className="secondary-action">My Listings</Link><Link href="/marketplace/new" className="primary-action">Create listing</Link></div>}/>

    <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6"><MarketplaceExplorer/></section>

    <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5"><div className="section-kicker">Browse by category</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.025em]">Marketplace sections</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categories.map(([title,text,icon])=><div key={title} className="panel interactive-card min-h-40 rounded-[22px] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.065] bg-white/[.018] text-emerald-300/70">{icon}</div><div className="mt-5 font-semibold">{title}</div><p className="mt-2 text-xs leading-5 text-white/50">{text}</p></div>)}</div>
    </section>

    <section className="border-y border-white/[.055] bg-black/[.1]"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 sm:px-6 lg:grid-cols-3">{[["Animal Database","Listings can link to species records without turning seller claims into reference facts."],["Snake Stocks","Eligible market observations can be reviewed, normalized and incorporated into market analysis."],["Seller identity","Listings are tied to authenticated seller accounts for clearer ownership and moderation."]].map(([t,x])=><div key={t} className="panel-soft rounded-[22px] p-6"><h3 className="font-semibold">{t}</h3><p className="mt-3 text-sm leading-6 text-white/50">{x}</p></div>)}</div></section>
  </main>
}
