import Link from "next/link";
import type { ReactNode } from "react";
import { ArborealPlanetMark } from "@/components/BrandVisuals";
import { NotificationBell } from "@/components/NotificationBell";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { AppShellRouteFrame } from "@/components/AppShellRouteFrame";
import { fetchOwnProfile,getServerIdentity } from "@/lib/supabase-auth";

const nav = [
  ["Animals", "/animals"],
  ["Plants", "/plants"],
  ["Snake Stocks", "/snake-stocks"],
  ["Marketplace", "/marketplace"],
  ["Community", "/community"],
  ["Arcade", "/arcade/enter?next=%2Farcade"],
] as const;

function ProfileAvatar({ avatarUrl, label, className }: { avatarUrl?: string | null; label: string; className: string }) {
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AP";
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-emerald-300/[.08] text-[10px] font-black text-emerald-100/70`} aria-hidden="true">{initials}</span>
  );
}

export async function AppShell({ children }: { children: ReactNode }) {
  const identity=await getServerIdentity();
  const profile=identity?await fetchOwnProfile(identity.token,identity.user.id) as {username?:string|null;display_name?:string|null;avatar_url?:string|null}|null:null;
  const signedIn=Boolean(identity);
  const accountLabel=profile?.display_name||profile?.username||"Profile";

  const header = (
    <header className="sticky top-0 z-50 border-b border-white/[.065] bg-[#06100c]/88 shadow-[0_10px_35px_rgba(0,0,0,.12)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[60px] max-w-[1440px] items-center gap-2 px-3 sm:min-h-[72px] sm:gap-5 sm:px-6">
        <Link href="/" aria-label="Arboreal Planet home" className="group flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none">
          <ArborealPlanetMark className="h-10 w-10 shrink-0 transition duration-200 group-hover:scale-[1.03]" />
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-[14px] font-extrabold tracking-[.15em] sm:text-base">ARBOREAL PLANET</div>
            <div className="mt-0.5 hidden text-[8px] font-semibold tracking-[.22em] text-emerald-300/55 md:block sm:text-[9px]">COMMUNITY · REFERENCE · MARKET DATA</div>
          </div>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 text-[13px] font-semibold text-white/60 lg:flex">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-xl px-3 py-2.5 transition hover:bg-white/[.04] hover:text-white">{label}</Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <PwaInstallButton />
          {signedIn&&<div className="lg:hidden"><NotificationBell /></div>}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {signedIn?<>
            <Link href="/messages" className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-lg text-white/60 transition hover:border-emerald-300/20 hover:bg-emerald-300/[.03] hover:text-emerald-200" aria-label="Messages">✉</Link>
            <NotificationBell />
            <Link href="/profile" aria-label="Profile settings" title="Profile settings" className="grid h-11 w-11 place-items-center rounded-full border border-white/[.08] bg-white/[.025] p-0.5 transition hover:border-emerald-300/30 hover:ring-2 hover:ring-emerald-300/10">
              <ProfileAvatar avatarUrl={profile?.avatar_url} label={accountLabel} className="h-full w-full rounded-full" />
            </Link>
          </>:<Link href="/login" className="primary-action">Sign in</Link>}
        </div>
      </div>

      <nav aria-label="Browse" className="hide-scrollbar mx-auto flex max-w-[1440px] gap-2 overflow-x-auto border-t border-white/[.04] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[.08em] text-white/50 lg:hidden sm:px-6">
        {nav.slice(0,4).map(([label,href])=><Link key={href} href={href} className="shrink-0 rounded-xl border border-white/[.055] bg-white/[.018] px-3 py-2.5 transition active:bg-white/[.05]">{label}</Link>)}
      </nav>
    </header>
  );

  const mobileNav = (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(66px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-white/[.07] bg-[#06100c]/96 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 text-center text-[9px] font-semibold uppercase text-white/48 shadow-[0_-12px_30px_rgba(0,0,0,.16)] backdrop-blur-xl lg:hidden">
      <Link href="/community" className="mobile-nav-item"><span className="mobile-nav-icon">◎</span><span className="mobile-nav-label">Community</span></Link>
      <Link href="/marketplace" className="mobile-nav-item"><span className="mobile-nav-icon">▣</span><span className="mobile-nav-label">Market</span></Link>
      <Link href="/arcade/enter?next=%2Farcade" className="mobile-nav-item text-emerald-300"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-300/[.09] text-[18px]">◈</span><span className="mobile-nav-label">Arcade</span></Link>
      <Link href={signedIn?"/messages":"/login?next=/messages"} className="mobile-nav-item"><span className="mobile-nav-icon">✉</span><span className="mobile-nav-label">Messages</span></Link>
      {signedIn ? (
        <Link href="/profile" aria-label="Profile settings" className="mobile-nav-item"><ProfileAvatar avatarUrl={profile?.avatar_url} label={accountLabel} className="h-7 w-7 rounded-full border border-emerald-300/15" /><span className="mobile-nav-label">Profile</span></Link>
      ) : (
        <Link href="/login" className="mobile-nav-item"><span className="mobile-nav-icon">◇</span><span className="mobile-nav-label">Sign in</span></Link>
      )}
    </nav>
  );

  const footer = (
    <footer className="border-t border-white/[.06] bg-black/[.12] px-5 py-10 pb-24 lg:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><ArborealPlanetMark className="h-8 w-8" /><span>Arboreal Planet · Reptile community, reference data and market tools.</span></div>
        <div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/animals" className="hover:text-white/70">Animals</Link><Link href="/plants" className="hover:text-white/70">Plants</Link><Link href="/community" className="hover:text-white/70">Community</Link><Link href="/marketplace" className="hover:text-white/70">Marketplace</Link><Link href="/arcade/enter?next=%2Farcade" className="hover:text-white/70">Arcade</Link></div>
      </div>
    </footer>
  );

  return <AppShellRouteFrame header={header} mobileNav={mobileNav} footer={footer}>{children}</AppShellRouteFrame>;
}

export function PageIntro({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description: string; aside?: ReactNode }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-9 pt-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:pt-14">
      <div>
        <div className="section-kicker">{eyebrow}</div>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-.04em] text-white md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/58 md:text-lg">{description}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </section>
  );
}
