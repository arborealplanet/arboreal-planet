export type BreederLifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";
export type BreederSex = "Male" | "Female";
export type BreederCondition = "Excellent" | "Good" | "Fair";
export type NeonateColor = "Red" | "Yellow";
export type BreederTraitKey =
  | "highBlack"
  | "highWhite"
  | "blueStripe"
  | "yellowRetention"
  | "blotches";

export type GrowthStep = {
  next: BreederLifeStage;
  feederUnits: number;
  months: number;
};

export type SpeciesGrowthProfile = {
  hatchling: GrowthStep;
  neonate: GrowthStep;
  subadultBySex: Record<BreederSex, GrowthStep>;
  feederUnitCost: number;
  annualCareCost: number;
};

export type BreedingStageDefinition = {
  id: string;
  label: string;
  hours: number;
};

export type SpeciesRecoveryProfile = {
  baseExtraYearChance: number;
  clutchSizeBaseline: number;
  chancePerAdditionalOffspring: number;
  excellentConditionAdjustment: number;
  fairConditionAdjustment: number;
  minimumChance: number;
  maximumChance: number;
};

export type SpeciesReproductionProfile = {
  stages: BreedingStageDefinition[];
  seasonCarePerAdult: number;
  recovery: SpeciesRecoveryProfile;
};

export type SpeciesNeonateProfile = {
  redChance: number;
  allowedColorsByTaxon: Record<string, NeonateColor[]>;
};

export type SpeciesTraitProfile = {
  preferredByTaxon: Record<string, BreederTraitKey[]>;
};

export type BreederSpeciesProfile = {
  id: string;
  displayName: string;
  growth: SpeciesGrowthProfile;
  reproduction: SpeciesReproductionProfile;
  neonates: SpeciesNeonateProfile;
  traits: SpeciesTraitProfile;
};

export const CHONDRO_SPECIES_PROFILE: BreederSpeciesProfile = {
  id: "chondro",
  displayName: "Green Tree Python Complex",
  growth: {
    hatchling: { next: "Neonate", feederUnits: 25, months: 6 },
    neonate: { next: "Subadult", feederUnits: 150, months: 36 },
    subadultBySex: {
      Female: { next: "Adult", feederUnits: 100, months: 24 },
      Male: { next: "Adult", feederUnits: 25, months: 6 },
    },
    feederUnitCost: 2.5,
    annualCareCost: 1500,
  },
  reproduction: {
    stages: [
      { id: "cycling", label: "Cycling", hours: 4 },
      { id: "pairing", label: "Pairing", hours: 8 },
      { id: "gestation", label: "Gestation · Watch for Off-Feed", hours: 12 },
      { id: "separate-pair", label: "Separate Pair", hours: 1 },
      { id: "pre-lay", label: "Egg Development · Ovulation / Pre-Lay", hours: 12 },
      { id: "laying", label: "Laying", hours: 6 },
      { id: "incubation", label: "Incubation", hours: 24 },
      { id: "hatch-day", label: "Hatch Day", hours: 2 },
    ],
    seasonCarePerAdult: 180,
    recovery: {
      baseExtraYearChance: 0.28,
      clutchSizeBaseline: 6,
      chancePerAdditionalOffspring: 0.06,
      excellentConditionAdjustment: -0.12,
      fairConditionAdjustment: 0.20,
      minimumChance: 0.12,
      maximumChance: 0.80,
    },
  },
  neonates: {
    redChance: 0.38,
    allowedColorsByTaxon: {
      "Morelia viridis": ["Yellow"],
    },
  },
  traits: {
    preferredByTaxon: {
      "Morelia azurea azurea": ["highBlack", "yellowRetention"],
      "Morelia azurea pulcher": ["yellowRetention", "blueStripe"],
      "Morelia azurea utaraensis": ["blueStripe", "highWhite"],
      "Morelia viridis": ["highWhite", "highBlack"],
    },
  },
};

export function growthRequirementFor(
  profile: BreederSpeciesProfile,
  lifeStage: BreederLifeStage,
  sex: BreederSex,
): GrowthStep | null {
  if (lifeStage === "Adult") return null;
  if (lifeStage === "Hatchling") return profile.growth.hatchling;
  if (lifeStage === "Neonate") return profile.growth.neonate;
  return profile.growth.subadultBySex[sex];
}

export function growthCostFor(
  profile: BreederSpeciesProfile,
  lifeStage: BreederLifeStage,
  sex: BreederSex,
) {
  const requirement = growthRequirementFor(profile, lifeStage, sex);
  if (!requirement) return 0;
  return (
    Math.round(
      (requirement.feederUnits * profile.growth.feederUnitCost +
        (requirement.months / 12) * profile.growth.annualCareCost) *
        100,
    ) / 100
  );
}

export function normalizeNeonateColorFor(
  profile: BreederSpeciesProfile,
  taxon: string,
  requested: NeonateColor,
): NeonateColor {
  const allowed = profile.neonates.allowedColorsByTaxon[taxon];
  if (!allowed?.length || allowed.includes(requested)) return requested;
  return allowed[0];
}

export function randomNeonateColorFor(
  profile: BreederSpeciesProfile,
  random: () => number = Math.random,
): NeonateColor {
  return random() < profile.neonates.redChance ? "Red" : "Yellow";
}

export function needsExtraRecoveryYear(
  profile: BreederSpeciesProfile,
  condition: BreederCondition,
  clutchSize: number,
  random: () => number = Math.random,
) {
  const recovery = profile.reproduction.recovery;
  let chance =
    recovery.baseExtraYearChance +
    Math.max(0, clutchSize - recovery.clutchSizeBaseline) * recovery.chancePerAdditionalOffspring;
  if (condition === "Excellent") chance += recovery.excellentConditionAdjustment;
  if (condition === "Fair") chance += recovery.fairConditionAdjustment;
  chance = Math.max(recovery.minimumChance, Math.min(recovery.maximumChance, chance));
  return random() < chance;
}
