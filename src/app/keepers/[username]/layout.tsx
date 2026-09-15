import type { ReactNode } from "react";
import Link from "next/link";
import { KeeperFollowAction } from "@/components/KeeperFollowAction";

export default async function KeeperLayout({ children, params }: { children: ReactNode; params: Promise<{ username: string }> }) {
  const { username } = await params;
  const clean = decodeURIComponent(username).trim();
  return <>
    <div className="border-b border-white/[.045] bg-black/[.08]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/24">Keeper profile</span>
          <span className="truncate text-xs text-white/38">@{clean}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/community?keeper=${encodeURIComponent(clean)}`} className="rounded-xl border border-white/[.07] px-3 py-2.5 text-xs font-bold text-white/45 transition hover:text-white/70">Posts</Link>
          <KeeperFollowAction username={clean} />
        </div>
      </div>
    </div>
    {children}
  </>;
}
