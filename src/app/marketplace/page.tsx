import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { MarketplaceExplorer } from "@/components/MarketplaceExplorer";
import { MarketplaceCategoryCards } from "@/components/MarketplaceCategoryCards";

export default function MarketplacePage(){
  return <main>
    <PageIntro eyebrow="Marketplace" title="Browse listings from Arboreal Planet sellers." description="Find animals, plants, enclosures, supplies and feeders. Listings stay separate from reference records and Snake Stocks market analysis." aside={<div className="flex gap-2"><Link href="/marketplace/mine" className="secondary-action">My Listings</Link><Link href="/marketplace/new" className="primary-action">Create listing</Link></div>}/>

    <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6"><MarketplaceExplorer/></section>

    <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5"><div className="section-kicker">Browse by category</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.025em]">Marketplace sections</h2><p className="mt-2 text-xs leading-5 text-white/32">Choose a category to jump back to the live marketplace with that filter applied.</p></div>
      <MarketplaceCategoryCards />
    </section>

    <section className="border-y border-white/[.055] bg-black/[.1]"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 sm:px-6 lg:grid-cols-3">{[["Animal Database","Listings can link to species records without turning seller claims into reference facts."],["Snake Stocks","Eligible market observations can be reviewed, normalized and incorporated into market analysis."],["Seller identity","Listings are tied to authenticated seller accounts for clearer ownership and moderation."]].map(([t,x])=><div key={t} className="panel-soft rounded-[22px] p-6"><h3 className="font-semibold">{t}</h3><p className="mt-3 text-sm leading-6 text-white/50">{x}</p></div>)}</div></section>
  </main>
}
