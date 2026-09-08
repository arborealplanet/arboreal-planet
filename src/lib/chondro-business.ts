export type StaffRole = {
  id: string;
  name: string;
  salaryPerSeason: number;
  reputationRequired: number;
  description: string;
  effects: {
    careCostMultiplier?: number;
    testingCostMultiplier?: number;
    saleValueMultiplier?: number;
    breedingCooldownReduction?: number;
    storeScoutDiscount?: number;
  };
};

export const STAFF_ROLES: StaffRole[] = [
  {
    id: "keeper",
    name: "Assistant Keeper",
    salaryPerSeason: 3500,
    reputationRequired: 750,
    description: "Helps with feeding, cleaning and routine animal care as the collection grows.",
    effects: { careCostMultiplier: 0.94 },
  },
  {
    id: "quarantine-tech",
    name: "Quarantine Technician",
    salaryPerSeason: 5000,
    reputationRequired: 1600,
    description: "Improves quarantine workflow and lowers routine testing costs.",
    effects: { testingCostMultiplier: 0.82 },
  },
  {
    id: "breeding-manager",
    name: "Breeding Manager",
    salaryPerSeason: 8000,
    reputationRequired: 3000,
    description: "Keeps breeding projects organized and reduces breeding recovery time.",
    effects: { breedingCooldownReduction: 1 },
  },
  {
    id: "sales-manager",
    name: "Sales & Expo Manager",
    salaryPerSeason: 9000,
    reputationRequired: 4500,
    description: "Handles higher-end buyers, contracts and show-season sales.",
    effects: { saleValueMultiplier: 1.05, storeScoutDiscount: 0.1 },
  },
];

export type FacilityUpgrade = {
  id: string;
  name: string;
  cost: number;
  reputationRequired: number;
  description: string;
  capacityBonus?: number;
  incubationBonus?: number;
  quarantineBonus?: number;
  reliabilityBonus?: number;
};

export const FACILITY_UPGRADES: FacilityUpgrade[] = [
  {
    id: "backup-power",
    name: "Backup Power System",
    cost: 12000,
    reputationRequired: 500,
    description: "Protects climate control and incubation equipment during utility failures.",
    reliabilityBonus: 15,
  },
  {
    id: "quarantine-room",
    name: "Dedicated Quarantine Room",
    cost: 18000,
    reputationRequired: 900,
    description: "Adds isolated quarantine capacity and improves intake workflow.",
    quarantineBonus: 8,
  },
  {
    id: "incubation-room",
    name: "Dedicated Incubation Room",
    cost: 28000,
    reputationRequired: 1800,
    description: "Expands safe clutch capacity and supports a larger breeding program.",
    incubationBonus: 3,
  },
  {
    id: "growout-wall",
    name: "Neonate Grow-Out Wall",
    cost: 22000,
    reputationRequired: 1400,
    description: "Adds efficient grow-out capacity for larger holdback groups.",
    capacityBonus: 16,
  },
  {
    id: "shipping-room",
    name: "Dedicated Shipping Room",
    cost: 35000,
    reputationRequired: 3000,
    description: "Professional packing and shipping space that improves the business side of the facility.",
    reliabilityBonus: 8,
  },
];

export function seasonalStaffCost(hiredRoleIds: string[]) {
  return STAFF_ROLES.filter((role) => hiredRoleIds.includes(role.id)).reduce(
    (sum, role) => sum + role.salaryPerSeason,
    0,
  );
}

export function combinedStaffEffects(hiredRoleIds: string[]) {
  const hired = STAFF_ROLES.filter((role) => hiredRoleIds.includes(role.id));
  return hired.reduce(
    (effects, role) => ({
      careCostMultiplier: effects.careCostMultiplier * (role.effects.careCostMultiplier ?? 1),
      testingCostMultiplier: effects.testingCostMultiplier * (role.effects.testingCostMultiplier ?? 1),
      saleValueMultiplier: effects.saleValueMultiplier * (role.effects.saleValueMultiplier ?? 1),
      breedingCooldownReduction:
        effects.breedingCooldownReduction + (role.effects.breedingCooldownReduction ?? 0),
      storeScoutDiscount: effects.storeScoutDiscount + (role.effects.storeScoutDiscount ?? 0),
    }),
    {
      careCostMultiplier: 1,
      testingCostMultiplier: 1,
      saleValueMultiplier: 1,
      breedingCooldownReduction: 0,
      storeScoutDiscount: 0,
    },
  );
}
