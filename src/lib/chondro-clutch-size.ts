export type ClutchPairingAnimal = {
  subspecies: string;
  classification: "Pure" | "Hybrid" | "Designer";
  locality: string;
  condition?: "Excellent" | "Good" | "Fair";
};

export type ClutchPairingKind =
  | "pure-same-locality"
  | "pure-same-subspecies"
  | "pure-mixed-subspecies"
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
  if (dam.classification === "Designer" || sire.classification === "Designer") return "designer";
  if (dam.classification === "Hybrid" || sire.classification === "Hybrid") return "hybrid";
  if (dam.subspecies !== sire.subspecies) return "pure-mixed-subspecies";
  if (dam.locality === sire.locality && !["Designer", "Mixed Locality"].includes(dam.locality)) return "pure-same-locality";
  return "pure-same-subspecies";
}

export const CLUTCH_SIZE_PROFILES: Record<ClutchPairingKind, ClutchSizeProfile> = {
  "pure-same-locality": {
    kind: "pure-same-locality",
    label: "Pure same-locality pairing",
    min: 7,
    max: 13,
    weights: [1, 3, 6, 8, 6, 3, 1],
  },
  "pure-same-subspecies": {
    kind: "pure-same-subspecies",
    label: "Pure same-subspecies pairing",
    min: 6,
    max: 12,
    weights: [1, 3, 6, 8, 6, 3, 1],
  },
  "pure-mixed-subspecies": {
    kind: "pure-mixed-subspecies",
    label: "Pure cross-subspecies pairing",
    min: 4,
    max: 9,
    weights: [1, 4, 7, 6, 3, 1],
  },
  hybrid: {
    kind: "hybrid",
    label: "Hybrid pairing",
    min: 3,
    max: 8,
    weights: [2, 6, 8, 5, 2, 1],
  },
  designer: {
    kind: "designer",
    label: "Designer pairing",
    min: 3,
    max: 7,
    weights: [3, 7, 7, 3, 1],
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
