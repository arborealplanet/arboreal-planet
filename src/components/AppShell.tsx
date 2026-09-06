import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Animals", "/animals"],
  ["Plants", "/plants"],
  ["Snake Stocks", "/snake-stocks"],
  ["Marketplace", "/marketplace"],
  ["Community", "/community"],
  ["The Hatchery", "/hatchery"],
] as const;

function BrandMark() {
  return (
    <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-300/25 bg-emerald-400/[.08] shadow-[0_0_32px_rgba(52,211,153,.08)]">
      <div className="absolute -right-2 top-1 h-8 w-3 rotate-[32deg] rounded-full bg-emerald-400/20" />
      <span className="relative text-[11px] font-black tracking-[-.05em] text-emerald-300">AP</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#06100c]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-5 px-4 sm:px-6">
          <Link href="/" className="flex min-w-fit items-center gap-3">
            <BrandMark />
            <div>
              <div className="text-[15px] font-extrabold tracking-[.17em] sm:text-base">ARBOREAL PLANET</div>
              <div className="mt-0.5 text-[8px] font-semibold tracking-[.27em] text-emerald-300/55 sm:text-[9px]">PEOPLE · DATA · CONSERVATION</div>
            </div>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 text-[13px] font-medium text-white/62 lg:flex">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-2.5 transition hover:bg-white/[.045] hover:text-white">
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:ml-2 lg:flex">
            <span className="hidden rounded-full border border-amber-300/15 bg-amber-300/[.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-amber-200/70 xl:inline-flex">Early access</span>
            <Link href="/profile" className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-emerald-300/25 hover:text-emerald-200">Profile</Link>
          </div>
        </div>
      </header>

      {children}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[62px] grid-cols-5 border-t border-white/[.08] bg-[#06100c]/95 px-1 pt-2 text-center text-[9px] font-semibold uppercase tracking-[.08em] text-white/45 backdrop-blur-xl lg:hidden">
        <Link href="/community" className="mobile-nav-item"><span>◎</span>Social</Link>
        <Link href="/animals" className="mobile-nav-item"><span>◇</span>Animals</Link>
        <Link href="/snake-stocks" className="mobile-nav-item text-emerald-300"><span>↗</span>Stocks</Link>
        <Link href="/marketplace" className="mobile-nav-item"><span>▣</span>Market</Link>
        <Link href="/profile" className="mobile-nav-item"><span>○</span>Profile</Link>
      </nav>

      <footer className="border-t border-white/[.07] bg-black/10 px-5 py-10 pb-24 lg:pb-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <div>Arboreal Planet · Built for keepers, breeders and the animals behind the data.</div>
          <div className="flex flex-wrap gap-5"><Link href="/plants">Plants</Link><span>Privacy</span><span>Guidelines</span><span>Support</span></div>
        </div>
      </footer>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description: string; aside?: ReactNode }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-9 pt-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:pt-16">
      <div>
        <div className="section-kicker">{eyebrow}</div>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-.035em] text-white md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/52 md:text-lg">{description}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </section>
  );
}
