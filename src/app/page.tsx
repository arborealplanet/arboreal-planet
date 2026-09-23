import Link from "next/link";
import { ArborealsByBunnBadge } from "@/components/BrandVisuals";
import { ChondroBreederPreview } from "@/components/ChondroBreederPreview";
import { HomeLogoAnimation } from "@/components/HomeLogoAnimation";

const platformCards = [
  { title: "Animal Database", text: "Species, localities, husbandry, breeding and market context.", href: "/animals", tag: "ANIMALS", icon: "◇" },
  { title: "Genetics & Pedigrees", text: "Subspecies calculator, family trees, registered lineages and public pedigree records.", href: "/genetics", tag: "LINEAGE", icon: "⌘" },
  { title: "Marketplace", text: "Animals, plants, enclosures, supplies and feeders in one market.", href: "/marketplace", tag: "MARKET", icon: "▣" },
  { title: "Community", text: "Follow keepers, animals, plants and topics across the hobby.", href: "/community", tag: "CONNECT", icon: "◎" },
  { title: "Arcade", text: "Educational breeder games with virtual animals, lineages, facilities, projects and long-term progression.", href: "/arcade/enter?next=%2Farcade", tag: "PLAY", icon: "◈" },
];

const utilityLinks = [
  ["Search everything", "/search"],
  ["Plant database", "/plants"],
  ["Journal & guides", "/learn"],
  ["Shows & events", "/events"],
] as const;

const populations = ["Biak", "Numfor", "Manokwari", "Sorong", "Timika", "Kofiau", "Wamena", "Lereh", "Cyclops", "Jayapura", "Aru", "Merauke"];

export default function Home() {
  return (
    <main>
      <section className="noise-surface relative overflow-hidden border-b border-white/[.055]">
        <div className="pointer-events-none absolute -right-24 top-16 h-[520px] w-[520px] rounded-full border border-emerald-300/[.05] bg-emerald-400/[.02]" />
        <div className="pointer-events-none absolute right-20 top-40 h-64 w-64 rounded-full bg-emerald-300/[.035] blur-3xl" />

        <div className="relative z-10 mx-auto flex max-w-7xl items-start justify-center px-5 py-3 sm:min-h-[calc(100svh-72px)] sm:items-center sm:px-6 sm:py-8"><HomeLogoAnimation /></div>

        <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 border-t border-white/[.055] px-5 pb-16 pt-14 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:pb-20 lg:pt-16">
          <div className="relative z-10">
            <div className="section-kicker">The arboreal keeper network</div>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-6xl lg:text-[72px]">
              Reptile keeping, knowledge, lineage and community <span className="text-emerald-300">in one platform.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/60">Arboreal Planet connects species records, plant cultivation, education, shows, marketplace listings, keeper activity and pedigrees in one ecosystem.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/login" className="primary-action">Join Arboreal Planet</Link>
              <Link href="/search" className="secondary-action">Search the hub</Link>
              <Link href="/community" className="secondary-action">Explore the network</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/[.055] pt-6 text-xs text-white/45">
              <span><b className="text-white/72">Locality-first</b> animal records</span>
              <span><b className="text-white/72">Private-by-default</b> pedigree tools</span>
              <span><b className="text-white/72">Source-linked</b> learning & events</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="panel relative overflow-hidden rounded-[30px] border-emerald-300/10 bg-[radial-gradient(circle_at_85%_10%,rgba(57,230,125,.10),transparent_32%)]">
              <div className="border-b border-white/[.055] p-6 sm:p-8">
                <div className="section-kicker">Green Tree Python · Reference Species</div>
                <div className="mt-12 max-w-lg">
                  <div className="text-sm italic text-white/42">Morelia viridis complex</div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Locality-first records, lineage tools and keeper context.</div>
                  <p className="mt-4 text-sm leading-6 text-white/52">Built around the distinctions keepers actually use—not a generic reptile catalog.</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  {populations.slice(0, 8).map((name) => <span key={name} className="rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-3 py-1.5 text-[10px] font-semibold text-emerald-100/60">{name}</span>)}
                </div>
                <Link href="/animals/green-tree-python" className="primary-action mt-8 w-fit">Open Green Tree Python →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[["Reference groups","4"],["Pedigree tools","Enabled"],["Locality views","Enabled"],["Source review","Required"]].map(([label,value],i)=><div key={label} className={`p-4 ${i<3?"border-r border-white/[.05]":""}`}><div className="text-[8px] font-bold uppercase tracking-[.12em] text-white/32">{label}</div><div className="mt-2 text-lg font-semibold text-white/75">{value}</div></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="section-kicker">Explore Arboreal Planet</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Core sections</h2></div>
          <p className="max-w-md text-sm leading-6 text-white/52">Search, reference data, learning, shows, genetics, marketplace listings, community activity and educational breeder games all share the same platform.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformCards.map((card) => (
            <Link key={card.href} href={card.href} className="panel interactive-card group flex min-h-48 flex-col rounded-[24px] p-6">
              <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[.065] bg-white/[.02] text-lg text-emerald-300/75">{card.icon}</span><span className="text-[9px] font-bold tracking-[.14em] text-white/36">{card.tag}</span></div>
              <div className="mt-auto pt-8"><h3 className="text-xl font-semibold">{card.title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-white/52">{card.text}</p><div className="mt-5 text-xs font-bold text-emerald-300/75 transition group-hover:text-emerald-100">Open →</div></div>
            </Link>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {utilityLinks.map(([label, href]) => <Link key={href} href={href} className="panel-soft interactive-card flex items-center justify-between rounded-2xl px-5 py-4 text-sm font-semibold text-white/64"><span>{label}</span><span className="text-emerald-300/60">→</span></Link>)}
        </div>
      </section>

      <section className="border-y border-white/[.055] bg-black/[.1]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="section-kicker">Reference animal</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-.04em]">Green Tree Python</h2>
            <p className="mt-2 text-sm italic text-white/42">Morelia viridis complex · Arboreal Planet market grouping</p>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/58">Green Tree Python is the first fully connected animal record, linking locality structure, origin terminology, Genetics, Learn, marketplace listings, Snake Stocks and community activity.</p>
            <div className="mt-7 flex flex-wrap gap-2">{populations.map((name) => <span key={name} className="rounded-full border border-white/[.07] bg-white/[.018] px-3 py-1.5 text-xs text-white/55">{name}</span>)}</div>
            <div className="mt-7 flex flex-wrap gap-4"><Link href="/animals/green-tree-python" className="w-fit text-sm font-bold text-emerald-300">Explore Green Tree Python →</Link><Link href="/genetics" className="w-fit text-sm font-bold text-emerald-300">Open genetics & pedigrees →</Link><Link href="/learn?q=Green%20Tree%20Python" className="w-fit text-sm font-bold text-emerald-300">Read related Journal pieces →</Link></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["CAPTIVE BRED", "USCBB, CBB and other unambiguous captive-produced terms normalize here."],["IMPORT", "Import, farm bred, farm raised, wild caught and LTC normalize into the public Import market."],["LOCALITY", "Population and locality stay visible instead of being flattened into one generic species price."],["DESIGNER LINES", "Designer and project animals remain separate from locality import comparisons."]].map(([title, text]) => <div key={title} className="panel-soft rounded-[22px] p-5"><div className="text-[10px] font-bold tracking-[.15em] text-emerald-300/65">{title}</div><p className="mt-3 text-sm leading-6 text-white/50">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="panel flex flex-col justify-between overflow-hidden rounded-[26px] p-6 sm:p-8">
            <div><div className="section-kicker">Community</div><h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-[-.035em]">Built for keeper updates, husbandry discussions and real collection stories.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/50">Follow the keepers, species, plants and topics you care about without pretending an empty feed is content.</p></div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">{["Breeding updates", "Husbandry", "Animals & plants"].map((item) => <div key={item} className="rounded-2xl border border-white/[.06] bg-white/[.018] px-4 py-5 text-sm font-semibold text-white/62">{item}</div>)}</div>
            <Link href="/community" className="primary-action mt-6 w-fit">Explore community →</Link>
          </div>
          <div className="grid gap-4">
            <Link href="/arcade/enter?next=%2Farcade" className="panel interactive-card group relative overflow-hidden rounded-[26px] p-4 sm:p-5">
              <ChondroBreederPreview />
              <div className="px-1 pb-1 pt-5">
                <div className="section-kicker text-amber-200/75">Arcade · Virtual breeder game</div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div><h2 className="text-2xl font-semibold">Arboreal Keeper</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/54">Manage a virtual Green Tree Python breeding program with lineage, facilities, projects and long-term progression. Game animals and game values stay separate from real Arboreal Planet market and pedigree records.</p></div>
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
