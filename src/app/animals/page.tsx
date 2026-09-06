import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GreenTreePythonArt, PitcherPlantArt } from "@/components/ArborealArt";

const groups = [
  { name: "Morelia azurea azurea", places: ["Biak", "Numfor"], note: "Arboreal Planet market grouping" },
  { name: "Morelia azurea pulcher", places: ["Timika", "Sorong", "Manokwari", "Kofiau", "Batanta*"], note: "Batanta flagged for review" },
  { name: "Morelia azurea utaraensis", places: ["Jayapura", "Cyclops", "Wamena", "Lereh / Highland"], note: "Arboreal Planet market grouping" },
  { name: "Morelia viridis", places: ["Aru", "Merauke"], note: "Southern market grouping" },
  { name: "Designer / line projects", places: ["Blue lines", "TWBL", "Calico", "Crosses"], note: "Captive-produced project categories" },
];

export default function AnimalsPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database"
        title="Green Tree Python"
        description="The first fully integrated animal record in Arboreal Planet: taxonomy, locality structure, husbandry, breeding, community context, marketplace discovery and Snake Stocks links in one place."
        aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Reference species</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="relative grid min-h-[390px] overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative z-10 p-7 sm:p-9">
              <div className="text-xs italic text-white/35">Morelia viridis complex</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">An animal record that connects the whole platform.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">Animal Database pages are not price pages with a biography attached. Biology, keeper knowledge and market evidence stay distinct, then link to one another where useful.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Overview", "Taxonomy", "Localities", "Husbandry", "Breeding", "Market", "Listings", "Community"].map((tab, index) => (
                  <span key={tab} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${index === 0 ? "border-emerald-300/20 bg-emerald-300/[.08] text-emerald-200" : "border-white/[.07] text-white/36"}`}>{tab}</span>
                ))}
              </div>
            </div>
            <div className="grid-surface relative min-h-[340px] overflow-hidden border-t border-white/[.06] bg-emerald-300/[.025] lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_44%,rgba(57,230,125,.12),transparent_36%)]" />
              <div className="absolute bottom-0 left-0 right-0 h-[95%]"><GreenTreePythonArt /></div>
              <div className="absolute bottom-0 right-2 h-44 w-36 opacity-60"><PitcherPlantArt /></div>
              <div className="absolute left-5 top-5 rounded-full border border-emerald-300/15 bg-black/25 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-emerald-200/60">Stylized species art · keeper media later</div>
            </div>
          </div>
          <div className="grid border-t border-white/[.06] sm:grid-cols-3">
            <Link href="/snake-stocks" className="border-b border-white/[.055] p-5 transition hover:bg-emerald-300/[.025] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-300/55">Market intelligence</div><div className="mt-2 font-semibold">Open Snake Stocks ↗</div><p className="mt-1 text-xs text-white/30">Locality and origin-specific market evidence.</p></Link>
            <Link href="/marketplace" className="border-b border-white/[.055] p-5 transition hover:bg-white/[.02] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Available animals</div><div className="mt-2 font-semibold">Browse Marketplace</div><p className="mt-1 text-xs text-white/30">Listings remain separate from database facts.</p></Link>
            <Link href="/community" className="p-5 transition hover:bg-white/[.02]"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Keeper knowledge</div><div className="mt-2 font-semibold">Community discussions</div><p className="mt-1 text-xs text-white/30">Posts and discussions around this animal.</p></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-6 lg:grid-cols-[.72fr_1.28fr]">
        <div className="panel rounded-3xl p-6">
          <div className="section-kicker">At a glance</div>
          <div className="mt-5 space-y-4 text-sm">
            {[["Common name", "Green Tree Python"],["Primary habitat", "Arboreal tropical forest"],["Public market origins", "Captive Bred · Import"],["Reference market", "United States"],["First Snake Stocks build", "Green Tree Python"]].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-5 border-b border-white/[.055] pb-4 last:border-0 last:pb-0"><span className="text-white/28">{label}</span><span className="text-right font-semibold text-white/62">{value}</span></div>)}
          </div>
        </div>

        <div className="panel rounded-3xl p-6">
          <div className="section-kicker">Population & market grouping</div>
          <h2 className="mt-3 text-2xl font-semibold">Locality stays visible.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">This grouping is an Arboreal Planet market structure. It keeps locality comparisons useful and auditable without pretending every taxonomic question is universally settled.</p>
          <div className="mt-6 space-y-3">
            {groups.map((group) => (
              <div key={group.name} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="font-semibold italic">{group.name}</div><div className="text-[9px] font-bold uppercase tracking-[.13em] text-white/24">{group.note}</div></div>
                <div className="mt-3 flex flex-wrap gap-2">{group.places.map((place) => <span key={place} className="rounded-full border border-white/[.07] bg-black/10 px-3 py-1.5 text-xs text-white/42">{place}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[["HUSBANDRY", "Environment, perching, feeding, hydration and keeper techniques belong here with source and experience context."],["BREEDING", "Pairings, seasonal strategy, incubation, hatch records and lineage data can connect to breeder tools later."],["LOCALITY", "Locality labels stay explicit so Manokwari, Wamena, Biak and others are not flattened into one price bucket."],["NEONATE COLOR", "Red and yellow hatch color can be analyzed as a phenotype variable without pretending it proves locality."]].map(([title, text]) => <div key={title} className="panel-soft rounded-3xl p-5"><div className="text-[10px] font-bold tracking-[.16em] text-emerald-300/58">{title}</div><p className="mt-3 text-sm leading-6 text-white/38">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Origin terminology</div><h2 className="mt-3 text-2xl font-semibold">Simple in public. Detailed underneath.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-5"><div className="font-semibold text-emerald-200">Captive Bred</div><p className="mt-2 text-xs leading-5 text-white/34">Includes USCBB, CBB, CB, captive produced and other unambiguous captive-produced terminology.</p></div><div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-5"><div className="font-semibold text-cyan-200">Import</div><p className="mt-2 text-xs leading-5 text-white/34">Includes imported, farm bred, farm raised, ranched, wild caught and LTC, with internal subtype preserved.</p></div></div>
          </div>
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Designer projects</div><h2 className="mt-3 text-2xl font-semibold">Do not force an Import graph where it makes no sense.</h2><p className="mt-4 text-sm leading-6 text-white/38">Designer lines, blue lines, TWBL, calico and other captive project categories are treated as project markets. Their charts should reflect captive-produced evidence rather than inventing an Import comparison.</p><Link href="/snake-stocks" className="mt-6 inline-block text-sm font-bold text-emerald-300">See market structure →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
