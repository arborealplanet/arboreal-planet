"use client";

import { useEffect, useMemo, useState } from "react";

type Snake = {
  id: string;
  name: string;
  locality: string;
  subspecies: string;
  classification: string;
  generation: number;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
};
type ClutchRecord = { id: string; dam: Snake; sire: Snake; offspring: Snake[]; season: number; holdbackIds?: string[] };
type Sale = { id: string; value: number; season: number };
type Save = { clutchHistory?: ClutchRecord[]; sales?: Sale[]; favoriteIds?: string[] };

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const bestTrait = (a: Snake) => Math.max(a.highBlack ?? 0, a.highWhite ?? 0, a.blueStripe ?? 0, a.yellowRetention ?? 0, a.blotches ?? 0);

export function ChondroClutchHistoryTable() {
  const [save, setSave] = useState<Save>({});
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState("All");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) setSave(data.save?.state ?? {});
      } catch {}
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(save.clutchHistory ?? [])]
      .filter((record) => season === "All" || String(record.season) === season)
      .filter((record) => !q || [record.id, record.dam.name, record.sire.name, record.dam.locality, record.sire.locality].some((value) => String(value).toLowerCase().includes(q)))
      .sort((a, b) => b.season - a.season);
  }, [save, query, season]);

  const seasons = Array.from(new Set((save.clutchHistory ?? []).map((r) => r.season))).sort((a, b) => b - a);
  const favoriteSet = new Set(save.favoriteIds ?? []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-sm font-bold text-white/70">Clutch history</div><div className="mt-1 text-[10px] text-white/30">Compact records instead of full-size cards.</div></div>
        <div className="flex flex-wrap gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pair or locality…" className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[10px] text-white/65" />
          <select value={season} onChange={(e) => setSeason(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-[10px] text-white/60"><option value="All">All seasons</option>{seasons.map((s) => <option key={s} value={s}>Season {s}</option>)}</select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[.06]">
        <table className="w-full min-w-[820px] text-left text-[10px]">
          <thead className="bg-white/[.025] text-white/30"><tr><th className="px-3 py-2">Season</th><th className="px-3 py-2">Pair</th><th className="px-3 py-2">Class</th><th className="px-3 py-2">Clutch</th><th className="px-3 py-2">Holdbacks</th><th className="px-3 py-2">Best trait</th><th className="px-3 py-2">Sales</th></tr></thead>
          <tbody>
            {rows.map((record) => {
              const offspring = record.offspring ?? [];
              const holdbacks = record.holdbackIds ?? [];
              const best = offspring.reduce<Snake | null>((top, baby) => !top || bestTrait(baby) > bestTrait(top) ? baby : top, null);
              const sales = (save.sales ?? []).filter((sale) => offspring.some((baby) => baby.id === sale.id)).reduce((sum, sale) => sum + sale.value, 0);
              const classification = offspring[0]?.classification ?? (record.dam.subspecies === record.sire.subspecies ? "Pure" : "Hybrid");
              return <tr key={record.id} className="border-t border-white/[.05] text-white/45"><td className="px-3 py-3 font-bold text-white/55">{record.season}</td><td className="px-3 py-3"><div className="font-bold text-white/65">{favoriteSet.has(record.dam.id) ? "★ " : ""}{record.dam.name} × {favoriteSet.has(record.sire.id) ? "★ " : ""}{record.sire.name}</div><div className="mt-1 text-white/25">{record.dam.locality} × {record.sire.locality}</div></td><td className="px-3 py-3">{classification}</td><td className="px-3 py-3 text-white/65">{offspring.length}</td><td className="px-3 py-3">{holdbacks.length}</td><td className="px-3 py-3">{best ? `${best.name} · ${bestTrait(best)}%` : "—"}</td><td className="px-3 py-3 text-emerald-100/60">{sales ? money(sales) : "—"}</td></tr>;
            })}
            {!rows.length ? <tr><td colSpan={7} className="px-4 py-8 text-center text-white/25">No clutch records match these filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
