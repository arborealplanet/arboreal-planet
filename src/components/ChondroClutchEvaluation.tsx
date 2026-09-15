"use client";

import { marketDemandForSeason, marketMultiplierForAnimal } from "@/lib/chondro-progression";

type Offspring = {
  id: string;
  name: string;
  source: "Captive Bred" | "Import";
  subspecies: "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
  locality: string;
  classification: "Pure" | "Hybrid" | "Designer";
  generation: number;
  neonateColor: "Red" | "Yellow";
  phenotypeScore: number;
  geneticsTested: boolean;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
  localityAncestry: Record<string, number> | Partial<Record<string, number>>;
};

type Ranked = { animal: Offspring; score: number; note: string };

const traitLabels = {
  highBlack: "High black",
  highWhite: "High white",
  blueStripe: "Blue",
  yellowRetention: "Yellow retention",
  blotches: "Blotches",
} as const;

type TraitKey = keyof typeof traitLabels;

function strongestTrait(animal: Offspring) {
  const keys = Object.keys(traitLabels) as TraitKey[];
  return keys.map((key) => ({ key, value: animal[key] })).sort((a, b) => b.value - a.value)[0];
}

function localityPurity(animal: Offspring) {
  if (animal.classification !== "Pure") return 0;
  const value = Number(animal.localityAncestry?.[animal.locality] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function breederScore(animal: Offspring) {
  const values = [animal.highBlack, animal.highWhite, animal.blueStripe, animal.yellowRetention, animal.blotches];
  const strongest = Math.max(...values);
  const eliteCount = values.filter((value) => value >= 70).length;
  const lineage = animal.classification === "Pure" ? 12 : animal.classification === "Designer" ? 10 : 6;
  return strongest * 0.45 + eliteCount * 8 + animal.generation * 4 + lineage + localityPurity(animal) * 0.08;
}

function phenotypeRank(offspring: Offspring[]): Ranked | null {
  if (!offspring.length) return null;
  const animal = [...offspring].sort((a, b) => b.phenotypeScore - a.phenotypeScore)[0];
  return { animal, score: animal.phenotypeScore, note: `Phenotype score ${animal.phenotypeScore}` };
}

function breederRank(offspring: Offspring[]): Ranked | null {
  if (!offspring.length) return null;
  const animal = [...offspring].sort((a, b) => breederScore(b) - breederScore(a))[0];
  const trait = strongestTrait(animal);
  return { animal, score: breederScore(animal), note: `${traitLabels[trait.key]} ${trait.value}% · Gen ${animal.generation}` };
}

function localityRank(offspring: Offspring[]): Ranked | null {
  const eligible = offspring.filter((animal) => animal.classification === "Pure");
  if (!eligible.length) return null;
  const animal = [...eligible].sort((a, b) => localityPurity(b) - localityPurity(a) || b.phenotypeScore - a.phenotypeScore)[0];
  const purity = localityPurity(animal);
  return { animal, score: purity, note: purity > 0 ? `${purity.toFixed(purity % 1 ? 1 : 0)}% ${animal.locality} pedigree` : `Pure ${animal.subspecies}` };
}

function marketRank(offspring: Offspring[], season: number): Ranked | null {
  if (!offspring.length) return null;
  const demand = marketDemandForSeason(season);
  const ranked = offspring.map((animal) => {
    const multiplier = marketMultiplierForAnimal(demand, animal);
    const strongest = strongestTrait(animal).value;
    const score = multiplier * (100 + animal.phenotypeScore + strongest * 0.65);
    return { animal, score, note: `${multiplier.toFixed(2)}× season demand · phenotype ${animal.phenotypeScore}` };
  }).sort((a, b) => b.score - a.score);
  return ranked[0];
}

function Recommendation({ title, ranked, holdbackIds }: { title: string; ranked: Ranked | null; holdbackIds: string[] }) {
  if (!ranked) {
    return <div className="rounded-2xl border border-white/[.06] bg-black/10 p-3"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">{title}</div><div className="mt-2 text-xs text-white/30">No qualifying offspring</div></div>;
  }
  const selected = holdbackIds.includes(ranked.animal.id);
  return (
    <div className="rounded-2xl border border-white/[.06] bg-black/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">{title}</div>
        {selected ? <span className="rounded-full border border-amber-200/18 bg-amber-200/[.04] px-2 py-0.5 text-[8px] font-black uppercase text-amber-100/65">Holdback</span> : null}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-white/72">{ranked.animal.name}</div>
      <div className="mt-1 text-[10px] leading-4 text-white/34">{ranked.note}</div>
    </div>
  );
}

export function ChondroClutchEvaluation({ offspring, holdbackIds, season }: { offspring: Offspring[]; holdbackIds: string[]; season: number }) {
  if (!offspring.length) return null;
  const phenotype = phenotypeRank(offspring);
  const breeder = breederRank(offspring);
  const locality = localityRank(offspring);
  const market = marketRank(offspring, season);
  const demand = marketDemandForSeason(season);

  return (
    <div className="mt-4 rounded-[24px] border border-sky-300/12 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,.06),transparent_36%),rgba(0,0,0,.14)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-sky-100/50">Clutch Evaluation</div>
          <h3 className="mt-2 text-lg font-semibold text-white/80">Compare the clutch before choosing holdbacks.</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/34">These are planning recommendations, not automatic decisions. The same animal can lead more than one category.</p>
        </div>
        <div className="rounded-xl border border-sky-300/10 bg-sky-300/[.03] px-3 py-2 text-right">
          <div className="text-[8px] font-black uppercase tracking-[.12em] text-sky-100/38">Season {season} demand</div>
          <div className="mt-1 text-[10px] font-semibold text-sky-100/65">Hot: {traitLabels[demand.hotTrait]}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Recommendation title="Best phenotype" ranked={phenotype} holdbackIds={holdbackIds} />
        <Recommendation title="Best future breeder" ranked={breeder} holdbackIds={holdbackIds} />
        <Recommendation title="Best locality keeper" ranked={locality} holdbackIds={holdbackIds} />
        <Recommendation title="Best market potential" ranked={market} holdbackIds={holdbackIds} />
      </div>
      <div className="mt-3 text-[10px] leading-5 text-white/28">Market potential uses the game&apos;s current seasonal demand multiplier plus phenotype/trait strength. It is a relative clutch ranking, not a guaranteed sale price.</div>
    </div>
  );
}
