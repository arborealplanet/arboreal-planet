import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GreenTreePythonArt, PitcherPlantArt } from "@/components/ArborealArt";

const taxonomicGroups = [
  {
    code: "M. a. azurea",
    name: "Morelia azurea azurea",
    places: ["Biak", "Numfor"],
    note: "Arboreal Planet market grouping",
    import: true,
  },
  {
    code: "M. a. pulcher",
    name: "Morelia azurea pulcher",
    places: ["Timika", "Sorong", "Manokwari", "Kofiau", "Batanta · review"],
    note: "Batanta remains review-flagged",
    import: true,
  },
  {
    code: "M. a. utaraensis",
    name: "Morelia azurea utaraensis",
    places: ["Wamena", "Lereh / Highland", "Cyclops", "Jayapura"],
    note: "Arboreal Planet market grouping",
    import: true,
  },
  {
    code: "M. viridis",
    name: "Morelia viridis",
    places: ["Aru", "Merauke"],
    note: "Southern market grouping",
    import: true,
  },
];

const designerGroup = {
  code: "Designer",
  name: "Designer / line projects",
  places: ["Blue lines", "TWBL", "Calico", "Crosses"],
  note: "Captive-produced project categories",
};

export default function GreenTreePythonPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database · Pythonidae"
        title="Green Tree Python"
        description="The Green Tree Python reference record now uses the same subspecies, locality and origin structure as Snake Stocks so the biology pages and market pages never contradict one another."
        aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Reference species</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="mb-4 text-xs text-white/26"><Link href="/animals" className="hover:text-emerald-200">Animal Database</Link> <span className="mx-2">/</span> Green Tree Python</div>
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="relative grid min-h-[390px] overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative z-10 p-7 sm:p-9">
              <div className="text-xs italic text-white/35">Morelia viridis complex</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">One animal record. One shared market structure.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">Taxonomy, locality, husbandry and breeding live here. Market evidence stays inside Snake Stocks, but both systems use the same grouping rules so Wamena, Manokwari, Biak, Aru and the rest never drift into the wrong bucket.</p>
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
              <div className="absolute left-5 top-5 rounded-full border border-emerald-300/15 bg-black/25 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-emerald-200/60">Stylized reference art</div>
            </div>
          </div>

          <div className="grid border-t border-white/[.06] sm:grid-cols-3">
            <Link href="/snake-stocks" className="border-b border-white/[.055] p-5 transition hover:bg-emerald-300/[.025] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-300/55">Market intelligence</div><div className="mt-2 font-semibold">Open Snake Stocks ↗</div><p className="mt-1 text-xs text-white/30">Paired Captive Bred / Import charts by the same locality structure.</p></Link>
            <Link href="/marketplace" className="border-b border-white/[.055] p-5 transition hover:bg-white/[.02] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Available animals</div><div className="mt-2 font-semibold">Browse Marketplace</div><p className="mt-1 text-xs text-white/30">Listings stay separate from reference information.</p></Link>
            <Link href="/community" className="p-5 transition hover:bg-white/[.02]"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Keeper knowledge</div><div className="mt-2 font-semibold">Community discussions</div><p className="mt-1 text-xs text-white/30">Keeper posts, questions and breeding discussion around this animal.</p></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="mb-5">
          <div className="section-kicker">Taxonomy & locality structure</div>
          <h2 className="mt-2 text-2xl font-semibold">The same four locality decks used by Snake Stocks.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">These are Arboreal Planet grouping rules for the Green Tree Python complex. Public market comparisons use the same structure rather than flattening every locality together.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {taxonomicGroups.map((group) => (
            <div key={group.name} className="panel rounded-3xl p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300/55">{group.code}</div>
                  <h3 className="mt-2 text-xl font-semibold italic">{group.name}</h3>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[.13em] text-white/25">{group.note}</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {group.places.map((place) => (
                  <span key={place} className={`rounded-full border px-3 py-1.5 text-xs ${place.includes("review") ? "border-amber-300/15 bg-amber-300/[.04] text-amber-100/60" : "border-white/[.07] bg-black/10 text-white/42"}`}>{place}</span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[.06] text-xs">
                <div className="border-r border-white/[.06] bg-emerald-300/[.03] p-4"><div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/55">Captive Bred</div><div className="mt-2 text-white/44">Public market segment</div></div>
                <div className="bg-cyan-300/[.025] p-4"><div className="text-[9px] font-black uppercase tracking-[.14em] text-cyan-300/55">Import</div><div className="mt-2 text-white/44">Public market segment</div></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 panel rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-300/55">{designerGroup.code}</div><h3 className="mt-2 text-xl font-semibold italic">{designerGroup.name}</h3></div>
            <div className="text-[9px] font-bold uppercase tracking-[.13em] text-white/25">{designerGroup.note}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{designerGroup.places.map((place) => <span key={place} className="rounded-full border border-violet-300/10 bg-violet-300/[.025] px-3 py-1.5 text-xs text-violet-100/48">{place}</span>)}</div>
          <p className="mt-4 text-xs leading-5 text-white/32">Designer / line projects remain outside the locality subspecies decks and do not receive an Import comparison graph.</p>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[["HUSBANDRY", "Environment, perching, feeding, hydration and keeper techniques belong here with source and experience context."],["BREEDING", "Pairings, seasonal strategy, incubation, hatch records and lineage data can connect to breeder tools later."],["LOCALITY", "Locality labels remain explicit so animals do not get flattened into one generic Green Tree Python bucket."],["NEONATE COLOR", "Red and yellow hatch color can be tracked as phenotype data without treating color as proof of locality."]].map(([title, text]) => <div key={title} className="panel-soft rounded-3xl p-5"><div className="text-[10px] font-bold tracking-[.16em] text-emerald-300/58">{title}</div><p className="mt-3 text-sm leading-6 text-white/38">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">At a glance</div>
            <div className="mt-5 space-y-4 text-sm">
              {[["Common name", "Green Tree Python"],["Complex", "Morelia viridis complex"],["Primary habitat", "Arboreal tropical forest"],["Public market origins", "Captive Bred · Import"],["Reference market", "United States"],["Snake Stocks status", "Layout locked · data pending"]].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-5 border-b border-white/[.055] pb-4 last:border-0 last:pb-0"><span className="text-white/28">{label}</span><span className="text-right font-semibold text-white/62">{value}</span></div>)}
            </div>
          </div>

          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Origin terminology</div>
            <h2 className="mt-3 text-2xl font-semibold">Simple in public. Detailed underneath.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-5"><div className="font-semibold text-emerald-200">Captive Bred</div><p className="mt-2 text-xs leading-5 text-white/34">Includes USCBB, CBB, CB, captive produced and other unambiguous captive-produced terminology.</p></div>
              <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-5"><div className="font-semibold text-cyan-200">Import</div><p className="mt-2 text-xs leading-5 text-white/34">Includes imported, farm bred, farm raised, ranched, wild caught, wild collected and LTC, with internal subtype preserved.</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/[.06] bg-black/10 p-4 text-xs leading-5 text-white/30">Unknown remains an internal review state only and is never guessed into either public segment.</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/[.07] bg-white/[.018] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="section-kicker">Market handoff</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/38">The Animal Database defines what the locality groups are. Snake Stocks handles their paired Captive Bred / Import market charts and detailed Wamena analysis.</p>
          </div>
          <Link href="/snake-stocks" className="w-fit rounded-xl border border-emerald-300/15 bg-emerald-300/[.055] px-4 py-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-300/[.09]">OPEN SNAKE STOCKS →</Link>
        </div>
      </section>
    </main>
  );
}
