import Link from "next/link";
import Image from "next/image";
import { HomeLogoAnimation } from "@/components/HomeLogoAnimation";
import { ReptileNewsCarousel } from "@/components/ReptileNewsCarousel";
import { getReptileNews } from "@/lib/reptile-news";

export const dynamic = "force-dynamic";

const trails = [
  { number: "01", label: "THE WILD SIDE", title: "Meet the animals", description: "Find species, discover localities, and follow the details that make every reptile different.", href: "/animals", action: "Explore animals", tone: "from-emerald-700/35 to-[#101d15]" },
  { number: "02", label: "THE PEOPLE", title: "Meet the keepers", description: "See what people are raising, growing, building and learning together.", href: "/community", action: "Enter the community", tone: "from-teal-700/30 to-[#101b1b]" },
  { number: "03", label: "THE STORIES", title: "Follow the story", description: "Catch sourced reptile news, field notes, guides and the ideas worth talking about.", href: "/news", action: "Browse news", tone: "from-amber-800/30 to-[#201811]" },
] as const;

const deeper = [
  { title: "Plants & habitats", description: "From carnivorous plants to the spaces our animals call home.", href: "/plants", label: "Explore plants", icon: "✳" },
  { title: "Journal & guides", description: "Go deeper into keeping, breeding, taxonomy and conservation.", href: "/learn", label: "Start reading", icon: "◌" },
  { title: "Shows & events", description: "Find places to meet the community beyond the screen.", href: "/events", label: "See events", icon: "◇" },
  { title: "Marketplace", description: "Browse animals, plants, enclosures and keeper supplies.", href: "/marketplace", label: "Browse listings", icon: "▣" },
  { title: "Genetics & pedigrees", description: "Explore lineages, parentage and the bigger picture behind every animal.", href: "/genetics", label: "Explore lineages", icon: "⌘" },
] as const;

export default async function Home() {
  const stories = await getReptileNews();
  return <main>
    <section className="noise-surface relative overflow-hidden border-b border-white/10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(67,137,69,.14),transparent_58%),#050b08]">
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-5 pb-12 pt-6 text-center sm:px-6 sm:pb-16 sm:pt-10">
        <HomeLogoAnimation />
        <Link href="/arboreals-by-bunn" aria-label="Visit the Arboreals By Bunn website" className="group mt-4 flex w-full max-w-md items-center gap-4 rounded-2xl border border-amber-200/30 bg-black/85 p-3 text-left shadow-xl transition hover:-translate-y-1 hover:border-amber-200/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">
          <Image src="/abb-site/assets/abb-logo-masthead.jpg" alt="Arboreals By Bunn logo with a Green Tree Python" width={160} height={102} className="h-20 w-32 shrink-0 rounded-lg object-contain sm:h-24 sm:w-40" />
          <span><span className="block text-base font-bold text-white sm:text-lg">Arboreals By Bunn</span><span className="mt-1 block text-sm font-semibold text-amber-100/80 group-hover:text-amber-100">Visit the website ↗</span></span>
        </Link>
        <div className="mt-10 max-w-4xl sm:mt-12">
          <p className="section-kicker">Welcome to Arboreal Planet</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[.98] tracking-[-.06em] text-white sm:text-7xl">A whole world for <span className="text-emerald-300">reptile people.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">Explore animals, plants and stories, then follow keepers and join the conversations that make the hobby feel alive.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/animals" className="primary-action">Start exploring →</Link><Link href="/community" className="secondary-action">Meet the community</Link><Link href="/login?mode=signup" className="secondary-action">Join the planet</Link></div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-24" aria-labelledby="trails-title">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-kicker">Pick a path</p><h2 id="trails-title" className="mt-3 text-4xl font-semibold tracking-[-.04em] text-white sm:text-5xl">Where will you wander?</h2></div><Link href="/search" className="text-sm font-semibold text-emerald-300 hover:text-emerald-100">Search the whole planet →</Link></div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">{trails.map((trail) => <Link key={trail.href} href={trail.href} className={`group relative flex min-h-[340px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br ${trail.tone} p-7 transition hover:-translate-y-1 hover:border-emerald-300/35 sm:p-9`}>
        <div className="flex items-start justify-between text-xs font-bold tracking-[.16em] text-white/60"><span>{trail.label}</span><span>{trail.number}</span></div>
        <div className="mt-auto"><h3 className="text-3xl font-semibold tracking-[-.04em] text-white">{trail.title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-white/65">{trail.description}</p><span className="mt-7 inline-flex text-sm font-bold text-emerald-200 transition group-hover:translate-x-1">{trail.action} →</span></div>
      </Link>)}</div>
    </section>

    <ReptileNewsCarousel stories={stories} />

    <section className="border-y border-white/10 bg-[#090f0c]" aria-labelledby="chondro-title">
      <div className="relative mx-auto flex min-h-[450px] max-w-[1600px] items-end overflow-hidden px-5 py-14 sm:px-10 lg:min-h-[560px] lg:items-center lg:px-20">
        <Image src="/abb-site/assets/animals.png" alt="Illustrated yellow and red Green Tree Pythons among tropical plants" fill sizes="100vw" className="object-cover object-center opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070c09]/95 via-[#070c09]/75 to-[#070c09]/15 lg:via-[#070c09]/50" />
        <div className="relative z-10 max-w-xl"><p className="text-xs font-black uppercase tracking-[.25em] text-emerald-200">Animal spotlight</p><h2 id="chondro-title" className="mt-4 text-4xl font-semibold leading-tight tracking-[-.04em] text-white sm:text-5xl">Know the animal behind the color.</h2><p className="mt-5 text-base leading-7 text-white/75">Green Tree Pythons are our first deep dive. Explore their populations, natural history and the keeper knowledge behind the images.</p><Link href="/animals/green-tree-python" className="primary-action mt-7">Meet the Green Tree Python →</Link></div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20" aria-labelledby="play-title">
      <div className="relative flex min-h-[400px] flex-col justify-end overflow-hidden rounded-[30px] border border-emerald-300/15 bg-[#101b13] p-7 sm:p-10">
        <Image src="/hatchery/snakes/localities/manokwari/yellow-adult.webp" alt="Illustrated Green Tree Python" fill sizes="100vw" className="object-contain object-center opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07110a] via-[#07110a]/55 to-transparent" />
        <div className="relative z-10 max-w-xl"><p className="section-kicker">Arboreal Arcade</p><h2 id="play-title" className="mt-3 text-4xl font-semibold tracking-[-.04em] text-white">Learn by playing.</h2><p className="mt-4 max-w-md text-sm leading-7 text-white/75">Build a virtual keeper program, follow lineages, and see where your decisions lead. Virtual animals and game values stay inside the game.</p><Link href="/arcade/enter?next=%2Farcade" className="primary-action mt-6">Explore the Arcade →</Link></div>
      </div>
    </section>

    <section className="border-t border-white/10 bg-black/15" aria-labelledby="more-title"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20"><p className="section-kicker">Go a little deeper</p><h2 id="more-title" className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Keep exploring.</h2><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{deeper.map((item) => <Link key={item.href} href={item.href} className="panel interactive-card flex min-h-60 flex-col rounded-3xl p-6"><span className="text-3xl text-emerald-200/70" aria-hidden="true">{item.icon}</span><h3 className="mt-7 text-xl font-semibold text-white">{item.title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{item.description}</p><span className="mt-auto pt-5 text-xs font-bold text-emerald-200">{item.label} →</span></Link>)}</div><div className="mt-6 text-center text-sm text-white/45">Looking for a specific animal or keeper? <Link href="/search" className="font-semibold text-emerald-200">Search Arboreal Planet →</Link></div></div></section>
  </main>;
}
