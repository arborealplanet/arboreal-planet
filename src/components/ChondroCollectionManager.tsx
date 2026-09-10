"use client";

import { useEffect, useMemo, useState } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";
import { ChondroFocusOverlay } from "@/components/ChondroFocusOverlay";

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
  notes?: string;
  sireId?: string;
  damId?: string;
};

type Sort = "name" | "trait" | "generation" | "locality";
const traitMax = (a: Snake) => Math.max(a.highBlack ?? 0, a.highWhite ?? 0, a.blueStripe ?? 0, a.yellowRetention ?? 0, a.blotches ?? 0);

export function ChondroCollectionManager() {
  const [animals, setAnimals] = useState<Snake[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Snake | null>(null);
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
    <>
      <section className="panel rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker">Colony</div>
            <h2 className="mt-2 text-2xl font-semibold">Find an animal, then open its record.</h2>
            <p className="mt-2 text-sm text-white/48">Filters stay compact. Detailed animal information now opens in a dedicated drawer instead of expanding the page.</p>
          </div>
          <div className="text-right"><div className="text-2xl font-black text-white">{filtered.length}</div><div className="text-[10px] uppercase tracking-[.16em] text-white/36">of {animals.length} animals</div></div>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, locality, subspecies…" className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/75" />
          {[{label:"Subspecies",value:subspecies,set:setSubspecies,key:"subspecies" as keyof Snake},{label:"Sex",value:sex,set:setSex,key:"sex" as keyof Snake},{label:"Life stage",value:stage,set:setStage,key:"lifeStage" as keyof Snake},{label:"Classification",value:classification,set:setClassification,key:"classification" as keyof Snake},{label:"Source",value:source,set:setSource,key:"source" as keyof Snake},{label:"Nido",value:nido,set:setNido,key:"nidoStatus" as keyof Snake}].map((f) => (
            <select key={f.label} value={f.value} onChange={(e) => f.set(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/65">
              <option value="All">All {f.label.toLowerCase()}</option>{unique(f.key).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}
          <select value={minimumTrait} onChange={(e) => setMinimumTrait(Number(e.target.value))} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/65">
            {[0,25,50,70,85,90,95,100].map((v) => <option key={v} value={v}>{v ? `Any trait ${v}%+` : "Any trait level"}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-white/65">
            <option value="name">Sort: Name</option><option value="trait">Sort: Highest trait</option><option value="generation">Sort: Generation</option><option value="locality">Sort: Locality</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/50">
          <label className="flex items-center gap-2"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /> Favorites only</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={testedOnly} onChange={(e) => setTestedOnly(e.target.checked)} /> Genetics tested only</label>
          <button type="button" onClick={reset} className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-bold">Reset filters</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 60).map((animal) => (
            <button type="button" key={animal.id} onClick={() => setSelectedAnimal(animal)} className="group rounded-2xl border border-white/[.06] bg-black/10 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/18 hover:bg-white/[.025]">
              <div className="flex items-start gap-3">
                <ChondroSnakeIcon subspecies={animal.subspecies as never} name={animal.name} traits={{ highBlack: animal.highBlack, highWhite: animal.highWhite, blueStripe: animal.blueStripe, yellowRetention: animal.yellowRetention, blotches: animal.blotches }} compact />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-white/80">{favorites.includes(animal.id) ? "★ " : ""}{animal.name}</div><div className="mt-1 text-[10px] text-white/38">{animal.sex} · {animal.lifeStage} · {animal.locality}</div><div className="mt-1 text-[10px] text-white/34">Gen {animal.generation} · {animal.classification} · {animal.nidoStatus}</div></div>
                <span className="text-xs text-emerald-200/45 transition group-hover:translate-x-0.5 group-hover:text-emerald-200/80">→</span>
              </div>
              <div className="mt-3 text-[10px] leading-5 text-white/42">HB {animal.highBlack}% · HW {animal.highWhite}% · Blue {animal.blueStripe}% · Yellow {animal.yellowRetention}% · Blotches {animal.blotches}%</div>
            </button>
          ))}
        </div>
        {filtered.length > 60 ? <div className="mt-4 text-center text-[10px] text-white/34">Showing first 60 matches. Refine filters to narrow the list.</div> : null}
      </section>

      <ChondroFocusOverlay open={Boolean(selectedAnimal)} onClose={() => setSelectedAnimal(null)} title={selectedAnimal?.name ?? "Animal record"} eyebrow="Colony animal" mode="drawer">
        {selectedAnimal ? <AnimalDetail animal={selectedAnimal} favorite={favorites.includes(selectedAnimal.id)} animals={animals} /> : null}
      </ChondroFocusOverlay>
    </>
  );
}

function AnimalDetail({ animal, favorite, animals }: { animal: Snake; favorite: boolean; animals: Snake[] }) {
  const traits = [
    ["High black", animal.highBlack],
    ["High white", animal.highWhite],
    ["Blue", animal.blueStripe],
    ["Yellow", animal.yellowRetention],
    ["Blotches", animal.blotches],
  ] as const;
  const dam = animal.damId ? animals.find((candidate) => candidate.id === animal.damId) : null;
  const sire = animal.sireId ? animals.find((candidate) => candidate.id === animal.sireId) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-white/[.07] bg-[radial-gradient(circle_at_50%_35%,rgba(57,230,125,.08),transparent_45%),rgba(0,0,0,.18)] p-5">
        <div className="mx-auto max-w-[360px]"><ChondroSnakeIcon subspecies={animal.subspecies as never} name={animal.name} traits={{ highBlack: animal.highBlack, highWhite: animal.highWhite, blueStripe: animal.blueStripe, yellowRetention: animal.yellowRetention, blotches: animal.blotches }} /></div>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-bold uppercase tracking-[.1em]">
          <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-white/58">{animal.sex}</span>
          <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-white/58">{animal.lifeStage}</span>
          <span className="rounded-full border border-emerald-300/12 bg-emerald-300/[.035] px-3 py-1.5 text-emerald-100/70">{animal.classification}</span>
          {favorite ? <span className="rounded-full border border-amber-200/12 bg-amber-200/[.035] px-3 py-1.5 text-amber-100/70">★ Favorite</span> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Subspecies" value={animal.subspecies} />
        <Info label="Locality" value={animal.locality || "—"} />
        <Info label="Generation" value={`Gen ${animal.generation ?? 0}`} />
        <Info label="Source" value={animal.source || "—"} />
        <Info label="Nido status" value={animal.nidoStatus || "—"} />
        <Info label="Genetics" value={animal.geneticsTested ? "Tested" : "Not tested"} />
      </div>

      <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="section-kicker">Phenotype traits</div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {traits.map(([label, value]) => <div key={label} className="rounded-xl bg-white/[.025] p-3 text-center"><div className="text-xl font-semibold text-white/78">{value ?? 0}%</div><div className="mt-1 text-[9px] uppercase tracking-[.1em] text-white/36">{label}</div></div>)}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="section-kicker">Lineage</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Dam" value={dam?.name || animal.damId || "No recorded dam"} />
          <Info label="Sire" value={sire?.name || animal.sireId || "No recorded sire"} />
        </div>
      </div>

      {animal.notes ? <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4"><div className="section-kicker">Notes</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/55">{animal.notes}</p></div> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[.065] bg-white/[.02] p-4"><div className="text-[9px] font-bold uppercase tracking-[.12em] text-white/34">{label}</div><div className="mt-2 text-sm font-semibold text-white/68">{value}</div></div>;
}
