import type { CSSProperties } from "react";
import type { KeeperLifeStage, KeeperPhase, KeeperSpeciesId } from "@/lib/arboreal-keeper-species";

const EMERALD_ATLAS = "data:image/webp;base64,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[... truncated for brevity in this interface ...]AAAAABFe/mbcSd2Kk/vm0fHZ4ZC/b0n8020OzyCUjOx6il1bChSbFbeS+GATdmoRenabWUZcMbUCgszDDIdu3lCaOY7KjY4etscnk0xPPFch2FQngpi7gAAAAA==";
const COLS = 5;
const ROWS = 4;

type EmeraldSpeciesId = Extract<KeeperSpeciesId, "northern_emerald_tree_boa" | "amazon_basin_emerald_tree_boa">;
type EmeraldArt = {
  id: string;
  speciesId: EmeraldSpeciesId;
  stage: KeeperLifeStage;
  phase: KeeperPhase;
  cell: number;
  neonateColor?: string;
  weight?: number;
};

export const EMERALD_ART: EmeraldArt[] = [
  { id: "etb-northern-neonate-red-01-v3", speciesId: "northern_emerald_tree_boa", stage: "neonate", phase: "standard", neonateColor: "red", cell: 0 },
  { id: "etb-northern-neonate-red-02-v3", speciesId: "northern_emerald_tree_boa", stage: "neonate", phase: "standard", neonateColor: "red", cell: 1 },
  { id: "etb-northern-neonate-red-03-v3", speciesId: "northern_emerald_tree_boa", stage: "neonate", phase: "standard", neonateColor: "red", cell: 3 },
  { id: "etb-northern-anaconda-neonate-v3", speciesId: "northern_emerald_tree_boa", stage: "neonate", phase: "anaconda", neonateColor: "green", cell: 2 },
  { id: "etb-northern-anaconda-subadult-v3", speciesId: "northern_emerald_tree_boa", stage: "subadult", phase: "anaconda", cell: 2 },
  { id: "etb-northern-subadult-01-v3", speciesId: "northern_emerald_tree_boa", stage: "subadult", phase: "standard", cell: 4 },
  { id: "etb-northern-subadult-02-v3", speciesId: "northern_emerald_tree_boa", stage: "subadult", phase: "standard", cell: 5 },
  { id: "etb-northern-adult-rare-01-v3", speciesId: "northern_emerald_tree_boa", stage: "adult", phase: "standard", cell: 6, weight: 6 },
  { id: "etb-northern-adult-common-01-v3", speciesId: "northern_emerald_tree_boa", stage: "adult", phase: "standard", cell: 8, weight: 47 },
  { id: "etb-northern-adult-common-02-v3", speciesId: "northern_emerald_tree_boa", stage: "adult", phase: "standard", cell: 9, weight: 47 },
  { id: "etb-northern-anaconda-adult-v3", speciesId: "northern_emerald_tree_boa", stage: "adult", phase: "anaconda", cell: 7 },
  { id: "etb-basin-neonate-01-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "neonate", phase: "standard", cell: 10 },
  { id: "etb-basin-neonate-02-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "neonate", phase: "standard", cell: 11 },
  { id: "etb-basin-neonate-03-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "neonate", phase: "standard", cell: 12 },
  { id: "etb-basin-neonate-04-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "neonate", phase: "standard", cell: 13 },
  { id: "etb-basin-neonate-05-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "neonate", phase: "standard", cell: 14 },
  { id: "etb-basin-subadult-01-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "subadult", phase: "standard", cell: 15 },
  { id: "etb-basin-subadult-02-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "subadult", phase: "standard", cell: 16 },
  { id: "etb-basin-adult-01-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "adult", phase: "standard", cell: 17 },
  { id: "etb-basin-adult-02-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "adult", phase: "standard", cell: 18 },
  { id: "etb-basin-adult-03-v3", speciesId: "amazon_basin_emerald_tree_boa", stage: "adult", phase: "standard", cell: 19 },
];

const BY_ID = new Map(EMERALD_ART.map((asset) => [asset.id, asset]));

export function emeraldArtStyle(assetId: string | null | undefined): CSSProperties | null {
  if (!assetId) return null;
  const asset = BY_ID.get(assetId);
  if (!asset) return null;
  const column = asset.cell % COLS;
  const row = Math.floor(asset.cell / COLS);
  return {
    backgroundImage: `url("${EMERALD_ATLAS}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
    backgroundPosition: `${(column / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`,
  };
}

export function emeraldArtForAnimal(
  speciesId: EmeraldSpeciesId,
  stage: KeeperLifeStage,
  phase: KeeperPhase,
  neonateColor: string | null,
  random: () => number,
) {
  let pool = EMERALD_ART.filter((asset) => asset.speciesId === speciesId && asset.stage === stage && asset.phase === phase);
  if (neonateColor) {
    const colorPool = pool.filter((asset) => !asset.neonateColor || asset.neonateColor === neonateColor);
    if (colorPool.length) pool = colorPool;
  }
  if (!pool.length) return null;
  const weighted = pool.some((asset) => asset.weight);
  if (weighted) {
    const total = pool.reduce((sum, asset) => sum + (asset.weight ?? 0), 0);
    let roll = random() * total;
    for (const asset of pool) {
      roll -= asset.weight ?? 0;
      if (roll < 0) return asset;
    }
  }
  return pool[Math.floor(random() * pool.length)] ?? pool[0] ?? null;
}
