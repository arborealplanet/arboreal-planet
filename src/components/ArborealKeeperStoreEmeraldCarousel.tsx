"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_EMERALD_KEEPER_SAVE,
  EMERALD_KEEPER_SAVE_KEY,
  EMERALD_MARKET_DAY_MS,
  EMERALD_TRAIT_LABELS,
  emeraldMarketForEpoch,
  emeraldSpeciesDisplayName,
  sanitizeEmeraldKeeperSave,
  type EmeraldAnimal,
  type EmeraldKeeperSave,
} from "@/lib/arboreal-keeper-emerald-engine";
import {
  ARBOREAL_KEEPER_FACILITY_EVENT,
  ARBOREAL_KEEPER_FACILITY_SAVE_KEY,
  assignAnimalToFacilityEnclosure,
  enclosureCanHouseAnimal,
  sanitizeKeeperFacilitySave,
  type KeeperFacilitySave,
} from "@/lib/arboreal-keeper-facility";
import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";
import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";

const CHONDRO_SAVE_KEY = "arboreal_chondro_breeder_v2";
const SAVE_EVENT = "arboreal-keeper-emerald-save-updated";
const LOAD_EVENT = "arboreal-keeper-emerald-cloud-loaded";
const ECONOMY_EVENT = "arboreal-keeper-economy-action";
const ECONOMY_UPDATED_EVENT = "arboreal-keeper-economy-updated";
const STORE_ART_SPRITE = "/hatchery/keeper-store-art-v1.webp?v=2026-09-16-store-recording-fix-1";

type EconomyAction = {
  action: "spend" | "credit" | "reputation";
  amount: number;
  reason: string;
  approved: boolean;
  balance?: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function readSharedProgress() {
  if (typeof window === "undefined") return { cash: 30000, reputation: 0 };
  try {
    const raw = window.localStorage.getItem(CHONDRO_SAVE_KEY);
    if (!raw) return { cash: 30000, reputation: 0 };
    const parsed = JSON.parse(raw) as { cash?: unknown; careerReputation?: unknown };
    return {
      cash: Number.isFinite(Number(parsed.cash)) ? Number(parsed.cash) : 30000,
      reputation: Number.isFinite(Number(parsed.careerReputation)) ? Number(parsed.careerReputation) : 0,
    };
  } catch {
    return { cash: 30000, reputation: 0 };
  }
}

function readEmeraldSave() {
  try {
    const raw = window.localStorage.getItem(EMERALD_KEEPER_SAVE_KEY);
    return raw ? sanitizeEmeraldKeeperSave(JSON.parse(raw)) : EMPTY_EMERALD_KEEPER_SAVE;
  } catch {
    return EMPTY_EMERALD_KEEPER_SAVE;
  }
}

function readFacilitySave() {
  try {
    const raw = window.localStorage.getItem(ARBOREAL_KEEPER_FACILITY_SAVE_KEY);
    return sanitizeKeeperFacilitySave(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeKeeperFacilitySave(null);
  }
}

function persistEmeraldSave(save: EmeraldKeeperSave) {
  const snapshot = { ...save, updatedAt: Date.now() };
  window.localStorage.setItem(EMERALD_KEEPER_SAVE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent(SAVE_EVENT, { detail: { save: snapshot } }));
  return snapshot;
}

function persistFacilitySave(save: KeeperFacilitySave) {
  const snapshot = { ...save, updatedAt: Date.now() };
  window.localStorage.setItem(ARBOREAL_KEEPER_FACILITY_SAVE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new Event(ARBOREAL_KEEPER_FACILITY_EVENT));
  return snapshot;
}

function requestEconomyAction(action: EconomyAction["action"], amount: number, reason: string) {
  const detail: EconomyAction = { action, amount, reason, approved: false };
  window.dispatchEvent(new CustomEvent<EconomyAction>(ECONOMY_EVENT, { detail }));
  return detail;
}

function strongestTraits(animal: EmeraldAnimal) {
  return Object.entries(animal.traits)
    .map(([key, value]) => ({
      label: EMERALD_TRAIT_LABELS[key as keyof typeof EMERALD_TRAIT_LABELS] ?? key,
      value: Number(value ?? 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

function storeSpriteIndex(animal: EmeraldAnimal) {
  const id = animal.assetId ?? "";
  if (id === "etb_northern_neonate_red_01") return 3;
  if (id.startsWith("etb_northern_neonate_")) return 4;
  if (id.startsWith("etb_northern_subadult_")) return 5;
  if (id.startsWith("etb_northern_adult_")) return 6;
  if (id.startsWith("etb_basin_neonate_")) return 7;
  if (id.startsWith("etb_basin_subadult_")) return 8;
  if (id.startsWith("etb_basin_adult_")) return 9;
  return animal.speciesId === "amazon_basin_emerald_tree_boa" ? 9 : 6;
}

function storeSpriteStyle(animal: EmeraldAnimal): React.CSSProperties {
  const index = storeSpriteIndex(animal);
  const column = index % 5;
  const row = Math.floor(index / 5);
  return {
    backgroundImage: `url("${STORE_ART_SPRITE}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "500% 200%",
    backgroundPosition: `${(column / 4) * 100}% ${row * 100}%`,
  };
}

function compatibleFacilityEnclosures(facility: KeeperFacilitySave, animal: EmeraldAnimal) {
  return facility.enclosures.filter((enclosure) =>
    enclosureCanHouseAnimal(enclosure, {
      id: animal.id,
      speciesId: animal.speciesId,
      lifeStage: animal.lifeStage,
    }),
  );
}

export function ArborealKeeperStoreEmeraldCarousel() {
  const [save, setSave] = useState<EmeraldKeeperSave>(EMPTY_EMERALD_KEEPER_SAVE);
  const [facility, setFacility] = useState<KeeperFacilitySave>(() => sanitizeKeeperFacilitySave(null));
  const [cash, setCash] = useState(30000);
  const [reputation, setReputation] = useState(0);
  const [now, setNow] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const hydrate = () => {
      setSave(readEmeraldSave());
      setFacility(readFacilitySave());
      const progress = readSharedProgress();
      setCash(progress.cash);
      setReputation(progress.reputation);
      setNow(Date.now());
      setHydrated(true);
    };

    const timer = window.setTimeout(hydrate, 0);
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);

    function handleCloudLoad(event: Event) {
      const detail = (event as CustomEvent<{ save?: unknown }>).detail;
      if (detail?.save) setSave(sanitizeEmeraldKeeperSave(detail.save));
    }

    function handleEconomyUpdate(event: Event) {
      const detail = (event as CustomEvent<{ cash?: number; reputation?: number }>).detail;
      if (typeof detail?.cash === "number") setCash(detail.cash);
      if (typeof detail?.reputation === "number") setReputation(detail.reputation);
      if (typeof detail?.cash !== "number" || typeof detail?.reputation !== "number") {
        const progress = readSharedProgress();
        if (typeof detail?.cash !== "number") setCash(progress.cash);
        if (typeof detail?.reputation !== "number") setReputation(progress.reputation);
      }
    }

    const handleFacility = () => setFacility(readFacilitySave());
    const handleEmerald = () => setSave(readEmeraldSave());

    window.addEventListener(LOAD_EVENT, handleCloudLoad);
    window.addEventListener(SAVE_EVENT, handleEmerald);
    window.addEventListener(ARBOREAL_KEEPER_FACILITY_EVENT, handleFacility);
    window.addEventListener(ECONOMY_UPDATED_EVENT, handleEconomyUpdate);
    window.addEventListener("storage", hydrate);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(clock);
      window.removeEventListener(LOAD_EVENT, handleCloudLoad);
      window.removeEventListener(SAVE_EVENT, handleEmerald);
      window.removeEventListener(ARBOREAL_KEEPER_FACILITY_EVENT, handleFacility);
      window.removeEventListener(ECONOMY_UPDATED_EVENT, handleEconomyUpdate);
      window.removeEventListener("storage", hydrate);
    };
  }, []);

  const keeperLevel = keeperLevelFromReputation(reputation);
  const marketEpoch = Math.floor((now || Date.now()) / EMERALD_MARKET_DAY_MS);
  const offers = useMemo(() => emeraldMarketForEpoch(marketEpoch, keeperLevel), [keeperLevel, marketEpoch]);
  const purchased = useMemo(() => new Set(save.purchasedOfferIds), [save.purchasedOfferIds]);

  function spend(amount: number, reason: string) {
    const result = requestEconomyAction("spend", amount, reason);
    if (!result.approved) {
      setStatus(`You need ${money(amount)} available in the shared facility budget.`);
      return false;
    }
    if (typeof result.balance === "number") setCash(result.balance);
    return true;
  }

  function buyAnimal(offerId: string) {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer || purchased.has(offer.id) || busy) return;

    const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;
    if (!offer.available) {
      setStatus(`${emeraldSpeciesDisplayName(offer.animal.speciesId)} unlocks at Keeper Level ${requiredLevel}.`);
      return;
    }

    const target = compatibleFacilityEnclosures(facility, offer.animal)[0];
    if (!target) {
      setStatus(`This ${offer.animal.lifeStage} needs an empty compatible Chondro Dojo 2 Stack or PVC Enclosure.`);
      return;
    }

    setBusy(offer.id);
    try {
      if (!spend(offer.price, `Purchase ${emeraldSpeciesDisplayName(offer.animal.speciesId)}`)) return;

      const nextFacility = persistFacilitySave(assignAnimalToFacilityEnclosure(
        facility,
        {
          id: offer.animal.id,
          speciesId: offer.animal.speciesId,
          lifeStage: offer.animal.lifeStage,
        },
        target.id,
      ));
      setFacility(nextFacility);

      const housingUnitId = `facility:${target.id}`;
      const nextHousingUnits = save.housingUnits
        .filter((unit) => unit.id !== housingUnitId && unit.occupantId !== offer.animal.id)
        .concat({
          id: housingUnitId,
          enclosureId: target.enclosureId,
          occupantId: offer.animal.id,
        });

      const next = persistEmeraldSave({
        ...save,
        animals: [...save.animals, offer.animal],
        purchasedOfferIds: [...save.purchasedOfferIds, offer.id],
        housingUnits: nextHousingUnits,
      });
      setSave(next);
      requestEconomyAction("reputation", 8, "Emerald Tree Boa acquisition");
      setStatus(`${offer.animal.sex} ${emeraldSpeciesDisplayName(offer.animal.speciesId)} added to My Animals.`);
    } finally {
      setBusy(null);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-5 pt-4 sm:px-6">
        <div className="rounded-[24px] border border-white/[.06] bg-white/[.02] p-5 text-sm text-white/40">
          Loading Emerald Tree Boa market…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-4 sm:px-6">
      <section className="rounded-[24px] border border-emerald-300/15 bg-emerald-300/[.025] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-100/55">Emerald Tree Boas</div>
            <h3 className="mt-2 text-xl font-semibold text-white/80">Northern + Amazon Basin listings</h3>
            <p className="mt-1 text-xs leading-5 text-white/35">Same horizontal store format as the Green Tree Python listings above.</p>
          </div>
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/45">Keeper level</div>
            <div className="mt-1 text-sm font-black text-emerald-100/80">Level {keeperLevel} · {money(cash)}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-white/32">
          <span>Swipe to browse all {offers.length} Emerald Tree Boa listings</span>
          <span>Northern L8 · Basin L18</span>
        </div>

        <div
          aria-label="Scrollable Emerald Tree Boa store listings"
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(110,231,183,.28)_transparent]"
        >
          {offers.map((offer) => {
            const sold = purchased.has(offer.id);
            const traits = strongestTraits(offer.animal);
            const compatibleHousing = compatibleFacilityEnclosures(facility, offer.animal).length;
            const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;
            const locked = !offer.available;
            return (
              <article
                key={offer.id}
                className="w-[82%] shrink-0 snap-start rounded-2xl border border-white/[.06] bg-black/10 p-3 sm:w-[48%] lg:w-[calc((100%-1.5rem)/3)]"
              >
                <div className="relative h-40 overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 sm:h-48">
                  <div
                    role="img"
                    aria-label={`${emeraldSpeciesDisplayName(offer.animal.speciesId)} ${offer.animal.lifeStage} illustrated virtual game portrait`}
                    className="absolute inset-1 rounded-xl bg-black"
                    style={storeSpriteStyle(offer.animal)}
                  />
                  <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-emerald-100/20 bg-[#06100c]/85 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-emerald-100/75 shadow-lg backdrop-blur-sm">Virtual</div>
                  <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-emerald-100/15 bg-emerald-950/80 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-emerald-100/75 shadow-lg backdrop-blur-sm">{offer.animal.lifeStage}</div>
                </div>

                <div className="mt-3 font-semibold text-white/75">{emeraldSpeciesDisplayName(offer.animal.speciesId)}</div>
                <div className="mt-1 text-[10px] text-white/32">{offer.animal.sex} · {offer.animal.lifeStage} · {offer.animal.condition}</div>
                {offer.animal.neonateColor ? <div className="mt-1 text-[10px] font-semibold text-amber-100/65">Neonate color: {offer.animal.neonateColor}</div> : null}

                <div className="mt-3 rounded-xl border border-white/[.06] p-2 text-[10px] leading-5 text-white/42">
                  {traits.map((trait) => (
                    <div key={trait.label} className="flex justify-between gap-2">
                      <span>{trait.label}</span>
                      <span className="font-semibold text-white/65">{trait.value}%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-emerald-200/78">{money(offer.price)}</div>
                    <div className="mt-0.5 text-[9px] text-white/28">{compatibleHousing} compatible enclosure{compatibleHousing === 1 ? "" : "s"} open</div>
                  </div>
                  <button
                    type="button"
                    disabled={locked || sold || busy !== null || cash < offer.price || compatibleHousing <= 0}
                    onClick={() => buyAnimal(offer.id)}
                    className="rounded-xl bg-amber-200 px-4 py-3 text-xs font-black text-[#17130a] disabled:opacity-30"
                  >
                    {locked ? `Level ${requiredLevel}` : sold ? "Purchased" : compatibleHousing <= 0 ? "Need space" : cash < offer.price ? "Need cash" : busy === offer.id ? "Buying…" : "Buy"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {status ? <div role="status" className="mt-3 text-xs text-emerald-100/65">{status}</div> : null}
      </section>
    </div>
  );
}
