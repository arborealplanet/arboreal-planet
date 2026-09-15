import type { ReactNode } from "react";
import Link from "next/link";
import { WatchlistButton } from "@/components/WatchlistButton";

export default async function MarketplaceListingLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <>
    <div className="border-b border-white/[.045] bg-black/[.08]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/24">Marketplace listing</span>
          <Link href="/saved" className="text-xs font-bold text-white/38 transition hover:text-emerald-100/65">Saved items →</Link>
        </div>
        <WatchlistButton type="MARKET_LISTING" id={id} label="Save listing" />
      </div>
    </div>
    {children}
  </>;
}
