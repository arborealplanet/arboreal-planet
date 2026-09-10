export type BreederLifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";
export type BreederSex = "Male" | "Female";

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

export type BreederSpeciesProfile = {
  id: string;
  displayName: string;
  growth: SpeciesGrowthProfile;
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
