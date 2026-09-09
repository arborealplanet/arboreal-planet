"use client";

import { useEffect } from "react";
import { clutchSizeForPairing } from "@/lib/chondro-clutch-size";
import { inheritTraitSet } from "@/lib/chondro-genetics";

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const ENGINE_VERSION = 2;

type Classification = "Pure" | "Hybrid" | "Designer";
type Snake = {
  id: string;
  name: string;
  sex: "Male" | "Female";
  source: "Captive Bred" | "Import";
  subspecies: string;
  locality: string;
  neonateColor: "Red" | "Yellow";
  lifeStage: string;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
  geneticsTested: boolean;
  phenotypeScore: number;
  localityAncestry: Record<string, number>;
  body: string;
  tail: string;
  eyes: string;
  head: string;
  pattern: string;
  color: string;
  nidoStatus: "Unknown" | "Negative" | "Positive";
  condition: "Excellent" | "Good" | "Fair";
  classification: Classification;
  generation: number;
  parentIds: string[];
  ancestry: Record<string, number>;
  notes: string;
  breederInitials: string | null;
};

type SyncedClutch = {
  id: string;
  dam: Snake;
  sire: Snake;
  offspring: Snake[];
  engineVersion?: number;
  pairingProfile?: string;
};

type Save = {
  clutch?: SyncedClutch | null;
  holdbacks?: string[];
  [key: string]: unknown;
};

function classifyPair(dam: Snake, sire: Snake): Classification {
  if (dam.classification === "Designer" || sire.classification === "Designer") return "Designer";
  if (dam.classification === "Hybrid" || sire.classification === "Hybrid") return "Hybrid";
  return dam.subspecies === sire.subspecies ? "Pure" : "Hybrid";
}

function combinePercentages(a: Record<string, number> | undefined, b: Record<string, number> | undefined) {
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const key of keys) out[key] = Math.round((((a?.[key] ?? 0) + (b?.[key] ?? 0)) / 2) * 10) / 10;
  return out;
}

function pick<T>(a: T, b: T) {
  return Math.random() < 0.5 ? a : b;
}

function localityFor(dam: Snake, sire: Snake, classification: Classification) {
  if (classification === "Designer") return "Designer";
  if (classification === "Hybrid") return "Mixed Locality";
  return dam.locality === sire.locality ? dam.locality : "Mixed Locality";
}

function phenotypeFor(dam: Snake, sire: Snake, locality: string, classification: Classification) {
  if (classification !== "Pure" || locality === "Mixed Locality") return 0;
  const midpoint = (Number(dam.phenotypeScore ?? 0) + Number(sire.phenotypeScore ?? 0)) / 2;
  return Math.max(0, Math.min(100, Math.round(midpoint + (Math.random() + Math.random() - 1) * 7)));
}

function syncClutch(clutch: SyncedClutch): SyncedClutch {
  const { dam, sire } = clutch;
  const classification = classifyPair(dam, sire);
  const locality = localityFor(dam, sire, classification);
  const size = clutchSizeForPairing(dam, sire);
  const initials = clutch.offspring[0]?.breederInitials || dam.breederInitials || sire.breederInitials || "AP";
  const generation = Math.max(Number(dam.generation ?? 1), Number(sire.generation ?? 1)) + 1;
  const ancestry = combinePercentages(dam.ancestry, sire.ancestry);
  const localityAncestry = combinePercentages(dam.localityAncestry, sire.localityAncestry);

  const offspring = Array.from({ length: size }, (_, index) => {
    const template = clutch.offspring[index % Math.max(1, clutch.offspring.length)] ?? dam;
    const structural = pick(dam, sire);
    const traits = inheritTraitSet(dam, sire);
    return {
      ...template,
      id: `${initials}-${clutch.id}-${String(index + 1).padStart(2, "0")}`,
      name: `Hatchling ${index + 1}`,
      sex: Math.random() < 0.5 ? "Male" : "Female",
      source: "Captive Bred" as const,
      subspecies: classification === "Pure" ? dam.subspecies : structural.subspecies,
      locality,
      neonateColor: pick(dam.neonateColor, sire.neonateColor),
      lifeStage: "Hatchling",
      highBlack: traits.highBlack,
      highWhite: traits.highWhite,
      blueStripe: traits.blueStripe,
      yellowRetention: traits.yellowRetention,
      blotches: traits.blotches,
      geneticsTested: false,
      phenotypeScore: phenotypeFor(dam, sire, locality, classification),
      localityAncestry,
      body: structural.body,
      tail: structural.tail,
      eyes: structural.eyes,
      head: structural.head,
      pattern: locality === dam.locality && locality === sire.locality ? locality : pick(dam.pattern, sire.pattern),
      color: locality === dam.locality && locality === sire.locality ? locality : pick(dam.color, sire.color),
      nidoStatus: "Unknown" as const,
      condition: "Good" as const,
      classification,
      generation,
      parentIds: [dam.id, sire.id],
      ancestry,
      notes: "",
      breederInitials: initials,
    } satisfies Snake;
  });

  return {
    ...clutch,
    offspring,
    engineVersion: ENGINE_VERSION,
    pairingProfile: `${dam.classification} × ${sire.classification}`,
  };
}

export function ChondroCoreBreedingSync() {
  useEffect(() => {
    let busy = false;

    const check = async () => {
      if (busy) return;
      let save: Save | null = null;
      try {
        save = JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) || "null") as Save | null;
      } catch {
        return;
      }
      const clutch = save?.clutch;
      if (!save || !clutch || clutch.engineVersion === ENGINE_VERSION || !clutch.dam || !clutch.sire) return;

      busy = true;
      const synced = syncClutch(clutch);
      const offspringIds = new Set(synced.offspring.map((baby) => baby.id));
      const next: Save = {
        ...save,
        clutch: synced,
        holdbacks: (save.holdbacks ?? []).filter((id) => offspringIds.has(id)),
      };

      try {
        window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(next));
        const response = await fetch("/api/hatchery/chondro-breeder/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (response.ok) {
          window.dispatchEvent(new CustomEvent("arboreal-chondro-core-clutch-synced", { detail: { clutchId: synced.id } }));
          window.setTimeout(() => window.location.reload(), 120);
          return;
        }
      } catch {}
      busy = false;
    };

    void check();
    const timer = window.setInterval(() => void check(), 250);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
