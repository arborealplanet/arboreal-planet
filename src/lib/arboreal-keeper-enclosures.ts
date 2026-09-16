import type { KeeperLifeStage, KeeperSpeciesId } from "@/lib/arboreal-keeper-species";

export type KeeperEnclosureId =
  | "neonate-arboreal-tub"
  | "chondro-dojo-bin"
  | "pvc-arboreal-medium"
  | "glass-arboreal-medium"
  | "glass-arboreal-large";

export type KeeperEnclosureDefinition = {
  id: KeeperEnclosureId;
  displayName: string;
  habitatProfile: "arboreal-tropical";
  sizeClass: "small" | "medium" | "large";
  price: number;
  compatibleSpecies: Partial<Record<KeeperSpeciesId, KeeperLifeStage[]>>;
  baseCapacity: number;
  cohabitationCapable: boolean;
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
    price: 175,
    compatibleSpecies: {
      green_tree_python: ["neonate"],
      northern_emerald_tree_boa: ["neonate"],
      amazon_basin_emerald_tree_boa: ["neonate"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
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
    price: 250,
    compatibleSpecies: {
      green_tree_python: ["neonate", "subadult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
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
    id: "pvc-arboreal-medium",
    displayName: "PVC Arboreal",
    habitatProfile: "arboreal-tropical",
    sizeClass: "medium",
    price: 650,
    compatibleSpecies: {
      green_tree_python: ["subadult", "adult"],
      northern_emerald_tree_boa: ["subadult", "adult"],
      amazon_basin_emerald_tree_boa: ["subadult", "adult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
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
    displayName: "Medium Arboreal Vivarium",
    habitatProfile: "arboreal-tropical",
    sizeClass: "medium",
    price: 900,
    compatibleSpecies: {
      green_tree_python: ["neonate", "subadult", "adult"],
      northern_emerald_tree_boa: ["neonate", "subadult", "adult"],
      amazon_basin_emerald_tree_boa: ["neonate", "subadult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
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
    price: 1800,
    compatibleSpecies: {
      green_tree_python: ["adult"],
      northern_emerald_tree_boa: ["adult"],
      amazon_basin_emerald_tree_boa: ["adult"],
    },
    baseCapacity: 1,
    cohabitationCapable: false,
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
