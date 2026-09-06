"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GreenTreePythonArt } from "@/components/ArborealArt";

type RecordStatus = "Published" | "Planned";
type AnimalRecord = {
  name: string;
  scientific: string;
  group: string;
  tags: string[];
  status: RecordStatus;
  href?: string;
  featured?: boolean;
};

const records: AnimalRecord[] = [
  { name: "Green Tree Python", scientific: "Morelia viridis complex", group: "Snakes", tags: ["Arboreal", "Python", "Localities", "Snake Stocks"], status: "Published", href: "/animals/green-tree-python", featured: true },
  { name: "Emerald Tree Boa", scientific: "Corallus caninus complex", group: "Snakes", tags: ["Arboreal", "Boa"], status: "Planned" },
  { name: "Boiga", scientific: "Boiga spp.", group: "Snakes", tags: ["Arboreal", "Colubrid"], status: "Planned" },
  { name: "Tree Monitors", scientific: "Varanus prasinus group", group: "Lizards", tags: ["Arboreal", "Monitor"], status: "Planned" },
  { name: "Dart Frogs", scientific: "Dendrobatidae", group: "Amphibians", tags: ["Tropical", "Vivarium"], status: "Planned" },
];

const groups = ["All", "Snakes", "Lizards", "Amphibians"];

export function AnimalDatabaseExplorer() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [publishedOnly, setPublishedOnly] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesGroup = group === "All" || record.group === group;
      const matchesStatus = !publishedOnly || record.status === "Published";
      const haystack = [record.name, record.scientific, record.group, ...record.tags].join(" ").toLowerCase();
      return matchesGroup && matchesStatus && (!q || haystack.includes(q));
    });
  }, [query, group, publishedOnly]);

  return (
    <>
      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="panel rounded-3xl p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <label className="relative block">
              <span className="sr-only">Search animal database</span>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search species, scientific name, locality topic…" className="w-full rounded-2xl border border-white/[.08] bg-black/15 py-3 pl-10 pr-4 text-sm text-white/75 outline-none transition placeholder:text-white/20 focus:border-emerald-300/25" />
            </label>
            <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-white/[.06] bg-black/10 p-1">
              {groups.map((item) => <button key={item} onClick={() => setGroup(item)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] transition ${group === item ? "bg-emerald-300 text-[#06100c]" : "text-white/34 hover:text-white/60"}`}>{item}</button>)}
            </div>
            <button onClick={() => setPublishedOnly((value) => !value)} className={`rounded-2xl border px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] transition ${publishedOnly ? "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200" : "border-white/[.07] text-white/34"}`}>Published only</button>
          </div>
          <div className="mt-3 flex items-center justify-between px-1 text-[10px] uppercase tracking-[.12em] text-white/22"><span>{visible.length} record{visible.length === 1 ? "" : "s"} shown</span><span>Built for expansion</span></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6">
        {visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((record) => {
            const body = <>
              <div className={`relative h-48 overflow-hidden border-b border-white/[.06] ${record.featured ? "bg-[radial-gradient(circle_at_55%_45%,rgba(57,230,125,.12),transparent_38%),#08130e]" : "grid-surface bg-white/[.012]"}`}>
                {record.featured ? <div className="absolute inset-x-0 bottom-0 h-[95%]"><GreenTreePythonArt /></div> : <div className="absolute inset-0 grid place-items-center"><div className="grid h-16 w-16 place-items-center rounded-full border border-white/[.06] text-2xl text-white/10">◇</div></div>}
                <div className={`absolute left-4 top-4 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] ${record.status === "Published" ? "border-emerald-300/15 bg-black/30 text-emerald-200/70" : "border-white/[.07] bg-black/25 text-white/28"}`}>{record.status}</div>
              </div>
              <div className="p-5">
                <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/24">{record.group}</div>
                <h2 className="mt-2 text-xl font-semibold">{record.name}</h2>
                <div className="mt-1 text-xs italic text-white/32">{record.scientific}</div>
                <div className="mt-4 flex flex-wrap gap-1.5">{record.tags.map((tag) => <span key={tag} className="rounded-full border border-white/[.06] px-2.5 py-1 text-[10px] text-white/30">{tag}</span>)}</div>
                <div className={`mt-5 text-[10px] font-black uppercase tracking-[.13em] ${record.status === "Published" ? "text-emerald-300/70" : "text-white/20"}`}>{record.status === "Published" ? "Open animal record →" : "Record not published yet"}</div>
              </div>
            </>;
            return record.href ? <Link key={record.name} href={record.href} className="panel group overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:border-emerald-300/15">{body}</Link> : <article key={record.name} className="panel overflow-hidden rounded-3xl opacity-75">{body}</article>;
          })}
        </div> : <div className="panel rounded-3xl px-6 py-16 text-center"><div className="text-lg font-semibold text-white/55">No matching records</div><p className="mt-2 text-sm text-white/28">Try a broader search or another animal group.</p><button onClick={() => { setQuery(""); setGroup("All"); setPublishedOnly(false); }} className="mt-5 text-xs font-bold text-emerald-300">CLEAR FILTERS</button></div>}
      </section>
    </>
  );
}
