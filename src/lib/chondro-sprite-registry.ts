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
  localityAncestry?: Partial<Record<string, number>>;
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
      Red: [variant("/hatchery/snakes/localities/lereh/red-neonate.webp")],
      Yellow: [variant("/hatchery/snakes/localities/lereh/yellow-neonate.webp")],
    },
    adult: {
      Yellow: [variant("/hatchery/snakes/localities/lereh/yellow-adult.webp")],
    },
  },
  Wamena: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/wamena/red-neonate-live.webp")],
      Yellow: [variant("/hatchery/snakes/localities/wamena/yellow-neonate.webp")],
    },
    adult: {
      Red: [variant("/hatchery/snakes/localities/wamena/red-adult-live-v2.webp")],
      Yellow: [variant("/hatchery/snakes/localities/wamena/yellow-adult-live-v2.webp")],
    },
  },
  Cyclops: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/cyclops/red-neonate.webp")],
    },
  },
  Manokwari: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/manokwari/red-neonate.webp")],
      Yellow: [variant("/hatchery/snakes/localities/manokwari/yellow-neonate.webp")],
    },
    adult: {
      Red: [
        variant("/hatchery/snakes/localities/manokwari/red-adult.webp", { maxPhenotypeScore: 84 }),
        variant("/hatchery/snakes/special/manokwari-red-adult-a-plus.webp", { minPhenotypeScore: 85 }),
      ],
      Yellow: [variant("/hatchery/snakes/localities/manokwari/yellow-adult.webp")],
    },
  },
  Arfak: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/arfak/red-neonate.webp")],
    },
    adultAny: [variant("/hatchery/snakes/localities/arfak/adult.webp")],
  },
  Sorong: {
    juvenile: {
      Yellow: [variant("/hatchery/snakes/localities/sorong/yellow-neonate.webp")],
    },
    adult: {
      Yellow: [
        variant("/hatchery/snakes/special/sorong-yellow-adult-a-plus.webp", { minPhenotypeScore: 85 }),
      ],
    },
  },
  Biak: {
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/biak/red-neonate-live-v2.webp")],
      Yellow: [variant("/hatchery/snakes/localities/biak/yellow-neonate.webp")],
    },
    adult: {
      Red: [variant("/hatchery/snakes/localities/biak/red-adult.webp")],
      Yellow: [variant("/hatchery/snakes/localities/biak/yellow-adult.webp")],
    },
  },
  Numfor: {
    // Temporary fallback requested by the owner while dedicated Numfor art is produced.
    juvenile: {
      Red: [variant("/hatchery/snakes/localities/biak/red-neonate.webp")],
      Yellow: [variant("/hatchery/snakes/localities/biak/yellow-neonate.webp")],
    },
    adult: {
      Red: [variant("/hatchery/snakes/localities/biak/red-adult.webp")],
      Yellow: [variant("/hatchery/snakes/localities/numfor/yellow-adult.webp")],
    },
  },
  Aru: {
    juvenile: {
      Yellow: [variant("/hatchery/snakes/localities/aru/yellow-neonate.webp")],
    },
    adultAny: [variant("/hatchery/snakes/localities/aru/adult-live-v2.webp")],
  },
  Merauke: {
    adultAny: [variant("/hatchery/snakes/localities/merauke/adult-live-v2.webp")],
  },
};

const specificHybridSprites: Record<string, StageSpriteSet> = {
  "aru-wamena": {
    juvenile: {
      Red: [variant("/hatchery/snakes/hybrids/wamena-viridis/red-neonate-01.webp")],
    },
  },
  "merauke-wamena": {
    juvenile: {
      Red: [variant("/hatchery/snakes/hybrids/wamena-viridis/red-neonate-01.webp")],
    },
  },
};

const hybridSprites: Record<string, StageSpriteSet> = {
  "pulcher-utaraensis": {
    juvenile: {
      Red: [variant("/hatchery/snakes/hybrids/pulcher-utaraensis/red-neonate.webp")],
      Yellow: [variant("/hatchery/snakes/hybrids/pulcher-utaraensis/yellow-neonate.webp")],
    },
  },
};

// Designer pools intentionally support many outcomes. Add new art by appending
// another variant here; existing animals keep a stable result because the
// picker is seeded from the snake id.
const designerSprites: StageSpriteSet = {
  juvenile: {
    Red: [
      variant("/hatchery/snakes/special/designer/red-neonate-01.webp"),
    ],
  },
  adultAny: [
    variant("/hatchery/snakes/special/designer/adult-01.webp"),
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
  if (score === null) {
    const core = variants.filter(
      (item) =>
        typeof item.minPhenotypeScore !== "number" &&
        typeof item.maxPhenotypeScore !== "number",
    );
    return core.length ? core : [];
  }

  return variants.filter((item) => {
    if (typeof item.minPhenotypeScore === "number" && score < item.minPhenotypeScore) return false;
    if (typeof item.maxPhenotypeScore === "number" && score > item.maxPhenotypeScore) return false;
    return true;
  });
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

function specificHybridKey(
  locality?: string,
  localityAncestry?: Partial<Record<string, number>>,
) {
  if (localityAncestry) {
    const parents = Object.entries(localityAncestry)
      .filter(([, value]) => Number(value ?? 0) > 0)
      .sort((a, b) => Number(b[1] ?? 0) - Number(a[1] ?? 0))
      .slice(0, 2)
      .map(([name]) => normalizeLocalityToken(name))
      .filter(Boolean)
      .sort();

    if (parents.length === 2) return parents.join("-");
  }

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

function canonicalLocalityKey(value?: string) {
  const token = normalizeLocalityToken(value);
  if (!token) return null;
  return Object.keys(localitySprites).find(
    (key) => normalizeLocalityToken(key) === token,
  ) ?? null;
}

function localityCandidates(request: ChondroSpriteRequest) {
  const candidates: string[] = [];
  const direct = canonicalLocalityKey(request.locality);
  if (direct) candidates.push(direct);

  if (request.localityAncestry) {
    const ancestryLocalities = Object.entries(request.localityAncestry)
      .filter(([, value]) => Number(value ?? 0) > 0)
      .sort((a, b) => Number(b[1] ?? 0) - Number(a[1] ?? 0))
      .map(([name]) => canonicalLocalityKey(name))
      .filter((name): name is string => Boolean(name));

    for (const name of ancestryLocalities) {
      if (!candidates.includes(name)) candidates.push(name);
    }
  }

  return candidates;
}

export function localitySpriteFor(request: ChondroSpriteRequest) {
  for (const locality of localityCandidates(request)) {
    const set = localitySprites[locality];
    const sprite = pickVariant(
      poolForStage(set, request),
      request,
      `locality:${locality}`,
    );
    if (sprite) return sprite;
  }
  return null;
}

export function hybridSpriteFor(request: ChondroSpriteRequest) {
  if (request.classification !== "Hybrid") return null;

  const exactKey = specificHybridKey(request.locality, request.localityAncestry);
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
    manokwariRedAdultAPlus: "/hatchery/snakes/special/manokwari-red-adult-a-plus.webp",
    sorongYellowAdultAPlus: "/hatchery/snakes/special/sorong-yellow-adult-a-plus.webp",
    designerAdult01: "/hatchery/snakes/special/designer/adult-01.webp",
    designerRedNeonate01: "/hatchery/snakes/special/designer/red-neonate-01.webp",
  },
  pending: {},
} as const;
