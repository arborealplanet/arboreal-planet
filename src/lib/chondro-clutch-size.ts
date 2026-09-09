export type ClutchPairingAnimal = {
  subspecies: string;
  classification: "Pure" | "Hybrid" | "Designer";
  locality: string;
  condition?: "Excellent" | "Good" | "Fair";
};

export type ClutchPairingKind =
  | "pure"
  | "hybrid"
  | "designer";

export type ClutchSizeProfile = {
  kind: ClutchPairingKind;
  label: string;
  min: number;
  max: number;
  weights: number[];
};

export function clutchPairingKind(dam: ClutchPairingAnimal, sire: ClutchPairingAnimal): ClutchPairingKind {
  // Any cross-subspecies pairing is a hybrid, even when both parents are individually pure.
  if (dam.subspecies !== sire.subspecies) return "hybrid";
  if (dam.classification === "Designer" || sire.classification === "Designer") return "designer";
  if (dam.classification === "Hybrid" || sire.classification === "Hybrid") return "hybrid";
  return "pure";
}

export const CLUTCH_SIZE_PROFILES: Record<ClutchPairingKind, ClutchSizeProfile> = {
  pure: {
    kind: "pure",
    label: "Pure same-subspecies pairing",
    min: 6,
    max: 12,
    weights: [1, 3, 6, 8, 6, 3, 1],
  },
  hybrid: {
    kind: "hybrid",
    label: "Hybrid pairing",
    min: 4,
    max: 8,
    weights: [2, 6, 8, 5, 2],
  },
  designer: {
    kind: "designer",
    label: "Designer pairing",
    min: 4,
    max: 7,
    weights: [3, 7, 7, 3],
  },
};

function weightedRoll(profile: ClutchSizeProfile, random: () => number) {
  const total = profile.weights.reduce((sum, value) => sum + value, 0);
  let roll = random() * total;
  for (let i = 0; i < profile.weights.length; i++) {
    roll -= profile.weights[i];
    if (roll <= 0) return profile.min + i;
  }
  return profile.max;
}

export function clutchSizeForPairing(
  dam: ClutchPairingAnimal,
  sire: ClutchPairingAnimal,
  random: () => number = Math.random,
) {
  const kind = clutchPairingKind(dam, sire);
  const profile = CLUTCH_SIZE_PROFILES[kind];
  let size = weightedRoll(profile, random);

  // Condition matters, but only lightly. Pairing type remains the main driver.
  if (dam.condition === "Excellent" && random() < 0.18) size += 1;
  if (dam.condition === "Fair" && random() < 0.45) size -= 1;

  return Math.max(profile.min, Math.min(profile.max + 1, size));
}

export function averageClutchSize(profile: ClutchSizeProfile) {
  const totalWeight = profile.weights.reduce((sum, value) => sum + value, 0);
  const weighted = profile.weights.reduce((sum, weight, index) => sum + (profile.min + index) * weight, 0);
  return Math.round((weighted / totalWeight) * 10) / 10;
}
