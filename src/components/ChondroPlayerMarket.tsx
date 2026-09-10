"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";

type SnakeLite = {
  id: string;
  name: string;
  sex?: string;
  subspecies: string;
  locality?: string;
  lifeStage?: string;
  neonateColor?: "Red" | "Yellow";
  classification?: string;
  generation?: number;
  nidoStatus?: string;
  geneticsTested?: boolean;
  phenotypeScore?: number;
  highBlack?: number;
  highWhite?: number;
  blueStripe?: number;
  yellowRetention?: number;
  blotches?: number;
};

type Listing = {
  id: string;
  snake_id: string;
  seller_id?: string;
  price: number;
  listed_at?: string;
  isMine?: boolean;
  snake: SnakeLite;
};

type SaveState = {
  cash?: number;
  colony?: Array<{ id: string }>;
  enclosures?: Record<string, number>;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function traitSummary(animal: SnakeLite) {
  if (!animal.geneticsTested) return "Traits untested";
  const rows = [
    ["Black", Number(animal.highBlack ?? 0)],
    ["White", Number(animal.highWhite ?? 0)],
    ["Blue", Number(animal.blueStripe ?? 0)],
    ["Yellow", Number(animal.yellowRetention ?? 0)],
    ["Blotches", Number(animal.blotches ?? 0)],
  ] as const;
  const best = rows.reduce((current, row) => (row[1] > current[1] ? row : current), rows[0]);
  return `Top tested trait · ${best[0]} ${best[1]}%`;
}

export function ChondroPlayerMarket() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [save, setSave] = useState<SaveState>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [marketResponse, saveResponse] = await Promise.all([
        fetch("/api/hatchery/chondro-breeder/player-market", { cache: "no-store" }),
        fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" }),
      ]);
      const market = await marketResponse.json();
      const saved = await saveResponse.json();
      if (marketResponse.ok) setListings(Array.isArray(market.listings) ? market.listings : []);
      if (saveResponse.ok) setSave(saved.save?.state ?? {});
      if (marketResponse.status === 401) setStatus("Sign in to browse and buy from the shared player market.");
    } catch {
      setStatus("The player market could not be refreshed.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    const onSave = () => void refresh();
    window.addEventListener("arboreal-chondro-breeder-save-change", onSave);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("arboreal-chondro-breeder-save-change", onSave);
    };
  }, [refresh]);

  const available = useMemo(() => listings.filter((listing) => !listing.isMine), [listings]);
  const cash = Math.max(0, Number(save.cash ?? 0));
  const installedEnclosures = Object.values(save.enclosures ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0);
  const openSlots = Math.max(0, installedEnclosures - (save.colony?.length ?? 0));

  function buy(listing: Listing) {
    if (busy || cash < listing.price || openSlots <= 0) return;
    setBusy(listing.id);
    setStatus(`Claiming ${listing.snake.name}…`);
    window.dispatchEvent(
      new CustomEvent("arboreal-chondro-market-action", {
        detail: { action: "buy-player-snake", listing },
      }),
    );
    window.setTimeout(() => {
      setBusy(null);
      setStatus("");
      void refresh();
    }, 1800);
  }

  return (
    <section className="mx-auto mt-5 max-w-7xl px-5 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border border-emerald-300/10 bg-emerald-300/[.022] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-100/48">Player market</div>
            <h2 className="mt-2 text-xl font-semibold text-white/84 sm:text-2xl">Chondros listed by other breeders</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/38">Shared listings keep the animal&apos;s locality, testing and breeding record when it changes hands.</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded-xl border border-white/[.08] px-3 py-2 text-[10px] font-bold text-white/52">Refresh</button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full border border-white/[.06] px-2.5 py-1 text-white/38">Cash {money(cash)}</span>
          <span className="rounded-full border border-white/[.06] px-2.5 py-1 text-white/38">Open enclosures {openSlots}</span>
          <span className="rounded-full border border-white/[.06] px-2.5 py-1 text-white/38">{available.length} available</span>
        </div>

        {status ? <div role="status" className="mt-4 rounded-xl border border-white/[.07] bg-black/15 px-3 py-2 text-xs text-white/55">{status}</div> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {available.map((listing) => {
            const animal = listing.snake;
            const cannotBuy = busy !== null || cash < listing.price || openSlots <= 0;
            return (
              <article key={listing.id} className="rounded-[22px] border border-white/[.06] bg-black/12 p-3">
                <div className="rounded-[18px] border border-white/[.045] bg-black/15 p-2">
                  <ChondroSnakeIcon
                    subspecies={animal.subspecies as never}
                    name={animal.name}
                    traits={{
                      highBlack: Number(animal.highBlack ?? 0),
                      highWhite: Number(animal.highWhite ?? 0),
                      blueStripe: Number(animal.blueStripe ?? 0),
                      yellowRetention: Number(animal.yellowRetention ?? 0),
                      blotches: Number(animal.blotches ?? 0),
                    }}
                    lifeStage={(animal.lifeStage ?? "Adult") as never}
                    neonateColor={animal.neonateColor}
                    compact
                  />
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white/78">{animal.name}</div>
                    <div className="mt-1 truncate text-[10px] text-white/34">{animal.sex ?? "Unknown sex"} · {animal.lifeStage ?? "Unknown stage"} · {animal.locality ?? animal.subspecies}</div>
                  </div>
                  <div className="shrink-0 text-base font-semibold text-emerald-200/76">{money(listing.price)}</div>
                </div>
                <div className="mt-3 rounded-xl border border-white/[.05] px-3 py-2 text-[10px] text-white/38">{traitSummary(animal)} · Nido {animal.nidoStatus ?? "Unknown"}</div>
                <button
                  type="button"
                  disabled={cannotBuy}
                  onClick={() => buy(listing)}
                  className="mt-3 w-full rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c] disabled:opacity-30"
                >
                  {busy === listing.id ? "Claiming…" : openSlots <= 0 ? "Need enclosure" : cash < listing.price ? "Not enough cash" : "Buy snake"}
                </button>
              </article>
            );
          })}
          {!available.length ? <div className="rounded-2xl border border-dashed border-white/[.08] p-6 text-sm text-white/30 md:col-span-2 xl:col-span-3">No breeder-listed snakes are available to you right now.</div> : null}
        </div>
      </div>
    </section>
  );
}
