/**
 * Canopy Hunter — expedition setup and wild-snake generation for the
 * in-game expedition event inside Arboreal Keeper. Generation is pure
 * (randomness is injectable) so the expedition rules can be tested without
 * a browser; `wildSnakeToKeeperSnake` shapes catches for the Keeper colony.
 */

/* ------------------------------------------------------------------ */
/* Expedition constants                                                */
/* ------------------------------------------------------------------ */

export const EXPEDITION_TREES = 12;
export const EXPEDITION_SEARCHES = 8;
export const EXPEDITION_PYTHONS = 4;

/* ------------------------------------------------------------------ */
/* Expedition entry (Arboreal Keeper in-game event)                     */
/* ------------------------------------------------------------------ */

/**
 * Entry model: one free expedition per player per week; extra expeditions
 * inside the same week cost game cash. TUNABLE — the owner can veto the
 * cadence, the fee, or swap the weekly model for random-chance drops.
 */
export const EXPEDITION_FREE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const EXPEDITION_ENTRY_FEE = 2500;

/**
 * One-shot intent: lets a screen outside the Keeper game (e.g. the home
 * screen) ask for the expedition modal. The request is consumed exactly
 * once by the game component, so there is no race between navigation and
 * the event listener when the game is not mounted yet.
 */
let expeditionOpenRequested = false;

export function requestExpeditionOpen(): void {
  expeditionOpenRequested = true;
}

export function consumeExpeditionOpenRequest(): boolean {
  if (!expeditionOpenRequested) return false;
  expeditionOpenRequested = false;
  return true;
}

export const CANOPY_LOCALITIES = [
  "Biak",
  "Numfor",
  "Manokwari",
  "Arfak",
  "Sorong",
  "Timika",
  "Kofiau",
  "Cyclops",
  "Jayapura",
  "Lereh",
  "Wamena",
  "Yapen",
  "Aru",
  "Merauke",
] as const;

export type CanopyLocality = (typeof CANOPY_LOCALITIES)[number];

export type CanopySubspecies =
  | "Morelia azurea azurea"
  | "Morelia azurea pulcher"
  | "Morelia azurea utaraensis"
  | "Morelia viridis";

/**
 * Copied from the single source of truth in ChondroBreederGameV3.tsx
 * (module-local `localitySubspecies`). Do not refactor V3 — keep this copy
 * in sync manually if the game ever changes it.
 */
export const CANOPY_LOCALITY_SUBSPECIES: Record<CanopyLocality, CanopySubspecies> = {
  Biak: "Morelia azurea azurea",
  Numfor: "Morelia azurea azurea",
  Manokwari: "Morelia azurea pulcher",
  Arfak: "Morelia azurea pulcher",
  Sorong: "Morelia azurea pulcher",
  Timika: "Morelia azurea pulcher",
  Kofiau: "Morelia azurea pulcher",
  Cyclops: "Morelia azurea utaraensis",
  Jayapura: "Morelia azurea utaraensis",
  Lereh: "Morelia azurea utaraensis",
  Wamena: "Morelia azurea utaraensis",
  Yapen: "Morelia azurea utaraensis",
  Aru: "Morelia viridis",
  Merauke: "Morelia viridis",
};

export type CanopySex = "Male" | "Female";
export type CanopyLifeStage = "Neonate" | "Subadult" | "Adult";
export type CanopyNeonateColor = "Red" | "Yellow";
export type CanopyCondition = "Excellent" | "Good" | "Fair";

export interface CanopyTraits {
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
}

/** A snake caught (or generated) during a Canopy Hunter expedition. */
export interface WildSnake {
  name: string;
  locality: CanopyLocality;
  subspecies: CanopySubspecies;
  sex: CanopySex;
  lifeStage: CanopyLifeStage;
  neonateColor: CanopyNeonateColor;
  traits: CanopyTraits;
  condition: CanopyCondition;
  phenotypeScore: number;
  /** ~8% of finds: one standout trait, called out in the UI. */
  exceptional: boolean;
  exceptionalTraitLabel: string | null;
  notes: string;
}

/**
 * Field-for-field mirror of the `Snake` type in
 * src/components/ChondroBreederGameV3.tsx, so imported snakes pass straight
 * through the game's `normalizeSnake` loader.
 */
export interface KeeperSnake {
  id: string;
  name: string;
  sex: CanopySex;
  source: "Captive Bred" | "Import";
  subspecies: CanopySubspecies;
  locality: CanopyLocality | "Mixed Locality" | "Designer";
  neonateColor: CanopyNeonateColor;
  lifeStage: CanopyLifeStage;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
  geneticsTested: boolean;
  phenotypeScore: number;
  localityAncestry: Partial<Record<CanopyLocality, number>>;
  body: string;
  tail: string;
  eyes: string;
  head: string;
  pattern: string;
  color: string;
  nidoStatus: "Unknown" | "Negative" | "Positive";
  condition: CanopyCondition;
  classification: "Pure" | "Hybrid" | "Designer";
  generation: number;
  parentIds: string[];
  ancestry: Partial<Record<CanopySubspecies, number>>;
  notes: string;
  breederInitials: string | null;
}

type RandomFn = () => number;

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const intBetween = (random: RandomFn, min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

/* ------------------------------------------------------------------ */
/* Expedition setup                                                    */
/* ------------------------------------------------------------------ */

/** Pick EXPEDITION_PYTHONS distinct tree indexes out of EXPEDITION_TREES. */
export function createExpedition(random: RandomFn = Math.random): number[] {
  const indexes = Array.from({ length: EXPEDITION_TREES }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes.slice(0, EXPEDITION_PYTHONS).sort((a, b) => a - b);
}

export type CanopyTraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention" | "blotches";

export interface CanopyRegion {
  id: string;
  name: string;
  tagline: string;
  localities: CanopyLocality[];
  /** Traits this region's animals lean toward (mirrors the Keeper's preferredByTaxon). */
  traitLean: [CanopyTraitKey, CanopyTraitKey];
}

/**
 * One expedition = one region. Finds only come from that region's
 * localities — no bagging an Aru and a Jayapura on the same night.
 */
export const CANOPY_REGIONS: CanopyRegion[] = [
  {
    id: "cenderawasih",
    name: "Cenderawasih Islands",
    tagline: "Island canopy off the north coast.",
    localities: ["Biak", "Numfor", "Yapen"],
    traitLean: ["highBlack", "yellowRetention"],
  },
  {
    id: "birds-head",
    name: "Bird's Head West",
    tagline: "Vogelkop lowlands and the Raja Ampat isles.",
    localities: ["Sorong", "Manokwari", "Arfak", "Kofiau"],
    traitLean: ["yellowRetention", "blueStripe"],
  },
  {
    id: "highlands",
    name: "Highlands & North Coast",
    tagline: "Moss forest, mountain valleys, and the Cyclops range.",
    localities: ["Wamena", "Timika", "Jayapura", "Cyclops", "Lereh"],
    traitLean: ["blueStripe", "highWhite"],
  },
  {
    id: "southern",
    name: "Southern Wilds",
    tagline: "Trans-Fly lowlands and the Aru Isles — true Morelia viridis country.",
    localities: ["Aru", "Merauke"],
    traitLean: ["highWhite", "highBlack"],
  },
];

/** Roll which region tonight's expedition heads to. */
export function rollRegion(random: RandomFn = Math.random): CanopyRegion {
  return CANOPY_REGIONS[Math.floor(random() * CANOPY_REGIONS.length)];
}

/* ------------------------------------------------------------------ */
/* Wild-snake generation                                               */
/* ------------------------------------------------------------------ */

/**
 * Locality-driven neonate color. Aru and Merauke are true Morelia viridis
 * (yellow babies only — the Keeper enforces this via allowedColorsByTaxon),
 * and Kofiau famously throws yellow too. Every other northern locality
 * throws both red and yellow babies.
 */
const YELLOW_NEONATE_LOCALITIES: ReadonlySet<CanopyLocality> = new Set([
  "Aru",
  "Kofiau",
  "Merauke",
]);

function rollNeonateColor(locality: CanopyLocality, random: RandomFn): CanopyNeonateColor {
  if (YELLOW_NEONATE_LOCALITIES.has(locality)) return "Yellow";
  return random() < 0.5 ? "Red" : "Yellow";
}

function rollLifeStage(random: RandomFn): CanopyLifeStage {
  const r = random();
  if (r < 0.4) return "Neonate";
  if (r < 0.75) return "Subadult";
  return "Adult";
}

function rollCondition(random: RandomFn): CanopyCondition {
  const r = random();
  if (r < 0.25) return "Excellent";
  if (r < 0.85) return "Good";
  return "Fair";
}

/**
 * Generate one wild snake. `n` numbers the finds within the expedition
 * ("Wild Biak 1", "Wild Biak 2", …).
 */
/**
 * Generate one wild snake for a region. `n` numbers the finds within the
 * expedition ("Wild Biak 1", "Wild Biak 2", …).
 */
export function generateWildSnake(n: number, region: CanopyRegion, random: RandomFn = Math.random): WildSnake {
  const locality = region.localities[Math.floor(random() * region.localities.length)];
  const subspecies = CANOPY_LOCALITY_SUBSPECIES[locality];
  const sex: CanopySex = random() < 0.5 ? "Male" : "Female";
  const lifeStage = rollLifeStage(random);
  const neonateColor = rollNeonateColor(locality, random);

  const exceptional = random() < 0.08;
  // Regional trait lean: the region's signature traits roll higher.
  const leaned = (key: CanopyTraitKey, min: number, max: number) =>
    region.traitLean.includes(key) ? intBetween(random, min + 20, max + 20) : intBetween(random, min, max);
  const traits: CanopyTraits = {
    highBlack: leaned("highBlack", 5, 40),
    highWhite: leaned("highWhite", 5, 40),
    blueStripe: exceptional ? intBetween(random, 65, 85) : leaned("blueStripe", 0, 30),
    yellowRetention: leaned("yellowRetention", 10, 60),
    blotches: intBetween(random, 0, 40),
  };

  const phenotypeScore = Math.round(
    (traits.highBlack + traits.highWhite + traits.blueStripe + traits.yellowRetention + traits.blotches) / 5,
  );

  return {
    name: `Wild ${locality} ${n}`,
    locality,
    subspecies,
    sex,
    lifeStage,
    neonateColor,
    traits,
    condition: rollCondition(random),
    phenotypeScore,
    exceptional,
    exceptionalTraitLabel: exceptional
      ? `Exceptional high-blue specimen (${traits.blueStripe}% blue)`
      : null,
    notes: `Caught in a Canopy Hunter ${region.name} expedition.`,
  };
}

/** Tail descriptor convention copied from ChondroBreederGameV3 (`tailFor`). */
function tailFor(subspecies: CanopySubspecies): string {
  return subspecies === "Morelia azurea utaraensis"
    ? "Matching body color and pattern"
    : "Black-dipped";
}

/**
 * Convert a WildSnake into a Keeper `Snake`-shaped record, following the same
 * field conventions as `makeSnake` in ChondroBreederGameV3.tsx.
 */
export function wildSnakeToKeeperSnake(wild: WildSnake, id: string): KeeperSnake {
  return {
    id,
    name: wild.name,
    sex: wild.sex,
    source: "Import",
    subspecies: wild.subspecies,
    locality: wild.locality,
    neonateColor: wild.neonateColor,
    lifeStage: wild.lifeStage,
    highBlack: clamp100(wild.traits.highBlack),
    highWhite: clamp100(wild.traits.highWhite),
    blueStripe: clamp100(wild.traits.blueStripe),
    yellowRetention: clamp100(wild.traits.yellowRetention),
    blotches: clamp100(wild.traits.blotches),
    geneticsTested: false,
    phenotypeScore: clamp100(wild.phenotypeScore),
    localityAncestry: { [wild.locality]: 100 },
    body: wild.subspecies,
    tail: tailFor(wild.subspecies),
    eyes: wild.subspecies,
    head: wild.subspecies,
    pattern: wild.locality,
    color: wild.locality,
    nidoStatus: "Unknown",
    condition: wild.condition,
    classification: "Pure",
    generation: 1,
    parentIds: [],
    ancestry: { [wild.subspecies]: 100 },
    notes: wild.notes,
    breederInitials: null,
  };
}

/* ------------------------------------------------------------------ */
/* Catch-mechanic helpers (kept here so components stay lint-pure)     */
/* ------------------------------------------------------------------ */

/** Random center for the catch timing-bar's green zone (0.25–0.75). */
export function rollZoneCenter(random: RandomFn = Math.random): number {
  return 0.25 + random() * 0.5;
}

const ESCAPE_LINES = [
  "It slipped into the canopy — gone in a flash of green.",
  "The branch sways… empty. It saw you first.",
  "A rustle, a flicker of yellow — and nothing.",
  "So close. It melted back into the leaves.",
];

/** Flavor text for a missed catch. */
export function randomEscapeLine(random: RandomFn = Math.random): string {
  return ESCAPE_LINES[Math.floor(random() * ESCAPE_LINES.length)];
}
