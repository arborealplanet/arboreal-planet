export type KeeperRoadmapGroup =
  | "Python"
  | "Boa"
  | "Colubrid"
  | "Gecko"
  | "Monitor"
  | "Iguana"
  | "Amphibian";

export type KeeperRoadmapLock = "experience" | "capital" | "rarity" | "certification";
export type KeeperRoadmapStatus = "active" | "planned" | "conservation";

export type KeeperRoadmapSpecies = {
  id: string;
  displayName: string;
  scientificName: string;
  group: KeeperRoadmapGroup;
  unlockLevel: number;
  status: KeeperRoadmapStatus;
  lock: KeeperRoadmapLock;
  note: string;
};

export const ARBOREAL_KEEPER_ROADMAP: KeeperRoadmapSpecies[] = [
  {
    id: "green_tree_python",
    displayName: "Green Tree Python",
    scientificName: "Morelia viridis / Morelia azurea complex",
    group: "Python",
    unlockLevel: 1,
    status: "active",
    lock: "experience",
    note: "Original Arboreal Keeper breeding program.",
  },
  {
    id: "crested_gecko",
    displayName: "Crested Gecko",
    scientificName: "Correlophus ciliatus",
    group: "Gecko",
    unlockLevel: 4,
    status: "planned",
    lock: "experience",
    note: "Entry gecko program planned for the shared facility.",
  },
  {
    id: "amazon_tree_boa",
    displayName: "Amazon Tree Boa",
    scientificName: "Corallus hortulanus",
    group: "Boa",
    unlockLevel: 6,
    status: "planned",
    lock: "capital",
    note: "Color-heavy live-bearing boa program planned after the first expansion tier.",
  },
  {
    id: "gargoyle_gecko",
    displayName: "Gargoyle Gecko",
    scientificName: "Rhacodactylus auriculatus",
    group: "Gecko",
    unlockLevel: 7,
    status: "planned",
    lock: "experience",
    note: "Second gecko program with its own trait system.",
  },
  {
    id: "northern_emerald_tree_boa",
    displayName: "Northern Emerald Tree Boa",
    scientificName: "Corallus caninus",
    group: "Boa",
    unlockLevel: 8,
    status: "active",
    lock: "experience",
    note: "Live-bearing Emerald Tree Boa program including the Anaconda Phase.",
  },
  {
    id: "solomon_island_tree_boa",
    displayName: "Solomon Island Tree Boa",
    scientificName: "Candoia bibroni",
    group: "Boa",
    unlockLevel: 12,
    status: "planned",
    lock: "rarity",
    note: "A later live-bearing boa branch for the grow-out facility tier.",
  },
  {
    id: "tokay_gecko",
    displayName: "Tokay Gecko",
    scientificName: "Gekko gecko",
    group: "Gecko",
    unlockLevel: 14,
    status: "planned",
    lock: "experience",
    note: "Higher-difficulty gecko branch planned for established keepers.",
  },
  {
    id: "amazon_basin_emerald_tree_boa",
    displayName: "Amazon Basin Emerald Tree Boa",
    scientificName: "Corallus batesii",
    group: "Boa",
    unlockLevel: 18,
    status: "active",
    lock: "capital",
    note: "Premium Emerald Tree Boa program with its own trait and asset pools.",
  },
  {
    id: "boiga_dendrophila",
    displayName: "Mangrove Snake",
    scientificName: "Boiga dendrophila",
    group: "Colubrid",
    unlockLevel: 22,
    status: "planned",
    lock: "experience",
    note: "First planned arboreal colubrid program.",
  },
  {
    id: "leachianus_gecko",
    displayName: "Leachianus Gecko",
    scientificName: "Rhacodactylus leachianus",
    group: "Gecko",
    unlockLevel: 24,
    status: "planned",
    lock: "capital",
    note: "Large premium gecko program for established facilities.",
  },
  {
    id: "emerald_tree_monitor",
    displayName: "Emerald Tree Monitor",
    scientificName: "Varanus prasinus",
    group: "Monitor",
    unlockLevel: 30,
    status: "planned",
    lock: "experience",
    note: "Advanced arboreal lizard program with larger enclosure requirements.",
  },
  {
    id: "fiji_iguana",
    displayName: "Fiji Iguana Conservation Program",
    scientificName: "Brachylophus spp.",
    group: "Iguana",
    unlockLevel: 50,
    status: "conservation",
    lock: "certification",
    note: "Endgame conservation program gated by the fictional in-game Fiji Iguana Conservation Certificate and facility requirements.",
  },
];

export const ARBOREAL_KEEPER_PLANNED_SPECIES = ARBOREAL_KEEPER_ROADMAP.filter(
  (species) => species.status !== "active",
);

export function roadmapSpeciesAvailableAtLevel(level: number) {
  return ARBOREAL_KEEPER_ROADMAP.filter((species) => species.unlockLevel <= level);
}
