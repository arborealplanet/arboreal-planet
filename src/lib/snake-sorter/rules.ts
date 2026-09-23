import { SNAKE_SORTER_TAXA, type SnakeSorterColor, type SnakeSorterLifeStage, type TaxonScores } from "./types";

export function emptyScores(): TaxonScores {
  return Object.fromEntries(SNAKE_SORTER_TAXA.map((taxon) => [taxon, 0])) as TaxonScores;
}

export function normalizeScores(scores: TaxonScores): TaxonScores {
  const total = SNAKE_SORTER_TAXA.reduce((sum, taxon) => sum + Math.max(0, Number(scores[taxon] ?? 0)), 0);
  if (total <= 0) return emptyScores();
  return Object.fromEntries(SNAKE_SORTER_TAXA.map((taxon) => [taxon, Math.max(0, Number(scores[taxon] ?? 0)) / total])) as TaxonScores;
}

export function applyBiologicalRules({
  scores,
  lifeStage,
  neonateColor,
  stageTrusted,
  colorTrusted,
}: {
  scores: TaxonScores;
  lifeStage: SnakeSorterLifeStage;
  neonateColor: SnakeSorterColor;
  stageTrusted: boolean;
  colorTrusted: boolean;
}) {
  const adjusted = { ...scores };
  const flags: string[] = [];

  // Neonate color is supporting evidence only. It must never hard-exclude a
  // taxon because red and yellow neonates can occur across multiple GTP
  // populations, including Biak. Keep color available to the model as a hint
  // without turning it into a biological veto.
  void lifeStage;
  void neonateColor;
  void stageTrusted;
  void colorTrusted;

  return { scores: normalizeScores(adjusted), flags };
}

export function chooseClassification(scores: TaxonScores, conservativeMode: boolean) {
  const ordered = SNAKE_SORTER_TAXA
    .map((taxon) => ({ taxon, score: scores[taxon] }))
    .sort((a, b) => b.score - a.score);
  const first = ordered[0];
  const second = ordered[1];
  const margin = (first?.score ?? 0) - (second?.score ?? 0);

  if (!first) return { taxon: "Unknown / review" as const, confidence: 0, margin: 0 };
  if (conservativeMode && (first.score < 0.6 || margin < 0.15)) {
    return { taxon: "Unknown / review" as const, confidence: first.score, margin };
  }
  return { taxon: first.taxon, confidence: first.score, margin };
}
