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
