// Shared capture-queue priority scoring used by the capture-jobs batch
// planner and the backfill planner. Locality rarity and review status are
// the only signals; neonate COLOR is deliberately not one — Biak neonates
// may be red or yellow and color proves nothing about locality (harvest
// contract §12).
export type CaptureCandidateLike = {
  review_status: string | null;
  life_stage_hint: string | null;
  provisional_locality: string | null;
  locality_raw: string | null;
  discovered_at: string;
};

export function capturePriorityScore(candidate: CaptureCandidateLike, localityRarity: number) {
  const locality = candidate.provisional_locality || candidate.locality_raw || "Unknown";
  let score = 0;
  if (candidate.review_status === "approved") score += 1000;
  if (candidate.life_stage_hint === "hatchling" || candidate.life_stage_hint === "neonate") score += 180;
  if (locality !== "Unknown") score += 120;
  score += Math.max(0, 100 - localityRarity);
  return score;
}
