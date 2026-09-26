import Image from "next/image";
import GameCard from "./GameCard";

const keeperSteps = [
  { title: "1 · BUILD", text: "Start with limited facility capacity, compatible enclosures and an operating budget." },
  { title: "2 · KEEP", text: "House animals individually by default while sharing compatible enclosure models across species." },
  { title: "3 · BREED", text: "Run egg-laying or live-bearing breeding programs according to the biology of each species." },
  { title: "4 · EXPAND", text: "Raise offspring, keep holdbacks, build lines, expand rooms and unlock rarer species and equipment." },
];

const achievements = ["First Offspring", "First Clutch", "First Litter", "Three Generations", "Lineage Keeper", "Facility Builder"];

const sorterSteps = [
  { title: "1 · MEET", text: "Ten wild specimens step up to the sorting chamber, each hiding clues in its scales, crown and origin." },
  { title: "2 · PROBE", text: "Probe each serpent's scales, crown and homeland — but every probe shrinks your swift-call bonus." },
  { title: "3 · SORT", text: "Call its House: Azurea, Pulcher, Utaraensis or Viridis. Call early and blind for up to +75." },
  { title: "4 · NAME", text: "Name the serpent's home valley for a +50 homeland bonus, then earn your rank up to Chondro Master." },
];

const triviaSteps = [
  { title: "1 · PLAY", text: "Ten questions per round drawn from green tree pythons, snake biology, husbandry and Arboreal Planet lore." },
  { title: "2 · BEAT THE CLOCK", text: "Fifteen seconds per question — faster correct answers score more, and streaks multiply your points." },
  { title: "3 · LIFELINE", text: "One 50/50 lifeline per round knocks out two wrong answers when a question has you cornered." },
  { title: "4 · RANK UP", text: "Climb from Hatchling to Chondro Master and chase your persisted best score." },
];

export default function ArcadePage() {
  return (
    <main className="bg-black">
      {/* Page header: Arboreal Arcade logo on black */}
      <section className="border-b border-white/[.06] bg-black">
        <div className="mx-auto max-w-2xl px-5 py-5 sm:py-8">
          <Image
            src="/branding/arboreal-arcade-logo.webp"
            alt="Arboreal Arcade"
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 672px) 100vw, 672px"
            className="block h-auto w-full"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-4 pt-6 sm:px-6">
        <div className="inline-flex rounded-full border border-amber-200/15 bg-amber-200/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">Virtual animals only</div>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">Keeper games built around long-term progression.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">Arboreal Planet&apos;s Arcade is home to Arboreal Keeper — a Green Tree Python breeding and keeper game built around animals, locality projects, lineages, enclosures, offspring and long-term progression.</p>
      </section>

      {/* One compact card per game — details collapse underneath */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="section-kicker">Games</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <GameCard
            href="/arcade/arboreal-keeper"
            imageSrc="/hatchery/game/arboreal-keeper-ad-hero.webp"
            imageAlt="Bunn holding a red green tree python neonate — Arboreal Keeper"
            kicker="Featured game"
            title="Arboreal Keeper"
            description="Build a Green Tree Python program around breeding, locality projects, housing, offspring, market decisions and records — start small and grow your keeper program over time."
            steps={keeperSteps}
          />
          {/* Canopy Hunter is intentionally unlisted until launch — the route /arcade/canopy-hunter stays live for owner review. */}
          <GameCard
            href="/arcade/snake-sorting"
            imageSrc="/arcade/snake-sorting/snake-sorter-logo.webp"
            imageAlt="Snake Sorter — The Sorting Ceremony"
            kicker="New game"
            title="Snake Sorter"
            description="The Sorting Ceremony: you are the Sorting Hat. Probe each serpent's scales, crown and homeland, call its House among the four chondro taxa — and name its valley for a bonus."
            steps={sorterSteps}
          />
          <GameCard
            href="/arcade/reptile-trivia"
            imageSrc="/arcade/reptile-trivia/reptile-trivia-logo.webp"
            imageAlt="Reptile Trivia — green tree python coiled around a golden question mark"
            kicker="New game"
            title="Reptile Trivia"
            description="Ten-question rounds on green tree pythons, snake biology, husbandry and Arboreal Planet lore. Beat the clock, ride your streak, and climb from Hatchling to Chondro Master."
            steps={triviaSteps}
          />
        </div>
      </section>

      <section className="border-t border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <div className="section-kicker">Arcade achievements</div>
          <h2 className="mt-3 text-2xl font-semibold">Achievements track long-term progress.</h2>
          <div className="mt-5 flex flex-wrap gap-2">{achievements.map((item) => <span key={item} className="rounded-full border border-amber-200/10 bg-amber-200/[.025] px-3 py-2 text-[11px] font-semibold text-amber-100/45">{item}</span>)}</div>
          <p className="mt-5 text-xs leading-5 text-white/28">Game rarity, virtual prices and progression are game systems only and do not represent real biological rarity or market value.</p>
        </div>
      </section>
    </main>
  );
}
