"use client";

import { useMemo, useState } from "react";

const categories = ["All", "Animals", "Plants", "Enclosures", "Supplies", "Feeders"];
const origins = ["All origins", "Captive Bred", "Import"];

export function MarketplaceExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [origin, setOrigin] = useState("All origins");

  const summary = useMemo(() => {
    const bits = [];
    if (category !== "All") bits.push(category);
    if (origin !== "All origins") bits.push(origin);
    if (query.trim()) bits.push(`“${query.trim()}”`);
    return bits.length ? bits.join(" · ") : "All marketplace categories";
  }, [query, category, origin]);

  return (
    <div className="space-y-5">
      <div className="panel rounded-3xl p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.35fr_.7fr_.7fr_auto]">
          <label className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/22">⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search animals, localities, plants, gear..." className="w-full rounded-xl border border-white/[.07] bg-black/15 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/23 focus:border-emerald-300/20" />
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/[.07] bg-[#08130e] px-4 py-3 text-sm text-white/55 outline-none focus:border-emerald-300/20">
            {categories.map((item) => <option key={item} value={item}>Category · {item}</option>)}
          </select>
          <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="rounded-xl border border-white/[.07] bg-[#08130e] px-4 py-3 text-sm text-white/55 outline-none focus:border-emerald-300/20">
            {origins.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button onClick={() => { setQuery(""); setCategory("All"); setOrigin("All origins"); }} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] px-5 py-3 text-sm font-bold text-emerald-200">Reset</button>
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-white/[.055] pt-4 text-[10px] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold uppercase tracking-[.13em] text-white/24">Active view</span>
          <span className="text-white/38">{summary}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/10 bg-amber-200/[.025] px-4 py-3 text-xs leading-5 text-amber-100/45">
        Browsing controls are functional now. Listing results stay empty until real marketplace records are connected—no fake sellers, animals or prices are generated to fill the grid.
      </div>
    </div>
  );
}
