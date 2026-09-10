import Link from "next/link";
import { GreenTreePythonArt, PitcherPlantArt } from "@/components/ArborealArt";
import { ArborealsByBunnBadge } from "@/components/BrandVisuals";
import { HomeLogoAnimation } from "@/components/HomeLogoAnimation";

const platformCards = [
  { title: "Animal Database", text: "Species, localities, husbandry, breeding and market context.", href: "/animals", tag: "ANIMALS", icon: "◇" },
  { title: "Plant Database", text: "Nepenthes, bromeliads and terrarium cultivation knowledge.", href: "/plants", tag: "PLANTS", icon: "⌁" },
  { title: "Snake Stocks", text: "Median-first reptile market intelligence with source transparency.", href: "/snake-stocks", tag: "MARKET DATA", icon: "↗" },
  { title: "Marketplace", text: "Animals, plants, enclosures, supplies and feeders in one market.", href: "/marketplace", tag: "DISCOVER", icon: "▣" },
  { title: "Community", text: "Follow keepers, animals, plants and topics across the hobby.", href: "/community", tag: "CONNECT", icon: "◎" },
  { title: "Arboreal Arcade", text: "Breeder games with virtual lineages, facilities, projects and long-term progression.", href: "/arcade/enter?next=%2Farcade", tag: "LEARN + PLAY", icon: "◈" },
];

const populations = ["Biak", "Numfor", "Manokwari", "Sorong", "Wamena", "Lereh", "Cyclops", "Jayapura", "Aru", "Merauke"];

export default function Home() {
  return (
    <main>
      <section className="noise-surface relative overflow-hidden border-b border-white/[.06]">
        <div className="pointer-events-none absolute -right-24 top-16 h-[520px] w-[520px] rounded-full border border-emerald-300/[.06] bg-emerald-400/[.025]" />
        <div className="pointer-events-none absolute right-20 top-40 h-64 w-64 rounded-full bg-emerald-300/[.04] blur-3xl" />

        <div className="relative z-10 mx-auto flex max-w-7xl justify-center px-5 pt-5 sm:px-6 sm:pt-7 lg:pt-8">
          <HomeLogoAnimation />
        </div>

        <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-5 pb-16 pt-4 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:pb-20 lg:pt-2">
          <div className="relative z-10">
            <div className="section-kicker">The arboreal keeper network</div>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.05em] text-white sm:text-6xl lg:text-[72px]">
              Reptile keeping, market data and community <span className="text-emerald-300">in one platform.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/52">
              Arboreal Planet connects species records, plant cultivation, marketplace listings, keeper activity and reptile market intelligence while keeping each source of information clearly separated.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/community" className="rounded-xl bg-emerald-300 px-5 py-3.5 text-sm font-bold text-[#06100c] transition hover:bg-emerald-200">Explore the network</Link>
              <Link href="/snake-stocks" className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.04] px-5 py-3.5 text-sm font-bold text-emerald-200 transition hover:border-emerald-300/40">Open Snake Stocks ↗</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/[.06] pt-6 text-xs text-white/35">
              <span><b className="text-white/60">USA-first</b> market terminology</span>
              <span><b className="text-white/60">Median-first</b> market analysis</span>
              <span><b className="text-white/60">Source-first</b> evidence</span>
            </div>
          </div>

          <div className="relative z-10 min-h-[560px]">
            <div className="absolute -left-4 top-8 h-20 w-20 opacity-55 sm:h-28 sm:w-28"><PitcherPlantArt /></div>
            <div className="panel relative overflow-hidden rounded-[34px] border-emerald-300/10">
              <div className="relative h-[365px] overflow-hidden border-b border-white/[.06] bg-[radial-gradient(circle_at_60%_40%,rgba(57,230,125,.08),transparent_34%),linear-gradient(160deg,#0b1b13,#07100c)] sm:h-[410px]">
                <div className="absolute inset-0 grid-surface opacity-35" />
                <div className="absolute inset-x-0 bottom-0 h-[94%]"><GreenTreePythonArt /></div>
                <div className="absolute left-5 top-5 rounded-full border border-emerald-300/15 bg-black/25 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/70">Green Tree Python · Reference Species</div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div><div className="text-xs italic text-white/35">Morelia viridis complex</div><div className="mt-1 text-xl font-semibold">Species records and market context</div></div>
                  <Link href="/animals/green-tree-python" className="rounded-xl border border-white/[.09] bg-black/30 px-3 py-2 text-[10px] font-bold text-white/60 backdrop-blur">OPEN RECORD →</Link>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[["Origin groups","2"],["Price method","Median"],["Locality views","Enabled"],["Source review","Required"]].map(([label,value],i)=><div key={label} className={`p-4 ${i<3?"border-r border-white/[.055]":""}`}><div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/23">{label}</div><div className="mt-2 text-xl font-semibold text-white/65">{value}</div></div>)}
              </div>
              <Link href="/snake-stocks" className="flex items-center justify-between border-t border-white/[.06] bg-emerald-300/[.035] px-5 py-4 text-xs font-bold text-emerald-200/70"><span>SNAKE STOCKS · TRACK · COMPARE · DISCOVER</span><span>↗</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="section-kicker">Explore Arboreal Planet</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Core sections</h2></div>
          <p className="max-w-md text-sm leading-6 text-white/38">Browse reference data, marketplace listings, community activity, market tools and the Arboreal Arcade from one navigation.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {platformCards.map((card) => (
            <Link key={card.href} href={card.href} className="panel group flex min-h-64 flex-col rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/20">
              <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.07] bg-white/[.025] text-lg text-emerald-300/70">{card.icon}</span><span className="text-[9px] font-bold tracking-[.16em] text-white/24">{card.tag}</span></div>
              <div className="mt-auto pt-10"><h3 className="text-lg font-semibold">{card.title}</h3><p className="mt-2 text-sm leading-6 text-white/38">{card.text}</p><div className="mt-4 text-xs font-bold text-emerald-300/70 transition group-hover:text-emerald-200">OPEN →</div></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="section-kicker">Reference animal</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Green Tree Python</h2>
            <p className="mt-2 text-sm italic text-white/32">Morelia viridis complex · Arboreal Planet market grouping</p>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/48">Green Tree Python is the first fully connected animal record, linking locality structure, origin terminology, marketplace listings, Snake Stocks and relevant community activity.</p>
            <div className="mt-7 flex flex-wrap gap-2">{populations.map((name) => <span key={name} className="rounded-full border border-white/[.08] bg-white/[.02] px-3 py-1.5 text-xs text-white/45">{name}</span>)}</div>
            <Link href="/animals/green-tree-python" className="mt-7 w-fit text-sm font-bold text-emerald-300">Explore Green Tree Python →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["CAPTIVE BRED", "USCBB, CBB and other unambiguous captive-produced terms normalize here."],["IMPORT", "Import, farm bred, farm raised, wild caught and LTC normalize into the public Import market."],["LOCALITY", "Population and locality stay visible instead of being flattened into one generic species price."],["DESIGNER LINES", "Designer and project animals remain separate from locality import comparisons."]].map(([title, text]) => <div key={title} className="panel-soft rounded-2xl p-5"><div className="text-[10px] font-bold tracking-[.17em] text-emerald-300/60">{title}</div><p className="mt-3 text-sm leading-6 text-white/42">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="panel overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/[.06] p-5"><div><div className="section-kicker">Community</div><h2 className="mt-2 text-2xl font-semibold">Recent keeper activity</h2></div><Link href="/community" className="text-xs font-bold text-emerald-300">EXPLORE →</Link></div>
            <div className="grid gap-px bg-white/[.055] sm:grid-cols-3">{["Breeding updates", "Husbandry discussions", "Animal & plant posts"].map((item) => <div key={item} className="bg-[#08140f] p-6"><div className="text-sm font-semibold">{item}</div><p className="mt-2 text-xs leading-5 text-white/34">Community posts from Arboreal Planet accounts appear in this section.</p></div>)}</div>
          </div>
          <div className="grid gap-4">
            <Link href="/arcade/enter?next=%2Farcade" className="panel relative overflow-hidden rounded-3xl p-6">
              <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border border-amber-200/[.08] bg-amber-200/[.025]" />
              <div className="section-kicker text-amber-200/70">Arboreal Arcade</div><h2 className="mt-3 text-2xl font-semibold">Chondro Breeder</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/42">Manage a virtual chondro breeding program with breeding stages, lineage, facilities, projects and long-term progression.</p><div className="mt-7 inline-flex rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white/42">Virtual · Strategy · Collection</div>
            </Link>
            <ArborealsByBunnBadge />
          </div>
        </div>
      </section>
    </main>
  );
}
