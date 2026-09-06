"use client";

import Link from "next/link";
import { useState } from "react";

const tabs = ["Overview", "Taxonomy", "Localities", "Husbandry", "Breeding", "Market", "Listings", "Community"] as const;
type Tab = (typeof tabs)[number];

const groups = [
  { name: "Morelia azurea azurea", places: ["Biak", "Numfor"], note: "Arboreal Planet market grouping" },
  { name: "Morelia azurea pulcher", places: ["Timika", "Sorong", "Manokwari", "Kofiau", "Batanta · review"], note: "Batanta remains review-flagged" },
  { name: "Morelia azurea utaraensis", places: ["Wamena", "Lereh / Highland", "Cyclops", "Jayapura"], note: "Arboreal Planet market grouping" },
  { name: "Morelia viridis", places: ["Aru", "Merauke"], note: "Southern market grouping" },
];

function InfoCard({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return <div className="panel-soft rounded-3xl p-5"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/58">{kicker}</div><h3 className="mt-2 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/38">{text}</p></div>;
}

export function AnimalRecordTabs() {
  const [active, setActive] = useState<Tab>("Overview");

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
      <div className="panel overflow-hidden rounded-3xl">
        <div className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-white/[.06] p-2" role="tablist" aria-label="Green Tree Python record sections">
          {tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} onClick={() => setActive(tab)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${active === tab ? "bg-emerald-300 text-[#06100c]" : "text-white/38 hover:bg-white/[.04] hover:text-white/65"}`}>{tab}</button>)}
        </div>

        <div className="p-5 sm:p-7">
          {active === "Overview" && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><InfoCard kicker="Habitat" title="Arboreal tropical forest" text="The reference record keeps natural-history information separate from marketplace and market-data evidence."/><InfoCard kicker="Origins" title="Captive Bred · Import" text="These are the two public origin categories used throughout Arboreal Planet."/><InfoCard kicker="Locality" title="Population matters" text="Locality remains visible rather than flattening every Green Tree Python into a single category."/><InfoCard kicker="Platform" title="One connected record" text="Biology, breeding, market evidence, listings and community discussion meet here without becoming the same dataset."/></div>}

          {active === "Taxonomy" && <div><div className="section-kicker">Taxonomy</div><h2 className="mt-3 text-2xl font-semibold">Morelia viridis complex</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">Arboreal Planet keeps biological taxonomy and its market grouping visibly related but distinct. The locality structure below is the working structure used across the Animal Database and Snake Stocks.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{groups.map((g)=><InfoCard key={g.name} kicker="Working group" title={g.name} text={g.places.join(" · ")}/>)}</div></div>}

          {active === "Localities" && <div><div className="section-kicker">Localities</div><h2 className="mt-3 text-2xl font-semibold">Localities stay inside their market group.</h2><div className="mt-6 space-y-3">{groups.map((group)=><div key={group.name} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="font-semibold italic">{group.name}</div><div className="text-[9px] font-bold uppercase tracking-[.13em] text-white/24">{group.note}</div></div><div className="mt-3 flex flex-wrap gap-2">{group.places.map((place)=><span key={place} className={`rounded-full border px-3 py-1.5 text-xs ${place.includes("review") ? "border-amber-300/15 bg-amber-300/[.04] text-amber-100/55" : "border-white/[.07] bg-black/10 text-white/42"}`}>{place}</span>)}</div></div>)}</div></div>}

          {active === "Husbandry" && <div><div className="section-kicker">Husbandry</div><h2 className="mt-3 text-2xl font-semibold">Keeper knowledge belongs in a structured reference.</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><InfoCard kicker="Environment" title="Enclosure & climate" text="Temperature, humidity, airflow, enclosure design and environmental context will live here with source and keeper-experience context."/><InfoCard kicker="Daily care" title="Perching, hydration & feeding" text="Core care topics get dedicated sections rather than being buried in a single wall of text."/><InfoCard kicker="Life stage" title="Age-aware husbandry" text="Neonate, juvenile, subadult and adult information can be separated when the care context meaningfully differs."/><InfoCard kicker="Evidence" title="Sources stay visible" text="Published references and keeper experience should be distinguishable instead of presented as equally established claims."/></div></div>}

          {active === "Breeding" && <div><div className="section-kicker">Breeding</div><h2 className="mt-3 text-2xl font-semibold">From pairing through offspring.</h2><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><InfoCard kicker="01" title="Pairing" text="Pairing records and seasonal context."/><InfoCard kicker="02" title="Ovulation & laying" text="Breeding-event chronology and notes."/><InfoCard kicker="03" title="Incubation" text="Incubation records and outcome context."/><InfoCard kicker="04" title="Offspring" text="Hatch records, lineage and resulting offspring."/></div><p className="mt-5 text-xs leading-5 text-white/30">This reference area will connect to private breeder tools later without exposing private animal records by default.</p></div>}

          {active === "Market" && <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div><div className="section-kicker">Market</div><h2 className="mt-3 text-2xl font-semibold">Snake Stocks handles the numbers.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">The Animal Database explains the animal and its market structure. Snake Stocks owns asking-price history, sold-listing history, origin comparisons and market statistics.</p><Link href="/snake-stocks" className="mt-6 inline-flex rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black uppercase tracking-[.12em] text-[#06100c]">Open Snake Stocks →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><InfoCard kicker="Public origin" title="Captive Bred" text="USCBB, CBB, CB and other unambiguous captive-produced terminology normalize here."/><InfoCard kicker="Public origin" title="Import" text="Import, farm bred, farm raised, ranched, wild caught and LTC normalize here while preserving internal subtype."/></div></div>}

          {active === "Listings" && <div><div className="section-kicker">Listings</div><h2 className="mt-3 text-2xl font-semibold">Available animals belong in Marketplace.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Listings remain separate from reference facts and Snake Stocks statistics. This tab becomes the species-filtered doorway into live marketplace inventory.</p><Link href="/marketplace" className="mt-6 inline-flex rounded-xl border border-white/[.09] px-4 py-2.5 text-xs font-bold text-white/65 hover:bg-white/[.04]">Browse Marketplace →</Link></div>}

          {active === "Community" && <div><div className="section-kicker">Community</div><h2 className="mt-3 text-2xl font-semibold">Keeper discussion around this species.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Questions, breeding updates, husbandry discussions and keeper media can eventually be filtered directly to the Green Tree Python record.</p><Link href="/community" className="mt-6 inline-flex rounded-xl border border-white/[.09] px-4 py-2.5 text-xs font-bold text-white/65 hover:bg-white/[.04]">Open Community →</Link></div>}
        </div>
      </div>
    </section>
  );
}
