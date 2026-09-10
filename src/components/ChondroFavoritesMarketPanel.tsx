"use client";

import { useEffect, useMemo, useState } from "react";

type SnakeLite = {
  id: string;
  name: string;
  locality?: string;
  subspecies?: string;
  sex?: string;
  lifeStage?: string;
  classification?: string;
  ancestry?: Record<string, number>;
};

type Listing = {
  id: string;
  snake_id: string;
  price: number;
  listed_at?: string;
  isMine?: boolean;
  snake: SnakeLite;
};

type MarketPayload = {
  listings?: Listing[];
  pendingProceeds?: number;
  pendingSaleCount?: number;
  fallbackSaleCount?: number;
  conservationSaleCount?: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function timeLeft(listedAt: string | undefined, now: number) {
  if (!listedAt || !now) return "48h window";
  const listed = new Date(listedAt).getTime();
  if (!Number.isFinite(listed)) return "48h window";
  const remaining = Math.max(0, listed + 48 * 3_600_000 - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.max(1, Math.ceil((remaining % 3_600_000) / 60_000));
  return remaining <= 0 ? "settling" : `${hours}h ${minutes}m`;
}

function isPureSubspecies(animal: SnakeLite) {
  if (animal.classification !== "Pure" || !animal.subspecies) return false;
  return Number(animal.ancestry?.[animal.subspecies] ?? 0) >= 99.9;
}

export function ChondroFavoritesMarketPanel() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingProceeds, setPendingProceeds] = useState(0);
  const [pendingSaleCount, setPendingSaleCount] = useState(0);
  const [fallbackSaleCount, setFallbackSaleCount] = useState(0);
  const [conservationSaleCount, setConservationSaleCount] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [now, setNow] = useState(0);

  async function refresh() {
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/player-market", { cache: "no-store" });
      const market = await response.json() as MarketPayload;
      if (!response.ok) {
        if (response.status === 401) setStatus("Sign in to use the shared player market.");
        return;
      }
      setListings(Array.isArray(market.listings) ? market.listings : []);
      setPendingProceeds(Math.max(0, Number(market.pendingProceeds ?? 0)));
      setPendingSaleCount(Math.max(0, Number(market.pendingSaleCount ?? 0)));
      setFallbackSaleCount(Math.max(0, Number(market.fallbackSaleCount ?? 0)));
      setConservationSaleCount(Math.max(0, Number(market.conservationSaleCount ?? 0)));
    } catch {
      setStatus("Unable to refresh your market activity.");
    }
  }

  useEffect(() => {
    void refresh();
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    const refreshTimer = window.setInterval(() => void refresh(), 20_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.clearInterval(refreshTimer);
    };
  }, []);

  const myListings = useMemo(() => listings.filter((listing) => listing.isMine), [listings]);

  async function reclaim(listing: Listing) {
    setBusy(listing.id);
    setStatus("");
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/player-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reclaim", listingId: listing.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "That snake could not be reclaimed.");
        return;
      }
      setStatus(`${listing.snake.name} returned to your colony.`);
      await refresh();
      window.dispatchEvent(new Event("arboreal-chondro-breeder-save-change"));
      window.setTimeout(() => window.location.reload(), 300);
    } finally {
      setBusy(null);
    }
  }

  async function claimProceeds() {
    if (pendingProceeds <= 0 || busy) return;
    setBusy("proceeds");
    setStatus("");
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/player-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim-proceeds" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Market proceeds could not be claimed.");
        return;
      }
      const total = Math.max(0, Number(data.result?.total ?? 0));
      const count = Math.max(0, Number(data.result?.claimedCount ?? 0));
      setStatus(count > 0 ? `${money(total)} collected from ${count} completed sale${count === 1 ? "" : "s"}.` : "No completed sales are waiting to be claimed.");
      await refresh();
      window.dispatchEvent(new Event("arboreal-chondro-breeder-save-change"));
      window.setTimeout(() => window.location.reload(), 300);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto mt-5 max-w-7xl px-5 sm:px-6">
      <div className="rounded-[26px] border border-white/[.07] bg-white/[.018] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-100/48">Seller desk</div>
            <h2 className="mt-2 text-xl font-semibold text-white/82">Your player-market activity</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/38">Player buyers pay the full asking price. Listings still active after 48 hours are automatically cleared at 85% of asking price.</p>
          </div>
          <button
            type="button"
            disabled={pendingProceeds <= 0 || busy !== null}
            onClick={() => void claimProceeds()}
            className="rounded-xl border border-amber-200/20 bg-amber-200/[.055] px-4 py-2.5 text-xs font-black text-amber-100/80 disabled:opacity-30"
          >
            {pendingProceeds > 0 ? `Collect ${money(pendingProceeds)}` : "No proceeds waiting"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MarketStat label="Active listings" value={String(myListings.length)} />
          <MarketStat label="Completed sales" value={String(pendingSaleCount)} />
          <MarketStat label="Fallback sales" value={String(fallbackSaleCount)} />
          <MarketStat label="To conservation" value={String(conservationSaleCount)} />
        </div>

        {status ? <div role="status" className="mt-4 rounded-xl border border-white/[.07] bg-black/20 px-3 py-2 text-xs text-white/58">{status}</div> : null}

        <div className="mt-4 space-y-2">
          {myListings.map((listing) => {
            const fallback = Math.round(listing.price * 0.85);
            const conservation = isPureSubspecies(listing.snake);
            return (
              <div key={listing.id} className="grid gap-3 rounded-2xl border border-white/[.06] bg-black/12 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white/76">{listing.snake.name}</span>
                    <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[.08em] ${conservation ? "border-emerald-300/15 text-emerald-100/58" : "border-white/[.08] text-white/34"}`}>{conservation ? "Conservation eligible" : "Pet market fallback"}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-white/34">Listed {money(listing.price)} · fallback {money(fallback)} · {timeLeft(listing.listed_at, now)} remaining</div>
                  {conservation ? <div className="mt-1 text-[9px] text-emerald-100/42">If it reaches fallback, it adds one animal to the shared conservation total without personal contribution credit.</div> : null}
                </div>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void reclaim(listing)}
                  className="rounded-xl border border-white/[.09] px-3 py-2 text-[10px] font-bold text-white/52 transition hover:border-white/20 hover:text-white/75 disabled:opacity-30"
                >
                  Reclaim
                </button>
              </div>
            );
          })}
          {!myListings.length ? <div className="rounded-2xl border border-dashed border-white/[.08] p-5 text-sm text-white/30">You have no active player-market listings.</div> : null}
        </div>
      </div>
    </section>
  );
}

function MarketStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[.06] bg-black/15 px-3 py-2.5">
      <div className="text-[8px] font-black uppercase tracking-[.1em] text-white/24">{label}</div>
      <div className="mt-1 text-base font-semibold text-white/68">{value}</div>
    </div>
  );
}
