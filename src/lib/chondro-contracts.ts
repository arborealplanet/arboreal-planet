export type ContractTraitKey =
  | "highBlack"
  | "highWhite"
  | "blueStripe"
  | "yellowRetention"
  | "blotches";

export type ContractAnimal = {
  id: string;
  sex: "Male" | "Female";
  locality: string;
  subspecies: string;
  classification: "Pure" | "Hybrid" | "Designer";
  generation: number;
  neonateColor: "Red" | "Yellow";
  nidoStatus: "Unknown" | "Negative" | "Positive";
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
};

export type BreederContract = {
  id: string;
  client: string;
  title: string;
  description: string;
  expiresSeason: number;
  rewardCash: number;
  rewardReputation: number;
  requirements: {
    sex?: ContractAnimal["sex"];
    locality?: string;
    subspecies?: string;
    classification?: ContractAnimal["classification"];
    generationAtLeast?: number;
    neonateColor?: ContractAnimal["neonateColor"];
    nidoNegative?: boolean;
    traits?: Partial<Record<ContractTraitKey, number>>;
  };
};

const CLIENTS = [
  "Locality Breeder",
  "Private Collector",
  "Regional Chondro Keeper",
  "Show Breeder",
  "Boutique Reptile Shop",
  "Established Breeding Partner",
];

const TRAITS: ContractTraitKey[] = [
  "highBlack",
  "highWhite",
  "blueStripe",
  "yellowRetention",
  "blotches",
];

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function contractsForSeason(season: number, reputation: number): BreederContract[] {
  const random = seeded(season * 1879 + Math.floor(reputation / 100) * 17 + 93);
  const count = reputation >= 3500 ? 4 : reputation >= 1000 ? 3 : 2;
  return Array.from({ length: count }, (_, index) => {
    const trait = TRAITS[Math.floor(random() * TRAITS.length)];
    const minimum = Math.min(92, 45 + Math.floor(random() * 35) + Math.floor(reputation / 1800) * 3);
    const generationAtLeast = random() < 0.35 ? 2 + Math.floor(random() * 2) : undefined;
    const classification = random() < 0.35 ? (random() < 0.65 ? "Pure" : "Designer") : undefined;
    const red = random() < 0.22;
    const nidoNegative = reputation >= 750 && random() < 0.3;
    const difficulty = minimum + (generationAtLeast ?? 1) * 8 + (classification ? 10 : 0) + (red ? 10 : 0);
    const rewardCash = Math.round((3500 + difficulty * 260) / 250) * 250;
    const rewardReputation = Math.round(80 + difficulty * 3.5);
    return {
      id: `CONTRACT-${season}-${index}`,
      client: CLIENTS[Math.floor(random() * CLIENTS.length)],
      title: `${minimum}%+ ${trait.replace(/([A-Z])/g, " $1").trim()} request`,
      description: `Produce an animal meeting the requested breeding target before the contract expires.`,
      expiresSeason: season + 2,
      rewardCash,
      rewardReputation,
      requirements: {
        classification,
        generationAtLeast,
        neonateColor: red ? "Red" : undefined,
        nidoNegative,
        traits: { [trait]: minimum },
      },
    };
  });
}

export function animalMeetsContract(contract: BreederContract, animal: ContractAnimal) {
  const req = contract.requirements;
  if (req.sex && animal.sex !== req.sex) return false;
  if (req.locality && animal.locality !== req.locality) return false;
  if (req.subspecies && animal.subspecies !== req.subspecies) return false;
  if (req.classification && animal.classification !== req.classification) return false;
  if (req.generationAtLeast && animal.generation < req.generationAtLeast) return false;
  if (req.neonateColor && animal.neonateColor !== req.neonateColor) return false;
  if (req.nidoNegative && animal.nidoStatus !== "Negative") return false;
  if (req.traits) {
    for (const [key, minimum] of Object.entries(req.traits) as Array<[ContractTraitKey, number]>) {
      if (animal[key] < minimum) return false;
    }
  }
  return true;
}
