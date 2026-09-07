type ChondroSubspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";

const artBySubspecies: Record<ChondroSubspecies, string> = {
  "Morelia azurea azurea": "/hatchery/snakes/azurea.webp",
  "Morelia azurea pulcher": "/hatchery/snakes/pulcher.webp",
  "Morelia azurea utaraensis": "/hatchery/snakes/utaraensis.webp",
  "Morelia viridis": "/hatchery/snakes/viridis.webp",
};

export function ChondroSnakeIcon({ subspecies, name, compact = false }: { subspecies: ChondroSubspecies; name: string; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 ${compact ? "h-28" : "h-40"}`}>
      <img src={artBySubspecies[subspecies]} alt={`${name} illustrated game portrait`} className="h-full w-full object-contain p-2" />
    </div>
  );
}
