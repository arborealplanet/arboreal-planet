import Link from "next/link";
import Image from "next/image";
import { PageIntro } from "@/components/AppShell";

const achievements = ["First Clutch", "First Red Neo", "First Yellow Neo", "Three Generations", "Lineage Keeper", "Genetics Student"];

export default function HatcheryPage() {
  return (
    <main>
      <section className="border-b border-white/[.06] bg-black/10">
        <div className="mx-auto max-w-[1560px] px-0 py-0 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="relative overflow-hidden sm:rounded-[30px]">
            <Image src="/branding/chondro-breeder-hero.webp" alt="Illustrated Chondro breeder with a green tree python and an arboreal enclosure rack" width={1600} height={900} sizes="100vw" className="aspect-[16/8] w-full object-cover sm:aspect-[16/7]" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-100/75">Featured in Arboreal Arcade</div>
              <div className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">Chondro Breeder</div>
            </div>
          </div>
        </div>
      </section>

      <PageIntro
        eyebrow="Arboreal Arcade"
        title="Breed. Build. Learn. Compete."
        description="Arboreal Planet's game space starts with Chondro Breeder: build a virtual collection, manage breeding seasons, develop lines, expand facilities, test genetics, enter shows and grow a long-term breeder program."
        aside={<div className="rounded-full border border-amber-200/15 bg-amber-200/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">Virtual animals only</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <div className="panel relative overflow-hidden rounded-[30px] border-amber-200/10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-amber-200/[.07] bg-amber-200/[.025]" />
          <div className="absolute right-16 top-20 h-24 w-24 rounded-full bg-emerald-300/[.04] blur-2xl" />
          <div className="relative grid gap-8 p-7 sm:p-9 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-100/55">Featured game</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Chondro Breeder</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/42">Start small, choose a breeding strategy, build your colony and shape the lines that follow. Real-time breeding stages, facility space, disease risk, projects, shows and long-term progression make each program develop differently.</p>
              <div className="mt-7 flex flex-wrap gap-2">{["Cycling", "Pairing", "Incubation", "Hatch Day", "Lineage", "Facilities", "Shows", "Research"].map((item) => <span key={item} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-xs text-white/38">{item}</span>)}</div>
              <Link href="/arcade/chondro-breeder" className="mt-8 inline-flex rounded-xl bg-amber-200 px-5 py-3 text-sm font-bold text-[#17130a]">Enter Chondro Breeder</Link>
            </div>

            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[26px] border border-amber-200/15 bg-black/20 shadow-2xl shadow-black/25">
              <Image src="/branding/arboreal-arcade-splash.webp" alt="Arboreal Planet Arboreal Arcade" width={700} height={1244} sizes="(max-width: 1024px) 90vw, 384px" className="block h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[["1 · BUILD", "Start with a small collection, limited room space and a real operating budget."],["2 · PAIR", "Plan pairings around lineage, locality, phenotype, condition, health and long-term projects."],["3 · WAIT", "Cycling, pairing, laying, incubation, testing and construction continue on real-time timers while you are away."],["4 · GROW", "Keep holdbacks, establish lines, enter shows, expand rooms and unlock more advanced research tools."]].map(([title, text]) => <div key={title} className="panel-soft rounded-3xl p-5"><div className="text-[10px] font-bold tracking-[.16em] text-emerald-300/55">{title}</div><p className="mt-3 text-sm leading-6 text-white/38">{text}</p></div>)}
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-6 lg:grid-cols-[1fr_1fr]">
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">My Chondro Program</div>
            <h2 className="mt-3 text-2xl font-semibold">A collection book with lineage and history.</h2>
            <p className="mt-3 text-sm leading-6 text-white/38">Virtual animals keep parents, grandparents, hatch color, generation, breeding history, project tags, favorites and achievements across multiple generations.</p>
            <div className="mt-6 grid grid-cols-3 gap-3">{["Collection", "Lineages", "Projects"].map((item) => <div key={item} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="text-[9px] uppercase tracking-[.13em] text-white/22">{item}</div><div className="mt-3 text-xl font-semibold text-white/45">—</div></div>)}</div>
          </div>
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Arcade achievements</div>
            <h2 className="mt-3 text-2xl font-semibold">Build a breeder legacy over time.</h2>
            <div className="mt-5 flex flex-wrap gap-2">{achievements.map((item) => <span key={item} className="rounded-full border border-amber-200/10 bg-amber-200/[.025] px-3 py-2 text-[11px] font-semibold text-amber-100/45">{item}</span>)}</div>
            <p className="mt-5 text-xs leading-5 text-white/28">Game rarity, virtual prices and progression are game systems only and do not represent real biological rarity or market value.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel-soft rounded-3xl p-6"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/50">Progression system</div><h3 className="mt-3 text-xl font-semibold text-white/65">Research & Genetics</h3><p className="mt-2 text-sm leading-6 text-white/32">Genetic testing unlocks later in your breeder career, takes real time and becomes more capable as your operation grows.</p></div>
          <div className="panel-soft rounded-3xl p-6"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/50">Progression system</div><h3 className="mt-3 text-xl font-semibold text-white/65">Rooms & Facility Growth</h3><p className="mt-2 text-sm leading-6 text-white/32">Add reptile rooms, breeding rooms, grow-out space and research wings instead of magically turning one room into a giant facility.</p></div>
        </div>
      </section>
    </main>
  );
}
