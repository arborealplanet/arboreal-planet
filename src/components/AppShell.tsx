import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Animals", "/animals"],
  ["Snake Stocks", "/snake-stocks"],
  ["Marketplace", "/marketplace"],
  ["Community", "/community"],
  ["The Hatchery", "/hatchery"],
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07110d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
          <Link href="/" className="min-w-fit">
            <div className="text-lg font-bold tracking-[.16em]">ARBOREAL PLANET</div>
            <div className="text-[10px] tracking-[.27em] text-emerald-400/70">PEOPLE · DATA · CONSERVATION</div>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-white/70 lg:flex">
            {nav.map(([label, href]) => <Link key={href} href={href} className="transition hover:text-emerald-300">{label}</Link>)}
            <Link href="/profile" className="rounded-full border border-white/15 px-4 py-2 hover:border-emerald-400/50">Profile</Link>
          </nav>
        </div>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#07110d]/95 px-2 py-2 text-center text-[10px] text-white/65 backdrop-blur lg:hidden">
        <Link href="/community">Social</Link><Link href="/animals">Animals</Link><Link href="/snake-stocks" className="text-emerald-300">Stocks</Link><Link href="/marketplace">Market</Link><Link href="/profile">Profile</Link>
      </nav>
      <footer className="border-t border-white/10 px-5 py-10 pb-20 text-center text-xs text-white/35 lg:pb-10">Arboreal Planet · Built for keepers, breeders and the animals behind the data.</footer>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="mx-auto max-w-7xl px-5 pb-8 pt-14"><div className="text-xs font-semibold uppercase tracking-[.25em] text-emerald-400">{eyebrow}</div><h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1><p className="mt-5 max-w-3xl text-base leading-7 text-white/60 md:text-lg">{description}</p></section>;
}
