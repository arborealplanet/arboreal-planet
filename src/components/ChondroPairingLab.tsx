"use client";

import { CLUTCH_SIZE_PROFILES, averageClutchSize, clutchPairingKind } from "@/lib/chondro-clutch-size";

type Parent = {
  id: string;
  name: string;
  sex: "Male" | "Female";
  subspecies: string;
  locality: string;
  classification: "Pure" | "Hybrid" | "Designer";
  neonateColor: "Red" | "Yellow";
  geneticsTested: boolean;
  condition: "Excellent" | "Good" | "Fair";
  nidoStatus: "Unknown" | "Negative" | "Positive";
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
};

type TraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention" | "blotches";

const traitLabels: Record<TraitKey, string> = {
  highBlack: "High black",
  highWhite: "High white",
  blueStripe: "Blue",
  yellowRetention: "Yellow retention",
  blotches: "Blotches",
};

function pairingChance(dam: Parent, sire: Parent) {
  let chance = 0.78;
  if (dam.condition === "Excellent") chance += 0.08;
  if (sire.condition === "Excellent") chance += 0.04;
  if (dam.condition === "Fair") chance -= 0.28;
  if (sire.condition === "Fair") chance -= 0.16;
  return Math.max(0.25, Math.min(0.94, chance));
}

function projectedClassification(dam: Parent, sire: Parent) {
  if (dam.classification === "Designer" || sire.classification === "Designer") return "Designer";
  if (dam.classification === "Hybrid" || sire.classification === "Hybrid") return "Hybrid";
  return dam.subspecies === sire.subspecies ? "Pure" : "Hybrid";
}

function localityOutcome(dam: Parent, sire: Parent) {
  const classification = projectedClassification(dam, sire);
  if (classification !== "Pure") return "Mixed ancestry project";
  if (dam.locality === sire.locality && dam.locality !== "Mixed Locality" && dam.locality !== "Designer") return `${dam.locality} locality preserved`;
  return "Pure subspecies · mixed locality";
}

function neonateColorReadout(dam: Parent, sire: Parent) {
  if (dam.neonateColor === sire.neonateColor) return `${dam.neonateColor} strongly represented in this line`;
  return "Red and yellow neonates are both represented by the parents";
}

function strongestTraits(dam: Parent, sire: Parent) {
  if (!dam.geneticsTested && !sire.geneticsTested) return [];
  const traits = (Object.keys(traitLabels) as TraitKey[]).map((key) => {
    const known = [dam.geneticsTested ? dam[key] : null, sire.geneticsTested ? sire[key] : null].filter((value): value is number => value !== null);
    const score = known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : 0;
    return { key, score, knownParents: known.length };
  });
  return traits.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function ChondroPairingLab({ dam, sire }: { dam: Parent; sire: Parent }) {
  const kind = clutchPairingKind(dam, sire);
  const profile = CLUTCH_SIZE_PROFILES[kind];
  const chance = Math.round(pairingChance(dam, sire) * 100);
  const classification = projectedClassification(dam, sire);
  const traits = strongestTraits(dam, sire);
  const nidoRisk = dam.nidoStatus === "Positive" || sire.nidoStatus === "Positive";
  const unknownNido = !nidoRisk && (dam.nidoStatus === "Unknown" || sire.nidoStatus === "Unknown");

  return (
    <div className="mt-5 overflow-hidden rounded-[24px] border border-amber-200/15 bg-[radial-gradient(circle_at_top_left,rgba(253,230,138,.07),transparent_38%),rgba(0,0,0,.16)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-100/55">Pairing Lab</div>
          <h3 className="mt-2 text-lg font-semibold text-white/82">{dam.name} × {sire.name}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/36">A planning preview based on the parents you selected. It shows ranges and direction, not the exact clutch you will hatch.</p>
        </div>
        <div className="rounded-xl border border-amber-200/12 bg-amber-200/[.035] px-3 py-2 text-right">
          <div className="text-[8px] font-black uppercase tracking-[.12em] text-amber-100/42">Pairing outlook</div>
          <div className="mt-1 text-sm font-black text-amber-100/75">{chance}% lock chance</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/[.06] bg-black/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">Projected line</div>
          <div className="mt-2 text-sm font-semibold text-white/72">{classification}</div>
          <div className="mt-1 text-[10px] leading-4 text-white/34">{localityOutcome(dam, sire)}</div>
        </div>
        <div className="rounded-2xl border border-white/[.06] bg-black/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">Expected clutch range</div>
          <div className="mt-2 text-sm font-semibold text-white/72">{profile.min}–{profile.max} offspring</div>
          <div className="mt-1 text-[10px] leading-4 text-white/34">Typical center ~{averageClutchSize(profile)} · {profile.label}</div>
        </div>
        <div className="rounded-2xl border border-white/[.06] bg-black/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">Neonate color direction</div>
          <div className="mt-2 text-sm font-semibold text-white/72">{dam.neonateColor} × {sire.neonateColor}</div>
          <div className="mt-1 text-[10px] leading-4 text-white/34">{neonateColorReadout(dam, sire)}</div>
        </div>
        <div className="rounded-2xl border border-white/[.06] bg-black/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">Parent condition</div>
          <div className="mt-2 text-sm font-semibold text-white/72">{dam.condition} ♀ · {sire.condition} ♂</div>
          <div className="mt-1 text-[10px] leading-4 text-white/34">Condition feeds directly into the game&apos;s pairing-success roll.</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-white/[.06] bg-black/10 p-4">
          <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">Trait direction</div>
          {traits.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {traits.map(({ key, score, knownParents }) => (
                <div key={key} className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] p-3">
                  <div className="text-[10px] font-semibold text-emerald-100/65">{traitLabels[key]}</div>
                  <div className="mt-1 text-xs text-white/46">Known-parent avg {Math.round(score)}%</div>
                  <div className="mt-1 text-[9px] text-white/25">{knownParents === 2 ? "Both parents tested" : "One tested parent"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-xs leading-5 text-white/34">Both parents are genetically untested, so the lab will not invent trait percentages. Breed by appearance or test a parent to reveal more planning information.</div>
          )}
        </div>

        <div className={`rounded-2xl border p-4 ${nidoRisk ? "border-red-300/20 bg-red-300/[.035]" : unknownNido ? "border-amber-200/15 bg-amber-200/[.025]" : "border-emerald-300/12 bg-emerald-300/[.025]"}`}>
          <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">Health check</div>
          <div className={`mt-2 text-sm font-semibold ${nidoRisk ? "text-red-100/75" : unknownNido ? "text-amber-100/70" : "text-emerald-100/65"}`}>
            {nidoRisk ? "High-risk pairing" : unknownNido ? "Nido status incomplete" : "Both parents Nido negative"}
          </div>
          <div className="mt-1 text-[10px] leading-4 text-white/34">
            {nidoRisk ? "At least one selected parent is Nido Positive. The existing game risk rules still apply." : unknownNido ? "At least one parent is untested. Nido testing is optional, but this preview flags the uncertainty before you commit." : "No Nido warning is present for this pair."}
          </div>
        </div>
      </div>
    </div>
  );
}
