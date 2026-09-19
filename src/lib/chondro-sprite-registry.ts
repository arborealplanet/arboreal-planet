export type ChondroSubspecies =
  | "Morelia azurea azurea"
  | "Morelia azurea pulcher"
  | "Morelia azurea utaraensis"
  | "Morelia viridis";

export type ChondroLifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";
export type ChondroNeonateColor = "Red" | "Yellow";
export type ChondroClassification = "Pure" | "Hybrid" | "Designer";

export type SpriteVariant = {
  path: string;
  weight?: number;
  minPhenotypeScore?: number;
  maxPhenotypeScore?: number;
};

type ColorSpritePool = Partial<Record<ChondroNeonateColor, SpriteVariant[]>>;

type StageSpriteSet = {
  juvenile?: ColorSpritePool;
  adult?: ColorSpritePool;
  juvenileAny?: SpriteVariant[];
  adultAny?: SpriteVariant[];
};

export type ChondroSpriteRequest = {
  subspecies: ChondroSubspecies;
  locality?: string;
  lifeStage?: ChondroLifeStage;
  neonateColor?: ChondroNeonateColor;
  classification?: ChondroClassification;
  ancestry?: Partial<Record<ChondroSubspecies, number>>;
  phenotypeScore?: number;
  variantSeed?: string;
};

const variant = (
  path: string,
  options: Omit<SpriteVariant, "path"> = {},
): SpriteVariant => ({ path, ...options });

const localitySprites: Record<string, StageSpriteSet> = {
  Lereh: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/lereh/red-neonate.png")],
      Yellow: [variant("/hatchery/snakes/localities/lereh/yellow-neonate.png")],
    },
    adult: {
      Yellow: [variant("/hatchery/snakes/localities/lereh/yellow-adult.png")],
    },
  },
  Wamena: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/wamena/red-neonate.jpg")],
      Yellow: [variant("/hatchery/snakes/localities/wamena/yellow-neonate.jpg")],
    },
    adult: {
      Red: [variant("/hatchery/snakes/localities/wamena/red-adult.png")],
      Yellow: [variant("/hatchery/snakes/localities/wamena/yellow-adult.png")],
    },
  },
  Manokwari: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/manokwari/red-neonate.png")],
      Yellow: [variant("/hatchery/snakes/localities/manokwari/yellow-neonate.png")],
    },
    adult: {
      Red: [variant("/hatchery/snakes/localities/manokwari/red-adult.png")],
      Yellow: [variant("/hatchery/snakes/localities/manokwari/yellow-adult.png")],
    },
  },
  Arfak: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/arfak/red-neonate.png")],
    },
    adultAny: [variant("/hatchery/snakes/localities/arfak/adult.png")],
  },
  Sorong: {
    juvenile: {
      Yellow: [variant("/hatchery/snakes/localities/sorong/yellow-neonate.png")],
    },
  },
  Biak: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/biak/red-neonate.png")],
      Yellow: [variant("/hatchery/snakes/localities/biak/yellow-neonate.png")],
    },
    adult: {
      Red: [variant("/hatchery/snakes/localities/biak/red-adult.png")],
      Yellow: [variant("/hatchery/snakes/localities/biak/yellow-adult.png")],
    },
  },
  Numfor: {
    // Temporary fallback requested by the owner while dedicated Numfor art is produced.
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/biak/red-neonate.png")],
      Yellow: [variant("/hatchery/snakes/localities/biak/yellow-neonate.png")],
    },
    adult: {
      Red: [variant("/hatchery/snakes/localities/biak/red-adult.png")],
    },
  },
  Aru: {
    adultAny: [variant("/hatchery/snakes/localities/aru/adult.png")],
  },
  Merauke: {
    adultAny: [variant("/hatchery/snakes/localities/merauke/adult.png")],
  },
};

const specificHybridSprites: Record<string, StageSpriteSet> = {
  "wamena-aru": {
    juvenile: {
      Red: [variant("/hatchery/snakes/hybrids/wamena-viridis/red-neonate-01.png")],
    },
  },
  "wamena-merauke": {
    juvenile: {
      Red: [variant("/hatchery/snakes/hybrids/wamena-viridis/red-neonate-01.png")],
    },
  },
};

const hybridSprites: Record<string, StageSpriteSet> = {
  "pulcher-utaraensis": {
    juvenile: {
      Red: [variant("/hatchery/snakes/hybrids/pulcher-utaraensis/red-neonate.png")],
      Yellow: [variant("/hatchery/snakes/hybrids/pulcher-utaraensis/yellow-neonate.png")],
    },
  },
};

// Designer pools intentionally support many outcomes. Add new art by appending
// another variant here; existing animals keep a stable result because the
// picker is seeded from the snake id.
const designerSprites: StageSpriteSet = {
  juvenile: {
    Red: [
      variant("/hatchery/snakes/special/designer/red-neonate-01.png"),
    ],
  },
  adultAny: [
    variant("/hatchery/snakes/special/designer/adult-01.png"),
  ],
};

const subspeciesSlug: Record<ChondroSubspecies, string> = {
  "Morelia azurea azurea": "azurea",
  "Morelia azurea pulcher": "pulcher",
  "Morelia azurea utaraensis": "utaraensis",
  "Morelia viridis": "viridis",
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function eligibleVariants(variants: SpriteVariant[] | undefined, phenotypeScore?: number) {
  if (!variants?.length) return [];
  const score = Number.isFinite(phenotypeScore) ? Number(phenotypeScore) : null;
  const filtered = variants.filter((item) => {
    if (score !== null && typeof item.minPhenotypeScore === "number" && score < item.minPhenotypeScore) return false;
    if (score !== null && typeof item.maxPhenotypeScore === "number" && score > item.maxPhenotypeScore) return false;
    return true;
  });
  return filtered.length ? filtered : variants;
}

function pickVariant(
  variants: SpriteVariant[] | undefined,
  request: ChondroSpriteRequest,
  poolKey: string,
) {
  const pool = eligibleVariants(variants, request.phenotypeScore);
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0].path;

  const totalWeight = pool.reduce((sum, item) => sum + Math.max(0, item.weight ?? 1), 0);
  if (totalWeight <= 0) return pool[0].path;

  const seed = request.variantSeed ?? [
    request.locality,
    request.classification,
    request.subspecies,
    request.neonateColor,
    request.lifeStage,
  ].filter(Boolean).join("|");
  const roll = (hashString(`${seed}|${poolKey}`) / 4294967296) * totalWeight;

  let cursor = 0;
  for (const item of pool) {
    cursor += Math.max(0, item.weight ?? 1);
    if (roll < cursor) return item.path;
  }
  return pool[pool.length - 1].path;
}

function poolForStage(set: StageSpriteSet, request: ChondroSpriteRequest) {
  const laterStage = request.lifeStage === "Subadult" || request.lifeStage === "Adult";
  const color = request.neonateColor ?? "Red";
  if (laterStage) return set.adult?.[color] ?? set.adultAny;
  return set.juvenile?.[color] ?? set.juvenileAny;
}

function normalizeLocalityToken(value?: string) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ?? "";
}

function specificHybridKey(locality?: string) {
  if (!locality || !locality.includes("×")) return null;
  const parts = locality.split("×").map((part) => normalizeLocalityToken(part)).filter(Boolean).sort();
  if (parts.length !== 2) return null;
  return parts.join("-");
}

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
  return pickVariant(poolForStage(set, request), request, `locality:${request.locality}`);
}

export function hybridSpriteFor(request: ChondroSpriteRequest) {
  if (request.classification !== "Hybrid") return null;

  const exactKey = specificHybridKey(request.locality);
  if (exactKey) {
    const exactSet = specificHybridSprites[exactKey];
    const exactSprite = exactSet
      ? pickVariant(poolForStage(exactSet, request), request, `hybrid-locality:${exactKey}`)
      : null;
    if (exactSprite) return exactSprite;
  }

  const key = hybridKey(request.ancestry);
  if (!key) return null;
  const set = hybridSprites[key];
  if (!set) return null;
  return pickVariant(poolForStage(set, request), request, `hybrid:${key}`);
}

export function designerSpriteFor(request: ChondroSpriteRequest) {
  if (request.classification !== "Designer") return null;
  return pickVariant(poolForStage(designerSprites, request), request, "designer");
}

export function chondroSpecificSpriteFor(request: ChondroSpriteRequest) {
  return designerSpriteFor(request) ?? hybridSpriteFor(request) ?? localitySpriteFor(request);
}

export const CHONDRO_SPRITE_ASSET_PLAN = {
  special: {
    manokwariRedAdultAPlus: "/hatchery/snakes/special/manokwari-red-adult-a-plus.png",
    sorongYellowAdultAPlus: "/hatchery/snakes/special/sorong-yellow-adult-a-plus.png",
    designerAdult01: "/hatchery/snakes/special/designer/adult-01.png",
    designerRedNeonate01: "/hatchery/snakes/special/designer/red-neonate-01.png",
  },
  pending: {
    numforYellowAdult: "/hatchery/snakes/localities/numfor/yellow-adult.png",
  },
} as const;
