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

/**
 * Chance that the trail hiding a python shows a "rustling leaves" tell on
 * the fork screen. The briefing promises readable signs — this keeps the
 * promise while leaving some nights unreadable, so the fork stays a hunt,
 * not a giveaway. TUNABLE.
 */
export const EXPEDITION_TRAIL_SIGN_CHANCE = 0.75;

/** Roll whether tonight's python trail shows its rustling-leaves tell. */
export function rollTrailSign(random: RandomFn = Math.random): boolean {
  return random() < EXPEDITION_TRAIL_SIGN_CHANCE;
}

/**
 * A wild-caught gravid female lays her clutch this long after she is
 * brought home to the colony (wall-clock, like every other game timer).
 */
export const GRAVID_GESTATION_MS = 24 * 60 * 60 * 1000;

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
  /** Adult females roll 30% gravid — she lays a wild clutch after import. */
  gravid: boolean;
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
  /** Wild-caught gravid females: true until she lays her clutch. */
  gravid?: boolean;
  /** Wall-clock timestamp when a gravid female lays (set at import). */
  gravidLaysAt?: number;
  /**
   * Stable sprite seed shared with the pre-import views (catch screen,
   * expedition receipt). The colony renders the exact same Keeper sprite —
   * or the exact same "Sprite pending" treatment — that the hunter screens
   * showed, because every view seeds from this value.
   */
  spriteSeed?: string;
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
    localities: ["Sorong", "Manokwari", "Arfak", "Kofiau", "Timika"],
    traitLean: ["yellowRetention", "blueStripe"],
  },
  {
    id: "highlands",
    name: "Highlands & North Coast",
    tagline: "Moss forest, mountain valleys, and the Cyclops range.",
    localities: ["Wamena", "Jayapura", "Cyclops", "Lereh"],
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
/* Expedition flight cinematics                                        */
/* ------------------------------------------------------------------ */

/**
 * Silent conservation-map flight intro per subspecies. Played full-screen
 * before the player heads out, matched to the expedition region's
 * signature subspecies.
 */
export const CANOPY_FLIGHT_VIDEO: Record<CanopySubspecies, string> = {
  "Morelia azurea azurea": "/videos/conservation-map-flight-orange.mp4",
  "Morelia azurea pulcher": "/videos/conservation-map-flight-blue.mp4",
  "Morelia azurea utaraensis": "/videos/conservation-map-flight-yellow.mp4",
  "Morelia viridis": "/videos/conservation-map-flight-green.mp4",
};

/**
 * A region's signature subspecies: the most common subspecies across its
 * localities (ties resolve to the first one seen).
 */
export function primarySubspeciesForRegion(region: CanopyRegion): CanopySubspecies {
  const counts = new Map<CanopySubspecies, number>();
  for (const locality of region.localities) {
    const sub = CANOPY_LOCALITY_SUBSPECIES[locality];
    counts.set(sub, (counts.get(sub) ?? 0) + 1);
  }
  let best: CanopySubspecies = "Morelia viridis";
  let bestCount = -1;
  for (const [sub, count] of counts) {
    if (count > bestCount) {
      best = sub;
      bestCount = count;
    }
  }
  return best;
}

/** Flight intro video for an expedition region, matched by name. */
export function flightVideoForRegion(region: CanopyRegion): string {
  return CANOPY_FLIGHT_VIDEO[primarySubspeciesForRegion(region)];
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

/** Wild catches come in two flavors: fresh neonates or full adults. */
export function rollLifeStage(random: RandomFn = Math.random): CanopyLifeStage {
  return random() < 0.5 ? "Neonate" : "Adult";
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
 * expedition ("Wild Biak 1", "Wild Biak 2", …). Pass `lifeStage` to fix the
 * stage (the grove pre-rolls it so the hiding spot matches: adults hunt
 * the tall trees, neonates hide in the low plants).
 */
export function generateWildSnake(
  n: number,
  region: CanopyRegion,
  random: RandomFn = Math.random,
  lifeStage: CanopyLifeStage | null = null,
): WildSnake {
  const locality = region.localities[Math.floor(random() * region.localities.length)];
  const subspecies = CANOPY_LOCALITY_SUBSPECIES[locality];
  const sex: CanopySex = random() < 0.5 ? "Male" : "Female";
  const stage = lifeStage ?? rollLifeStage(random);
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

  // Adult females have a 30% shot at being gravid — after she's brought
  // home, a timer starts, and when it runs out she lays a wild clutch.
  const gravid = stage === "Adult" && sex === "Female" && random() < 0.3;

  return {
    name: `Wild ${locality} ${n}`,
    locality,
    subspecies,
    sex,
    lifeStage: stage,
    neonateColor,
    traits,
    condition: rollCondition(random),
    phenotypeScore,
    exceptional,
    exceptionalTraitLabel: exceptional
      ? `Exceptional high-blue specimen (${traits.blueStripe}% blue)`
      : null,
    gravid,
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
    // A gravid female's laying timer starts the moment she joins the colony.
    gravid: wild.gravid || undefined,
    gravidLaysAt: wild.gravid ? Date.now() + GRAVID_GESTATION_MS : undefined,
    // The wild snake's name is stable from catch to import, so the colony
    // card resolves the identical sprite (or "Sprite pending") the hunter
    // screens showed.
    spriteSeed: wild.name,
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

/* ------------------------------------------------------------------ */
/* Regional atmosphere (scenery grading per expedition region)         */
/* ------------------------------------------------------------------ */

/**
 * Per-region night atmosphere. This is the scenery system: every region
 * grades the trail and grove scenes with its own palette, fog, and
 * fireflies, and the night deepens grove by grove. When painted region
 * backdrops exist, drop the file path into `backdrop` and the scenes will
 * layer it under the grade automatically.
 */
export interface CanopyAtmosphere {
  /** CSS background for the color-grade overlay over trail/grove scenes. */
  grade: string;
  /** 0..1 opacity of the drifting fog layer. */
  fogOpacity: number;
  /** Tint of the fog layer. */
  fogTint: string;
  /** Firefly count for the trail scene. */
  fireflies: number;
  /** Firefly glow color. */
  fireflyColor: string;
  /** Flavor name shown in the trail status ("Moss-forest midnight"). */
  nightName: string;
  /**
   * Optional painted region backdrop (e.g.
   * "/arcade/canopy-hunter/scenery/grove-highlands.webp"). Rendered in the
   * grove scene under the grade — the trail keeps its fork paintings as the
   * base layer (a backdrop there would bury them), so painted scenery lives
   * where the player actually hunts: the grove. Undefined until art exists;
   * the grade carries the regional mood on its own.
   */
  backdrop?: string;
}

export const CANOPY_REGION_ATMOSPHERE: Record<CanopyRegion["id"], CanopyAtmosphere> = {
  cenderawasih: {
    grade:
      "linear-gradient(180deg, rgba(8,47,46,.42) 0%, rgba(4,20,18,.10) 55%, rgba(2,10,10,.55) 100%)",
    fogOpacity: 0.22,
    fogTint: "#5eead4",
    fireflies: 10,
    fireflyColor: "#fef9c3",
    nightName: "Island dusk",
    backdrop: "/arcade/canopy-hunter/scenery/grove-cenderawasih.webp",
  },
  "birds-head": {
    grade:
      "linear-gradient(180deg, rgba(46,16,70,.45) 0%, rgba(20,8,32,.12) 55%, rgba(8,4,16,.60) 100%)",
    fogOpacity: 0.28,
    fogTint: "#c4b5fd",
    fireflies: 8,
    fireflyColor: "#fde68a",
    nightName: "Vogelkop night",
    backdrop: "/arcade/canopy-hunter/scenery/grove-birds-head.webp",
  },
  highlands: {
    grade:
      "linear-gradient(180deg, rgba(12,34,64,.50) 0%, rgba(8,20,40,.14) 55%, rgba(3,8,18,.62) 100%)",
    fogOpacity: 0.5,
    fogTint: "#bfdbfe",
    fireflies: 5,
    fireflyColor: "#e0f2fe",
    nightName: "Moss-forest midnight",
    backdrop: "/arcade/canopy-hunter/scenery/grove-highlands.webp",
  },
  southern: {
    grade:
      "linear-gradient(180deg, rgba(80,36,8,.48) 0%, rgba(40,20,8,.12) 55%, rgba(16,8,4,.60) 100%)",
    fogOpacity: 0.18,
    fogTint: "#fcd34d",
    fireflies: 12,
    fireflyColor: "#fde68a",
    nightName: "Trans-Fly dusk",
    backdrop: "/arcade/canopy-hunter/scenery/grove-southern.webp",
  },
};

/** Atmosphere for an expedition region. */
export function atmosphereForRegion(region: CanopyRegion): CanopyAtmosphere {
  return CANOPY_REGION_ATMOSPHERE[region.id];
}

/* ------------------------------------------------------------------ */
/* Regional flora: tall trees hide adults, low plants hide neonates    */
/* ------------------------------------------------------------------ */

/**
 * Keyed tree cutouts per region (3 per region). Tall trees hide adult
 * pythons; the scenes fall back to the shared keyed tree set if a region
 * ever ships without its own.
 */
export const CANOPY_REGION_TREES: Record<CanopyRegion["id"], string[]> = {
  cenderawasih: [
    "/arcade/canopy-hunter/trees/cenderawasih-1.webp",
    "/arcade/canopy-hunter/trees/cenderawasih-2.webp",
    "/arcade/canopy-hunter/trees/cenderawasih-3.webp",
  ],
  "birds-head": [
    "/arcade/canopy-hunter/trees/birds-head-1.webp",
    "/arcade/canopy-hunter/trees/birds-head-2.webp",
    "/arcade/canopy-hunter/trees/birds-head-3.webp",
  ],
  highlands: [
    "/arcade/canopy-hunter/trees/highlands-1.webp",
    "/arcade/canopy-hunter/trees/highlands-2.webp",
    "/arcade/canopy-hunter/trees/highlands-3.webp",
  ],
  southern: [
    "/arcade/canopy-hunter/trees/southern-1.webp",
    "/arcade/canopy-hunter/trees/southern-2.webp",
    "/arcade/canopy-hunter/trees/southern-3.webp",
  ],
};

/**
 * Keyed low-plant cutouts per region (1 per region). Neonates hide in the
 * undergrowth — the height mechanic switches on for a region once its
 * plant art exists.
 */
export const CANOPY_REGION_PLANTS: Record<CanopyRegion["id"], string[]> = {
  cenderawasih: ["/arcade/canopy-hunter/plants/cenderawasih.webp"],
  "birds-head": ["/arcade/canopy-hunter/plants/birds-head.webp"],
  highlands: ["/arcade/canopy-hunter/plants/highlands.webp"],
  southern: ["/arcade/canopy-hunter/plants/southern.webp"],
};

export type GroveSpotKind = "tree" | "plant";

/** One hiding spot in a grove: a tall tree or a low plant. */
export interface GroveSpot {
  kind: GroveSpotKind;
  /** Index into the region's tree or plant art set. */
  variant: number;
}

/**
 * Build one grove's hiding spots. Always at least one tall tree and one
 * low plant once the region has plant art; without plant art the grove
 * falls back to all trees and the height mechanic stays off.
 */
export function createGroveSpots(
  treeVariants: number,
  plantVariants: number,
  random: RandomFn = Math.random,
): GroveSpot[] {
  const kinds: GroveSpotKind[] =
    plantVariants > 0
      ? random() < 0.5
        ? ["tree", "tree", "plant"]
        : ["tree", "plant", "plant"]
      : ["tree", "tree", "tree"];
  for (let i = kinds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds.map((kind) => ({
    kind,
    variant: Math.floor(random() * (kind === "tree" ? treeVariants : plantVariants)),
  }));
}

/**
 * The night deepens across the four groves: dusk, nightfall, deep night,
 * blue hour. Index with the 0-based leg/grove index.
 */
export const NIGHT_PHASES = ["Dusk", "Nightfall", "Deep night", "Blue hour"] as const;

export function nightPhaseForLeg(legIndex: number): (typeof NIGHT_PHASES)[number] {
  return NIGHT_PHASES[Math.max(0, Math.min(NIGHT_PHASES.length - 1, legIndex))];
}

/** 0 at dusk → 1 at the blue hour: extra darkness layered over the grade. */
export function nightfallForLeg(legIndex: number): number {
  return Math.max(0, Math.min(1, legIndex / (NIGHT_PHASES.length - 1)));
}

/* ------------------------------------------------------------------ */
/* Expedition scoring                                                  */
/* ------------------------------------------------------------------ */

export type ExpeditionRank = "S" | "A" | "B" | "C" | "D";

export interface ExpeditionScore {
  points: number;
  rank: ExpeditionRank;
}

/**
 * Rank the night: catches and hot streaks earn, escapes and wasted
 * searches cost. Tuned so a perfect night (4 caught, hot streak) is S,
 * a clean 3-catch night is A, and a skunked night is D. TUNABLE.
 */
export function scoreExpedition(
  caught: number,
  bestStreak: number,
  escaped: number,
  searchesUsed: number,
): ExpeditionScore {
  const points =
    caught * 40 + bestStreak * 10 - escaped * 10 - Math.max(0, searchesUsed - 4) * 5;
  const rank: ExpeditionRank =
    points >= 170 ? "S" : points >= 130 ? "A" : points >= 90 ? "B" : points >= 40 ? "C" : "D";
  return { points, rank };
}

export const EXPEDITION_RANK_LINES: Record<ExpeditionRank, string> = {
  S: "Legend of the canopy — the night gave up everything.",
  A: "A hunter's night. The colony grows stronger.",
  B: "A solid night under the leaves.",
  C: "The canopy kept most of its secrets.",
  D: "A quiet night. The snakes were listening.",
};

/* ------------------------------------------------------------------ */
/* Shed-skin finds (consolation sign on empty trees)                   */
/* ------------------------------------------------------------------ */

/** Chance an empty searched tree turns up a fresh shed skin. TUNABLE. */
export const SHED_FIND_CHANCE = 0.3;

/** Roll whether tonight's empty tree hides a shed skin. */
export function rollShedFind(random: RandomFn = Math.random): boolean {
  return random() < SHED_FIND_CHANCE;
}

const SHED_LINES = [
  "Shed skin — fresh. Somebody was here tonight.",
  "A papery shed tangled in the bark. Close.",
  "Shed skin, still supple. You're on warm trail.",
  "An empty coil of shed — the owner slipped away.",
];

/** Flavor text for a shed-skin find. */
export function randomShedLine(random: RandomFn = Math.random): string {
  return SHED_LINES[Math.floor(random() * SHED_LINES.length)];
}

/* ------------------------------------------------------------------ */
/* Catch escalation: the snakes get warier as the night deepens        */
/* ------------------------------------------------------------------ */

/** Sweep period multiplier per leg — the timing bar speeds up each grove. */
export const ESCALATION_PER_LEG = 0.92;
/** Fastest the sweep ever gets (ms per one-way pass). */
export const MIN_SWEEP_MS = 700;

/** Sweep period for a leg index, shrinking as the night deepens. */
export function sweepMsForLeg(legIndex: number, baseMs: number): number {
  return Math.max(MIN_SWEEP_MS, Math.round(baseMs * Math.pow(ESCALATION_PER_LEG, legIndex)));
}
