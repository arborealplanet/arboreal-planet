import Link from "next/link";
import Image from "next/image";
import { PageIntro } from "@/components/AppShell";
import { ChondroPatternBanner } from "@/components/ChondroPatternBanner";

const achievements = ["First Clutch", "First Red Neo", "First Yellow Neo", "Three Generations", "Lineage Keeper", "Genetics Student"];

export default function HatcheryPage() {
  return (
    <main>
      <section className="border-b border-white/[.06] bg-black/10">
        <div className="mx-auto max-w-[1560px] px-0 py-0 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <ChondroPatternBanner />
        </div>
      </section>

      <PageIntro
        eyebrow="Arboreal Arcade"
        title="Breeder games built around long-term progression."
        description="Arboreal Planet's game space starts with Chondro Breeder, where players manage a virtual collection, breeding seasons, lineage, facilities, genetics, shows and research over multiple generations."
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
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/42">Manage breeding pairs, lineage, facility capacity, health risk, research and shows. Real-time timers continue while you are away, and each generation becomes part of the program&apos;s recorded history.</p>
              <div className="mt-7 flex flex-wrap gap-2">{["Cycling", "Pairing", "Gestation", "Incubation", "Hatch Day", "Lineage", "Facilities", "Research"].map((item) => <span key={item} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-xs text-white/38">{item}</span>)}</div>
              <Link href="/arcade/chondro-breeder" className="mt-8 inline-flex rounded-xl bg-amber-200 px-5 py-3 text-sm font-bold text-[#17130a]">Enter Chondro Breeder</Link>
            </div>

            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[26px] border border-amber-200/15 bg-black/20 shadow-2xl shadow-black/25">
              <Image src="/branding/arboreal-arcade-splash.webp" alt="Arboreal Planet Arboreal Arcade" width={700} height={1244} sizes="(max-width: 1024px) 90vw, 384px" className="block h-auto w-full" />
              <div className="border-t border-white/[.06] bg-[#030806] p-3">
                <div className="grid grid-cols-[88px_1fr] items-center gap-3 rounded-[18px] border border-emerald-300/10 bg-emerald-300/[.025] p-3">
                  <Image src="/hatchery/game/fresh-eggs.webp" alt="Chondro Breeder illustrated clutch art" width={220} height={220} className="h-auto w-full rounded-[14px]" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[.16em] text-emerald-200/50">Inside the game</div>
                    <div className="mt-1 text-sm font-semibold text-white/72">Clutches now use Arboreal Planet game art.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[["1 · BUILD", "Start with a limited collection, facility capacity and operating budget."],["2 · PAIR", "Plan pairings around lineage, locality, phenotype, condition, health and breeding goals."],["3 · MANAGE", "Breeding, incubation, testing and construction continue on real-time timers while you are away."],["4 · EXPAND", "Keep holdbacks, establish lines, enter shows, expand rooms and unlock research tools."]].map(([title, text]) => <div key={title} className="panel-soft rounded-3xl p-5"><div className="text-[10px] font-bold tracking-[.16em] text-emerald-300/55">{title}</div><p className="mt-3 text-sm leading-6 text-white/38">{text}</p></div>)}
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-6 lg:grid-cols-[1fr_1fr]">
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">My Chondro Program</div>
            <h2 className="mt-3 text-2xl font-semibold">Collection history and lineage records.</h2>
            <p className="mt-3 text-sm leading-6 text-white/38">Virtual animals retain parentage, hatch color, generation, breeding history, project tags, favorites and achievements across multiple generations.</p>
            <div className="mt-6 grid grid-cols-3 gap-3">{["Collection", "Lineages", "Projects"].map((item) => <div key={item} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="text-[9px] uppercase tracking-[.13em] text-white/22">{item}</div><div className="mt-3 text-xl font-semibold text-white/45">—</div></div>)}</div>
          </div>
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Arcade achievements</div>
            <h2 className="mt-3 text-2xl font-semibold">Achievements track long-term progress.</h2>
            <div className="mt-5 flex flex-wrap gap-2">{achievements.map((item) => <span key={item} className="rounded-full border border-amber-200/10 bg-amber-200/[.025] px-3 py-2 text-[11px] font-semibold text-amber-100/45">{item}</span>)}</div>
            <p className="mt-5 text-xs leading-5 text-white/28">Game rarity, virtual prices and progression are game systems only and do not represent real biological rarity or market value.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel-soft overflow-hidden rounded-3xl">
            <div className="grid items-center gap-4 p-5 sm:grid-cols-[130px_1fr] sm:p-6">
              <div className="overflow-hidden rounded-[20px] border border-emerald-300/10 bg-black/30">
                <Image src="/hatchery/game/fresh-eggs.webp" alt="Illustrated Chondro Breeder clutch" width={560} height={560} className="h-auto w-full" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/50">Progression system</div>
                <h3 className="mt-3 text-xl font-semibold text-white/65">Breeding & Genetics</h3>
                <p className="mt-2 text-sm leading-6 text-white/32">Pairing, clutch development and genetic testing become part of a visual breeding program instead of living only in tables and timers.</p>
              </div>
            </div>
          </div>
          <div className="panel-soft overflow-hidden rounded-3xl">
            <div className="grid items-center gap-4 p-5 sm:grid-cols-[130px_1fr] sm:p-6">
              <div className="overflow-hidden rounded-[20px] border border-amber-200/10 bg-black/30">
                <Image src="/hatchery/game/incubator.webp" alt="Illustrated Chondro Breeder incubator" width={560} height={560} className="h-auto w-full" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/50">Progression system</div>
                <h3 className="mt-3 text-xl font-semibold text-white/65">Rooms & Facility Growth</h3>
                <p className="mt-2 text-sm leading-6 text-white/32">Add breeder capacity, incubation and research infrastructure as the collection expands.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
