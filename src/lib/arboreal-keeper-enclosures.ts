import type { KeeperLifeStage, KeeperSpeciesId } from "@/lib/arboreal-keeper-species";

export type KeeperEnclosureId =
  | "neonate-arboreal-tub"
  | "chondro-dojo-bin"
  | "glass-arboreal-small"
  | "pvc-arboreal-medium"
  | "glass-arboreal-medium"
  | "glass-arboreal-large";

export type KeeperEnclosureStrategy = "breeder" | "display" | "hybrid";

export type KeeperEnclosureStats = {
  temperatureStability: number;
  humidityStability: number;
  ventilation: number;
  perchQuality: number;
  cleaningEase: number;
  stressReduction: number;
  displayQuality: number;
  plantCover: number;
};

export type KeeperEnclosureDefinition = {
  id: KeeperEnclosureId;
  displayName: string;
  habitatProfile: "arboreal-tropical";
  sizeClass: "small" | "medium" | "large";
  dimensions: string;
  strategy: KeeperEnclosureStrategy;
  price: number;
  compatibleSpecies: Partial<Record<KeeperSpeciesId, KeeperLifeStage[]>>;
  baseCapacity: number;
  cohabitationCapable: boolean;
  stats: KeeperEnclosureStats;
  customizationSlots: {
    primaryPerch: number;
    secondaryPerch: number;
    plants: number;
    background: number;
    water: number;
    environmentalEquipment: number;
  };
};

export const ARBOREAL_KEEPER_ENCLOSURES: KeeperEnclosureDefinition[] = [
  {
    id: "neonate-arboreal-tub",
    displayName: "Neonate Arboreal Tub",
    habitatProfile: "arboreal-tropical",
    sizeClass: "small",
    dimensions: "compact neonate tub",
    strategy: "breeder",
    price: 175,
    compatibleSpecies: {
      green_tree_python: ["neonate"],
      northern_emerald_tree_boa: ["neonate"],
      amazon_basin_emerald_tree_boa: ["neonate"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
    stats: {
      temperatureStability: 66,
      humidityStability: 72,
      ventilation: 58,
      perchQuality: 58,
      cleaningEase: 92,
      stressReduction: 76,
      displayQuality: 28,
      plantCover: 20,
    },
    customizationSlots: {
      primaryPerch: 1,
      secondaryPerch: 0,
      plants: 1,
      background: 1,
      water: 1,
      environmentalEquipment: 1,
    },
  },
  {
    id: "chondro-dojo-bin",
    displayName: "Chondro Dojo Bin",
    habitatProfile: "arboreal-tropical",
    sizeClass: "small",
    dimensions: "64 qt arboreal bin",
    strategy: "breeder",
    price: 250,
    compatibleSpecies: {
      green_tree_python: ["neonate", "subadult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
    stats: {
      temperatureStability: 74,
      humidityStability: 78,
      ventilation: 62,
      perchQuality: 70,
      cleaningEase: 94,
      stressReduction: 82,
      displayQuality: 35,
      plantCover: 30,
    },
    customizationSlots: {
      primaryPerch: 1,
      secondaryPerch: 1,
      plants: 2,
      background: 1,
      water: 1,
      environmentalEquipment: 1,
    },
  },
  {
    id: "glass-arboreal-small",
    displayName: "Hatchling Arboreal Vivarium",
    habitatProfile: "arboreal-tropical",
    sizeClass: "small",
    dimensions: "12 × 12 × 18 in",
    strategy: "display",
    price: 425,
    compatibleSpecies: {
      green_tree_python: ["neonate"],
      northern_emerald_tree_boa: ["neonate"],
      amazon_basin_emerald_tree_boa: ["neonate"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
    stats: {
      temperatureStability: 62,
      humidityStability: 68,
      ventilation: 78,
      perchQuality: 66,
      cleaningEase: 60,
      stressReduction: 72,
      displayQuality: 84,
      plantCover: 72,
    },
    customizationSlots: {
      primaryPerch: 1,
      secondaryPerch: 1,
      plants: 3,
      background: 1,
      water: 1,
      environmentalEquipment: 1,
    },
  },
  {
    id: "pvc-arboreal-medium",
    displayName: "PVC Arboreal",
    habitatProfile: "arboreal-tropical",
    sizeClass: "medium",
    dimensions: "24 × 24 × 36 in",
    strategy: "breeder",
    price: 650,
    compatibleSpecies: {
      green_tree_python: ["subadult", "adult"],
      northern_emerald_tree_boa: ["subadult", "adult"],
      amazon_basin_emerald_tree_boa: ["subadult", "adult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
    stats: {
      temperatureStability: 86,
      humidityStability: 82,
      ventilation: 74,
      perchQuality: 82,
      cleaningEase: 88,
      stressReduction: 80,
      displayQuality: 56,
      plantCover: 55,
    },
    customizationSlots: {
      primaryPerch: 1,
      secondaryPerch: 2,
      plants: 4,
      background: 1,
      water: 1,
      environmentalEquipment: 2,
    },
  },
  {
    id: "glass-arboreal-medium",
    displayName: "Juvenile Arboreal Vivarium",
    habitatProfile: "arboreal-tropical",
    sizeClass: "medium",
    dimensions: "18 × 18 × 24 in",
    strategy: "display",
    price: 900,
    compatibleSpecies: {
      green_tree_python: ["neonate", "subadult", "adult"],
      northern_emerald_tree_boa: ["neonate", "subadult", "adult"],
      amazon_basin_emerald_tree_boa: ["neonate", "subadult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
    stats: {
      temperatureStability: 68,
      humidityStability: 74,
      ventilation: 84,
      perchQuality: 78,
      cleaningEase: 58,
      stressReduction: 84,
      displayQuality: 92,
      plantCover: 88,
    },
    customizationSlots: {
      primaryPerch: 1,
      secondaryPerch: 2,
      plants: 5,
      background: 1,
      water: 1,
      environmentalEquipment: 2,
    },
  },
  {
    id: "glass-arboreal-large",
    displayName: "Large Arboreal Display",
    habitatProfile: "arboreal-tropical",
    sizeClass: "large",
    dimensions: "24 × 24 × 48 in",
    strategy: "hybrid",
    price: 1800,
    compatibleSpecies: {
      green_tree_python: ["adult"],
      northern_emerald_tree_boa: ["adult"],
      amazon_basin_emerald_tree_boa: ["adult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
    stats: {
      temperatureStability: 76,
      humidityStability: 80,
      ventilation: 82,
      perchQuality: 90,
      cleaningEase: 55,
      stressReduction: 92,
      displayQuality: 98,
      plantCover: 94,
    },
    customizationSlots: {
      primaryPerch: 2,
      secondaryPerch: 3,
      plants: 7,
      background: 1,
      water: 1,
      environmentalEquipment: 3,
    },
  },
];

export function enclosureSupportsAnimal(
  enclosureId: KeeperEnclosureId,
  speciesId: KeeperSpeciesId,
  stage: KeeperLifeStage,
) {
  const enclosure = ARBOREAL_KEEPER_ENCLOSURES.find((item) => item.id === enclosureId);
  return Boolean(enclosure?.compatibleSpecies[speciesId]?.includes(stage));
}

export function enclosureCapacityForSpecies(
  enclosureId: KeeperEnclosureId,
  speciesId: KeeperSpeciesId,
) {
  const enclosure = ARBOREAL_KEEPER_ENCLOSURES.find((item) => item.id === enclosureId);
  if (!enclosure?.compatibleSpecies[speciesId]) return 0;
  return enclosure.cohabitationCapable ? enclosure.baseCapacity : 1;
}
