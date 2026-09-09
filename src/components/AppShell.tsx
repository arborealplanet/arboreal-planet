import Link from "next/link";
import type { ReactNode } from "react";
import { ArborealPlanetMark } from "@/components/BrandVisuals";
import { NotificationBell } from "@/components/NotificationBell";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { fetchOwnProfile,getServerIdentity } from "@/lib/supabase-auth";

const nav = [
  ["Animals", "/animals"],
  ["Plants", "/plants"],
  ["Snake Stocks", "/snake-stocks"],
  ["Marketplace", "/marketplace"],
  ["Community", "/community"],
  ["Arboreal Arcade", "/arcade/enter?next=%2Farcade"],
] as const;

function ProfileAvatar({
  avatarUrl,
  label,
  className,
}: {
  avatarUrl?: string | null;
  label: string;
  className: string;
}) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AP";

  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-emerald-300/[.08] text-[10px] font-black text-emerald-100/70`} aria-hidden="true">
      {initials}
    </span>
  );
}

export async function AppShell({ children }: { children: ReactNode }) {
  const identity=await getServerIdentity();
  const profile=identity?await fetchOwnProfile(identity.token,identity.user.id) as {username?:string|null;display_name?:string|null;avatar_url?:string|null}|null:null;
  const signedIn=Boolean(identity);
  const accountLabel=profile?.display_name||profile?.username||"Profile";

  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#06100c]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center gap-3 px-4 sm:min-h-[72px] sm:gap-5 sm:px-6">
          <Link href="/" className="flex min-w-fit items-center gap-3">
            <ArborealPlanetMark className="h-10 w-10" />
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

          <PwaInstallButton />

          <div className="hidden items-center gap-2 lg:ml-2 lg:flex">
            {signedIn?<>
              <Link href="/messages" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-lg text-white/65 transition hover:border-emerald-300/25 hover:text-emerald-200" aria-label="Messages">✉</Link>
              <NotificationBell />
              <Link href="/profile" aria-label="Profile settings" title="Profile settings" className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[.035] p-0.5 transition hover:border-emerald-300/35 hover:ring-2 hover:ring-emerald-300/10">
                <ProfileAvatar avatarUrl={profile?.avatar_url} label={accountLabel} className="h-full w-full rounded-full" />
              </Link>
            </>:<Link href="/login" className="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-[#06100c] transition hover:bg-emerald-200">Sign in</Link>}
          </div>
        </div>
        <nav className="mx-auto grid max-w-[1440px] grid-cols-3 gap-2 border-t border-white/[.045] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.1em] text-white/42 lg:hidden sm:px-6">
          <Link href="/animals" className="rounded-lg border border-white/[.06] px-2 py-2.5">Animals</Link>
          <Link href="/plants" className="rounded-lg border border-white/[.06] px-2 py-2.5">Plants</Link>
          <Link href="/snake-stocks" className="rounded-lg border border-white/[.06] px-2 py-2.5">Snake Stocks</Link>
        </nav>
      </header>

      {children}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(62px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-white/[.08] bg-[#06100c]/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 text-center text-[9px] font-semibold uppercase tracking-[.08em] text-white/45 backdrop-blur-xl lg:hidden">
        <Link href="/community" className="mobile-nav-item"><span className="mobile-nav-icon">◎</span><span className="mobile-nav-label">Community</span></Link>
        <Link href="/marketplace" className="mobile-nav-item"><span className="mobile-nav-icon">▣</span><span className="mobile-nav-label">Market</span></Link>
        <Link href="/arcade/enter?next=%2Farcade" className="mobile-nav-item text-emerald-300"><span className="mobile-nav-icon">◈</span><span className="mobile-nav-label">Arcade</span></Link>
        <Link href={signedIn?"/messages":"/login?next=/messages"} className="mobile-nav-item"><span className="mobile-nav-icon">✉</span><span className="mobile-nav-label">Messages</span></Link>
        {signedIn ? (
          <Link href="/profile" aria-label="Profile settings" className="mobile-nav-item">
            <ProfileAvatar avatarUrl={profile?.avatar_url} label={accountLabel} className="h-7 w-7 rounded-full border border-emerald-300/15" />
            <span className="mobile-nav-label">Profile</span>
          </Link>
        ) : (
          <Link href="/login" className="mobile-nav-item"><span className="mobile-nav-icon">◇</span><span className="mobile-nav-label">Sign in</span></Link>
        )}
      </nav>

      <footer className="border-t border-white/[.07] bg-black/10 px-5 py-10 pb-24 lg:pb-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><ArborealPlanetMark className="h-8 w-8" /><span>Arboreal Planet · Built for keepers, breeders and the animals behind the data.</span></div>
          <div className="flex flex-wrap gap-5"><Link href="/animals">Animals</Link><Link href="/plants">Plants</Link><Link href="/community">Community</Link><Link href="/marketplace">Marketplace</Link><Link href="/arcade/enter?next=%2Farcade">Arboreal Arcade</Link></div>
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
