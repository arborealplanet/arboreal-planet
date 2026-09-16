export type KeeperSpeciesId =
  | "green_tree_python"
  | "northern_emerald_tree_boa"
  | "amazon_basin_emerald_tree_boa";

export type KeeperAnimalGroup = "Python" | "Boa";
export type KeeperBreedingMode = "oviparous" | "viviparous";
export type KeeperLifeStage = "neonate" | "subadult" | "adult";
export type KeeperCareDifficulty = "intermediate" | "advanced" | "expert";
export type KeeperRarityTier = "common" | "uncommon" | "rare" | "exceptional";
export type KeeperPhase = "standard" | "anaconda";

export type KeeperAssetVariant = {
  id: string;
  stage: KeeperLifeStage;
  path: string;
  phase?: KeeperPhase;
  neonateColor?: string;
  notes?: string;
};

export type KeeperBreedingStage = {
  id: string;
  label: string;
};

export type KeeperSpeciesDefinition = {
  id: KeeperSpeciesId;
  displayName: string;
  scientificName: string;
  animalGroup: KeeperAnimalGroup;
  programGroup: string;
  breedingMode: KeeperBreedingMode;
  breedingStages: KeeperBreedingStage[];
  unlockLevel: number;
  careDifficulty: KeeperCareDifficulty;
  rarity: KeeperRarityTier;
  valueTier: 1 | 2 | 3 | 4 | 5;
  enclosureProfiles: string[];
  cohabitation: {
    allowed: boolean;
    maxGroupSize: number;
  };
  neonateRules?: {
    colors: string[];
    phaseColorRequirements?: Partial<Record<KeeperPhase, string[]>>;
  };
  traits: string[];
  assets: KeeperAssetVariant[];
};

const GTP_ASSETS: KeeperAssetVariant[] = [
  {
    id: "gtp_neonate_existing_pool",
    stage: "neonate",
    path: "/hatchery/game/neonates.webp",
    notes: "Existing Green Tree Python neonate pool; individual asset migration remains backward compatible.",
  },
];

const NORTHERN_ETB_ASSETS: KeeperAssetVariant[] = [
  {
    id: "etb_northern_neonate_red_01",
    stage: "neonate",
    path: "/hatchery/animals/emerald-tree-boas/northern/neonate/red-01.png",
    phase: "standard",
    neonateColor: "red",
  },
  {
    id: "etb_northern_neonate_green_01",
    stage: "neonate",
    path: "/hatchery/animals/emerald-tree-boas/northern/neonate/green-01.png",
    phase: "standard",
    neonateColor: "green",
  },
  {
    id: "etb_northern_neonate_anaconda_01",
    stage: "neonate",
    path: "/hatchery/animals/emerald-tree-boas/northern/neonate/anaconda-green-01.png",
    phase: "anaconda",
    neonateColor: "green",
  },
  {
    id: "etb_northern_subadult_01",
    stage: "subadult",
    path: "/hatchery/animals/emerald-tree-boas/northern/subadult/standard-01.png",
    phase: "standard",
  },
  {
    id: "etb_northern_adult_standard_01",
    stage: "adult",
    path: "/hatchery/animals/emerald-tree-boas/northern/adult/standard-01.png",
    phase: "standard",
  },
  {
    id: "etb_northern_adult_standard_02",
    stage: "adult",
    path: "/hatchery/animals/emerald-tree-boas/northern/adult/standard-02.png",
    phase: "standard",
  },
  {
    id: "etb_northern_adult_standard_03",
    stage: "adult",
    path: "/hatchery/animals/emerald-tree-boas/northern/adult/standard-03.png",
    phase: "standard",
  },
  {
    id: "etb_northern_adult_anaconda_01",
    stage: "adult",
    path: "/hatchery/animals/emerald-tree-boas/northern/adult/anaconda-01.png",
    phase: "anaconda",
  },
];

const BASIN_ETB_ASSETS: KeeperAssetVariant[] = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `etb_basin_neonate_${String(index + 1).padStart(2, "0")}`,
    stage: "neonate" as const,
    path: `/hatchery/animals/emerald-tree-boas/amazon-basin/neonate/${String(index + 1).padStart(2, "0")}.png`,
    phase: "standard" as const,
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `etb_basin_subadult_${String(index + 1).padStart(2, "0")}`,
    stage: "subadult" as const,
    path: `/hatchery/animals/emerald-tree-boas/amazon-basin/subadult/${String(index + 1).padStart(2, "0")}.png`,
    phase: "standard" as const,
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `etb_basin_adult_${String(index + 1).padStart(2, "0")}`,
    stage: "adult" as const,
    path: `/hatchery/animals/emerald-tree-boas/amazon-basin/adult/${String(index + 1).padStart(2, "0")}.png`,
    phase: "standard" as const,
  })),
];

export const ARBOREAL_KEEPER_SPECIES: KeeperSpeciesDefinition[] = [
  {
    id: "green_tree_python",
    displayName: "Green Tree Python",
    scientificName: "Morelia viridis / Morelia azurea complex",
    animalGroup: "Python",
    programGroup: "Green Tree Pythons",
    breedingMode: "oviparous",
    breedingStages: [
      { id: "cycling", label: "Cycling" },
      { id: "pairing", label: "Pairing" },
      { id: "development", label: "Development" },
      { id: "incubation", label: "Incubation" },
      { id: "hatching", label: "Hatching" },
    ],
    unlockLevel: 1,
    careDifficulty: "advanced",
    rarity: "uncommon",
    valueTier: 3,
    enclosureProfiles: ["arboreal-tropical-small", "arboreal-tropical-medium", "arboreal-pvc-medium"],
    cohabitation: { allowed: false, maxGroupSize: 1 },
    neonateRules: { colors: ["red", "yellow"] },
    traits: ["highBlack", "highWhite", "blue", "yellowRetention", "blotches"],
    assets: GTP_ASSETS,
  },
  {
    id: "northern_emerald_tree_boa",
    displayName: "Northern Emerald Tree Boa",
    scientificName: "Corallus caninus",
    animalGroup: "Boa",
    programGroup: "Emerald Tree Boas",
    breedingMode: "viviparous",
    breedingStages: [
      { id: "pairing", label: "Pairing" },
      { id: "ovulation", label: "Ovulation" },
      { id: "gestation", label: "Gestation" },
      { id: "birth", label: "Birth" },
      { id: "litter", label: "Litter" },
    ],
    unlockLevel: 8,
    careDifficulty: "advanced",
    rarity: "rare",
    valueTier: 4,
    enclosureProfiles: ["arboreal-tropical-small", "arboreal-tropical-medium", "arboreal-pvc-medium", "arboreal-display-medium"],
    cohabitation: { allowed: false, maxGroupSize: 1 },
    neonateRules: {
      colors: ["red", "green"],
      phaseColorRequirements: {
        anaconda: ["green"],
      },
    },
    traits: [
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
    assets: NORTHERN_ETB_ASSETS,
  },
  {
    id: "amazon_basin_emerald_tree_boa",
    displayName: "Amazon Basin Emerald Tree Boa",
    scientificName: "Corallus batesii",
    animalGroup: "Boa",
    programGroup: "Emerald Tree Boas",
    breedingMode: "viviparous",
    breedingStages: [
      { id: "pairing", label: "Pairing" },
      { id: "ovulation", label: "Ovulation" },
      { id: "gestation", label: "Gestation" },
      { id: "birth", label: "Birth" },
      { id: "litter", label: "Litter" },
    ],
    unlockLevel: 18,
    careDifficulty: "expert",
    rarity: "rare",
    valueTier: 5,
    enclosureProfiles: ["arboreal-tropical-medium", "arboreal-pvc-medium", "arboreal-display-medium", "arboreal-display-large"],
    cohabitation: { allowed: false, maxGroupSize: 1 },
    traits: [
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
    assets: BASIN_ETB_ASSETS,
  },
];

export const ARBOREAL_KEEPER_SPECIES_BY_ID = Object.fromEntries(
  ARBOREAL_KEEPER_SPECIES.map((species) => [species.id, species]),
) as Record<KeeperSpeciesId, KeeperSpeciesDefinition>;

export function assetsForStage(
  speciesId: KeeperSpeciesId,
  stage: KeeperLifeStage,
  phase: KeeperPhase = "standard",
) {
  return ARBOREAL_KEEPER_SPECIES_BY_ID[speciesId].assets.filter(
    (asset) => asset.stage === stage && (asset.phase ?? "standard") === phase,
  );
}

export function isValidNeonatePhaseColor(
  speciesId: KeeperSpeciesId,
  phase: KeeperPhase,
  color: string,
) {
  const rules = ARBOREAL_KEEPER_SPECIES_BY_ID[speciesId].neonateRules;
  if (!rules) return true;
  if (!rules.colors.includes(color)) return false;
  const required = rules.phaseColorRequirements?.[phase];
  return !required?.length || required.includes(color);
}
