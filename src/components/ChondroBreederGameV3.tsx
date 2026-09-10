"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";
import { clutchSizeForPairing } from "@/lib/chondro-clutch-size";
import { inheritTraitSet } from "@/lib/chondro-genetics";
import { breedingReputationGain, marketDemandForSeason, marketMultiplierForAnimal } from "@/lib/chondro-progression";
import { geneticTestingUnlocked, roomCapacityFromSave, ROOM_EXPANSIONS, type FacilityRoomState } from "@/lib/chondro-facility-limits";
import { CHONDRO_SPECIES_PROFILE, growthCostFor, growthRequirementFor, needsExtraRecoveryYear, normalizeNeonateColorFor, randomNeonateColorFor } from "@/lib/breeder-species-profiles";

type Subspecies =
  | "Morelia azurea azurea"
  | "Morelia azurea pulcher"
  | "Morelia azurea utaraensis"
  | "Morelia viridis";
type Locality =
  | "Biak"
  | "Numfor"
  | "Manokwari"
  | "Sorong"
  | "Timika"
  | "Cyclops"
  | "Jayapura"
  | "Lereh"
  | "Wamena"
  | "Aru"
  | "Merauke";
type SnakeLocality = Locality | "Mixed Locality" | "Designer";
type Sex = "Male" | "Female";
type Source = "Captive Bred" | "Import";
type Classification = "Pure" | "Hybrid" | "Designer";
type NidoStatus = "Unknown" | "Negative" | "Positive";
type LifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";
type TraitKey =
  | "highBlack"
  | "highWhite"
  | "blueStripe"
  | "yellowRetention"
  | "blotches";

type Snake = {
  id: string;
  name: string;
  sex: Sex;
  source: Source;
  subspecies: Subspecies;
  locality: SnakeLocality;
  neonateColor: "Red" | "Yellow";
  lifeStage: LifeStage;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
  geneticsTested: boolean;
  phenotypeScore: number;
  localityAncestry: Partial<Record<Locality, number>>;
  body: string;
  tail: string;
  eyes: string;
  head: string;
  pattern: string;
  color: string;
  nidoStatus: NidoStatus;
  condition: "Excellent" | "Good" | "Fair";
  classification: Classification;
  generation: number;
  parentIds: string[];
  ancestry: Partial<Record<Subspecies, number>>;
  notes: string;
  breederInitials: string | null;
};
type StoreSnake = Snake & { price: number; pretested: boolean };
type Clutch = { id: string; dam: Snake; sire: Snake; offspring: Snake[] };
type ClutchRecord = Clutch & { season: number; holdbackIds: string[] };
type PlayerMarketListing = {
  id: string;
  snake_id: string;
  seller_id: string;
  snake: Snake;
  price: number;
  listed_at: string;
};
type Sale = { id: string; name: string; value: number; season: number };
type Transfer = { id: string; name: string; season: number };
type EnclosureType = "Chondro Dojo Bin" | "PVC Arboreal";
type BreedingStage = "cycling" | "pairing" | "laying" | "incubation" | "hatch-day";
type BreedingCycle = { damId: string; sireId: string; stage: BreedingStage; startedAt: number; completesAt: number };
type GeneticTestJob = { snakeId: string; completesAt: number };
type FacilityConstruction = { roomId: string; completesAt: number };
type GameSave = {
  started: boolean;
  cash: number;
  colony: Snake[];
  tested: string[];
  damId: string;
  sireId: string;
  clutch: Clutch | null;
  clutchHistory: ClutchRecord[];
  holdbacks: string[];
  season: number;
  sales: Sale[];
  transfers: Transfer[];
  enclosures: Record<EnclosureType, number>;
  purchasedStoreIds: string[];
  careerReputation?: number;
  facilityRooms?: FacilityRoomState;
  facilityConstruction?: FacilityConstruction | null;
  breedingCycle?: BreedingCycle | null;
  geneticTestsPending?: GeneticTestJob[];
  femaleRecovery?: Record<string, number>;
  seasonCarePaid?: number;
  breedingMessage?: string;
};

type RandomFn = () => number;

const STARTING_CASH = 30000;
const NIDO_TEST_COST = 125;
const GENETIC_TEST_COST = 350;
const GENETIC_TEST_HOURS = 12;
const SEASON_CARE_PER_ADULT = CHONDRO_SPECIES_PROFILE.reproduction.seasonCarePerAdult;
const BREEDING_STAGES = CHONDRO_SPECIES_PROFILE.reproduction.stages as Array<{ id: BreedingStage; label: string; hours: number }>;
const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const DAY_MS = 86_400_000;
const enclosurePrices: Record<EnclosureType, number> = {
  "Chondro Dojo Bin": 225,
  "PVC Arboreal": 650,
};

const localitySubspecies: Record<Locality, Subspecies> = {
  Biak: "Morelia azurea azurea",
  Numfor: "Morelia azurea azurea",
  Manokwari: "Morelia azurea pulcher",
  Sorong: "Morelia azurea pulcher",
  Timika: "Morelia azurea pulcher",
  Cyclops: "Morelia azurea utaraensis",
  Jayapura: "Morelia azurea utaraensis",
  Lereh: "Morelia azurea utaraensis",
  Wamena: "Morelia azurea utaraensis",
  Aru: "Morelia viridis",
  Merauke: "Morelia viridis",
};
const allLocalities = Object.keys(localitySubspecies) as Locality[];
const preferredTraits = CHONDRO_SPECIES_PROFILE.traits.preferredByTaxon as Record<Subspecies, TraitKey[]>;
const traitRows: [string, TraitKey][] = [
  ["High Black", "highBlack"],
  ["High White", "highWhite"],
  ["Blue", "blueStripe"],
  ["Yellow", "yellowRetention"],
  ["Blotches", "blotches"],
];

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
const clamp = (n: number, max = 100) =>
  Math.max(0, Math.min(max, Math.round(n)));
const remainingTime = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
function pairingChance(dam: Snake, sire: Snake) {
  let chance = 0.78;
  if (dam.condition === "Excellent") chance += 0.08;
  if (sire.condition === "Excellent") chance += 0.04;
  if (dam.condition === "Fair") chance -= 0.28;
  if (sire.condition === "Fair") chance -= 0.16;
  return Math.max(0.25, Math.min(0.94, chance));
}
function pairingFailureReason(dam: Snake, sire: Snake) {
  if (dam.condition === "Fair") return "The female did not cycle strongly enough to complete the pairing.";
  if (sire.condition === "Fair") return "The male showed poor breeding interest this cycle.";
  return Math.random() < 0.5 ? "No successful lock was observed." : "The female was unreceptive and the pairing was stopped.";
}
const pick = <T,>(a: T, b: T) => (Math.random() < 0.5 ? a : b);
const tailFor = (s: Subspecies) =>
  s === "Morelia azurea utaraensis"
    ? "Matching body color and pattern"
    : "Black-dipped";
const isNamedLocality = (value: SnakeLocality): value is Locality =>
  Object.prototype.hasOwnProperty.call(localitySubspecies, value);
const portraitTraits = (a: Snake) => ({
  highBlack: a.highBlack,
  highWhite: a.highWhite,
  blueStripe: a.blueStripe,
  yellowRetention: a.yellowRetention,
  blotches: a.blotches ?? 0,
});

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicScore(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 66 + (Math.abs(hash) % 28);
}

function rollBetween(random: RandomFn, min: number, max: number) {
  return clamp(min + random() * (max - min));
}

function rollTrait(random: RandomFn, preferred: boolean) {
  const r = random();
  if (preferred) {
    if (r < 0.25) return 0;
    if (r < 0.55) return rollBetween(random, 1, 10);
    if (r < 0.78) return rollBetween(random, 11, 25);
    if (r < 0.92) return rollBetween(random, 26, 50);
    if (r < 0.98) return rollBetween(random, 51, 75);
    return rollBetween(random, 76, 100);
  }
  if (r < 0.55) return 0;
  if (r < 0.82) return rollBetween(random, 1, 10);
  if (r < 0.94) return rollBetween(random, 11, 25);
  if (r < 0.98) return rollBetween(random, 26, 50);
  if (r < 0.995) return rollBetween(random, 51, 75);
  return rollBetween(random, 76, 100);
}

function rollPhenotypeScore(random: RandomFn) {
  const r = random();
  if (r < 0.6) return rollBetween(random, 65, 82);
  if (r < 0.88) return rollBetween(random, 83, 90);
  if (r < 0.98) return rollBetween(random, 91, 94);
  return rollBetween(random, 95, 100);
}

function phenotypeGrade(score: number) {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 74) return "B";
  if (score >= 68) return "B-";
  if (score >= 62) return "C+";
  return "C";
}

function localityPurity(a: Snake) {
  if (!isNamedLocality(a.locality)) return 0;
  return Math.round((a.localityAncestry[a.locality] ?? 0) * 10) / 10;
}

function phenotypeLabel(a: Snake) {
  if (
    a.classification !== "Pure" ||
    !isNamedLocality(a.locality) ||
    localityPurity(a) < 99.9
  )
    return null;
  return `${phenotypeGrade(a.phenotypeScore)} ${a.locality} phenotype`;
}

function traitSummary(a: Snake) {
  if (!a.geneticsTested) return "Genetics untested · percentages hidden";
  return `HB ${a.highBlack}% · HW ${a.highWhite}% · Blue ${a.blueStripe}% · Yellow ${a.yellowRetention}% · Blotches ${a.blotches}%`;
}

function makeSnake(
  id: string,
  name: string,
  sex: Sex,
  source: Source,
  locality: Locality,
  neonateColor: "Red" | "Yellow",
  lifeStage: LifeStage,
  traits: Record<TraitKey, number>,
  phenotypeScore: number,
  geneticsTested = false,
  condition: Snake["condition"] = "Good",
): Snake {
  const subspecies = localitySubspecies[locality];
  return {
    id,
    name,
    sex,
    source,
    subspecies,
    locality,
    neonateColor: normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, neonateColor),
    lifeStage,
    highBlack: clamp(traits.highBlack),
    highWhite: clamp(traits.highWhite),
    blueStripe: clamp(traits.blueStripe),
    yellowRetention: clamp(traits.yellowRetention),
    blotches: clamp(traits.blotches),
    geneticsTested,
    phenotypeScore: clamp(phenotypeScore),
    localityAncestry: { [locality]: 100 },
    body: subspecies,
    tail: tailFor(subspecies),
    eyes: subspecies,
    head: subspecies,
    pattern: locality,
    color: locality,
    nidoStatus: "Unknown",
    condition,
    classification: "Pure",
    generation: 1,
    parentIds: [],
    ancestry: { [subspecies]: 100 },
    notes: "",
    breederInitials: null,
  };
}

function makeHybrid(
  id: string,
  name: string,
  sex: Sex,
  neonateColor: "Red" | "Yellow",
  lifeStage: LifeStage,
  a: Locality,
  b: Locality,
  traits: Record<TraitKey, number>,
  structural: Subspecies,
  geneticsTested = false,
): Snake {
  const sa = localitySubspecies[a], sb = localitySubspecies[b];
  return {
    id,
    name,
    sex,
    source: "Captive Bred",
    subspecies: structural,
    locality: "Designer",
    neonateColor,
    lifeStage,
    highBlack: traits.highBlack,
    highWhite: traits.highWhite,
    blueStripe: traits.blueStripe,
    yellowRetention: traits.yellowRetention,
    blotches: traits.blotches,
    geneticsTested,
    phenotypeScore: 0,
    localityAncestry: { [a]: 50, [b]: 50 },
    body: structural,
    tail: tailFor(structural),
    eyes: structural,
    head: structural,
    pattern: a,
    color: b,
    nidoStatus: "Unknown",
    condition: "Good",
    classification: "Hybrid",
    generation: 1,
    parentIds: [],
    ancestry: { [sa]: 50, [sb]: 50 },
    notes: "",
    breederInitials: null,
  };
}

function storeForEpoch(epoch: number): StoreSnake[] {
  const random = seeded(epoch * 7919 + 73);
  const offers: StoreSnake[] = [];
  for (let i = 0; i < 10; i++) {
    const isHybrid = i === 8 || (i > 5 && random() < 0.25);
    const source: Source = random() < 0.48 ? "Import" : "Captive Bred";
    const sex: Sex = random() < 0.5 ? "Male" : "Female";
    const neonateColor = randomNeonateColorFor(CHONDRO_SPECIES_PROFILE, random);
    const stages: LifeStage[] = ["Hatchling", "Neonate", "Subadult", "Adult"];
    const lifeStage = stages[Math.floor(random() * stages.length)];
    const a = allLocalities[Math.floor(random() * allLocalities.length)];
    let b = allLocalities[Math.floor(random() * allLocalities.length)];
    while (localitySubspecies[b] === localitySubspecies[a])
      b = allLocalities[Math.floor(random() * allLocalities.length)];
    const sa = localitySubspecies[a], sb = localitySubspecies[b];
    const preferred = (key: TraitKey) =>
      key !== "blotches" &&
      (preferredTraits[sa].includes(key) ||
        (isHybrid && preferredTraits[sb].includes(key)));
    const traits: Record<TraitKey, number> = {
      highBlack: rollTrait(random, preferred("highBlack")),
      highWhite: rollTrait(random, preferred("highWhite")),
      blueStripe: rollTrait(random, preferred("blueStripe")),
      yellowRetention: rollTrait(random, preferred("yellowRetention")),
      blotches: rollTrait(random, false),
    };
    const geneticsTested = random() < 0.18;
    const baseName = isHybrid ? `${a} × ${b}` : a;
    const snake = isHybrid
      ? makeHybrid(
          `STORE-${epoch}-${i}`,
          `${baseName} Hybrid`,
          sex,
          neonateColor,
          lifeStage,
          a,
          b,
          traits,
          random() < 0.5 ? sa : sb,
          geneticsTested,
        )
      : makeSnake(
          `STORE-${epoch}-${i}`,
          `${baseName} ${source === "Import" ? "Import" : "CB"}`,
          sex,
          source,
          a,
          neonateColor,
          lifeStage,
          traits,
          rollPhenotypeScore(random),
          geneticsTested,
          source === "Import" ? "Fair" : "Good",
        );
    const pretested = random() < 0.38;
    if (pretested) snake.nidoStatus = "Negative";
    const stageMultiplier =
      lifeStage === "Hatchling"
        ? 0.55
        : lifeStage === "Neonate"
          ? 0.75
          : lifeStage === "Subadult"
            ? 1
            : 1.28;
    const visibleTraitPremium = geneticsTested
      ? (traits.highBlack + traits.highWhite + traits.blueStripe + traits.yellowRetention + traits.blotches) * 10
      : 0;
    const phenotypePremium = phenotypeLabel(snake)
      ? Math.max(0, snake.phenotypeScore - 70) * 42
      : 0;
    const price =
      Math.round(
        (((snake.source === "Import" ? 900 : 2050) +
          (isHybrid ? 750 : 0) +
          (snake.neonateColor === "Red" ? 600 : 0) +
          (pretested ? 425 : 0) +
          (geneticsTested ? 350 : 0) +
          visibleTraitPremium +
          phenotypePremium) *
          stageMultiplier) /
          25,
      ) * 25;
    offers.push({ ...snake, price, pretested });
  }
  return offers;
}

function combineAncestry(a: Snake, b: Snake) {
  const out: Partial<Record<Subspecies, number>> = {};
  const keys = Object.keys({ ...a.ancestry, ...b.ancestry }) as Subspecies[];
  for (const key of keys)
    out[key] = Math.round((((a.ancestry[key] ?? 0) + (b.ancestry[key] ?? 0)) / 2) * 10) / 10;
  return out;
}

function combineLocalityAncestry(a: Snake, b: Snake) {
  const out: Partial<Record<Locality, number>> = {};
  const keys = Object.keys({ ...a.localityAncestry, ...b.localityAncestry }) as Locality[];
  for (const key of keys)
    out[key] = Math.round((((a.localityAncestry[key] ?? 0) + (b.localityAncestry[key] ?? 0)) / 2) * 10) / 10;
  return out;
}

function classifyPair(a: Snake, b: Snake): Classification {
  if (a.classification === "Designer" || b.classification === "Designer") return "Designer";
  if (a.classification === "Hybrid" || b.classification === "Hybrid") return "Hybrid";
  return a.subspecies === b.subspecies ? "Pure" : "Hybrid";
}

function inheritPhenotypeScore(dam: Snake, sire: Snake, sameLocality: boolean) {
  if (!sameLocality) return 0;
  const midpoint = (dam.phenotypeScore + sire.phenotypeScore) / 2;
  const ordinary = midpoint + (Math.random() + Math.random() - 1) * 7;
  const breakthrough = Math.random() < 0.025 ? 4 + Math.random() * 8 : 0;
  return clamp(ordinary + breakthrough);
}

function makeOffspring(
  dam: Snake,
  sire: Snake,
  clutchId: string,
  index: number,
  breederInitials: string,
): Snake {
  const classification = classifyPair(dam, sire);
  const structural = pick(dam, sire);
  const pureSame = classification === "Pure" && dam.subspecies === sire.subspecies;
  const sameLocality =
    pureSame &&
    isNamedLocality(dam.locality) &&
    isNamedLocality(sire.locality) &&
    dam.locality === sire.locality &&
    localityPurity(dam) >= 99.9 &&
    localityPurity(sire) >= 99.9;
  const locality: SnakeLocality = sameLocality
    ? dam.locality
    : classification === "Designer"
      ? "Designer"
      : "Mixed Locality";
  const subspecies = pureSame ? dam.subspecies : structural.subspecies;
  const inheritedTraits = inheritTraitSet(dam, sire);
  return {
    id: `${breederInitials}-${clutchId}-${String(index + 1).padStart(2, "0")}`,
    name: `Hatchling ${index + 1}`,
    sex: Math.random() < 0.5 ? "Male" : "Female",
    source: "Captive Bred",
    subspecies,
    locality,
    neonateColor: pureSame
      ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, pick(dam.neonateColor, sire.neonateColor))
      : pick(dam.neonateColor, sire.neonateColor),
    lifeStage: "Hatchling",
    highBlack: inheritedTraits.highBlack,
    highWhite: inheritedTraits.highWhite,
    blueStripe: inheritedTraits.blueStripe,
    yellowRetention: inheritedTraits.yellowRetention,
    blotches: inheritedTraits.blotches,
    geneticsTested: false,
    phenotypeScore: inheritPhenotypeScore(dam, sire, sameLocality),
    localityAncestry: combineLocalityAncestry(dam, sire),
    body: pick(dam.body, sire.body),
    tail: pick(dam.tail, sire.tail),
    eyes: pick(dam.eyes, sire.eyes),
    head: pick(dam.head, sire.head),
    pattern: sameLocality ? dam.locality : pick(dam.pattern, sire.pattern),
    color: sameLocality ? dam.locality : pick(dam.color, sire.color),
    nidoStatus: "Unknown",
    condition: "Good",
    classification,
    generation: Math.max(dam.generation, sire.generation) + 1,
    parentIds: [dam.id, sire.id],
    ancestry: combineAncestry(dam, sire),
    notes: "",
    breederInitials,
  };
}

function createClutch(dam: Snake, sire: Snake, breederInitials: string): Clutch {
  const id = `CL-${Date.now().toString(36).toUpperCase()}`;
  const size = clutchSizeForPairing(dam, sire);
  return {
    id,
    dam,
    sire,
    offspring: Array.from({ length: size }, (_, i) =>
      makeOffspring(dam, sire, id, i, breederInitials),
    ),
  };
}

function saleValue(a: Snake, season: number) {
  const traits = [a.highBlack, a.highWhite, a.blueStripe, a.yellowRetention, a.blotches ?? 0];
  const strongest = Math.max(...traits);
  const avg = traits.reduce((s, v) => s + v, 0) / traits.length;
  const traitPremium = a.geneticsTested ? avg * 12 + strongest * 18 : avg * 3 + strongest * 5;
  let value = 300 + traitPremium;
  const label = phenotypeLabel(a);
  if (label) {
    const grade = phenotypeGrade(a.phenotypeScore);
    if (grade === "A+") value *= 1.5;
    else if (grade === "A") value *= 1.3;
    else if (grade === "A-") value *= 1.18;
    else if (grade === "B+") value *= 1.08;
  }
  if (a.neonateColor === "Red") value *= 1.18;
  if (a.classification === "Hybrid") value *= 1.08;
  if (a.classification === "Designer") value *= 1.16;
  if (a.lifeStage === "Adult") value *= 1.35;
  if (a.lifeStage === "Subadult") value *= 1.16;
  if (a.nidoStatus === "Negative") value *= 1.08;
  if (a.nidoStatus === "Unknown") value *= 0.9;
  if (a.condition === "Fair") value *= 0.82;
  value *= marketMultiplierForAnimal(marketDemandForSeason(season), a);
  return Math.max(250, Math.round(value / 25) * 25);
}

function agingRequirement(a: Snake) {
  const requirement = growthRequirementFor(CHONDRO_SPECIES_PROFILE, a.lifeStage, a.sex);
  return requirement
    ? { next: requirement.next as LifeStage, mice: requirement.feederUnits, months: requirement.months }
    : null;
}
function agingCost(a: Snake) {
  return growthCostFor(CHONDRO_SPECIES_PROFILE, a.lifeStage, a.sex);
}

function isGameSave(value: unknown): value is GameSave {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const save = value as Partial<GameSave>;
  return Array.isArray(save.colony) && typeof save.cash === "number" && save.enclosures != null;
}

function normalizeSnake(raw: Snake): Snake {
  const locality = raw.locality as SnakeLocality;
  const named = isNamedLocality(locality);
  const subspecies = raw.subspecies ?? (named ? localitySubspecies[locality] : "Morelia viridis");
  const legacyLocalityAncestry = named && raw.classification === "Pure" ? { [locality]: 100 } : {};
  return {
    ...raw,
    subspecies,
    locality,
    neonateColor: raw.classification === "Pure"
      ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, raw.neonateColor)
      : raw.neonateColor,
    highBlack: Number(raw.highBlack ?? 0),
    highWhite: Number(raw.highWhite ?? 0),
    blueStripe: Number(raw.blueStripe ?? 0),
    yellowRetention: Number(raw.yellowRetention ?? 0),
    blotches: Number(raw.blotches ?? 0),
    geneticsTested: typeof raw.geneticsTested === "boolean" ? raw.geneticsTested : false,
    phenotypeScore:
      typeof raw.phenotypeScore === "number" && raw.phenotypeScore > 0
        ? clamp(raw.phenotypeScore)
        : named && raw.classification === "Pure"
          ? deterministicScore(raw.id)
          : 0,
    localityAncestry:
      raw.localityAncestry && typeof raw.localityAncestry === "object"
        ? raw.localityAncestry
        : legacyLocalityAncestry,
    ancestry: raw.ancestry ?? { [subspecies]: 100 },
    parentIds: Array.isArray(raw.parentIds) ? raw.parentIds : [],
    notes: typeof raw.notes === "string" ? raw.notes : "",
    breederInitials: typeof raw.breederInitials === "string" ? raw.breederInitials : null,
  };
}

function TraitGrid({ animal }: { animal: Snake }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {traitRows.map(([label, key]) => (
        <div key={key} className="rounded-2xl border border-white/[.06] p-3">
          <div className="text-[9px] uppercase tracking-[.1em] text-white/23">{label}</div>
          <div className="mt-2 text-lg font-semibold text-white/62">
            {animal.geneticsTested ? `${animal[key] ?? 0}%` : "?"}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhenotypeBadge({ animal }: { animal: Snake }) {
  const label = phenotypeLabel(animal);
  if (!label) return null;
  return (
    <span className="rounded-full border border-amber-200/15 bg-amber-200/[.04] px-3 py-1 text-[10px] font-bold text-amber-100/70">
      {label}
    </span>
  );
}

function CollapsibleGameSection({
  label,
  detail,
  children,
  defaultOpen = false,
}: {
  label: string;
  detail?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group mt-5"
    >
      <summary className="panel flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 transition hover:border-emerald-300/15 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="text-sm font-bold text-white/75">{label}</div>
          {detail ? <div className="mt-1 text-[10px] text-white/30">{detail}</div> : null}
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[.08] text-lg text-white/45 transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function ChondroBreederGameV3() {
  const [started, setStarted] = useState(false);
  const [cash, setCash] = useState(STARTING_CASH);
  const [colony, setColony] = useState<Snake[]>([]);
  const [tested, setTested] = useState<string[]>([]);
  const [damId, setDamId] = useState("");
  const [sireId, setSireId] = useState("");
  const [clutch, setClutch] = useState<Clutch | null>(null);
  const [clutchHistory, setClutchHistory] = useState<ClutchRecord[]>([]);
  const [holdbacks, setHoldbacks] = useState<string[]>([]);
  const [season, setSeason] = useState(1);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [enclosures, setEnclosures] = useState<Record<EnclosureType, number>>({
    "Chondro Dojo Bin": 0,
    "PVC Arboreal": 0,
  });
  const [purchasedStoreIds, setPurchasedStoreIds] = useState<string[]>([]);
  const [careerReputation, setCareerReputation] = useState(0);
  const [facilityRooms, setFacilityRooms] = useState<FacilityRoomState>({ "starter-room": 1 });
  const [facilityConstruction, setFacilityConstruction] = useState<FacilityConstruction | null>(null);
  const [breedingCycle, setBreedingCycle] = useState<BreedingCycle | null>(null);
  const [geneticTestsPending, setGeneticTestsPending] = useState<GeneticTestJob[]>([]);
  const [femaleRecovery, setFemaleRecovery] = useState<Record<string, number>>({});
  const [seasonCarePaid, setSeasonCarePaid] = useState(0);
  const [breedingMessage, setBreedingMessage] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [collapsedAnimalIds, setCollapsedAnimalIds] = useState<string[]>([]);
  const [playerMarket, setPlayerMarket] = useState<PlayerMarketListing[]>([]);
  const [marketStatus, setMarketStatus] = useState("");
  const [marketBusy, setMarketBusy] = useState<string | null>(null);
  const [breederInitials, setBreederInitials] = useState<string | null>(null);
  const [initialsInput, setInitialsInput] = useState("");
  const [initialsPrompt, setInitialsPrompt] = useState(false);
  const [initialsStatus, setInitialsStatus] = useState("");
  const [selectedSnakeId, setSelectedSnakeId] = useState<string | null>(null);
  const [storeIndex, setStoreIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSave, setCloudSave] = useState(false);
  const [now, setNow] = useState(Date.now());

  const storeEpoch = Math.floor(now / DAY_MS);
  const store = useMemo(() => storeForEpoch(storeEpoch), [storeEpoch]);
  const nextRefresh = (storeEpoch + 1) * DAY_MS;
  const installedEnclosureCount = enclosures["Chondro Dojo Bin"] + enclosures["PVC Arboreal"];
  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms });
  const capacity = installedEnclosureCount;
  const openSlots = Math.max(0, capacity - colony.length);
  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - installedEnclosureCount);
  const females = colony.filter((a) => a.sex === "Female" && a.lifeStage === "Adult" && Number(femaleRecovery[a.id] ?? 0) <= season);
  const males = colony.filter((a) => a.sex === "Male" && a.lifeStage === "Adult");
  const geneticsUnlocked = geneticTestingUnlocked({ careerReputation, facilityRooms });
  const adultCount = colony.filter((a) => a.lifeStage === "Adult").length;
  const seasonCareCost = Math.max(SEASON_CARE_PER_ADULT, adultCount * SEASON_CARE_PER_ADULT);
  const dam = colony.find((a) => a.id === damId) ?? null;
  const sire = colony.find((a) => a.id === sireId) ?? null;
  const saleIncome = sales.reduce((sum, item) => sum + item.value, 0);

  const knownSnakes = useMemo(() => {
    const records = new Map<string, Snake>();
    for (const animal of colony) records.set(animal.id, animal);
    for (const record of clutchHistory) {
      records.set(record.dam.id, record.dam);
      records.set(record.sire.id, record.sire);
      for (const baby of record.offspring) if (!records.has(baby.id)) records.set(baby.id, baby);
    }
    return records;
  }, [colony, clutchHistory]);
  const selectedAnimal = selectedSnakeId ? knownSnakes.get(selectedSnakeId) ?? null : null;
  const selectedParents =
    selectedAnimal?.parentIds
      .map((id) => knownSnakes.get(id))
      .filter((animal): animal is Snake => !!animal) ?? [];
  const selectedOffspring = selectedAnimal
    ? [...knownSnakes.values()].filter((animal) => animal.parentIds.includes(selectedAnimal.id))
    : [];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let local: GameSave | null = null;
      try {
        const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (isGameSave(parsed)) local = parsed;
      } catch {}
      let chosen = local;
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) setCloudSave(true);
          if (isGameSave(data.save?.state)) chosen = data.save.state;
        }
      } catch {}
      if (!cancelled && chosen) {
        setStarted(chosen.started);
        setCash(chosen.cash);
        setColony((chosen.colony ?? []).map(normalizeSnake));
        setTested(chosen.tested ?? []);
        setDamId(chosen.damId ?? "");
        setSireId(chosen.sireId ?? "");
        setClutch(
          chosen.clutch
            ? {
                ...chosen.clutch,
                dam: normalizeSnake(chosen.clutch.dam),
                sire: normalizeSnake(chosen.clutch.sire),
                offspring: chosen.clutch.offspring.map(normalizeSnake),
              }
            : null,
        );
        setClutchHistory(
          (chosen.clutchHistory ?? []).map((record) => ({
            ...record,
            dam: normalizeSnake(record.dam),
            sire: normalizeSnake(record.sire),
            offspring: record.offspring.map(normalizeSnake),
            holdbackIds: record.holdbackIds ?? [],
          })),
        );
        setHoldbacks(chosen.holdbacks ?? []);
        setSeason(chosen.season ?? 1);
        setSales(chosen.sales ?? []);
        setTransfers(chosen.transfers ?? []);
        setEnclosures(chosen.enclosures ?? { "Chondro Dojo Bin": 0, "PVC Arboreal": 0 });
        setPurchasedStoreIds(chosen.purchasedStoreIds ?? []);
        setCareerReputation(Number(chosen.careerReputation ?? 0));
        setFacilityRooms(chosen.facilityRooms ?? { "starter-room": 1 });
        setFacilityConstruction(chosen.facilityConstruction ?? null);
        setBreedingCycle(chosen.breedingCycle ?? null);
        setGeneticTestsPending(chosen.geneticTestsPending ?? []);
        setFemaleRecovery(chosen.femaleRecovery ?? {});
        setSeasonCarePaid(Number(chosen.seasonCarePaid ?? 0));
        setBreedingMessage(chosen.breedingMessage ?? "");
      }
      if (!cancelled) setHydrated(true);
    }
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const save: GameSave = {
      started,
      cash,
      colony,
      tested,
      damId,
      sireId,
      clutch,
      clutchHistory,
      holdbacks,
      season,
      sales,
      transfers,
      enclosures,
      purchasedStoreIds,
      careerReputation,
      facilityRooms,
      facilityConstruction,
      breedingCycle,
      geneticTestsPending,
      femaleRecovery,
      seasonCarePaid,
      breedingMessage,
    };
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(save));
      } catch {}
      if (cloudSave)
        void fetch("/api/hatchery/chondro-breeder/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(save),
        });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [hydrated, cloudSave, started, cash, colony, tested, damId, sireId, clutch, clutchHistory, holdbacks, season, sales, transfers, enclosures, purchasedStoreIds, careerReputation, facilityRooms, facilityConstruction, breedingCycle, geneticTestsPending, femaleRecovery, seasonCarePaid, breedingMessage]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    async function loadMarket() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/player-market", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled) {
          setPlayerMarket(
            (data.listings ?? []).map((listing: PlayerMarketListing) => ({
              ...listing,
              snake: normalizeSnake(listing.snake),
            })),
          );
          if (response.status === 401) setMarketStatus("Sign in to buy or sell snakes with other players.");
        }
      } catch {
        if (!cancelled) setMarketStatus("The player market is temporarily unavailable.");
      }
    }
    void loadMarket();
    const timer = window.setInterval(loadMarket, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    async function loadBreederIdentity() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/breeder-identity", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) setBreederInitials(data.initials ?? null);
      } catch {}
    }
    void loadBreederIdentity();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    async function loadFavorites() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/favorites", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok && Array.isArray(data.favoriteIds)) setFavoriteIds(data.favoriteIds.map((item: unknown) => String(item)));
      } catch {}
    }
    void loadFavorites();
    return () => { cancelled = true; };
  }, [hydrated]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hydrated) return;
    if (facilityConstruction && facilityConstruction.completesAt <= now) {
      const room = ROOM_EXPANSIONS.find((item) => item.id === facilityConstruction.roomId);
      if (room) {
        setFacilityRooms((current) => ({ ...current, [room.id]: Number(current[room.id] ?? 0) + 1 }));
        setBreedingMessage(`${room.name} is ready.`);
      }
      setFacilityConstruction(null);
      return;
    }
    const readyTests = geneticTestsPending.filter((job) => job.completesAt <= now);
    if (readyTests.length) {
      const readyIds = new Set(readyTests.map((job) => job.snakeId));
      setColony((current) => current.map((animal) => readyIds.has(animal.id) ? { ...animal, geneticsTested: true } : animal));
      setGeneticTestsPending((current) => current.filter((job) => !readyIds.has(job.snakeId)));
      setBreedingMessage(`${readyTests.length} genetic test${readyTests.length === 1 ? " is" : "s are"} ready.`);
      return;
    }
    if (!breedingCycle || breedingCycle.completesAt > now) return;
    const cycleDam = colony.find((animal) => animal.id === breedingCycle.damId);
    const cycleSire = colony.find((animal) => animal.id === breedingCycle.sireId);
    if (!cycleDam || !cycleSire) {
      setBreedingCycle(null);
      setBreedingMessage("Breeding cycle cancelled because one selected animal is no longer in the colony.");
      return;
    }
    if (breedingCycle.stage === "pairing") {
      if (Math.random() > pairingChance(cycleDam, cycleSire)) {
        setBreedingCycle(null);
        setBreedingMessage(pairingFailureReason(cycleDam, cycleSire));
        return;
      }
      const positiveIds = [cycleDam, cycleSire].filter((animal) => animal.nidoStatus === "Positive").filter(() => Math.random() < 0.60).map((animal) => animal.id);
      if (positiveIds.length) {
        const names = colony.filter((animal) => positiveIds.includes(animal.id)).map((animal) => animal.name);
        setColony((current) => current.filter((animal) => !positiveIds.includes(animal.id)));
        if (positiveIds.includes(damId)) setDamId("");
        if (positiveIds.includes(sireId)) setSireId("");
        setBreedingCycle(null);
        setBreedingMessage(`${names.join(" and ")} ${names.length === 1 ? "was" : "were"} lost following the high-risk Nido-positive breeding attempt.`);
        return;
      }
      if (cycleDam.nidoStatus === "Positive" && cycleSire.nidoStatus !== "Positive" && Math.random() < 0.40) {
        setColony((current) => current.map((animal) => animal.id === cycleSire.id ? { ...animal, nidoStatus: "Positive" } : animal));
        setBreedingMessage(`${cycleSire.name} became Nido Positive after exposure during breeding.`);
      } else if (cycleSire.nidoStatus === "Positive" && cycleDam.nidoStatus !== "Positive" && Math.random() < 0.40) {
        setColony((current) => current.map((animal) => animal.id === cycleDam.id ? { ...animal, nidoStatus: "Positive" } : animal));
        setBreedingMessage(`${cycleDam.name} became Nido Positive after exposure during breeding.`);
      }
    }
    if (breedingCycle.stage === "hatch-day") {
      if (!breederInitials) {
        setBreedingCycle(null);
        setInitialsPrompt(true);
        setBreedingMessage("Choose breeder initials before the clutch can be recorded.");
        return;
      }
      setClutch(createClutch(cycleDam, cycleSire, breederInitials));
      setHoldbacks([]);
      setBreedingCycle(null);
      setBreedingMessage("Hatch Day complete. Your clutch is ready for review.");
      return;
    }
    const stageIndex = BREEDING_STAGES.findIndex((stage) => stage.id === breedingCycle.stage);
    const nextStage = BREEDING_STAGES[stageIndex + 1];
    if (nextStage) {
      setBreedingCycle({ ...breedingCycle, stage: nextStage.id, completesAt: Date.now() + nextStage.hours * 3_600_000 });
      setBreedingMessage(`${nextStage.label} started.`);
    }
  }, [hydrated, now, facilityConstruction, geneticTestsPending, breedingCycle, colony, breederInitials, damId, sireId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function buyEnclosure(type: EnclosureType) {
    const price = enclosurePrices[type];
    if (cash < price || roomEnclosureSlots <= 0) return;
    setCash((value) => value - price);
    setEnclosures((current) => ({ ...current, [type]: current[type] + 1 }));
  }

  function buySnake(offer: StoreSnake) {
    if (cash < offer.price || openSlots <= 0 || purchasedStoreIds.includes(offer.id)) return;
    setCash((value) => value - offer.price);
    setColony((current) => [...current, normalizeSnake(offer)]);
    setPurchasedStoreIds((current) => [...current, offer.id]);
  }

  function geneticTest(id: string) {
    if (!geneticsUnlocked || cash < GENETIC_TEST_COST) return;
    const animal = colony.find((a) => a.id === id);
    if (!animal || animal.geneticsTested || geneticTestsPending.some((job) => job.snakeId === id)) return;
    setCash((value) => value - GENETIC_TEST_COST);
    setGeneticTestsPending((current) => [...current, { snakeId: id, completesAt: Date.now() + GENETIC_TEST_HOURS * 3_600_000 }]);
    setBreedingMessage(`${animal.name}'s genetic panel was submitted. Results in ${GENETIC_TEST_HOURS} hours.`);
  }

  async function toggleFavorite(id: string) {
    const favorite = !favoriteIds.includes(id);
    setFavoriteIds((current) => favorite ? [...current, id] : current.filter((item) => item !== id));
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snakeId: id, favorite }),
      });
      if (!response.ok) throw new Error("favorite failed");
      const data = await response.json();
      if (Array.isArray(data.favoriteIds)) setFavoriteIds(data.favoriteIds.map((item: unknown) => String(item)));
    } catch {
      setFavoriteIds((current) => favorite ? current.filter((item) => item !== id) : [...current, id]);
    }
  }

  function toggleAnimalDetails(id: string) {
    setCollapsedAnimalIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function nidoTest(id: string) {
    if (tested.includes(id) || cash < NIDO_TEST_COST) return;
    setCash((value) => value - NIDO_TEST_COST);
    setTested((current) => [...current, id]);
    setColony((current) =>
      current.map((a) =>
        a.id !== id
          ? a
          : {
              ...a,
              nidoStatus:
                Math.random() < (a.source === "Import" ? 0.12 : 0.018)
                  ? "Positive"
                  : "Negative",
            },
      ),
    );
  }

  function ageSnake(a: Snake) {
    const req = agingRequirement(a);
    const cost = agingCost(a);
    if (!req || cash < cost) return;
    setCash((value) => value - cost);
    setColony((current) =>
      current.map((item) =>
        item.id === a.id
          ? { ...item, lifeStage: req.next, condition: item.condition === "Fair" ? "Good" : item.condition }
          : item,
      ),
    );
  }

  function updateSnakeDetails(id: string, field: "name" | "notes", value: string) {
    const limit = field === "name" ? 60 : 1000;
    setColony((current) =>
      current.map((a) => (a.id === id ? { ...a, [field]: value.slice(0, limit) } : a)),
    );
  }

  async function refreshPlayerMarket() {
    const response = await fetch("/api/hatchery/chondro-breeder/player-market", { cache: "no-store" });
    const data = await response.json();
    if (response.ok)
      setPlayerMarket(
        (data.listings ?? []).map((listing: PlayerMarketListing) => ({ ...listing, snake: normalizeSnake(listing.snake) })),
      );
  }

  async function sellSnake(a: Snake) {
    if (a.nidoStatus === "Positive" || marketBusy) return;
    const value = saleValue(a, season);
    setMarketBusy(a.id);
    setMarketStatus("");
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/player-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", snakeId: a.id, price: value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMarketStatus(data.error ?? "This snake could not be listed.");
        return;
      }
      setColony((current) => current.filter((item) => item.id !== a.id));
      if (damId === a.id) setDamId("");
      if (sireId === a.id) setSireId("");
      setMarketStatus(`${a.name} is listed for ${money(value)}. You will be paid after another player buys it.`);
      void refreshPlayerMarket();
    } catch {
      setMarketStatus("The player market is temporarily unavailable.");
    } finally {
      setMarketBusy(null);
    }
  }

  async function buyPlayerSnake(listing: PlayerMarketListing) {
    if (marketBusy || cash < listing.price || openSlots <= 0) return;
    setMarketBusy(listing.id);
    setMarketStatus("");
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/player-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy", listingId: listing.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMarketStatus(data.error ?? "This snake is no longer available.");
        void refreshPlayerMarket();
        return;
      }
      setCash((value) => value - listing.price);
      setColony((current) => [...current, normalizeSnake(data.result.snake)]);
      setPlayerMarket((current) => current.filter((item) => item.id !== listing.id));
      setMarketStatus(`${listing.snake.name} joined your colony.`);
    } finally {
      setMarketBusy(null);
    }
  }

  function transferPositive(a: Snake) {
    if (a.nidoStatus !== "Positive") return;
    setTransfers((current) => [{ id: a.id, name: a.name, season }, ...current]);
    setColony((current) => current.filter((item) => item.id !== a.id));
    if (damId === a.id) setDamId("");
    if (sireId === a.id) setSireId("");
  }

  function startBreedingCycle() {
    if (!dam || !sire || clutch || breedingCycle) return;
    if (seasonCarePaid !== season) {
      setBreedingMessage("Provide this season's food and care before starting a breeding cycle.");
      return;
    }
    const recoverySeason = Number(femaleRecovery[dam.id] ?? 0);
    if (recoverySeason > season) {
      setBreedingMessage(`${dam.name} needs another full year of recovery before breeding again.`);
      return;
    }
    if ((dam.nidoStatus === "Positive" || sire.nidoStatus === "Positive") && !window.confirm("HIGH RISK PAIRING: A Nido Positive animal has a 60% chance of dying when bred and may infect its partner. Continue?")) return;
    const first = BREEDING_STAGES[0];
    const start = Date.now();
    setBreedingCycle({ damId: dam.id, sireId: sire.id, stage: first.id, startedAt: start, completesAt: start + first.hours * 3_600_000 });
    setBreedingMessage("Cycling started. Progress continues while you are offline.");
  }

  function breedSelected() {
    if (!dam || !sire) return;
    if (!breederInitials) {
      setInitialsPrompt(true);
      setInitialsStatus("");
      return;
    }
    startBreedingCycle();
  }

  function paySeasonCare() {
    if (seasonCarePaid === season || cash < seasonCareCost) return;
    setCash((value) => value - seasonCareCost);
    setSeasonCarePaid(season);
    setBreedingMessage(`Season ${season} food and care provided for ${money(seasonCareCost)}.`);
  }

  async function claimBreederInitials() {
    const initials = initialsInput.trim().toUpperCase();
    if (!/^[A-Z]{2,5}$/.test(initials)) {
      setInitialsStatus("Choose 2–5 letters.");
      return;
    }
    setInitialsStatus("Checking availability…");
    const response = await fetch("/api/hatchery/chondro-breeder/breeder-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initials }),
    });
    const data = await response.json();
    if (!response.ok) {
      setInitialsStatus(data.error ?? "Those initials could not be claimed.");
      return;
    }
    setBreederInitials(data.initials);
    setInitialsPrompt(false);
    setInitialsStatus("");
    window.setTimeout(() => startBreedingCycle(), 0);
  }

  function toggleHoldback(id: string) {
    setHoldbacks((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < openSlots
          ? [...current, id]
          : current,
    );
  }

  async function finishClutch() {
    if (!clutch || marketBusy) return;
    const kept = clutch.offspring.filter((baby) => holdbacks.includes(baby.id));
    const sold = clutch.offspring.filter((baby) => !holdbacks.includes(baby.id));
    const saleItems = sold.map((baby) => ({ snakeId: baby.id, price: saleValue(baby, season) }));
    const total = saleItems.reduce((sum, item) => sum + item.price, 0);
    if (sold.length) {
      setMarketBusy("clutch");
      setMarketStatus(`Listing ${sold.length} unheld offspring…`);
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/player-market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list-clutch", clutch, holdbackIds: holdbacks, saleItems }),
        });
        const data = await response.json();
        if (!response.ok) {
          setMarketStatus(data.error ?? "The clutch could not be listed. Nothing was changed.");
          return;
        }
      } catch {
        setMarketStatus("The clutch could not be listed. Nothing was changed.");
        return;
      } finally {
        setMarketBusy(null);
      }
    }
    setColony((current) => [...current, ...kept]);
    setClutchHistory((current) => [{ ...clutch, season, holdbackIds: [...holdbacks] }, ...current]);
    const clutchReputation = Math.min(
      250,
      clutch.offspring.reduce((sum, baby) => sum + breedingReputationGain(baby), 0),
    );
    setCareerReputation((current) => current + clutchReputation);
    const needsExtraRecovery = needsExtraRecoveryYear(
      CHONDRO_SPECIES_PROFILE,
      clutch.dam.condition,
      clutch.offspring.length,
    );
    const nextEligibleSeason = needsExtraRecovery ? season + 2 : season + 1;
    setFemaleRecovery((current) => ({ ...current, [clutch.dam.id]: nextEligibleSeason }));
    setBreedingMessage(
      needsExtraRecovery
        ? `${clutch.dam.name} needs an additional recovery year after this ${clutch.offspring.length}-egg clutch. +${clutchReputation} breeder reputation.`
        : `${clutch.dam.name} recovered in time for next season. +${clutchReputation} breeder reputation.`,
    );
    setClutch(null);
    setHoldbacks([]);
    setDamId("");
    setSireId("");
    setSeasonCarePaid(0);
    setSeason((current) => current + 1);
    if (sold.length) {
      setMarketStatus(`${sold.length} unheld offspring listed at ${money(total)} combined asking price. Proceeds become claimable after buyers purchase them.`);
      void refreshPlayerMarket();
    }
  }

  function resetGame() {
    if (!window.confirm("Reset Chondro Breeder and erase this save?")) return;
    setStarted(false);
    setCash(STARTING_CASH);
    setColony([]);
    setTested([]);
    setDamId("");
    setSireId("");
    setClutch(null);
    setClutchHistory([]);
    setHoldbacks([]);
    setSeason(1);
    setSales([]);
    setTransfers([]);
    setEnclosures({ "Chondro Dojo Bin": 0, "PVC Arboreal": 0 });
    setPurchasedStoreIds([]);
    setCareerReputation(0);
    setFacilityRooms({ "starter-room": 1 });
    setFacilityConstruction(null);
    setBreedingCycle(null);
    setGeneticTestsPending([]);
    setFemaleRecovery({});
    setSeasonCarePaid(0);
    setBreedingMessage("");
    setFavoriteIds([]);
    setCollapsedAnimalIds([]);
    setSelectedSnakeId(null);
    try {
      window.localStorage.removeItem(LOCAL_SAVE_KEY);
    } catch {}
  }

  if (!hydrated)
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
        <div className="panel rounded-[30px] p-8 text-center text-sm text-white/45">Loading your Chondro Breeder save…</div>
      </div>
    );

  if (!started)
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
        <section className="panel rounded-[32px] p-7 sm:p-10">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200/55">Start Your Dream Sweepstakes</div>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">You won {money(STARTING_CASH)}.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/45">
            Build a trait program, a pure locality program, or both. Most snakes now begin with little or no expression, high percentages are genuinely rare, and each subspecies has traits it is naturally more likely to express.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[.06] p-4 text-sm text-white/40">
              <div className="font-semibold text-emerald-100/65">Trait breeder</div>
              <div className="mt-1 text-xs leading-5">Breed by appearance for free, or pay for optional genetic testing to reveal exact trait percentages.</div>
            </div>
            <div className="rounded-2xl border border-white/[.06] p-4 text-sm text-white/40">
              <div className="font-semibold text-amber-100/65">Locality breeder</div>
              <div className="mt-1 text-xs leading-5">Keep named-locality lines pure and chase phenotype grades such as A+ Jayapura phenotype.</div>
            </div>
          </div>
          <div className="mt-5 text-xs text-white/32">Progress autosaves to this browser{cloudSave ? " and your Arboreal Planet account" : ""}.</div>
          <button onClick={() => setStarted(true)} className="mt-8 rounded-2xl bg-amber-200 px-6 py-3 text-sm font-black text-[#17130a]">Start with $30K</button>
        </section>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">Chondro Breeder · Season {season}</div>
          <h1 className="mt-2 text-3xl font-semibold">Build your program</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/34">Breed by eye, reveal exact genetics when it matters, or build a documented pure-locality line over generations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
            <div className="text-[9px] uppercase tracking-[.14em] text-white/24">Cash</div>
            <div className="mt-1 font-semibold text-emerald-200/75">{money(cash)}</div>
          </div>
          <div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
            <div className="text-[9px] uppercase tracking-[.14em] text-white/24">Capacity</div>
            <div className="mt-1 font-semibold text-white/65">{colony.length}/{capacity}</div>
          </div>
          <button onClick={resetGame} className="rounded-2xl border border-red-300/15 px-4 py-3 text-xs font-bold text-red-100/55">Reset game</button>
        </div>
      </div>

      {(breedingCycle || geneticTestsPending.length || facilityConstruction) ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-4">
          <div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/45">Operations Queue</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {breedingCycle ? <div className="rounded-xl border border-amber-200/10 p-3"><div className="text-xs font-bold text-amber-100/65">{BREEDING_STAGES.find((stage) => stage.id === breedingCycle.stage)?.label}</div><div className="mt-1 text-[10px] text-white/35">{colony.find((animal) => animal.id === breedingCycle.damId)?.name ?? breedingCycle.damId} × {colony.find((animal) => animal.id === breedingCycle.sireId)?.name ?? breedingCycle.sireId} · {remainingTime(breedingCycle.completesAt - now)}</div></div> : null}
            {geneticTestsPending.map((job) => <div key={job.snakeId} className="rounded-xl border border-sky-300/10 p-3"><div className="text-xs font-bold text-sky-100/65">Genetic Test</div><div className="mt-1 text-[10px] text-white/35">{colony.find((animal) => animal.id === job.snakeId)?.name ?? job.snakeId} · {remainingTime(job.completesAt - now)}</div></div>)}
            {facilityConstruction ? <div className="rounded-xl border border-emerald-300/10 p-3"><div className="text-xs font-bold text-emerald-100/65">Construction</div><div className="mt-1 text-[10px] text-white/35">{ROOM_EXPANSIONS.find((room) => room.id === facilityConstruction.roomId)?.name ?? facilityConstruction.roomId} · {remainingTime(facilityConstruction.completesAt - now)}</div></div> : null}
          </div>
        </div>
      ) : null}

      <CollapsibleGameSection label="Genetics & locality guide" detail="Subspecies tendencies · testing · phenotype grades" defaultOpen>
        <section className="panel rounded-[28px] p-6">
          <div className="section-kicker">How the new genetics work</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(preferredTraits).map(([subspecies, traits]) => (
              <div key={subspecies} className="rounded-2xl border border-white/[.06] p-4">
                <div className="text-sm font-semibold text-white/70">{subspecies}</div>
                <div className="mt-2 text-xs leading-5 text-white/35">Higher natural odds: {traits.map((key) => traitRows.find((row) => row[1] === key)?.[0]).join(" + ")}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-4 text-xs leading-5 text-white/40"><strong className="text-emerald-100/65">Most animals are ordinary.</strong><br />Zeros and single-digit traits are common. 76–100% rolls are rare even in a favored trait.</div>
            <div className="rounded-2xl border border-sky-300/10 bg-sky-300/[.025] p-4 text-xs leading-5 text-white/40"><strong className="text-sky-100/65">Genetic testing unlocks later.</strong><br />Reach 1,500 breeder reputation or build the Research & Conservation Wing. Once unlocked, a panel costs {money(GENETIC_TEST_COST)} and takes {GENETIC_TEST_HOURS} real hours.</div>
            <div className="rounded-2xl border border-amber-200/10 bg-amber-200/[.025] p-4 text-xs leading-5 text-white/40"><strong className="text-amber-100/65">Pure locality is its own chase.</strong><br />Same-locality pure pairings preserve a named phenotype grade. Mixing localities creates a Pure · Mixed Locality animal with no named-locality grade.</div>
          </div>
        </section>
      </CollapsibleGameSection>

      <CollapsibleGameSection label="Enclosures" detail={`${capacity} installed · ${physicalRoomCapacity} room limit · ${openSlots} animal spaces open`}>
        <section className="panel rounded-[28px] p-6">
          <div className="section-kicker">Enclosures</div>
          <h2 className="mt-2 text-2xl font-semibold">Rooms set the limit. Enclosures fill the rooms.</h2>
          <p className="mt-2 text-xs text-white/34">Your rooms can physically hold {physicalRoomCapacity} enclosures. You have {roomEnclosureSlots} installation slot{roomEnclosureSlots === 1 ? "" : "s"} left.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(Object.keys(enclosurePrices) as EnclosureType[]).map((type) => (
              <div key={type} className="rounded-2xl border border-white/[.06] p-4">
                <div className="text-lg font-semibold">{type}</div>
                <div className="mt-1 text-xs text-white/35">1 snake capacity · Owned: {enclosures[type]}</div>
                <button disabled={cash < enclosurePrices[type] || roomEnclosureSlots <= 0} onClick={() => buyEnclosure(type)} className="mt-4 rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black text-[#06100c] disabled:opacity-30">{roomEnclosureSlots <= 0 ? "Need another room" : `Buy · ${money(enclosurePrices[type])}`}</button>
              </div>
            ))}
          </div>
        </section>
      </CollapsibleGameSection>

      <CollapsibleGameSection label="Daily snake store" detail={`Offer ${storeIndex + 1} of ${store.length} · refreshes in ~${Math.max(1, Math.ceil((nextRefresh - now) / 3_600_000))}h`} defaultOpen>
        <section className="panel rounded-[28px] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="section-kicker">Daily snake store</div>
              <h2 className="mt-2 text-2xl font-semibold">Most are ordinary. The special ones matter.</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/34">Buy by eye, phenotype grade, or tested genetics. The market no longer hands out high-expression animals constantly.</p>
            </div>
            <div className="text-xs text-white/30">Refreshes in ~{Math.max(1, Math.ceil((nextRefresh - now) / 3_600_000))}h</div>
          </div>
          <div className="mx-auto mt-6 max-w-2xl">
            {(() => {
              const offer = store[storeIndex];
              const sold = purchasedStoreIds.includes(offer.id);
              return (
                <article className="rounded-3xl border border-white/[.06] bg-white/[.015] p-4">
                  <ChondroSnakeIcon subspecies={offer.subspecies} name={offer.name} traits={portraitTraits(offer)} compact />
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white/75">{offer.name}</div>
                      <div className="mt-1 text-[10px] text-white/30">{offer.sex} · {offer.source} · {offer.lifeStage} · {offer.locality}</div>
                      <div className="mt-1 text-[10px] font-semibold text-amber-100/55">Neonate color: {offer.neonateColor}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PhenotypeBadge animal={offer} />
                      <span className="rounded-full border border-white/[.08] px-2 py-1 text-[9px] uppercase text-white/40">{offer.classification}</span>
                    </div>
                  </div>
                  <div className={`mt-3 rounded-xl border p-3 text-xs ${offer.geneticsTested ? "border-emerald-300/10 bg-emerald-300/[.025] text-emerald-100/60" : "border-white/[.06] text-white/34"}`}>{traitSummary(offer)}</div>
                  <div className="mt-2 text-[10px] text-white/34">Nido: <span className={offer.pretested ? "text-emerald-200/70" : "text-white/45"}>{offer.pretested ? "Pretested negative" : "Untested"}</span></div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-lg font-semibold text-emerald-200/75">{money(offer.price)}</div>
                    <button disabled={sold || cash < offer.price || openSlots <= 0} onClick={() => buySnake(offer)} className="rounded-xl bg-amber-200 px-4 py-2 text-xs font-black text-[#17130a] disabled:opacity-30">{sold ? "Purchased" : openSlots <= 0 ? "Need enclosure" : cash < offer.price ? "Not enough cash" : "Buy"}</button>
                  </div>
                </article>
              );
            })()}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStoreIndex((current) => (current - 1 + store.length) % store.length)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">← Previous</button>
              <div className="flex gap-1.5">{store.map((offer, index) => <button key={offer.id} type="button" aria-label={`Show offer ${index + 1}`} onClick={() => setStoreIndex(index)} className={`h-2 rounded-full transition ${index === storeIndex ? "w-6 bg-amber-200/75" : "w-2 bg-white/15"}`} />)}</div>
              <button type="button" onClick={() => setStoreIndex((current) => (current + 1) % store.length)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">Next →</button>
            </div>
          </div>
        </section>
      </CollapsibleGameSection>

      <CollapsibleGameSection label="Breeding room" detail={`${females.length} adult female${females.length === 1 ? "" : "s"} · ${males.length} adult male${males.length === 1 ? "" : "s"}`} defaultOpen>
        <section className="panel rounded-[28px] p-6">
          <div className="section-kicker">Breeding room</div>
          <h2 className="mt-2 text-2xl font-semibold">Select the direction of your line.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-bold text-white/38">Female</span>
              <select value={damId} onChange={(event) => setDamId(event.target.value)} className="w-full rounded-2xl border border-white/[.08] bg-black/30 px-4 py-3 text-sm">
                <option value="">Choose adult female</option>
                {females.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.locality}{a.geneticsTested ? " · tested" : ""}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-white/38">Male</span>
              <select value={sireId} onChange={(event) => setSireId(event.target.value)} className="w-full rounded-2xl border border-white/[.08] bg-black/30 px-4 py-3 text-sm">
                <option value="">Choose adult male</option>
                {males.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.locality}{a.geneticsTested ? " · tested" : ""}</option>)}
              </select>
            </label>
          </div>
          {dam && sire ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[.06] p-4 text-xs text-white/42">Projected classification: <span className="font-semibold text-amber-100/65">{classifyPair(dam, sire)}</span><br /><span className="mt-1 block text-white/30">{classifyPair(dam, sire) === "Pure" && dam.locality === sire.locality && isNamedLocality(dam.locality) ? `Named-locality line preserved: ${dam.locality}` : classifyPair(dam, sire) === "Pure" ? "Subspecies stays pure, but this becomes a Mixed Locality line." : "This pairing will not receive a pure-locality phenotype grade."}</span></div>
              <div className="rounded-2xl border border-white/[.06] p-4 text-xs text-white/42">Selected genetics: <span className="font-semibold text-emerald-100/60">{dam.geneticsTested && sire.geneticsTested ? "Both parents tested" : dam.geneticsTested || sire.geneticsTested ? "One parent tested" : "Both parents untested"}</span><br /><span className="mt-1 block text-white/30">Testing is not required to breed. You can select entirely by appearance.</span></div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {seasonCarePaid === season ? <span className="rounded-full border border-emerald-300/15 px-3 py-2 text-[10px] font-bold text-emerald-100/60">Season {season} care paid</span> : <button disabled={cash < seasonCareCost} onClick={paySeasonCare} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-2 text-xs font-bold text-emerald-100/65 disabled:opacity-30">Food & care · {money(seasonCareCost)}</button>}
            {breedingCycle ? <span className="rounded-full border border-amber-200/15 px-3 py-2 text-[10px] font-black text-amber-100/70">{BREEDING_STAGES.find((stage) => stage.id === breedingCycle.stage)?.label} · {remainingTime(breedingCycle.completesAt - now)}</span> : null}
          </div>
          {breedingMessage ? <div role="status" className="mt-3 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{breedingMessage}</div> : null}
          <button disabled={!dam || !sire || !!clutch || !!breedingCycle || seasonCarePaid !== season} onClick={breedSelected} className="mt-5 rounded-2xl bg-amber-200 px-6 py-3 text-sm font-black text-[#17130a] disabled:opacity-30">{breedingCycle ? "Breeding cycle in progress" : "Start breeding cycle"}</button>
        </section>
      </CollapsibleGameSection>

      {clutch ? (
        <CollapsibleGameSection label={`Active clutch · ${clutch.id}`} detail={`${clutch.offspring.length} offspring · ${holdbacks.length} holdback${holdbacks.length === 1 ? "" : "s"} selected`} defaultOpen>
          <section className="panel rounded-[28px] p-6">
            <div className="section-kicker">{clutch.id}</div>
            <h2 className="mt-2 text-2xl font-semibold">Clutch hatched · {clutch.offspring.length} offspring</h2>
            <p className="mt-2 text-sm text-white/34">Choose holdbacks by what you can see, locality grade, or test them later after holding them back. Exact percentages are intentionally hidden at hatch unless an animal is genetically tested.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clutch.offspring.map((baby) => {
                const kept = holdbacks.includes(baby.id);
                return (
                  <button key={baby.id} onClick={() => toggleHoldback(baby.id)} className={`rounded-3xl border p-4 text-left ${kept ? "border-amber-200/35 bg-amber-200/[.05]" : "border-white/[.06] bg-white/[.015]"}`}>
                    <ChondroSnakeIcon subspecies={baby.subspecies} name={baby.name} traits={portraitTraits(baby)} compact />
                    <div className="mt-3 flex flex-wrap items-center gap-2"><span className="font-semibold text-white/75">{baby.name}</span><PhenotypeBadge animal={baby} /></div>
                    <div className="mt-1 text-[10px] text-white/30">{baby.sex} · Hatchling · {baby.classification} · {baby.locality}</div>
                    <div className="mt-3 text-[10px] text-white/35">Genetics untested · percentages hidden</div>
                    <div className="mt-3 text-[10px] font-bold uppercase tracking-[.12em] text-amber-100/50">{kept ? "Holdback selected" : `Will list · ${money(saleValue(baby, season))}`}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-white/38">{holdbacks.length} held back · {clutch.offspring.length - holdbacks.length} going to market</div>
              <button disabled={!!marketBusy} onClick={() => void finishClutch()} className="rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black text-[#06100c] disabled:opacity-40">{marketBusy === "clutch" ? "Listing offspring…" : "List unheld & advance season"}</button>
            </div>
          </section>
        </CollapsibleGameSection>
      ) : null}

      <CollapsibleGameSection label="Your colony" detail={`${colony.length} animal${colony.length === 1 ? "" : "s"} · ${openSlots} open enclosure${openSlots === 1 ? "" : "s"}`} defaultOpen>
        <section>
          <div className="section-kicker">Your colony</div>
          <h2 className="mt-2 text-2xl font-semibold">Animals and project material</h2>
          <p className="mt-2 text-sm text-white/32">Phenotype grades stay visible by eye. Exact trait percentages require the genetic-testing unlock, {money(GENETIC_TEST_COST)}, and a {GENETIC_TEST_HOURS}-hour lab timer.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {colony.map((animal) => {
              const req = agingRequirement(animal);
              const growCost = agingCost(animal);
              const sell = saleValue(animal, season);
              const collapsed = collapsedAnimalIds.includes(animal.id);
              const favorite = favoriteIds.includes(animal.id);
              const pendingTest = geneticTestsPending.find((job) => job.snakeId === animal.id);
              const recoverySeason = Number(femaleRecovery[animal.id] ?? 0);
              return (
                <article key={animal.id} className="panel rounded-[28px] p-5">
                  <ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} traits={portraitTraits(animal)} />
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-semibold">{animal.name || "Unnamed snake"}</div>
                      <div className="mt-1 text-xs text-white/30">{animal.id} · {animal.sex} · {animal.classification} · Gen {animal.generation}</div>
                    </div>
                    <div className="flex flex-wrap gap-2"><PhenotypeBadge animal={animal} /><span className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] uppercase text-white/45">{animal.lifeStage}</span><button type="button" onClick={() => void toggleFavorite(animal.id)} className={`rounded-full border px-3 py-1 text-[10px] font-black ${favorite ? "border-amber-200/30 bg-amber-200/[.07] text-amber-100" : "border-white/[.08] text-white/45"}`}>{favorite ? "★ Favorite" : "☆ Favorite"}</button><button type="button" onClick={() => toggleAnimalDetails(animal.id)} className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-bold text-white/45">{collapsed ? "Show details" : "Hide details"}</button></div>
                  </div>
                  {!collapsed ? <>
                  <div className="mt-3 text-xs text-white/35">{animal.subspecies} · {animal.locality}{isNamedLocality(animal.locality) ? ` · ${localityPurity(animal)}% locality pedigree` : ""}</div>
                  <div className="mt-1 text-xs font-semibold text-amber-100/55">Neonate color: {animal.neonateColor}</div>
                  <div className="mt-4"><TraitGrid animal={animal} /></div>
                  {!animal.geneticsTested ? <div className="mt-3 rounded-xl border border-sky-300/10 bg-sky-300/[.025] p-3 text-xs text-sky-100/55">Exact percentages are hidden. You can keep breeding by appearance, or test this animal when the numbers matter.</div> : null}
                  <div className="mt-4 grid gap-3 rounded-2xl border border-white/[.06] bg-black/10 p-4">
                    <label className="text-[10px] font-bold uppercase tracking-[.12em] text-white/35">Snake name<input value={animal.name} onChange={(event) => updateSnakeDetails(animal.id, "name", event.target.value)} maxLength={60} className="mt-2 h-11 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 text-sm font-medium normal-case tracking-normal text-white/75 outline-none" /></label>
                    <label className="text-[10px] font-bold uppercase tracking-[.12em] text-white/35">Private notes<textarea value={animal.notes} onChange={(event) => updateSnakeDetails(animal.id, "notes", event.target.value)} maxLength={1000} placeholder="Lineage plans, phenotype notes, pairing ideas…" className="mt-2 min-h-20 w-full resize-y rounded-xl border border-white/[.08] bg-black/25 p-3 text-sm font-normal normal-case leading-6 tracking-normal text-white/65 outline-none" /></label>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/[.05] p-3 text-xs text-white/38">
                    Nido: <span className={animal.nidoStatus === "Positive" ? "font-semibold text-red-200/75" : animal.nidoStatus === "Negative" ? "font-semibold text-emerald-200/70" : "text-white/45"}>{animal.nidoStatus}</span>
                    {req ? <div className="mt-2">Next stage: {req.next} · {req.mice} mice · {req.months} months · Total care/food {money(growCost)}</div> : <div className="mt-2 text-emerald-200/60">Adult · breeding eligible</div>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!animal.geneticsTested ? pendingTest ? <span className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-2 text-xs font-bold text-sky-100/65">Testing · {remainingTime(pendingTest.completesAt - now)}</span> : <button disabled={!geneticsUnlocked || cash < GENETIC_TEST_COST} onClick={() => geneticTest(animal.id)} className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-2 text-xs font-bold text-sky-100/65 disabled:opacity-30">{!geneticsUnlocked ? "Genetic testing locked" : `Genetic test · ${money(GENETIC_TEST_COST)}`}</button> : <span className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.03] px-4 py-2 text-xs font-bold text-emerald-100/55">Genetics tested</span>}
                    {animal.nidoStatus === "Unknown" ? <button disabled={cash < NIDO_TEST_COST} onClick={() => nidoTest(animal.id)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55 disabled:opacity-30">Nido test · {money(NIDO_TEST_COST)}</button> : null}
                    {req ? <button disabled={cash < growCost} onClick={() => ageSnake(animal)} className="rounded-xl border border-amber-200/15 bg-amber-200/[.04] px-4 py-2 text-xs font-bold text-amber-100/65 disabled:opacity-30">Raise to {req.next} · {money(growCost)}</button> : null}
                    <button onClick={() => setSelectedSnakeId(animal.id)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">Pedigree</button>
                    {animal.sex === "Female" && recoverySeason > season ? <span className="rounded-xl border border-amber-200/10 px-4 py-2 text-xs font-bold text-amber-100/55">Recovering · eligible season {recoverySeason}</span> : null}
                    {animal.nidoStatus === "Positive" ? <button onClick={() => transferPositive(animal)} className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-2 text-xs font-bold text-sky-100/65">Send to specialty snake care</button> : favorite ? <span className="rounded-xl border border-amber-200/15 bg-amber-200/[.04] px-4 py-2 text-xs font-bold text-amber-100/65">Favorite · sale protected</span> : <button disabled={!!marketBusy} onClick={() => void sellSnake(animal)} className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-2 text-xs font-bold text-emerald-200/75 disabled:opacity-30">Sell · {money(sell)}</button>}
                  </div>
                  </> : null}
                </article>
              );
            })}
          </div>
        </section>
      </CollapsibleGameSection>

      <CollapsibleGameSection label="Player snake market" detail={`${playerMarket.length} snake${playerMarket.length === 1 ? "" : "s"} available from players`}>
        <section className="overflow-hidden rounded-[30px] border border-emerald-300/10 bg-emerald-300/[.025] p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><div className="section-kicker">Player snake market</div><h2 className="mt-2 text-2xl font-semibold">Snakes sold by real players</h2><p className="mt-2 text-sm text-white/38">Testing status and pure-locality phenotype grades travel with the animal.</p></div>
            <button onClick={() => void refreshPlayerMarket()} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">Refresh market</button>
          </div>
          {marketStatus ? <div role="status" className="mt-4 rounded-xl border border-amber-200/10 bg-amber-200/[.03] p-3 text-xs text-amber-100/65">{marketStatus}</div> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {playerMarket.map((listing) => {
              const animal = listing.snake;
              return (
                <article key={listing.id} className="rounded-3xl border border-white/[.06] bg-black/10 p-4">
                  <ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} traits={portraitTraits(animal)} compact />
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-2"><div><div className="font-semibold text-white/75">{animal.name}</div><div className="mt-1 text-[10px] text-white/30">{animal.sex} · {animal.lifeStage} · Gen {animal.generation}</div></div><PhenotypeBadge animal={animal} /></div>
                  <div className="mt-3 text-[10px] text-white/34">{traitSummary(animal)}</div>
                  <div className="mt-2 text-[10px] text-white/30">{animal.subspecies} · {animal.locality} · Nido {animal.nidoStatus}</div>
                  <div className="mt-4 flex items-center justify-between gap-3"><div className="text-lg font-semibold text-emerald-200/75">{money(listing.price)}</div><button disabled={!!marketBusy || cash < listing.price || openSlots <= 0} onClick={() => void buyPlayerSnake(listing)} className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black text-[#06100c] disabled:opacity-30">{marketBusy === listing.id ? "Claiming…" : openSlots <= 0 ? "Need enclosure" : cash < listing.price ? "Not enough cash" : "Buy snake"}</button></div>
                </article>
              );
            })}
            {!playerMarket.length ? <div className="rounded-2xl border border-dashed border-white/[.08] p-6 text-sm text-white/30 md:col-span-2 xl:col-span-3">No player-listed snakes are available yet.</div> : null}
          </div>
        </section>
      </CollapsibleGameSection>

      <CollapsibleGameSection label="Program records" detail={`${clutchHistory.length} completed clutch${clutchHistory.length === 1 ? "" : "es"}`}>
        <section className="panel rounded-[28px] p-6">
          <div className="section-kicker">Program records</div>
          <h2 className="mt-2 text-2xl font-semibold">Track progress across generations.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {clutchHistory.map((record) => {
              const graded = record.offspring.filter((baby) => phenotypeLabel(baby));
              const topPhenotype = graded.length ? Math.max(...graded.map((baby) => baby.phenotypeScore)) : 0;
              const testedBabies = record.offspring.filter((baby) => baby.geneticsTested);
              const strongestTested = testedBabies.length ? Math.max(...testedBabies.flatMap((baby) => [baby.highBlack, baby.highWhite, baby.blueStripe, baby.yellowRetention, baby.blotches])) : null;
              return (
                <article key={record.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-4">
                  <div className="font-semibold text-white/72">{record.dam.name} × {record.sire.name}</div>
                  <div className="mt-1 text-[10px] text-white/30">Season {record.season} · {record.id} · {record.offspring.length} hatched</div>
                  <div className="mt-3 text-xs text-white/38">{record.holdbackIds.length} held back{topPhenotype ? ` · best locality grade ${phenotypeGrade(topPhenotype)}` : ""}{strongestTested != null ? ` · strongest tested trait ${strongestTested}%` : ""}</div>
                </article>
              );
            })}
            {!clutchHistory.length ? <div className="rounded-2xl border border-dashed border-white/[.07] p-5 text-sm text-white/28 md:col-span-2">Complete a clutch to start building your program history.</div> : null}
          </div>
        </section>
      </CollapsibleGameSection>

      {sales.length > 0 || transfers.length > 0 ? (
        <CollapsibleGameSection label="Activity" detail={`${sales.length} sale${sales.length === 1 ? "" : "s"} · ${transfers.length} transfer${transfers.length === 1 ? "" : "s"}`}>
          <section className="panel-soft rounded-[28px] p-5">
            <div className="section-kicker">Activity</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sales.slice(0, 4).map((sale) => <div key={`${sale.id}-${sale.season}`} className="rounded-2xl border border-white/[.06] p-3 text-sm text-white/50">Sold {sale.name} · <span className="text-emerald-200/70">+{money(sale.value)}</span></div>)}
              {transfers.slice(0, 4).map((item) => <div key={`${item.id}-${item.season}`} className="rounded-2xl border border-sky-300/10 p-3 text-sm text-white/50">Transferred {item.name} to specialty snake care</div>)}
            </div>
            <div className="mt-3 text-xs text-white/28">Total snake sales: {money(saleIncome)}</div>
          </section>
        </CollapsibleGameSection>
      ) : null}

      {selectedAnimal ? (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-4xl rounded-[30px] border border-white/[.09] bg-[#09120e] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between gap-4"><div><div className="section-kicker">Snake record · {selectedAnimal.id}</div><h2 className="mt-2 text-3xl font-semibold">{selectedAnimal.name || "Unnamed snake"}</h2></div><button onClick={() => setSelectedSnakeId(null)} className="rounded-xl border border-white/[.09] px-4 py-2 text-sm font-bold text-white/60">Close</button></div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <ChondroSnakeIcon subspecies={selectedAnimal.subspecies} name={selectedAnimal.name} traits={portraitTraits(selectedAnimal)} />
                <div className="mt-4"><TraitGrid animal={selectedAnimal} /></div>
                <div className="mt-4 flex flex-wrap gap-2"><PhenotypeBadge animal={selectedAnimal} /><span className="rounded-full border border-white/[.08] px-3 py-1 text-[10px] text-white/45">{selectedAnimal.classification} · {selectedAnimal.locality}</span></div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[.06] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-white/30">Pedigree</div>
                  {selectedParents.length ? <div className="mt-3 grid grid-cols-2 gap-2">{selectedParents.map((parent) => <button key={parent.id} onClick={() => setSelectedSnakeId(parent.id)} className="rounded-xl border border-white/[.06] p-3 text-left"><div className="text-[9px] uppercase text-white/25">{parent.sex === "Female" ? "Dam" : "Sire"}</div><div className="mt-1 truncate text-sm font-semibold text-white/65">{parent.name}</div><div className="mt-1 text-[9px] text-white/25">{parent.locality} · Gen {parent.generation}</div></button>)}</div> : <div className="mt-3 text-sm text-white/28">Foundation animal · no recorded parents</div>}
                  {selectedOffspring.length ? <div className="mt-5"><div className="text-[9px] font-bold uppercase tracking-[.11em] text-white/25">Offspring ({selectedOffspring.length})</div><div className="mt-2 flex flex-wrap gap-2">{selectedOffspring.map((baby) => <button key={baby.id} onClick={() => setSelectedSnakeId(baby.id)} className="rounded-lg border border-amber-200/10 px-3 py-2 text-xs text-amber-100/60">{baby.name}</button>)}</div></div> : null}
                </div>
                <div className="rounded-2xl border border-white/[.06] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-white/30">Locality pedigree</div>
                  <div className="mt-3 space-y-2">{Object.entries(selectedAnimal.localityAncestry).map(([name, percent]) => <div key={name}><div className="flex justify-between gap-3 text-xs text-white/45"><span>{name}</span><span>{percent}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-amber-200/55" style={{ width: `${percent}%` }} /></div></div>)}</div>
                </div>
                <div className="rounded-2xl border border-white/[.06] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-white/30">Subspecies ancestry</div>
                  <div className="mt-3 space-y-2">{Object.entries(selectedAnimal.ancestry).map(([name, percent]) => <div key={name}><div className="flex justify-between gap-3 text-xs text-white/45"><span>{name}</span><span>{percent}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-emerald-300/55" style={{ width: `${percent}%` }} /></div></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {initialsPrompt ? (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-amber-200/15 bg-[#0a130f] p-6 shadow-2xl">
            <div className="section-kicker">Your first clutch</div>
            <h2 className="mt-3 text-3xl font-semibold">Choose your breeder initials</h2>
            <p className="mt-3 text-sm leading-6 text-white/42">Choose 2–5 letters. They become part of every offspring ID you produce.</p>
            <input autoFocus value={initialsInput} onChange={(event) => setInitialsInput(event.target.value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 5))} maxLength={5} placeholder="ABB" className="mt-5 h-14 w-full rounded-2xl border border-white/[.09] bg-black/25 px-4 text-center text-2xl font-black uppercase tracking-[.25em] text-amber-100 outline-none" />
            {initialsStatus ? <div role="status" className="mt-3 text-sm text-amber-100/70">{initialsStatus}</div> : null}
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setInitialsPrompt(false)} className="rounded-xl border border-white/[.08] px-4 py-3 text-xs font-bold text-white/50">Cancel</button><button onClick={() => void claimBreederInitials()} className="rounded-xl bg-amber-200 px-5 py-3 text-xs font-black text-[#17130a]">Claim initials & start cycle</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
