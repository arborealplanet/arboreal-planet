"use client";

import { useEffect, useMemo, useState } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";

type Snake = {
  id: string;
  name: string;
  sex: string;
  source: string;
  subspecies: string;
  locality: string;
  lifeStage: string;
  classification: string;
  nidoStatus: string;
  generation: number;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
  geneticsTested?: boolean;
};

type Sort = "name" | "trait" | "generation" | "locality";
const traitMax = (a: Snake) => Math.max(a.highBlack ?? 0, a.highWhite ?? 0, a.blueStripe ?? 0, a.yellowRetention ?? 0, a.blotches ?? 0);

export function ChondroCollectionManager() {
  const [animals, setAnimals] = useState<Snake[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [subspecies, setSubspecies] = useState("All");
  const [sex, setSex] = useState("All");
  const [stage, setStage] = useState("All");
  const [classification, setClassification] = useState("All");
  const [source, setSource] = useState("All");
  const [nido, setNido] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [testedOnly, setTestedOnly] = useState(false);
  const [minimumTrait, setMinimumTrait] = useState(0);
  const [sort, setSort] = useState<Sort>("name");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) {
          setAnimals(Array.isArray(data.save?.state?.colony) ? data.save.state.colony : []);
          setFavorites(Array.isArray(data.save?.state?.favoriteIds) ? data.save.state.favoriteIds : []);
        }
      } catch {}
    }
    void load();
    const refresh = () => void load();
    window.addEventListener("arboreal-chondro-favorites-change", refresh);
    return () => { cancelled = true; window.removeEventListener("arboreal-chondro-favorites-change", refresh); };
  }, []);

  const filtered = useMemo(() => {
    const favoriteSet = new Set(favorites);
    const q = query.trim().toLowerCase();
    return animals
      .filter((a) => !q || [a.name, a.locality, a.subspecies, a.classification].some((v) => String(v ?? "").toLowerCase().includes(q)))
      .filter((a) => subspecies === "All" || a.subspecies === subspecies)
      .filter((a) => sex === "All" || a.sex === sex)
      .filter((a) => stage === "All" || a.lifeStage === stage)
      .filter((a) => classification === "All" || a.classification === classification)
      .filter((a) => source === "All" || a.source === source)
      .filter((a) => nido === "All" || a.nidoStatus === nido)
      .filter((a) => !favoritesOnly || favoriteSet.has(a.id))
      .filter((a) => !testedOnly || a.geneticsTested)
      .filter((a) => traitMax(a) >= minimumTrait)
      .sort((a, b) => {
        if (sort === "trait") return traitMax(b) - traitMax(a);
        if (sort === "generation") return Number(b.generation ?? 0) - Number(a.generation ?? 0);
        if (sort === "locality") return String(a.locality).localeCompare(String(b.locality));
        return String(a.name).localeCompare(String(b.name));
      });
  }, [animals, favorites, query, subspecies, sex, stage, classification, source, nido, favoritesOnly, testedOnly, minimumTrait, sort]);

  const unique = (key: keyof Snake) => Array.from(new Set(animals.map((a) => String(a[key] ?? "")).filter(Boolean))).sort();
  const reset = () => { setQuery(""); setSubspecies("All"); setSex("All"); setStage("All"); setClassification("All"); setSource("All"); setNido("All"); setFavoritesOnly(false); setTestedOnly(false); setMinimumTrait(0); setSort("name"); };

  return (
    <section className="panel rounded-[28px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Collection tools</div>
          <h2 className="mt-2 text-2xl font-semibold">Search and sort your colony</h2>
          <p className="mt-2 text-sm text-white/35">Built for larger breeding programs so you do not have to hunt through dozens of cards manually.</p>
        </div>
        <div className="text-right"><div className="text-2xl font-black text-white">{filtered.length}</div><div className="text-[10px] uppercase tracking-[.16em] text-white/30">of {animals.length} animals</div></div>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, locality, subspecies…" className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/70" />
        {[{label:"Subspecies",value:subspecies,set:setSubspecies,key:"subspecies" as keyof Snake},{label:"Sex",value:sex,set:setSex,key:"sex" as keyof Snake},{label:"Life stage",value:stage,set:setStage,key:"lifeStage" as keyof Snake},{label:"Classification",value:classification,set:setClassification,key:"classification" as keyof Snake},{label:"Source",value:source,set:setSource,key:"source" as keyof Snake},{label:"Nido",value:nido,set:setNido,key:"nidoStatus" as keyof Snake}].map((f) => (
          <select key={f.label} value={f.value} onChange={(e) => f.set(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/60">
            <option value="All">All {f.label.toLowerCase()}</option>{unique(f.key).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ))}
        <select value={minimumTrait} onChange={(e) => setMinimumTrait(Number(e.target.value))} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/60">
          {[0,25,50,70,85,90,95,100].map((v) => <option key={v} value={v}>{v ? `Any trait ${v}%+` : "Any trait level"}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/60">
          <option value="name">Sort: Name</option><option value="trait">Sort: Highest trait</option><option value="generation">Sort: Generation</option><option value="locality">Sort: Locality</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
        <label className="flex items-center gap-2"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /> Favorites only</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={testedOnly} onChange={(e) => setTestedOnly(e.target.checked)} /> Genetics tested only</label>
        <button type="button" onClick={reset} className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-bold">Reset filters</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.slice(0, 60).map((animal) => (
          <article key={animal.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-4">
            <div className="flex items-start gap-3">
              <ChondroSnakeIcon subspecies={animal.subspecies as never} name={animal.name} traits={{ highBlack: animal.highBlack, highWhite: animal.highWhite, blueStripe: animal.blueStripe, yellowRetention: animal.yellowRetention, blotches: animal.blotches }} compact />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-white/75">{favorites.includes(animal.id) ? "★ " : ""}{animal.name}</div><div className="mt-1 text-[10px] text-white/30">{animal.sex} · {animal.lifeStage} · {animal.locality}</div><div className="mt-1 text-[10px] text-white/30">Gen {animal.generation} · {animal.classification} · {animal.nidoStatus}</div></div>
            </div>
            <div className="mt-3 text-[10px] text-white/35">HB {animal.highBlack}% · HW {animal.highWhite}% · Blue {animal.blueStripe}% · Yellow {animal.yellowRetention}% · Blotches {animal.blotches}%</div>
          </article>
        ))}
      </div>
      {filtered.length > 60 ? <div className="mt-4 text-center text-[10px] text-white/30">Showing first 60 matches. Refine filters to narrow the list.</div> : null}
    </section>
  );
}
