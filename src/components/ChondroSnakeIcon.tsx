type ChondroSubspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type VisualTrait = "highWhite" | "blue" | "highBlack" | "yellow" | "blotches";
type TraitTier = 70 | 85 | 95 | 100;

type TraitValues = {
  highBlack?: number;
  highWhite?: number;
  blue?: number;
  yellow?: number;
  blotches?: number;
};

const baseArtBySubspecies: Record<ChondroSubspecies, string> = {
  "Morelia azurea azurea": "/hatchery/snakes/azurea.webp",
  "Morelia azurea pulcher": "/hatchery/snakes/pulcher.webp",
  "Morelia azurea utaraensis": "/hatchery/snakes/utaraensis.webp",
  "Morelia viridis": "/hatchery/snakes/viridis.webp",
};

const slugBySubspecies: Record<ChondroSubspecies, string> = {
  "Morelia azurea azurea": "azurea",
  "Morelia azurea pulcher": "pulcher",
  "Morelia azurea utaraensis": "utaraensis",
  "Morelia viridis": "viridis",
};

const traitSlug: Record<VisualTrait, string> = {
  highWhite: "high-white",
  blue: "blue",
  highBlack: "high-black",
  yellow: "yellow",
  blotches: "blotches",
};

function artTier(value: number): TraitTier | null {
  if (value >= 100) return 100;
  if (value >= 95) return 95;
  if (value >= 85) return 85;
  if (value >= 70) return 70;
  return null;
}

function dominantTrait(traits: TraitValues): { trait: VisualTrait; value: number; tier: TraitTier } | null {
  const candidates: { trait: VisualTrait; value: number }[] = [
    { trait: "highBlack", value: traits.highBlack ?? 0 },
    { trait: "highWhite", value: traits.highWhite ?? 0 },
    { trait: "blue", value: traits.blue ?? 0 },
    { trait: "yellow", value: traits.yellow ?? 0 },
    { trait: "blotches", value: traits.blotches ?? 0 },
  ];

  candidates.sort((a, b) => b.value - a.value);
  const winner = candidates[0];
  const tier = artTier(winner.value);
  return tier ? { ...winner, tier } : null;
}

function traitArt(subspecies: ChondroSubspecies, traits: TraitValues) {
  const winner = dominantTrait(traits);
  if (!winner) return baseArtBySubspecies[subspecies];
  return `/hatchery/snakes/traits/${slugBySubspecies[subspecies]}-${traitSlug[winner.trait]}-${winner.tier}.webp`;
}

export function ChondroSnakeIcon({
  subspecies,
  name,
  compact = false,
  highBlack = 0,
  highWhite = 0,
  blue = 0,
  yellow = 0,
  blotches = 0,
}: {
  subspecies: ChondroSubspecies;
  name: string;
  compact?: boolean;
  highBlack?: number;
  highWhite?: number;
  blue?: number;
  yellow?: number;
  blotches?: number;
}) {
  const fallback = baseArtBySubspecies[subspecies];
  const src = traitArt(subspecies, { highBlack, highWhite, blue, yellow, blotches });

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 ${compact ? "h-28" : "h-40"}`}>
      <img
        src={src}
        alt={`${name} illustrated game portrait`}
        className="h-full w-full object-contain p-2"
        onError={(event) => {
          const image = event.currentTarget;
          if (!image.src.endsWith(fallback)) image.src = fallback;
        }}
      />
    </div>
  );
}
