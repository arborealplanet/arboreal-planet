"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PitcherPlantArt } from "@/components/ArborealArt";

type PlantCollection = { name: string; scientific: string; group: string; description: string; tags: string[]; status: "Reference" | "Planned"; featured?: boolean };

const collections: PlantCollection[] = [
  { name: "Nepenthes", scientific: "Nepenthes spp.", group: "Carnivorous", description: "Tropical pitcher plants", tags: ["Pitcher plant", "Tropical", "Terrarium"], status: "Reference", featured: true },
  { name: "Drosera", scientific: "Drosera spp.", group: "Carnivorous", description: "Sundews", tags: ["Carnivorous", "Sundew"], status: "Planned" },
  { name: "Sarracenia", scientific: "Sarracenia spp.", group: "Carnivorous", description: "North American pitcher plants", tags: ["Pitcher plant", "Carnivorous"], status: "Planned" },
  { name: "Bromeliads", scientific: "Bromeliaceae", group: "Epiphytes", description: "Epiphytic and terrarium bromeliads", tags: ["Epiphyte", "Terrarium"], status: "Planned" },
  { name: "Orchids", scientific: "Orchidaceae", group: "Epiphytes", description: "Arboreal and terrarium orchids", tags: ["Epiphyte", "Flowering"], status: "Planned" },
  { name: "Aroids", scientific: "Araceae", group: "Tropical foliage", description: "Terrarium and climbing aroids", tags: ["Climbing", "Tropical", "Terrarium"], status: "Planned" },
];

const groups = ["All", "Carnivorous", "Epiphytes", "Tropical foliage"];

export function PlantDatabaseExplorer() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [referenceOnly, setReferenceOnly] = useState(false);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collections.filter((item) => (group === "All" || item.group === group) && (!referenceOnly || item.status === "Reference") && (!q || [item.name, item.scientific, item.group, item.description, ...item.tags].join(" ").toLowerCase().includes(q)));
  }, [query, group, referenceOnly]);

  return <>
    <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6"><div className="panel rounded-3xl p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <label className="relative block"><span className="sr-only">Search plant database</span><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25">⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search plants, scientific names, cultivation groups…" className="w-full rounded-2xl border border-white/[.08] bg-black/15 py-3 pl-10 pr-4 text-sm text-white/75 outline-none placeholder:text-white/20 focus:border-emerald-300/25" /></label>
        <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-white/[.06] bg-black/10 p-1">{groups.map((item)=><button key={item} onClick={()=>setGroup(item)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] ${group===item?"bg-emerald-300 text-[#06100c]":"text-white/34 hover:text-white/60"}`}>{item}</button>)}</div>
        <button onClick={()=>setReferenceOnly(v=>!v)} className={`rounded-2xl border px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] ${referenceOnly?"border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200":"border-white/[.07] text-white/34"}`}>Reference only</button>
      </div><div className="mt-3 flex justify-between px-1 text-[10px] uppercase tracking-[.12em] text-white/22"><span>{visible.length} collection{visible.length===1?"":"s"} shown</span><span>Plants · cultivation · community</span></div>
    </div></section>

    <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6">{visible.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((item)=><article key={item.name} className={`panel overflow-hidden rounded-3xl ${item.status==="Planned"?"opacity-75":""}`}>
      <div className={`relative h-48 overflow-hidden border-b border-white/[.06] ${item.featured?"bg-[radial-gradient(circle_at_50%_42%,rgba(57,230,125,.12),transparent_40%),#08130e]":"grid-surface bg-white/[.012]"}`}>{item.featured?<div className="absolute inset-4"><PitcherPlantArt /></div>:<div className="absolute inset-0 grid place-items-center"><div className="grid h-16 w-16 place-items-center rounded-full border border-white/[.06] text-2xl text-white/10">✦</div></div>}<span className={`absolute left-4 top-4 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] ${item.status==="Reference"?"border-emerald-300/15 bg-black/30 text-emerald-200/70":"border-white/[.07] bg-black/25 text-white/28"}`}>{item.status}</span></div>
      <div className="p-5"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/24">{item.group}</div><h2 className="mt-2 text-xl font-semibold">{item.name}</h2><div className="mt-1 text-xs italic text-white/32">{item.scientific}</div><p className="mt-3 text-xs text-white/32">{item.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{item.tags.map(tag=><span key={tag} className="rounded-full border border-white/[.06] px-2.5 py-1 text-[10px] text-white/30">{tag}</span>)}</div><div className={`mt-5 text-[10px] font-black uppercase tracking-[.13em] ${item.status==="Reference"?"text-emerald-300/70":"text-white/20"}`}>{item.status==="Reference"?"Reference collection · species records next":"Collection not published yet"}</div></div>
    </article>)}</div>:<div className="panel rounded-3xl px-6 py-16 text-center"><div className="text-lg font-semibold text-white/55">No matching plant collections</div><p className="mt-2 text-sm text-white/28">Try a broader search or another plant group.</p><button onClick={()=>{setQuery("");setGroup("All");setReferenceOnly(false)}} className="mt-5 text-xs font-bold text-emerald-300">CLEAR FILTERS</button></div>}</section>
  </>;
}
