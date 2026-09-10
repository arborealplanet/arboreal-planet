type ChondroSubspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type TraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention" | "blotches";
type PortraitTraits = Partial<Record<TraitKey, number>> & { blue?: number };
type LifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";
type NeonateColor = "Red" | "Yellow";

const TRAIT_ART_VERSION = "2026-09-09-i";

const baseArtBySubspecies: Record<ChondroSubspecies, string> = {
  "Morelia azurea azurea": "/hatchery/snakes/azurea.avif",
  "Morelia azurea pulcher": "/hatchery/snakes/pulcher.avif",
  "Morelia azurea utaraensis": "/hatchery/snakes/utaraensis.avif",
  "Morelia viridis": "/hatchery/snakes/viridis.avif",
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

// Only trait families listed here are allowed to override a sharp base portrait.
// This lets us upgrade artwork one family at a time without accidentally
// re-enabling low-resolution legacy files for other snakes.
const verifiedTraitArtBySubspecies: Record<ChondroSubspecies, readonly TraitKey[]> = {
  "Morelia azurea azurea": [
    "highBlack",
    "highWhite",
    "blueStripe",
    "yellowRetention",
    "blotches",
  ],
  "Morelia azurea pulcher": [
    "highBlack",
    "highWhite",
    "blueStripe",
    "yellowRetention",
    "blotches",
  ],
  "Morelia azurea utaraensis": ["blueStripe", "yellowRetention"],
  "Morelia viridis": [],
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

function adultPortraitArt(subspecies: ChondroSubspecies, traits?: PortraitTraits) {
  if (!traits) return baseArtBySubspecies[subspecies];

  const allowedTraits = verifiedTraitArtBySubspecies[subspecies];
  if (allowedTraits.length === 0) return baseArtBySubspecies[subspecies];

  const entries = allowedTraits.map(
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

function neonatePortraitArt(subspecies: ChondroSubspecies, neonateColor: NeonateColor) {
  const effectiveColor: NeonateColor = subspecies === "Morelia viridis" ? "Yellow" : neonateColor;
  return `/hatchery/snakes/neonates/${slugBySubspecies[subspecies]}-${effectiveColor.toLowerCase()}.webp`;
}

export function ChondroSnakeIcon({
  subspecies,
  name,
  traits,
  compact = false,
  lifeStage,
  neonateColor,
}: {
  subspecies: ChondroSubspecies;
  name: string;
  traits?: PortraitTraits;
  compact?: boolean;
  lifeStage?: LifeStage;
  neonateColor?: NeonateColor;
}) {
  const adultRawSrc = adultPortraitArt(subspecies, traits);
  const isNeonate = (lifeStage === "Hatchling" || lifeStage === "Neonate") && !!neonateColor;
  const rawSrc = isNeonate ? neonatePortraitArt(subspecies, neonateColor) : adultRawSrc;
  const rawFallback = adultRawSrc;
  const rawBaseFallback = baseArtBySubspecies[subspecies];
  const src = withVersion(rawSrc);
  const fallback = withVersion(rawFallback);
  const baseFallback = withVersion(rawBaseFallback);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 ${compact ? "h-40 sm:h-48" : "h-56 sm:h-72"}`}>
      <img
        key={src}
        src={src}
        onError={(event) => {
          const current = event.currentTarget.src;
          if (!current.includes(rawFallback) && rawSrc !== rawFallback) {
            event.currentTarget.src = fallback;
            return;
          }
          if (!current.includes(rawBaseFallback) && rawFallback !== rawBaseFallback) {
            event.currentTarget.src = baseFallback;
          }
        }}
        alt={`${name} illustrated virtual game portrait`}
        className="h-full w-full object-contain p-1 sm:p-2"
      />
      <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-emerald-100/20 bg-[#06100c]/85 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-emerald-100/75 shadow-lg backdrop-blur-sm">
        Virtual
      </div>
      {isNeonate ? (
        <div className={`pointer-events-none absolute right-2 top-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] shadow-lg backdrop-blur-sm ${neonateColor === "Red" ? "border-red-200/20 bg-red-950/75 text-red-100/80" : "border-amber-100/20 bg-amber-950/75 text-amber-100/80"}`}>
          {neonateColor} neonate
        </div>
      ) : null}
    </div>
  );
}
