import Link from "next/link";
import Image from "next/image";

const steps = [
  ["1 · BUILD", "Start with limited facility capacity, compatible enclosures and an operating budget."],
  ["2 · KEEP", "House animals individually by default while sharing compatible enclosure models across species."],
  ["3 · BREED", "Run egg-laying or live-bearing breeding programs according to the biology of each species."],
  ["4 · EXPAND", "Raise offspring, keep holdbacks, build lines, expand rooms and unlock rarer species and equipment."],
];

const achievements = ["First Offspring", "First Clutch", "First Litter", "Three Generations", "Lineage Keeper", "Facility Builder"];

export default function ArcadePage() {
  return (
    <main className="bg-black">
      {/* Page header: Arboreal Arcade logo on black */}
      <section className="border-b border-white/[.06] bg-black">
        <div className="mx-auto max-w-4xl px-5 py-8 sm:py-10">
          <Image
            src="/branding/arboreal-arcade-logo.webp"
            alt="Arboreal Arcade"
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="block h-auto w-full"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-4 pt-10 sm:px-6">
        <div className="inline-flex rounded-full border border-amber-200/15 bg-amber-200/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">Virtual animals only</div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.03em] text-white sm:text-5xl">Keeper games built around long-term progression.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">Arboreal Planet&apos;s Arcade is home to Arboreal Keeper — a Green Tree Python breeding and keeper game built around animals, locality projects, lineages, enclosures, offspring and long-term progression.</p>
      </section>

      {/* One card per game */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <div className="section-kicker">Games</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Link href="/arcade/arboreal-keeper" className="panel group overflow-hidden rounded-[26px]">
            <div className="grid sm:grid-cols-[240px_1fr]">
              <div className="relative min-h-[240px] bg-black/30">
                <Image src="/hatchery/game/arboreal-keeper-ad-hero.webp" alt="Bunn holding a red green tree python neonate — Arboreal Keeper" fill sizes="(max-width: 640px) 100vw, 240px" className="object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-7">
                <div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-100/55">Featured game</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-.02em]">Arboreal Keeper</h2>
                <p className="mt-3 text-sm leading-6 text-white/42">Build a Green Tree Python program around breeding, locality projects, housing, offspring, market decisions and records — start small and grow your keeper program over time.</p>
                <span className="mt-5 inline-flex w-fit rounded-xl bg-amber-200 px-5 py-3 text-sm font-bold text-[#17130a]">Play now</span>
              </div>
            </div>
          </Link>
          {/* Canopy Hunter is intentionally unlisted until launch — the route /arcade/canopy-hunter stays live for owner review. */}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text]) => (
            <div key={title} className="panel-soft rounded-3xl p-5">
              <div className="text-[10px] font-bold tracking-[.16em] text-emerald-300/55">{title}</div>
              <p className="mt-3 text-sm leading-6 text-white/38">{text}</p>
            </div>
          ))}
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
