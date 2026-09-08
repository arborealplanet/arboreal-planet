type ChondroSubspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type TraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention" | "blotches";
type PortraitTraits = Partial<Record<TraitKey, number>>;

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
const portraitTiers = [70, 85, 95, 100] as const;

function portraitArt(subspecies: ChondroSubspecies, traits?: PortraitTraits) {
  if (!traits) return baseArtBySubspecies[subspecies];
  const entries = (Object.keys(slugByTrait) as TraitKey[]).map(key => [key, Number(traits[key] ?? 0)] as const);
  const [trait, value] = entries.reduce((best, current) => current[1] > best[1] ? current : best, entries[0]);
  if (value < portraitTiers[0]) return baseArtBySubspecies[subspecies];
  const tier = portraitTiers.reduce((best, current) => Math.abs(value - current) < Math.abs(value - best) ? current : best, portraitTiers[0]);
  return `/hatchery/snakes/traits/${slugBySubspecies[subspecies]}-${slugByTrait[trait]}-${tier}.webp`;
}

export function ChondroSnakeIcon({ subspecies, name, traits, compact = false }: { subspecies: ChondroSubspecies; name: string; traits?: PortraitTraits; compact?: boolean }) {
  const src = portraitArt(subspecies, traits);
  const fallback = baseArtBySubspecies[subspecies];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 ${compact ? "h-28" : "h-40"}`}>
      <img src={src} onError={event => { if (event.currentTarget.src.endsWith(fallback)) return; event.currentTarget.src = fallback; }} alt={`${name} illustrated game portrait`} className="h-full w-full object-contain p-2" />
    </div>
  );
}
