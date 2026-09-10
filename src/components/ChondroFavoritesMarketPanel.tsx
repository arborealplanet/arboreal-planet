"use client";

import { useEffect, useMemo, useState } from "react";

type SnakeLite = {
  id: string;
  name: string;
  locality?: string;
  subspecies?: string;
  sex?: string;
  lifeStage?: string;
  highBlack?: number;
  highWhite?: number;
  blueStripe?: number;
  yellowRetention?: number;
  blotches?: number;
};

type Listing = {
  id: string;
  snake_id: string;
  price: number;
  isMine?: boolean;
  snake: SnakeLite;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function ChondroFavoritesMarketPanel() {
  const [colony, setColony] = useState<SnakeLite[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingProceeds, setPendingProceeds] = useState(0);
  const [pendingSaleCount, setPendingSaleCount] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function refresh() {
    try {
      const [saveResponse, favoritesResponse, marketResponse] = await Promise.all([
        fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" }),
        fetch("/api/hatchery/chondro-breeder/favorites", { cache: "no-store" }),
        fetch("/api/hatchery/chondro-breeder/player-market", { cache: "no-store" }),
      ]);
      const save = await saveResponse.json();
      const favorites = await favoritesResponse.json();
      const market = await marketResponse.json();
      setColony(Array.isArray(save.save?.state?.colony) ? save.save.state.colony : []);
      setFavoriteIds(Array.isArray(favorites.favoriteIds) ? favorites.favoriteIds : []);
      setListings(Array.isArray(market.listings) ? market.listings : []);
      setPendingProceeds(Math.max(0, Number(market.pendingProceeds ?? 0)));
      setPendingSaleCount(Math.max(0, Number(market.pendingSaleCount ?? 0)));
    } catch {
      setStatus("Unable to refresh favorites and market listings.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const myListings = useMemo(() => listings.filter((listing) => listing.isMine), [listings]);

  async function toggleFavorite(animal: SnakeLite) {
    const favorite = !favoriteSet.has(animal.id);
    setBusy(animal.id);
    setStatus("");
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snakeId: animal.id, favorite }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Favorite could not be changed.");
        return;
      }
      setFavoriteIds(Array.isArray(data.favoriteIds) ? data.favoriteIds : []);
      setStatus(favorite ? `${animal.name} is protected as a favorite.` : `${animal.name} can be sold again.`);
    } finally {
      setBusy(null);
    }
  }

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
      setStatus(`${listing.snake.name} has been returned to your colony.`);
      await refresh();
      window.setTimeout(() => window.location.reload(), 350);
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
      setStatus(count > 0 ? `${money(total)} collected from ${count} completed market sale${count === 1 ? "" : "s"}.` : "No completed market sales are waiting to be claimed.");
      await refresh();
      window.setTimeout(() => window.location.reload(), 350);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel mt-5 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white/80">Favorites & Player Market</div>
          <div className="mt-1 max-w-3xl text-[11px] leading-5 text-white/40">
            Favorite important animals to protect them from accidental sale. Listing a snake does not pay immediately; game cash becomes claimable after another player actually buys it. Unsold listings can be reclaimed at no charge if you have enclosure space.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-white/45">
            {favoriteIds.length} favorites
          </div>
          <button
            type="button"
            disabled={pendingProceeds <= 0 || busy !== null}
            onClick={() => void claimProceeds()}
            className="rounded-full border border-amber-200/20 bg-amber-200/[.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-amber-100/75 disabled:opacity-30"
          >
            {pendingProceeds > 0 ? `Claim ${money(pendingProceeds)} · ${pendingSaleCount} sold` : "No proceeds waiting"}
          </button>
        </div>
      </div>

      {status ? <div className="mt-3 rounded-xl border border-white/[.07] bg-black/20 px-3 py-2 text-xs text-white/55">{status}</div> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[.07] bg-black/15 p-3">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Your snakes</div>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {colony.length ? colony.map((animal) => {
              const favorite = favoriteSet.has(animal.id);
              return (
                <div key={animal.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${favorite ? "border-amber-200/30 bg-amber-200/[.05]" : "border-white/[.06] bg-white/[.015]"}`}>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-white/75">{favorite ? "★ " : ""}{animal.name}</div>
                    <div className="mt-0.5 truncate text-[10px] text-white/30">{animal.sex ?? ""} · {animal.lifeStage ?? ""} · {animal.locality ?? animal.subspecies ?? ""}</div>
                  </div>
                  <button
                    type="button"
                    disabled={busy === animal.id}
                    onClick={() => void toggleFavorite(animal)}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold ${favorite ? "border-amber-200/30 text-amber-100/80" : "border-white/10 text-white/45"}`}
                  >
                    {favorite ? "★ Favorited" : "☆ Favorite"}
                  </button>
                </div>
              );
            }) : <div className="text-xs text-white/30">No colony animals loaded yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[.07] bg-black/15 p-3">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Your active player-market listings</div>
          <div className="mt-3 space-y-2">
            {myListings.length ? myListings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-white/[.015] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-white/75">{listing.snake.name}</div>
                  <div className="mt-0.5 text-[10px] text-white/30">Listed at {money(listing.price)} · awaiting buyer</div>
                </div>
                <button
                  type="button"
                  disabled={busy === listing.id}
                  onClick={() => void reclaim(listing)}
                  className="shrink-0 rounded-lg border border-emerald-300/20 bg-emerald-300/[.05] px-3 py-1.5 text-[10px] font-bold text-emerald-100/75"
                >
                  Reclaim
                </button>
              </div>
            )) : <div className="text-xs text-white/30">You do not have any active player-market listings.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
