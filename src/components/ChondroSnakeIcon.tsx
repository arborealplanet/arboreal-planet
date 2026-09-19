import { chondroSpecificSpriteFor, type ChondroClassification, type ChondroLifeStage, type ChondroNeonateColor, type ChondroSubspecies } from "@/lib/chondro-sprite-registry";

type TraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention" | "blotches";
type PortraitTraits = Partial<Record<TraitKey, number>> & { blue?: number };

export function ChondroSnakeIcon({
  subspecies,
  name,
  compact = false,
  lifeStage,
  neonateColor,
  locality,
  classification,
  ancestry,
  localityAncestry,
  phenotypeScore,
  spriteSeed,
}: {
  subspecies: ChondroSubspecies;
  name: string;
  traits?: PortraitTraits;
  compact?: boolean;
  lifeStage?: ChondroLifeStage;
  neonateColor?: ChondroNeonateColor;
  locality?: string;
  classification?: ChondroClassification;
  ancestry?: Partial<Record<ChondroSubspecies, number>>;
  localityAncestry?: Partial<Record<string, number>>;
  phenotypeScore?: number;
  spriteSeed?: string;
}) {
  const rawSrc = chondroSpecificSpriteFor({
    subspecies,
    locality,
    lifeStage,
    neonateColor,
    classification,
    ancestry,
    localityAncestry,
    phenotypeScore,
    variantSeed: spriteSeed ?? name,
  });
  const isSubadult = lifeStage === "Subadult";
  const versionedSrc = rawSrc ? `${rawSrc}?v=2026-09-19-variant-pools-v15` : null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 ${compact ? "h-40 sm:h-48" : "h-56 sm:h-72"}`}>
      <img
        key={versionedSrc ?? "missing-sprite"}
        src={versionedSrc ?? ""}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
        alt={`${name} illustrated virtual game portrait`}
        className={`h-full w-full object-contain p-1 sm:p-2 ${isSubadult ? "scale-[0.86]" : ""} ${versionedSrc ? "" : "hidden"}`}
      />
      {!versionedSrc ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-100/55">Sprite pending</div>
            <div className="mt-2 text-xs font-semibold text-white/45">{locality ?? classification ?? subspecies}</div>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-emerald-100/20 bg-[#06100c]/85 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-emerald-100/75 shadow-lg backdrop-blur-sm">
        Virtual
      </div>
      {lifeStage && lifeStage !== "Adult" ? (
        <div className={`pointer-events-none absolute right-2 top-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] shadow-lg backdrop-blur-sm ${neonateColor === "Red" ? "border-red-200/20 bg-red-950/75 text-red-100/80" : "border-amber-100/20 bg-amber-950/75 text-amber-100/80"}`}>
          {lifeStage ?? "Juvenile"}
        </div>
      ) : null}
    </div>
  );
}
