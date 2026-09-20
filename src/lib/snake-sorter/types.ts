export const SNAKE_SORTER_TAXA = [
  "Morelia azurea azurea",
  "Morelia azurea pulcher",
  "Morelia azurea utaraensis",
  "Morelia viridis",
] as const;

export type SnakeSorterTaxon = (typeof SNAKE_SORTER_TAXA)[number];
export type SnakeSorterLifeStage = "neonate" | "juvenile" | "subadult" | "adult" | "unknown";
export type SnakeSorterColor = "red" | "yellow" | "not_applicable" | "unknown";

export type TaxonScores = Record<SnakeSorterTaxon, number>;

export type SnakeSorterHints = {
  lifeStage: SnakeSorterLifeStage | "auto";
  color: SnakeSorterColor | "auto";
  localityMode: boolean;
  nearestNeighbors: boolean;
  conservativeMode: boolean;
};

export type PreparedEvidence = {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type ReferenceNeighbor = {
  animalId: string;
  mediaId?: string;
  taxon: SnakeSorterTaxon;
  locality?: string | null;
  similarity: number;
};

export type SnakeSorterAnalysisResult = {
  taxon: SnakeSorterTaxon | "Unknown / review";
  confidence: number;
  scores: TaxonScores;
  lifeStage: SnakeSorterLifeStage;
  neonateColor: SnakeSorterColor;
  locality?: { label: string; confidence: number } | null;
  nearestReferences: ReferenceNeighbor[];
  evidenceQuality: {
    usableFrames: number;
    requestedFrames: number;
    score: number;
    notes: string[];
  };
  flags: string[];
  modelVersion: string;
};
