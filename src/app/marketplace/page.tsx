import { PageIntro } from "@/components/AppShell";
import { MarketplaceExplorer } from "@/components/MarketplaceExplorer";

const categories = [
  ["Animals", "Live reptiles and other permitted animals", "◇"],
  ["Plants", "Nepenthes, bromeliads and terrarium plants", "⌁"],
  ["Enclosures", "Caging, racks, perches and habitat systems", "▤"],
  ["Supplies", "Lighting, controls, tools and husbandry gear", "＋"],
  ["Feeders", "Feeder listings and breeder supply", "◌"],
];

export default function MarketplacePage() {
  return (
    <main>
      <PageIntro
        eyebrow="Marketplace"
        title="One marketplace instead of three competing sections."
        description="Available Animals, Classifieds and Seller Platforms are consolidated into one public market. Search and filter by category while Animal Database records and Snake Stocks provide context beside—not inside—the listing itself."
        aside={<button className="rounded-xl bg-emerald-300 px-4 py-3 text-xs font-bold text-[#06100c]">Create listing</button>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6"><MarketplaceExplorer /></section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map(([title, text, icon]) => (
            <div key={title} className="panel group min-h-44 rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-emerald-300/18">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.07] bg-white/[.025] text-lg text-emerald-300/65">{icon}</div>
              <div className="mt-5 font-semibold">{title}</div>
              <p className="mt-2 text-xs leading-5 text-white/34">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="section-kicker">Listing grid</div><h2 className="mt-2 text-2xl font-semibold">Real listings will populate here.</h2></div>
            <div className="text-xs text-white/28">No placeholder sellers or fake asking prices</div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map((item) => (
              <div key={item} className="panel overflow-hidden rounded-3xl">
                <div className="grid-surface grid h-44 place-items-center border-b border-white/[.06] bg-white/[.014]"><span className="text-2xl text-white/10">◇</span></div>
                <div className="p-5">
                  <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.14em] text-white/24">Listing slot</span><span className="rounded-full border border-white/[.06] px-2 py-1 text-[9px] text-white/25">Pending</span></div>
                  <div className="mt-4 h-3 w-2/3 rounded-full bg-white/[.06]" />
                  <div className="mt-2 h-2.5 w-1/2 rounded-full bg-white/[.035]" />
                  <div className="mt-6 flex items-end justify-between"><div className="h-5 w-20 rounded bg-white/[.04]"/><div className="text-[10px] text-white/22">Seller data</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-6 lg:grid-cols-3">
        {[["Animal Database context", "A Green Tree Python listing can link to the species and locality record without making seller claims part of the database."],["Snake Stocks context", "Qualified listings can contribute observations to market intelligence after normalization and duplicate checks."],["Seller identity", "Profiles can show breeder/seller information, verification state and public history once account systems are connected."]].map(([title, text]) => <div key={title} className="panel-soft rounded-3xl p-6"><h3 className="font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/38">{text}</p></div>)}
      </section>
    </main>
  );
}
