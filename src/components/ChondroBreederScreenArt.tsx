import Image from "next/image";

type Screen = "breeding" | "colony" | "market";

const screenArt: Record<Screen, { src: string; eyebrow: string; title: string; detail: string; alt: string }> = {
  breeding: {
    src: "/hatchery/game/fresh-eggs.webp",
    eyebrow: "Breeding program",
    title: "Build each pairing toward a real clutch.",
    detail: "Condition breeders, cycle the female, pair, separate, follow development and move into incubation.",
    alt: "Illustrated green tree python eggs in the Arboreal Planet game style",
  },
  colony: {
    src: "/hatchery/game/pvc-enclosure.webp",
    eyebrow: "Chondro Dojo housing",
    title: "Your colony lives in purpose-built arboreal enclosures.",
    detail: "Use the Colony screen for animal records, testing, care, capacity and enclosure management.",
    alt: "Illustrated PVC green tree python enclosure with white PVC perches",
  },
  market: {
    src: "/hatchery/game/neonates.webp",
    eyebrow: "Chondro exchange",
    title: "Buy, raise and move animals through the breeder economy.",
    detail: "The Store combines rotating game animals with player listings and the conservation fallback system.",
    alt: "Illustrated red and yellow green tree python neonates in the Arboreal Planet game style",
  },
};

export function ChondroBreederScreenArt({ screen }: { screen: Screen }) {
  const art = screenArt[screen];
  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div className="overflow-hidden rounded-[26px] border border-emerald-300/10 bg-[radial-gradient(circle_at_left,rgba(52,211,153,.085),transparent_38%),#06100c] shadow-[0_18px_54px_rgba(0,0,0,.18)]">
        <div className="grid items-center gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-5">
          <div className="mx-auto w-full max-w-[180px] overflow-hidden rounded-[20px] border border-white/[.07] bg-black/30">
            <Image src={art.src} alt={art.alt} width={560} height={560} className="h-auto w-full" />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/50">{art.eyebrow}</div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white sm:text-2xl">{art.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/44">{art.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
