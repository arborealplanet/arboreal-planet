import { PitcherPlantArt } from "@/components/ArborealArt";

// Slugs with raster art in public/images/plants/<slug>.webp.
// Nepenthes keeps its inline SVG; anything else falls back to the ✦ glyph.
const RASTER_ART = new Set([
  "pothos",
  "bromeliad",
  "snake-plant",
  "birds-nest-fern",
  "philodendron",
  "dracaena",
  "orchid",
  "ficus",
]);

// Absolutely positioned inside a relative parent (card banner, detail hero, ...).
export function PlantArt({ slug, name }: { slug: string; name: string }) {
  if (slug === "nepenthes")
    return (
      <div className="absolute inset-4">
        <PitcherPlantArt />
      </div>
    );
  if (RASTER_ART.has(slug))
    return (
      <img
        src={`/images/plants/${slug}.webp`}
        alt={name}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
    );
  return (
    <div className="absolute inset-0 grid place-items-center text-3xl text-white/10">
      ✦
    </div>
  );
}
