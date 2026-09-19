export type ChondroSubspecies =
  | "Morelia azurea azurea"
  | "Morelia azurea pulcher"
  | "Morelia azurea utaraensis"
  | "Morelia viridis";

export type ChondroLifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";
export type ChondroNeonateColor = "Red" | "Yellow";
export type ChondroClassification = "Pure" | "Hybrid" | "Designer";

type StageSpriteSet = {
  juvenile?: Partial<Record<ChondroNeonateColor, string>>;
  adult?: Partial<Record<ChondroNeonateColor, string>>;
};

export type ChondroSpriteRequest = {
  subspecies: ChondroSubspecies;
  locality?: string;
  lifeStage?: ChondroLifeStage;
  neonateColor?: ChondroNeonateColor;
  classification?: ChondroClassification;
  ancestry?: Partial<Record<ChondroSubspecies, number>>;
  phenotypeScore?: number;
};

const localitySprites: Record<string, StageSpriteSet> = {
  Lereh: {
    juvenile: {
      Red: "/hatchery/snakes/localities/lereh/red-neonate.png",
      Yellow: "/hatchery/snakes/localities/lereh/yellow-neonate.png",
    },
  },
  Wamena: {
    juvenile: {
      Red: "/hatchery/snakes/localities/wamena/red-neonate.jpg",
      Yellow: "/hatchery/snakes/localities/wamena/yellow-neonate.jpg",
    },
    adult: {
      Red: "/hatchery/snakes/localities/wamena/red-adult.png",
      Yellow: "/hatchery/snakes/localities/wamena/yellow-adult.png",
    },
  },
  Manokwari: {
    juvenile: {
      Red: "/hatchery/snakes/localities/manokwari/red-neonate.png",
      Yellow: "/hatchery/snakes/localities/manokwari/yellow-neonate.png",
    },
    adult: {
      Red: "/hatchery/snakes/localities/manokwari/red-adult.png",
      Yellow: "/hatchery/snakes/localities/manokwari/yellow-adult.png",
    },
  },
  Sorong: {
    juvenile: {
      Yellow: "/hatchery/snakes/localities/sorong/yellow-neonate.png",
    },
  },
  Biak: {
    juvenile: {
      Red: "/hatchery/snakes/localities/biak/red-neonate.png",
      Yellow: "/hatchery/snakes/localities/biak/yellow-neonate.png",
    },
    adult: {
      Red: "/hatchery/snakes/localities/biak/red-adult.png",
      Yellow: "/hatchery/snakes/localities/biak/yellow-adult.png",
    },
  },
  Numfor: {
    // Temporary fallback requested by the owner while dedicated Numfor art is produced.
    juvenile: {
      Red: "/hatchery/snakes/localities/biak/red-neonate.png",
      Yellow: "/hatchery/snakes/localities/biak/yellow-neonate.png",
    },
    adult: {
      Red: "/hatchery/snakes/localities/biak/red-adult.png",
    },
  },
  Aru: {
    adult: {
      Yellow: "/hatchery/snakes/localities/aru/adult.png",
    },
  },
  Merauke: {
    adult: {
      Yellow: "/hatchery/snakes/localities/merauke/adult.png",
    },
  },
};

const hybridJuvenileSprites: Record<string, Partial<Record<ChondroNeonateColor, string>>> = {
  "pulcher-utaraensis": {
    Red: "/hatchery/snakes/hybrids/pulcher-utaraensis/red-neonate.png",
    Yellow: "/hatchery/snakes/hybrids/pulcher-utaraensis/yellow-neonate.png",
  },
};

const subspeciesSlug: Record<ChondroSubspecies, string> = {
  "Morelia azurea azurea": "azurea",
  "Morelia azurea pulcher": "pulcher",
  "Morelia azurea utaraensis": "utaraensis",
  "Morelia viridis": "viridis",
};

function hybridKey(ancestry?: Partial<Record<ChondroSubspecies, number>>) {
  if (!ancestry) return null;
  const parents = (Object.entries(ancestry) as Array<[ChondroSubspecies, number | undefined]>)
    .filter(([, value]) => Number(value ?? 0) > 0)
    .sort((a, b) => Number(b[1] ?? 0) - Number(a[1] ?? 0))
    .slice(0, 2)
    .map(([taxon]) => subspeciesSlug[taxon])
    .sort();

  if (parents.length < 2) return null;
  return parents.join("-");
}

export function localitySpriteFor(request: ChondroSpriteRequest) {
  if (!request.locality) return null;
  const set = localitySprites[request.locality];
  if (!set) return null;

  const color = request.neonateColor ?? "Red";
  const laterStage = request.lifeStage === "Subadult" || request.lifeStage === "Adult";
  return laterStage ? set.adult?.[color] ?? null : set.juvenile?.[color] ?? null;
}

export function hybridSpriteFor(request: ChondroSpriteRequest) {
  if (request.classification !== "Hybrid") return null;
  if (request.lifeStage === "Subadult" || request.lifeStage === "Adult") return null;
  const key = hybridKey(request.ancestry);
  if (!key) return null;
  const color = request.neonateColor ?? "Red";
  return hybridJuvenileSprites[key]?.[color] ?? null;
}

export function chondroSpecificSpriteFor(request: ChondroSpriteRequest) {
  return hybridSpriteFor(request) ?? localitySpriteFor(request);
}

export const CHONDRO_SPRITE_ASSET_PLAN = {
  special: {
    manokwariRedAdultAPlus: "/hatchery/snakes/special/manokwari-red-adult-a-plus.png",
    sorongYellowAdultAPlus: "/hatchery/snakes/special/sorong-yellow-adult-a-plus.png",
    designerAdult01: "/hatchery/snakes/special/designer-adult-01.png",
    designerRedNeonate01: "/hatchery/snakes/special/designer-red-neonate-01.png",
  },
  pending: {
    numforYellowAdult: "/hatchery/snakes/localities/numfor/yellow-adult.png",
  },
} as const;
