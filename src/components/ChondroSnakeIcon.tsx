type ChondroSubspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";

const artBySubspecies: Record<ChondroSubspecies, string> = {
  "Morelia azurea azurea": "/hatchery/snakes/azurea.webp",
  "Morelia azurea pulcher": "/hatchery/snakes/pulcher.webp",
  "Morelia azurea utaraensis": "/hatchery/snakes/utaraensis.webp",
  "Morelia viridis": "/hatchery/snakes/viridis.webp",
};

export function ChondroSnakeIcon({ subspecies, name, compact = false }: { subspecies: ChondroSubspecies; name: string; compact?: boolean }) {
  const blackDippedTail = subspecies !== "Morelia azurea utaraensis";
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 ${compact ? "h-28" : "h-40"}`}>
      <img src={artBySubspecies[subspecies]} alt={`${name} illustrated game portrait`} className="h-full w-full object-contain p-2" />
      <div className="absolute bottom-2 right-2 rounded-full border border-black/20 bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-[.11em] text-white/60">
        {blackDippedTail ? "Black-dipped tail" : "Matching tail"}
      </div>
    </div>
  );
}
