import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { PitcherPlantArt } from "@/components/ArborealArt";

const groups = [
  ["Nepenthes", "Tropical pitcher plants", "Reference collection"],
  ["Drosera", "Sundews", "Planned"],
  ["Sarracenia", "North American pitcher plants", "Planned"],
  ["Bromeliads", "Epiphytic and terrarium bromeliads", "Planned"],
  ["Orchids", "Arboreal and terrarium orchids", "Planned"],
  ["Aroids", "Terrarium and climbing aroids", "Planned"],
];

export default function PlantsPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Plant Database"
        title="Plants belong in the ecosystem too."
        description="Arboreal Planet can connect plant records, cultivation knowledge, keeper posts and marketplace listings without treating plant care as a side note to reptile content. Nepenthes is the first collection being structured."
        aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Nepenthes first</div>}
      />

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-12 sm:px-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="grid min-h-[390px] sm:grid-cols-[1fr_.8fr]">
            <div className="p-7 sm:p-8">
              <div className="section-kicker">Reference plant collection</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Nepenthes</h2>
              <p className="mt-4 text-sm leading-7 text-white/42">The plant side of Arboreal Planet is being built around useful cultivation records: species and hybrid identity, growth habit, environmental preferences, media, community discussions and relevant marketplace listings.</p>
              <div className="mt-6 flex flex-wrap gap-2">{["Overview", "Species", "Cultivation", "Media", "Marketplace", "Community"].map((item, index) => <span key={item} className={`rounded-full border px-3 py-1.5 text-xs ${index === 0 ? "border-emerald-300/20 bg-emerald-300/[.08] text-emerald-200" : "border-white/[.07] text-white/34"}`}>{item}</span>)}</div>
              <div className="mt-7 rounded-2xl border border-amber-200/10 bg-amber-200/[.025] p-4 text-xs leading-5 text-amber-100/42">Individual Nepenthes species records are not being invented to fill space. They will publish as real records are structured.</div>
            </div>
            <div className="grid-surface relative min-h-72 overflow-hidden border-t border-white/[.06] bg-[radial-gradient(circle_at_50%_42%,rgba(57,230,125,.1),transparent_40%)] sm:border-l sm:border-t-0"><div className="absolute inset-4"><PitcherPlantArt /></div></div>
          </div>
        </div>

        <div className="panel rounded-[30px] p-6">
          <div className="section-kicker">Connected context</div>
          <h2 className="mt-3 text-2xl font-semibold">Built for terrarium and plant people.</h2>
          <div className="mt-5 space-y-3">
            {[["Cultivation", "Light, substrate, watering, humidity, temperature and growth notes."],["Community", "Attach posts and discussions to plants without turning anecdotes into database facts."],["Marketplace", "Plants can be sold alongside animals and supplies in the same marketplace."],["Profiles", "Keepers can show plant collections and interests alongside animals."]].map(([title,text]) => <div key={title} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="font-semibold text-white/58">{title}</div><p className="mt-1.5 text-xs leading-5 text-white/30">{text}</p></div>)}
          </div>
          <Link href="/marketplace" className="mt-6 inline-block text-sm font-bold text-emerald-300">Browse plant marketplace →</Link>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <div className="section-kicker">Collections</div>
          <h2 className="mt-3 text-2xl font-semibold">Plant database roadmap.</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map(([name, description, state]) => <div key={name} className="panel-soft rounded-3xl p-5"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{name}</div><div className="mt-1 text-xs text-white/30">{description}</div></div><span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/22">{state}</span></div></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}
