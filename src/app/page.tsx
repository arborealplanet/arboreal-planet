import Link from "next/link";
import { GreenTreePythonArt, PitcherPlantArt } from "@/components/ArborealArt";
import { ArborealsByBunnBadge } from "@/components/BrandVisuals";
import { ChondroBreederPreview } from "@/components/ChondroBreederPreview";
import { HomeLogoAnimation } from "@/components/HomeLogoAnimation";

const platformCards = [
  { title: "Animal Database", text: "Species, localities, husbandry, breeding and market context.", href: "/animals", tag: "ANIMALS", icon: "◇" },
  { title: "Plant Database", text: "Nepenthes, bromeliads and terrarium cultivation knowledge.", href: "/plants", tag: "PLANTS", icon: "⌁" },
  { title: "Snake Stocks", text: "Median-first reptile market intelligence with source transparency.", href: "/snake-stocks", tag: "MARKET DATA", icon: "↗" },
  { title: "Marketplace", text: "Animals, plants, enclosures, supplies and feeders in one market.", href: "/marketplace", tag: "DISCOVER", icon: "▣" },
  { title: "Community", text: "Follow keepers, animals, plants and topics across the hobby.", href: "/community", tag: "CONNECT", icon: "◎" },
  { title: "Arboreal Arcade", text: "Breeder games with virtual lineages, facilities, projects and long-term progression.", href: "/arcade/enter?next=%2Farcade", tag: "PLAY", icon: "◈" },
];

const populations = ["Biak", "Numfor", "Manokwari", "Sorong", "Wamena", "Lereh", "Cyclops", "Jayapura", "Aru", "Merauke"];

export default function Home() {
  return (
    <main>
      <section className="noise-surface relative overflow-hidden border-b border-white/[.055]">
        <div className="pointer-events-none absolute -right-24 top-16 h-[520px] w-[520px] rounded-full border border-emerald-300/[.05] bg-emerald-400/[.02]" />
        <div className="pointer-events-none absolute right-20 top-40 h-64 w-64 rounded-full bg-emerald-300/[.035] blur-3xl" />

        <div className="relative z-10 mx-auto flex max-w-7xl justify-center px-5 pt-5 sm:px-6 sm:pt-7 lg:pt-8"><HomeLogoAnimation /></div>

        <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-5 pb-16 pt-4 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:pb-20 lg:pt-2">
          <div className="relative z-10">
            <div className="section-kicker">The arboreal keeper network</div>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-6xl lg:text-[72px]">
              Reptile keeping, market data and community <span className="text-emerald-300">in one platform.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/60">Arboreal Planet brings species records, plant cultivation, marketplace listings, keeper activity and reptile market intelligence into one connected platform.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/community" className="primary-action">Explore the network</Link>
              <Link href="/snake-stocks" className="secondary-action">Open Snake Stocks ↗</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/[.055] pt-6 text-xs text-white/45">
              <span><b className="text-white/72">USA-first</b> market terminology</span>
              <span><b className="text-white/72">Median-first</b> market analysis</span>
              <span><b className="text-white/72">Source-reviewed</b> market data</span>
            </div>
          </div>

          <div className="relative z-10 min-h-[540px]">
            <div className="absolute -left-4 top-8 h-20 w-20 opacity-50 sm:h-28 sm:w-28"><PitcherPlantArt /></div>
            <div className="panel relative overflow-hidden rounded-[30px] border-emerald-300/10">
              <div className="relative h-[365px] overflow-hidden border-b border-white/[.055] bg-[radial-gradient(circle_at_60%_40%,rgba(57,230,125,.08),transparent_34%),linear-gradient(160deg,#0b1b13,#07100c)] sm:h-[410px]">
                <div className="absolute inset-0 grid-surface opacity-30" />
                <div className="absolute inset-x-0 bottom-0 h-[94%]"><GreenTreePythonArt /></div>
                <div className="absolute left-5 top-5 rounded-full border border-emerald-300/15 bg-black/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/75">Green Tree Python · Reference Species</div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div><div className="text-xs italic text-white/45">Morelia viridis complex</div><div className="mt-1 text-xl font-semibold">Species records and market context</div></div>
                  <Link href="/animals/green-tree-python" className="secondary-action !min-h-0 !px-3 !py-2 !text-[10px]">Open record →</Link>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[["Origin groups","2"],["Price method","Median"],["Locality views","Enabled"],["Source review","Required"]].map(([label,value],i)=><div key={label} className={`p-4 ${i<3?"border-r border-white/[.05]":""}`}><div className="text-[8px] font-bold uppercase tracking-[.12em] text-white/32">{label}</div><div className="mt-2 text-lg font-semibold text-white/75">{value}</div></div>)}
              </div>
              <Link href="/snake-stocks" className="flex items-center justify-between border-t border-white/[.055] bg-emerald-300/[.025] px-5 py-4 text-xs font-bold text-emerald-100/75"><span>SNAKE STOCKS · TRACK · COMPARE · DISCOVER</span><span>↗</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="section-kicker">Explore Arboreal Planet</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Core sections</h2></div>
          <p className="max-w-md text-sm leading-6 text-white/52">Reference data, marketplace listings, community activity, market tools and breeder games all share the same account and navigation.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformCards.map((card) => (
            <Link key={card.href} href={card.href} className="panel interactive-card group flex min-h-52 flex-col rounded-[24px] p-6">
              <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[.065] bg-white/[.02] text-lg text-emerald-300/75">{card.icon}</span><span className="text-[9px] font-bold tracking-[.14em] text-white/36">{card.tag}</span></div>
              <div className="mt-auto pt-8"><h3 className="text-xl font-semibold">{card.title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-white/52">{card.text}</p><div className="mt-5 text-xs font-bold text-emerald-300/75 transition group-hover:text-emerald-100">Open →</div></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[.055] bg-black/[.1]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="section-kicker">Reference animal</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Green Tree Python</h2>
            <p className="mt-2 text-sm italic text-white/42">Morelia viridis complex · Arboreal Planet market grouping</p>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/58">Green Tree Python is the first fully connected animal record, linking locality structure, origin terminology, marketplace listings, Snake Stocks and community activity.</p>
            <div className="mt-7 flex flex-wrap gap-2">{populations.map((name) => <span key={name} className="rounded-full border border-white/[.07] bg-white/[.018] px-3 py-1.5 text-xs text-white/55">{name}</span>)}</div>
            <Link href="/animals/green-tree-python" className="mt-7 w-fit text-sm font-bold text-emerald-300">Explore Green Tree Python →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["CAPTIVE BRED", "USCBB, CBB and other unambiguous captive-produced terms normalize here."],["IMPORT", "Import, farm bred, farm raised, wild caught and LTC normalize into the public Import market."],["LOCALITY", "Population and locality stay visible instead of being flattened into one generic species price."],["DESIGNER LINES", "Designer and project animals remain separate from locality import comparisons."]].map(([title, text]) => <div key={title} className="panel-soft rounded-[22px] p-5"><div className="text-[10px] font-bold tracking-[.15em] text-emerald-300/65">{title}</div><p className="mt-3 text-sm leading-6 text-white/50">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="panel overflow-hidden rounded-[26px]">
            <div className="flex items-center justify-between border-b border-white/[.055] p-5"><div><div className="section-kicker">Community</div><h2 className="mt-2 text-2xl font-semibold">Recent keeper activity</h2></div><Link href="/community" className="text-xs font-bold text-emerald-300">Explore →</Link></div>
            <div className="grid gap-px bg-white/[.05] sm:grid-cols-3">{["Breeding updates", "Husbandry discussions", "Animal & plant posts"].map((item) => <div key={item} className="bg-[#08140f] p-6"><div className="text-sm font-semibold">{item}</div><p className="mt-2 text-xs leading-5 text-white/46">Community posts from Arboreal Planet accounts appear here.</p></div>)}</div>
          </div>
          <div className="grid gap-4">
            <Link href="/arcade/enter?next=%2Farcade" className="panel interactive-card group relative overflow-hidden rounded-[26px] p-4 sm:p-5">
              <ChondroBreederPreview />
              <div className="px-1 pb-1 pt-5">
                <div className="section-kicker text-amber-200/75">Arboreal Arcade</div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div><h2 className="text-2xl font-semibold">Chondro Breeder</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/54">Manage a virtual chondro breeding program with breeding stages, lineage, facilities, projects and long-term progression.</p></div>
                  <span className="shrink-0 text-xs font-bold text-amber-200/75 transition group-hover:text-amber-100">Play →</span>
                </div>
              </div>
            </Link>
            <ArborealsByBunnBadge />
          </div>
        </div>
      </section>
    </main>
  );
}
