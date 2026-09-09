type ChondroSubspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type TraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention" | "blotches";
type PortraitTraits = Partial<Record<TraitKey, number>> & { blue?: number };

const TRAIT_ART_VERSION = "2026-09-09-b";

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
const slugByTrait: Record<TraitKey, string> = {
  highBlack: "high-black",
  highWhite: "high-white",
  blueStripe: "blue",
  yellowRetention: "yellow",
  blotches: "blotches",
};

const withVersion = (src: string) => `${src}?v=${TRAIT_ART_VERSION}`;

function portraitTier(value: number) {
  if (value >= 100) return 100;
  if (value >= 95) return 95;
  if (value >= 85) return 85;
  if (value >= 70) return 70;
  return null;
}

function traitValue(traits: PortraitTraits, key: TraitKey) {
  if (key === "blueStripe") return Number(traits.blueStripe ?? traits.blue ?? 0);
  return Number(traits[key] ?? 0);
}

function portraitArt(subspecies: ChondroSubspecies, traits?: PortraitTraits) {
  if (!traits) return baseArtBySubspecies[subspecies];

  const blue = traitValue(traits, "blueStripe");
  if (blue >= 100) {
    return `/hatchery/snakes/traits/${slugBySubspecies[subspecies]}-blue-100.webp`;
  }

  const entries = (Object.keys(slugByTrait) as TraitKey[]).map(
    key => [key, traitValue(traits, key)] as const,
  );
  const [trait, value] = entries.reduce(
    (best, current) => (current[1] > best[1] ? current : best),
    entries[0],
  );
  const tier = portraitTier(value);
  if (tier === null) return baseArtBySubspecies[subspecies];
  return `/hatchery/snakes/traits/${slugBySubspecies[subspecies]}-${slugByTrait[trait]}-${tier}.webp`;
}

export function ChondroSnakeIcon({ subspecies, name, traits, compact = false }: { subspecies: ChondroSubspecies; name: string; traits?: PortraitTraits; compact?: boolean }) {
  const rawSrc = portraitArt(subspecies, traits);
  const rawFallback = baseArtBySubspecies[subspecies];
  const src = withVersion(rawSrc);
  const fallback = withVersion(rawFallback);
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 ${compact ? "h-40 sm:h-48" : "h-56 sm:h-72"}`}>
      <img
        key={src}
        src={src}
        onError={(event) => {
          if (event.currentTarget.src.includes(rawFallback)) return;
          event.currentTarget.src = fallback;
        }}
        alt={`${name} illustrated virtual game portrait`}
        className="h-full w-full object-contain p-1 sm:p-2"
      />
      <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-emerald-100/20 bg-[#06100c]/85 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-emerald-100/75 shadow-lg backdrop-blur-sm">
        Virtual
      </div>
    </div>
  );
}
