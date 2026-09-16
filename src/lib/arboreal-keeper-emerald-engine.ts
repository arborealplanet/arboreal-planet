import {
  ARBOREAL_KEEPER_SPECIES_BY_ID,
  assetsForStage,
  type KeeperAssetVariant,
  type KeeperLifeStage,
  type KeeperPhase,
} from "@/lib/arboreal-keeper-species";
import {
  ARBOREAL_KEEPER_ENCLOSURES,
  enclosureSupportsAnimal,
  type KeeperEnclosureId,
} from "@/lib/arboreal-keeper-enclosures";
import {
  ARBOREAL_KEEPER_RACKS,
  createRackInstance,
  emptyCompatibleRackTubs,
  rackDefinition,
  rackSupportsAnimal,
  type KeeperRackInstance,
} from "@/lib/arboreal-keeper-racks";

export type EmeraldSpeciesId =
  | "northern_emerald_tree_boa"
  | "amazon_basin_emerald_tree_boa";

export type EmeraldSex = "Male" | "Female";
export type EmeraldCondition = "Excellent" | "Good" | "Fair";
export type EmeraldNeonateColor = "red" | "green" | "orange" | "yellow";

export type EmeraldTraitKey =
  | "whiteAmount"
  | "whiteStructure"
  | "whiteConnectivity"
  | "dorsalStripe"
  | "patternDensity"
  | "patternCleanliness"
  | "contrast"
  | "greenSaturation"
  | "darkGreen"
  | "yellowGreen"
  | "darkEdging"
  | "speckling"
  | "redIntensity"
  | "orangeIntensity"
  | "darkRed";

export type EmeraldAnimal = {
  id: string;
  name: string;
  speciesId: EmeraldSpeciesId;
  sex: EmeraldSex;
  lifeStage: KeeperLifeStage;
  phase: KeeperPhase;
  neonateColor: EmeraldNeonateColor | null;
  traits: Partial<Record<EmeraldTraitKey, number>>;
  generation: number;
  parentIds: string[];
  condition: EmeraldCondition;
  assetId: string | null;
  assetPath: string | null;
  notes: string;
  createdAt: number;
};

export type EmeraldMarketOffer = {
  id: string;
  animal: EmeraldAnimal;
  price: number;
  available: boolean;
};

export type EmeraldBreedingStage = "pairing" | "ovulation" | "gestation" | "birth";

export type EmeraldBreedingJob = {
  id: string;
  speciesId: EmeraldSpeciesId;
  damId: string;
  sireId: string;
  stage: EmeraldBreedingStage;
  startedAt: number;
  completesAt: number;
  seed: number;
};

export type EmeraldLitterRecord = {
  id: string;
  speciesId: EmeraldSpeciesId;
  damId: string;
  sireId: string;
  offspringIds: string[];
  bornAt: number;
  seasonLabel: string;
};

export type EmeraldHousingUnit = {
  id: string;
  enclosureId: KeeperEnclosureId;
  occupantId: string | null;
};

export type EmeraldHousingPlacement =
  | { kind: "enclosure"; housingUnitId: string }
  | { kind: "rack-tub"; rackId: string; tubId: string };

export type EmeraldKeeperSave = {
  schemaVersion: 2;
  animals: EmeraldAnimal[];
  purchasedOfferIds: string[];
  breedingJobs: EmeraldBreedingJob[];
  litters: EmeraldLitterRecord[];
  housingUnits: EmeraldHousingUnit[];
  racks: KeeperRackInstance[];
  selectedSpecies: EmeraldSpeciesId;
  updatedAt: number;
};

export const EMERALD_KEEPER_SAVE_KEY = "arboreal_keeper_emeralds_v1";
export const EMERALD_MARKET_DAY_MS = 86_400_000;
export const STARTER_RACK_ID = "starter-arboreal-rack-1";

const HOUR_MS = 3_600_000;

type LegacyHousingUnit = {
  id?: unknown;
  enclosureId?: unknown;
  occupantId?: unknown;
};

type RawEmeraldKeeperSave = Omit<Partial<EmeraldKeeperSave>, "housingUnits" | "racks"> & {
  housingUnits?: LegacyHousingUnit[];
  racks?: unknown[];
};

export const EMERALD_BREEDING_STAGES: Array<{
  id: EmeraldBreedingStage;
  label: string;
  durationMs: number;
}> = [
  { id: "pairing", label: "Pairing", durationMs: 4 * HOUR_MS },
  { id: "ovulation", label: "Ovulation", durationMs: 8 * HOUR_MS },
  { id: "gestation", label: "Gestation", durationMs: 24 * HOUR_MS },
  { id: "birth", label: "Birth", durationMs: 2 * HOUR_MS },
];

export const EMERALD_TRAIT_LABELS: Record<EmeraldTraitKey, string> = {
  whiteAmount: "White Amount",
  whiteStructure: "White Structure",
  whiteConnectivity: "White Connectivity",
  dorsalStripe: "Dorsal Stripe",
  patternDensity: "Pattern Density",
  patternCleanliness: "Pattern Cleanliness",
  contrast: "Contrast",
  greenSaturation: "Green Saturation",
  darkGreen: "Dark Green",
  yellowGreen: "Yellow-Green",
  darkEdging: "Dark Edging",
  speckling: "Speckling",
  redIntensity: "Red Intensity",
  orangeIntensity: "Orange Intensity",
  darkRed: "Dark Red",
};

const TRAITS_BY_SPECIES: Record<EmeraldSpeciesId, EmeraldTraitKey[]> = {
  northern_emerald_tree_boa: [
    "whiteAmount",
    "whiteStructure",
    "patternDensity",
    "contrast",
    "greenSaturation",
    "darkEdging",
    "speckling",
    "redIntensity",
    "orangeIntensity",
    "darkRed",
  ],
  amazon_basin_emerald_tree_boa: [
    "whiteAmount",
    "whiteConnectivity",
    "dorsalStripe",
    "patternDensity",
    "patternCleanliness",
    "contrast",
    "greenSaturation",
    "darkGreen",
    "yellowGreen",
    "speckling",
  ],
};

const BASE_MARKET_VALUE: Record<EmeraldSpeciesId, number> = {
  northern_emerald_tree_boa: 4200,
  amazon_basin_emerald_tree_boa: 6800,
};

const LITTER_RANGE: Record<EmeraldSpeciesId, readonly [number, number]> = {
  northern_emerald_tree_boa: [5, 11],
  amazon_basin_emerald_tree_boa: [4, 9],
};

export function createStarterRack(index = 1) {
  return createRackInstance({
    id: index === 1 ? STARTER_RACK_ID : `migrated-arboreal-rack-${index}`,
    rackDefinitionId: "arboreal-rack-12",
    roomId: "main-room",
    position: { x: (index - 1) * 5, y: 0 },
  });
}

export function createEmptyEmeraldKeeperSave(): EmeraldKeeperSave {
  return {
    schemaVersion: 2,
    animals: [],
    purchasedOfferIds: [],
    breedingJobs: [],
    litters: [],
    housingUnits: [],
    racks: [createStarterRack()],
    selectedSpecies: "northern_emerald_tree_boa",
    updatedAt: 0,
  };
}

export const EMPTY_EMERALD_KEEPER_SAVE: EmeraldKeeperSave = createEmptyEmeraldKeeperSave();

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(randomBetween(random, min, max + 1));
}

function rollTrait(random: () => number) {
  const roll = random();
  if (roll < 0.35) return 0;
  if (roll < 0.68) return randomInt(random, 1, 18);
  if (roll < 0.88) return randomInt(random, 19, 40);
  if (roll < 0.97) return randomInt(random, 41, 65);
  if (roll < 0.995) return randomInt(random, 66, 84);
  return randomInt(random, 85, 100);
}

function marketTraitSet(speciesId: EmeraldSpeciesId, random: () => number) {
  return Object.fromEntries(
    TRAITS_BY_SPECIES[speciesId].map((key) => [key, rollTrait(random)]),
  ) as Partial<Record<EmeraldTraitKey, number>>;
}

function assetForAnimal(
  speciesId: EmeraldSpeciesId,
  lifeStage: KeeperLifeStage,
  phase: KeeperPhase,
  neonateColor: EmeraldNeonateColor | null,
  random: () => number,
): KeeperAssetVariant | null {
  const assets = assetsForStage(speciesId, lifeStage, phase);
  if (!assets.length) return null;
  const colorMatched = neonateColor
    ? assets.filter((asset) => !asset.neonateColor || asset.neonateColor === neonateColor)
    : assets;
  const pool = colorMatched.length ? colorMatched : assets;
  return pool[Math.floor(random() * pool.length)] ?? pool[0] ?? null;
}

function randomNeonateColor(
  speciesId: EmeraldSpeciesId,
  phase: KeeperPhase,
  random: () => number,
): EmeraldNeonateColor {
  if (speciesId === "northern_emerald_tree_boa") {
    if (phase === "anaconda") return "green";
    return random() < 0.55 ? "red" : "green";
  }
  const colors: EmeraldNeonateColor[] = ["red", "orange", "yellow"];
  return colors[Math.floor(random() * colors.length)] ?? "red";
}

function marketPhase(speciesId: EmeraldSpeciesId, random: () => number): KeeperPhase {
  if (speciesId !== "northern_emerald_tree_boa") return "standard";
  return random() < 0.035 ? "anaconda" : "standard";
}

function phaseForOffspring(
  speciesId: EmeraldSpeciesId,
  dam: EmeraldAnimal,
  sire: EmeraldAnimal,
  random: () => number,
): KeeperPhase {
  if (speciesId !== "northern_emerald_tree_boa") return "standard";
  const phaseParents = Number(dam.phase === "anaconda") + Number(sire.phase === "anaconda");
  const chance = phaseParents === 2 ? 0.72 : phaseParents === 1 ? 0.28 : 0.005;
  return random() < chance ? "anaconda" : "standard";
}

export function createEmeraldAnimal(args: {
  id: string;
  speciesId: EmeraldSpeciesId;
  sex: EmeraldSex;
  lifeStage: KeeperLifeStage;
  phase: KeeperPhase;
  neonateColor: EmeraldNeonateColor | null;
  traits: Partial<Record<EmeraldTraitKey, number>>;
  generation?: number;
  parentIds?: string[];
  condition?: EmeraldCondition;
  name?: string;
  createdAt?: number;
  random?: () => number;
}) {
  const random = args.random ?? seededRandom(hashString(args.id));
  const asset = assetForAnimal(
    args.speciesId,
    args.lifeStage,
    args.phase,
    args.neonateColor,
    random,
  );

  return {
    id: args.id,
    name: args.name ?? ARBOREAL_KEEPER_SPECIES_BY_ID[args.speciesId].displayName,
    speciesId: args.speciesId,
    sex: args.sex,
    lifeStage: args.lifeStage,
    phase: args.phase,
    neonateColor: args.neonateColor,
    traits: Object.fromEntries(
      Object.entries(args.traits).map(([key, value]) => [key, clamp(Number(value ?? 0))]),
    ) as Partial<Record<EmeraldTraitKey, number>>,
    generation: Math.max(1, Math.round(args.generation ?? 1)),
    parentIds: args.parentIds ?? [],
    condition: args.condition ?? "Good",
    assetId: asset?.id ?? null,
    assetPath: asset?.path ?? null,
    notes: "",
    createdAt: args.createdAt ?? Date.now(),
  } satisfies EmeraldAnimal;
}

export function emeraldMarketForEpoch(epoch: number, keeperLevel: number): EmeraldMarketOffer[] {
  const random = seededRandom(epoch * 6151 + 1207);
  const availableSpecies = ([
    "northern_emerald_tree_boa",
    "amazon_basin_emerald_tree_boa",
  ] as EmeraldSpeciesId[]).filter(
    (speciesId) => keeperLevel >= ARBOREAL_KEEPER_SPECIES_BY_ID[speciesId].unlockLevel,
  );

  if (!availableSpecies.length) return [];

  return Array.from({ length: 8 }, (_, index) => {
    const speciesId = availableSpecies[index % availableSpecies.length] ?? availableSpecies[0];
    const lifeStage: KeeperLifeStage = random() < 0.68 ? "adult" : "subadult";
    const phase = marketPhase(speciesId, random);
    const neonateColor = null;
    const id = `emerald-market-${epoch}-${speciesId}-${index}`;
    const animal = createEmeraldAnimal({
      id,
      speciesId,
      sex: random() < 0.5 ? "Male" : "Female",
      lifeStage,
      phase,
      neonateColor,
      traits: marketTraitSet(speciesId, random),
      condition: random() < 0.25 ? "Excellent" : "Good",
      random,
    });
    return { id, animal, price: emeraldMarketValue(animal), available: true };
  });
}

export function emeraldMarketValue(animal: EmeraldAnimal) {
  const values = Object.values(animal.traits).map((value) => Number(value ?? 0));
  const strongest = values.length ? Math.max(...values) : 0;
  const strongTraits = values.filter((value) => value >= 65).length;
  const stageMultiplier = animal.lifeStage === "adult" ? 1 : animal.lifeStage === "subadult" ? 0.72 : 0.42;
  const conditionMultiplier = animal.condition === "Excellent" ? 1.08 : animal.condition === "Fair" ? 0.82 : 1;
  const phaseMultiplier = animal.phase === "anaconda" ? 2.8 : 1;
  const traitMultiplier = 1 + strongest / 350 + strongTraits * 0.08;
  return Math.round(
    (BASE_MARKET_VALUE[animal.speciesId] * stageMultiplier * conditionMultiplier * phaseMultiplier * traitMultiplier) /
      50,
  ) * 50;
}

function inheritedTrait(damValue: number, sireValue: number, random: () => number) {
  const midpoint = (damValue + sireValue) / 2;
  const spread = randomBetween(random, -14, 14);
  const rarePush = random() < 0.025 ? randomBetween(random, 6, 18) : 0;
  return clamp(midpoint + spread + rarePush);
}

export function generateEmeraldLitter(args: {
  dam: EmeraldAnimal;
  sire: EmeraldAnimal;
  seed: number;
  bornAt?: number;
}) {
  const { dam, sire } = args;
  if (dam.speciesId !== sire.speciesId) throw new Error("Emerald Tree Boa pairings must use the same species.");
  if (dam.sex !== "Female" || sire.sex !== "Male") throw new Error("Emerald Tree Boa pairing requires a female dam and male sire.");
  if (dam.lifeStage !== "adult" || sire.lifeStage !== "adult") throw new Error("Only adult Emerald Tree Boas can breed.");

  const speciesId = dam.speciesId;
  const random = seededRandom(args.seed);
  const [minimum, maximum] = LITTER_RANGE[speciesId];
  const litterSize = randomInt(random, minimum, maximum);
  const bornAt = args.bornAt ?? Date.now();
  const traitKeys = TRAITS_BY_SPECIES[speciesId];
  const generation = Math.max(dam.generation, sire.generation) + 1;

  return Array.from({ length: litterSize }, (_, index) => {
    const phase = phaseForOffspring(speciesId, dam, sire, random);
    const neonateColor = randomNeonateColor(speciesId, phase, random);
    const traits = Object.fromEntries(
      traitKeys.map((key) => [
        key,
        inheritedTrait(Number(dam.traits[key] ?? 0), Number(sire.traits[key] ?? 0), random),
      ]),
    ) as Partial<Record<EmeraldTraitKey, number>>;
    const id = `emerald-offspring-${args.seed}-${index}`;
    return createEmeraldAnimal({
      id,
      speciesId,
      sex: random() < 0.5 ? "Male" : "Female",
      lifeStage: "neonate",
      phase,
      neonateColor,
      traits,
      generation,
      parentIds: [dam.id, sire.id],
      condition: "Good",
      createdAt: bornAt,
      random,
    });
  });
}

export function startEmeraldBreedingJob(args: {
  dam: EmeraldAnimal;
  sire: EmeraldAnimal;
  now?: number;
}) {
  const now = args.now ?? Date.now();
  const firstStage = EMERALD_BREEDING_STAGES[0];
  if (args.dam.speciesId !== args.sire.speciesId) throw new Error("Pair animals from the same Emerald Tree Boa species.");
  if (args.dam.sex !== "Female" || args.sire.sex !== "Male") throw new Error("Select an adult female and adult male.");
  if (args.dam.lifeStage !== "adult" || args.sire.lifeStage !== "adult") throw new Error("Both breeders must be adults.");
  const seed = hashString(`${args.dam.id}:${args.sire.id}:${now}`);
  return {
    id: `emerald-breeding-${seed}`,
    speciesId: args.dam.speciesId,
    damId: args.dam.id,
    sireId: args.sire.id,
    stage: firstStage.id,
    startedAt: now,
    completesAt: now + firstStage.durationMs,
    seed,
  } satisfies EmeraldBreedingJob;
}

export function advanceEmeraldBreedingJob(job: EmeraldBreedingJob, now = Date.now()) {
  if (now < job.completesAt) return { job, completed: false as const };
  const currentIndex = EMERALD_BREEDING_STAGES.findIndex((stage) => stage.id === job.stage);
  const next = EMERALD_BREEDING_STAGES[currentIndex + 1];
  if (!next) return { job: null, completed: true as const };
  return {
    completed: false as const,
    job: { ...job, stage: next.id, startedAt: now, completesAt: now + next.durationMs },
  };
}

export function breedingStageLabel(stage: EmeraldBreedingStage) {
  return EMERALD_BREEDING_STAGES.find((item) => item.id === stage)?.label ?? stage;
}

export function eligibleEmeraldEnclosures(animal: Pick<EmeraldAnimal, "speciesId" | "lifeStage">) {
  return ARBOREAL_KEEPER_ENCLOSURES.filter((enclosure) =>
    enclosureSupportsAnimal(enclosure.id, animal.speciesId, animal.lifeStage),
  );
}

export function housingPlacementForAnimal(
  save: Pick<EmeraldKeeperSave, "housingUnits" | "racks">,
  animalId: string,
): EmeraldHousingPlacement | null {
  const unit = save.housingUnits.find((item) => item.occupantId === animalId);
  if (unit) return { kind: "enclosure", housingUnitId: unit.id };
  for (const rack of save.racks) {
    const tub = rack.tubs.find((item) => item.occupantId === animalId);
    if (tub) return { kind: "rack-tub", rackId: rack.id, tubId: tub.id };
  }
  return null;
}

export function housingPlacementSupportsAnimal(
  save: Pick<EmeraldKeeperSave, "housingUnits" | "racks">,
  placement: EmeraldHousingPlacement,
  animal: Pick<EmeraldAnimal, "speciesId" | "lifeStage">,
) {
  if (placement.kind === "enclosure") {
    const unit = save.housingUnits.find((item) => item.id === placement.housingUnitId);
    return Boolean(unit && enclosureSupportsAnimal(unit.enclosureId, animal.speciesId, animal.lifeStage));
  }
  const rack = save.racks.find((item) => item.id === placement.rackId);
  return Boolean(rack && rackSupportsAnimal(rack.rackDefinitionId, animal.speciesId, animal.lifeStage));
}

export function availableHousingPlacement(
  save: Pick<EmeraldKeeperSave, "housingUnits" | "racks">,
  animal: Pick<EmeraldAnimal, "speciesId" | "lifeStage">,
): EmeraldHousingPlacement | null {
  const rackSlot = emptyCompatibleRackTubs(save.racks, animal.speciesId, animal.lifeStage)[0];
  if (rackSlot) {
    return { kind: "rack-tub", rackId: rackSlot.rack.id, tubId: rackSlot.tub.id };
  }
  const unit = save.housingUnits.find(
    (item) =>
      item.occupantId === null &&
      enclosureSupportsAnimal(item.enclosureId, animal.speciesId, animal.lifeStage),
  );
  return unit ? { kind: "enclosure", housingUnitId: unit.id } : null;
}

export function availableHousingUnit(
  save: Pick<EmeraldKeeperSave, "housingUnits">,
  animal: Pick<EmeraldAnimal, "speciesId" | "lifeStage">,
) {
  return save.housingUnits.find(
    (unit) =>
      unit.occupantId === null &&
      enclosureSupportsAnimal(unit.enclosureId, animal.speciesId, animal.lifeStage),
  ) ?? null;
}

export function releaseAnimalHousing(save: EmeraldKeeperSave, animalId: string): EmeraldKeeperSave {
  return {
    ...save,
    housingUnits: save.housingUnits.map((unit) =>
      unit.occupantId === animalId ? { ...unit, occupantId: null } : unit,
    ),
    racks: save.racks.map((rack) => ({
      ...rack,
      tubs: rack.tubs.map((tub) =>
        tub.occupantId === animalId ? { ...tub, occupantId: null } : tub,
      ),
    })),
  };
}

export function assignAnimalToHousing(
  save: EmeraldKeeperSave,
  animalId: string,
  placement: EmeraldHousingPlacement,
): EmeraldKeeperSave {
  const released = releaseAnimalHousing(save, animalId);
  if (placement.kind === "enclosure") {
    return {
      ...released,
      housingUnits: released.housingUnits.map((unit) =>
        unit.id === placement.housingUnitId ? { ...unit, occupantId: animalId } : unit,
      ),
    };
  }
  return {
    ...released,
    racks: released.racks.map((rack) =>
      rack.id === placement.rackId
        ? {
            ...rack,
            tubs: rack.tubs.map((tub) =>
              tub.id === placement.tubId ? { ...tub, occupantId: animalId } : tub,
            ),
          }
        : rack,
    ),
  };
}

export function housingLabelForAnimal(
  save: Pick<EmeraldKeeperSave, "housingUnits" | "racks">,
  animalId: string,
) {
  const placement = housingPlacementForAnimal(save, animalId);
  if (!placement) return "Unassigned";
  if (placement.kind === "enclosure") {
    const unit = save.housingUnits.find((item) => item.id === placement.housingUnitId);
    return ARBOREAL_KEEPER_ENCLOSURES.find((item) => item.id === unit?.enclosureId)?.displayName ?? "Enclosure";
  }
  const rack = save.racks.find((item) => item.id === placement.rackId);
  const tub = rack?.tubs.find((item) => item.id === placement.tubId);
  const definition = rack ? rackDefinition(rack.rackDefinitionId) : null;
  return `${definition?.displayName ?? "Arboreal Rack"} · ${tub?.label ?? "Tub"}`;
}

export function openRackTubCount(
  save: Pick<EmeraldKeeperSave, "racks">,
  speciesId: EmeraldSpeciesId,
  lifeStage: KeeperLifeStage = "neonate",
) {
  return emptyCompatibleRackTubs(save.racks, speciesId, lifeStage).length;
}

function normalizeRack(raw: unknown, index: number): KeeperRackInstance | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Partial<KeeperRackInstance>;
  const definition = ARBOREAL_KEEPER_RACKS.find((item) => item.id === input.rackDefinitionId);
  if (!definition) return null;
  const id = typeof input.id === "string" && input.id ? input.id : `arboreal-rack-${index + 1}`;
  const normalized = createRackInstance({
    id,
    rackDefinitionId: definition.id,
    roomId: typeof input.roomId === "string" && input.roomId ? input.roomId : "main-room",
    position: {
      x: Number.isFinite(Number(input.position?.x)) ? Number(input.position?.x) : index * 5,
      y: Number.isFinite(Number(input.position?.y)) ? Number(input.position?.y) : 0,
    },
    rotation: input.rotation === 90 || input.rotation === 180 || input.rotation === 270 ? input.rotation : 0,
  });
  const oldTubs = Array.isArray(input.tubs) ? input.tubs : [];
  normalized.tubs = normalized.tubs.map((tub) => {
    const old = oldTubs.find((item) => item.id === tub.id);
    return {
      ...tub,
      occupantId: typeof old?.occupantId === "string" ? old.occupantId : null,
    };
  });
  return normalized;
}

export function sanitizeEmeraldKeeperSave(value: unknown): EmeraldKeeperSave {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createEmptyEmeraldKeeperSave();
  const input = value as RawEmeraldKeeperSave;
  const animals = Array.isArray(input.animals) ? input.animals : [];
  const rawHousing: LegacyHousingUnit[] = Array.isArray(input.housingUnits) ? input.housingUnits : [];
  const legacyTubUnits = rawHousing.filter((unit) => unit.enclosureId === "neonate-arboreal-tub");

  let racks = Array.isArray(input.racks)
    ? input.racks.map((rack, index) => normalizeRack(rack, index)).filter((rack): rack is KeeperRackInstance => Boolean(rack))
    : [];

  const legacyCapacityNeeded = legacyTubUnits.length;
  const totalRackCapacity = () => racks.reduce((sum, rack) => sum + rack.tubs.length, 0);
  if (!racks.length) racks = [createStarterRack()];
  while (totalRackCapacity() < Math.max(12, legacyCapacityNeeded)) {
    racks.push(createStarterRack(racks.length + 1));
  }

  const housingUnits: EmeraldHousingUnit[] = rawHousing.flatMap((unit, index) => {
    const enclosureId = String(unit.enclosureId ?? "");
    if (enclosureId === "neonate-arboreal-tub") return [];
    const migratedId: KeeperEnclosureId | null =
      enclosureId === "chondro-dojo-bin"
        ? "chondro-dojo-bin"
        : enclosureId === "pvc-arboreal-medium" || enclosureId === "glass-arboreal-medium" || enclosureId === "glass-arboreal-large"
          ? "pvc-arboreal-medium"
          : null;
    if (!migratedId) return [];
    return [{
      id: typeof unit.id === "string" && unit.id ? unit.id : `keeper-housing-${index + 1}`,
      enclosureId: migratedId,
      occupantId: typeof unit.occupantId === "string" ? unit.occupantId : null,
    }];
  });

  const neonateIds = new Set(
    animals.filter((animal) => animal.lifeStage === "neonate").map((animal) => animal.id),
  );
  const rackCandidateOccupants = new Set<string>();
  for (const unit of legacyTubUnits) {
    if (typeof unit.occupantId === "string") rackCandidateOccupants.add(unit.occupantId);
  }
  for (const unit of housingUnits) {
    if (unit.occupantId && neonateIds.has(unit.occupantId)) {
      rackCandidateOccupants.add(unit.occupantId);
      unit.occupantId = null;
    }
  }
  for (const animal of animals) {
    if (animal.lifeStage === "neonate") rackCandidateOccupants.add(animal.id);
  }

  const alreadyRacked = new Set(
    racks.flatMap((rack) => rack.tubs.map((tub) => tub.occupantId).filter((id): id is string => Boolean(id))),
  );
  const pending = [...rackCandidateOccupants].filter((id) => !alreadyRacked.has(id));
  let openSlots = racks.flatMap((rack) => rack.tubs.filter((tub) => tub.occupantId === null).map((tub) => ({ rack, tub })));
  while (openSlots.length < pending.length) {
    const extra = createStarterRack(racks.length + 1);
    racks.push(extra);
    openSlots = racks.flatMap((rack) => rack.tubs.filter((tub) => tub.occupantId === null).map((tub) => ({ rack, tub })));
  }
  pending.forEach((animalId, index) => {
    const slot = openSlots[index];
    if (slot) slot.tub.occupantId = animalId;
  });

  return {
    schemaVersion: 2,
    animals,
    purchasedOfferIds: Array.isArray(input.purchasedOfferIds) ? input.purchasedOfferIds : [],
    breedingJobs: Array.isArray(input.breedingJobs) ? input.breedingJobs : [],
    litters: Array.isArray(input.litters) ? input.litters : [],
    housingUnits,
    racks,
    selectedSpecies:
      input.selectedSpecies === "amazon_basin_emerald_tree_boa"
        ? "amazon_basin_emerald_tree_boa"
        : "northern_emerald_tree_boa",
    updatedAt: Number.isFinite(Number(input.updatedAt)) ? Number(input.updatedAt) : 0,
  };
}

export function nextLifeStage(stage: KeeperLifeStage): KeeperLifeStage | null {
  if (stage === "neonate") return "subadult";
  if (stage === "subadult") return "adult";
  return null;
}

export function growthCostForEmerald(animal: EmeraldAnimal) {
  if (animal.lifeStage === "neonate") return animal.speciesId === "amazon_basin_emerald_tree_boa" ? 1800 : 1400;
  if (animal.lifeStage === "subadult") return animal.speciesId === "amazon_basin_emerald_tree_boa" ? 3400 : 2800;
  return 0;
}

export function growEmeraldAnimal(animal: EmeraldAnimal) {
  const next = nextLifeStage(animal.lifeStage);
  if (!next) return animal;
  const random = seededRandom(hashString(`${animal.id}:${next}:${Date.now()}`));
  const asset = assetForAnimal(animal.speciesId, next, animal.phase, null, random);
  return {
    ...animal,
    lifeStage: next,
    neonateColor: next === "neonate" ? animal.neonateColor : null,
    assetId: asset?.id ?? animal.assetId,
    assetPath: asset?.path ?? animal.assetPath,
  };
}

export function emeraldSpeciesDisplayName(speciesId: EmeraldSpeciesId) {
  return ARBOREAL_KEEPER_SPECIES_BY_ID[speciesId].displayName;
}
