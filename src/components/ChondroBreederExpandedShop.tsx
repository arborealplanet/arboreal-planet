"use client";

import { useEffect, useMemo, useState } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";
import { animalHousingCapacity, enclosureFootprint, roomCapacityFromSave } from "@/lib/chondro-facility-limits";

type Sex = "Male" | "Female";
type Locality = "Biak" | "Numfor" | "Manokwari" | "Sorong" | "Timika" | "Cyclops" | "Jayapura" | "Lereh" | "Wamena" | "Yapen" | "Aru" | "Merauke";
type Subspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type LifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";
type ConservationRow = { subspecies: Subspecies; import_multiplier: number; phenotype_bonus: number; stewardship_score: number; contribution_count: number };

type Snake = {
  id: string;
  name: string;
  sex: Sex;
  source: "Captive Bred" | "Import";
  subspecies: Subspecies;
  locality: Locality;
  neonateColor: "Red" | "Yellow";
  lifeStage: LifeStage;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
  geneticsTested: boolean;
  phenotypeScore: number;
  localityAncestry: Partial<Record<Locality, number>>;
  body: string;
  tail: string;
  eyes: string;
  head: string;
  pattern: string;
  color: string;
  nidoStatus: "Unknown" | "Negative" | "Positive";
  condition: "Excellent" | "Good" | "Fair";
  classification: "Pure" | "Hybrid" | "Designer";
  generation: number;
  parentIds: string[];
  ancestry: Partial<Record<Subspecies, number>>;
  notes: string;
  breederInitials: string | null;
};

type Offer = Snake & { price: number };
type EnclosureType = "Chondro Dojo Bin" | "PVC Arboreal";
type GameSave = {
  cash: number;
  colony: Snake[];
  enclosures: Record<string, number>;
  facilityRooms?: Record<string, number>;
  purchasedStoreIds?: string[];
  [key: string]: unknown;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const SHOP_SEED_KEY = "arboreal_chondro_expanded_shop_seed_v2";
const SHOP_REFRESH_AT_KEY = "arboreal_chondro_expanded_shop_refresh_at_v1";
const SHOP_REFRESH_MS = 24 * 60 * 60 * 1000;

const enclosurePrices: Record<EnclosureType, number> = {
  "Chondro Dojo Bin": 250,
  "PVC Arboreal": 650,
};

const enclosureDisplay: Record<EnclosureType, { label: string; detail: string }> = {
  "Chondro Dojo Bin": {
    label: "Chondro Dojo 2 Stack",
    detail: "Two individual Chondro Dojo enclosures in one stack. Best for hatchlings and neonates; subadults may use open Dojo space when appropriate.",
  },
  "PVC Arboreal": {
    label: "PVC Enclosure",
    detail: "Full-size individual arboreal housing. Required for adults and suitable for subadults.",
  },
};

const subspeciesList: Subspecies[] = [
  "Morelia azurea azurea",
  "Morelia azurea pulcher",
  "Morelia azurea utaraensis",
  "Morelia viridis",
];

const localitiesBySubspecies: Record<Subspecies, Locality[]> = {
  "Morelia azurea azurea": ["Biak", "Numfor"],
  "Morelia azurea pulcher": ["Manokwari", "Sorong", "Timika"],
  "Morelia azurea utaraensis": ["Cyclops", "Jayapura", "Lereh", "Wamena", "Yapen"],
  "Morelia viridis": ["Aru", "Merauke"],
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function rng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ordinaryTrait(random: () => number) {
  const roll = random();
  if (roll < 0.55) return 0;
  if (roll < 0.82) return 1 + Math.floor(random() * 10);
  if (roll < 0.94) return 11 + Math.floor(random() * 15);
  if (roll < 0.985) return 26 + Math.floor(random() * 25);
  if (roll < 0.997) return 51 + Math.floor(random() * 25);
  return 76 + Math.floor(random() * 25);
}

function effectMap(rows: ConservationRow[]) {
  return new Map(rows.map((row) => [row.subspecies, row]));
}

function chooseSubspecies(random: () => number, source: Snake["source"], effects: Map<Subspecies, ConservationRow>) {
  const weights = subspeciesList.map((subspecies) => source === "Import" ? Number(effects.get(subspecies)?.import_multiplier ?? 1) : 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let index = 0; index < subspeciesList.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return subspeciesList[index];
  }
  return subspeciesList[subspeciesList.length - 1];
}

function makeRandomOffer(seed: number, index: number, random: () => number, effects: Map<Subspecies, ConservationRow>): Offer {
  const source: Snake["source"] = random() < 0.68 ? "Captive Bred" : "Import";
  const subspecies = chooseSubspecies(random, source, effects);
  const localities = localitiesBySubspecies[subspecies];
  const locality = localities[Math.floor(random() * localities.length)] ?? localities[0];
  const sex: Sex = random() < 0.5 ? "Male" : "Female";
  const neonateColor: "Red" | "Yellow" = subspecies === "Morelia viridis" ? "Yellow" : random() < 0.4 ? "Red" : "Yellow";
  const stageRoll = random();
  const lifeStage: LifeStage = stageRoll < 0.15 ? "Hatchling" : stageRoll < 0.42 ? "Neonate" : stageRoll < 0.72 ? "Subadult" : "Adult";
  const geneticsTested = random() < 0.22;
  const conservationBonus = source === "Import" ? Number(effects.get(subspecies)?.phenotype_bonus ?? 0) : 0;
  const phenotypeScore = Math.min(100, 66 + Math.floor(random() * 35) + conservationBonus);
  const highBlack = ordinaryTrait(random);
  const highWhite = ordinaryTrait(random);
  const blueStripe = ordinaryTrait(random);
  const yellowRetention = ordinaryTrait(random);
  const blotches = ordinaryTrait(random);
  const stageMultiplier = lifeStage === "Hatchling" ? 0.58 : lifeStage === "Neonate" ? 0.76 : lifeStage === "Subadult" ? 1 : 1.28;
  const testedTraits = geneticsTested ? (highBlack + highWhite + blueStripe + yellowRetention + blotches) * 10 : 0;
  const base = (source === "Import" ? 900 : 2050) + (neonateColor === "Red" ? 600 : 0) + (geneticsTested ? 350 : 0) + testedTraits + Math.max(0, phenotypeScore - 70) * 40;
  const price = Math.max(500, Math.round((base * stageMultiplier) / 25) * 25);

  return {
    id: `SHOP-PLUS-${seed}-${index}`,
    name: `${locality} ${source === "Import" ? "Import" : "CB"}`,
    sex,
    source,
    subspecies,
    locality,
    neonateColor,
    lifeStage,
    highBlack,
    highWhite,
    blueStripe,
    yellowRetention,
    blotches,
    geneticsTested,
    phenotypeScore,
    localityAncestry: { [locality]: 100 },
    body: subspecies,
    tail: subspecies === "Morelia azurea utaraensis" ? "Matching body color and pattern" : "Black-dipped",
    eyes: subspecies,
    head: subspecies,
    pattern: locality,
    color: locality,
    nidoStatus: "Unknown",
    condition: source === "Import" ? "Fair" : "Good",
    classification: "Pure",
    generation: 1,
    parentIds: [],
    ancestry: { [subspecies]: 100 },
    notes: source === "Import" && conservationBonus > 0 ? `Community conservation partnership phenotype bonus: +${conservationBonus}.` : "",
    breederInitials: null,
    price,
  };
}

function buildOffers(seed: number, rows: ConservationRow[]) {
  const random = rng(seed * 7919 + 20260908);
  const effects = effectMap(rows);
  return Array.from({ length: 20 }, (_, index) => makeRandomOffer(seed, index, random, effects));
}

function parseSave(value: unknown): GameSave | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const save = value as Partial<GameSave>;
  if (typeof save.cash !== "number" || !Array.isArray(save.colony) || !save.enclosures) return null;
  return save as GameSave;
}

function housingRequirement(stage: LifeStage) {
  if (stage === "Adult") return "PVC Enclosure required";
  if (stage === "Subadult") return "Dojo or PVC";
  return "Chondro Dojo 2 Stack required";
}

function hasCompatibleHousing(enclosures: Record<string, number> | undefined, colony: Snake[], stage: LifeStage) {
  const dojoSpaces = Math.max(0, Number(enclosures?.["Chondro Dojo Bin"] ?? 0) || 0) * 2;
  const pvcSpaces = Math.max(0, Number(enclosures?.["PVC Arboreal"] ?? 0) || 0);
  const young = colony.filter((snake) => snake.lifeStage === "Hatchling" || snake.lifeStage === "Neonate").length;
  const subadults = colony.filter((snake) => snake.lifeStage === "Subadult").length;
  const adults = colony.filter((snake) => snake.lifeStage === "Adult").length;
  const dojoFree = dojoSpaces - young;
  const pvcFree = pvcSpaces - adults;

  if (dojoFree < 0 || pvcFree < 0) return false;

  if (stage === "Hatchling" || stage === "Neonate") {
    const subadultsForcedIntoDojo = Math.max(0, subadults - pvcFree);
    return dojoFree - subadultsForcedIntoDojo > 0;
  }

  if (stage === "Adult") {
    const subadultsForcedIntoPvc = Math.max(0, subadults - dojoFree);
    return pvcFree - subadultsForcedIntoPvc > 0;
  }

  return dojoFree + pvcFree - subadults > 0;
}

function EnclosureDiagram({ type }: { type: EnclosureType }) {
  const isDojo = type === "Chondro Dojo Bin";
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(110,231,183,.12),transparent_42%),#06100c] p-5">
      <div className={`relative ${isDojo ? "h-[82%] w-[54%]" : "h-[84%] w-[58%]"}`}>
        {isDojo ? (
          <>
            <div className="absolute inset-x-0 top-0 h-[46%] rounded-xl border-2 border-white/35 bg-white/[.035]">
              <div className="absolute left-[12%] right-[12%] top-[42%] h-2 rounded-full bg-white/55" />
              <div className="absolute bottom-[10%] right-[10%] h-5 w-9 rounded-t-full border border-sky-100/30 bg-sky-100/10" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[46%] rounded-xl border-2 border-white/35 bg-white/[.035]">
              <div className="absolute left-[12%] right-[12%] top-[42%] h-2 rounded-full bg-white/55" />
              <div className="absolute bottom-[10%] right-[10%] h-5 w-9 rounded-t-full border border-sky-100/30 bg-sky-100/10" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 rounded-xl border-2 border-white/35 bg-white/[.035]">
            <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/15" />
            <div className="absolute left-[12%] right-[12%] top-[34%] h-2 rounded-full bg-white/55" />
            <div className="absolute left-[18%] right-[18%] top-[58%] h-2 rounded-full bg-white/45" />
            <div className="absolute bottom-[9%] right-[10%] h-6 w-10 rounded-t-full border border-sky-100/30 bg-sky-100/10" />
          </div>
        )}
      </div>
    </div>
  );
}

export function ChondroBreederExpandedShop() {
  const [save, setSave] = useState<GameSave | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [conservation, setConservation] = useState<ConservationRow[]>([]);
  const [seed, setSeed] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [refreshAt, setRefreshAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const current = Date.now();
    let storedSeed = Number(window.localStorage.getItem(SHOP_SEED_KEY) || "1");
    if (!Number.isFinite(storedSeed) || storedSeed < 1) storedSeed = 1;

    let storedRefreshAt = Number(window.localStorage.getItem(SHOP_REFRESH_AT_KEY) || "0");
    if (!Number.isFinite(storedRefreshAt) || storedRefreshAt <= 0) storedRefreshAt = current + SHOP_REFRESH_MS;
    if (current >= storedRefreshAt) {
      const rotations = Math.floor((current - storedRefreshAt) / SHOP_REFRESH_MS) + 1;
      storedSeed += rotations;
      storedRefreshAt += rotations * SHOP_REFRESH_MS;
    }

    window.localStorage.setItem(SHOP_SEED_KEY, String(storedSeed));
    window.localStorage.setItem(SHOP_REFRESH_AT_KEY, String(storedRefreshAt));
    setSeed(storedSeed);
    setRefreshAt(storedRefreshAt);
    setNow(current);

    const timer = window.setInterval(() => {
      const tickNow = Date.now();
      setNow(tickNow);
      const deadline = Number(window.localStorage.getItem(SHOP_REFRESH_AT_KEY) || "0");
      if (!Number.isFinite(deadline) || tickNow < deadline) return;
      const currentSeed = Math.max(1, Number(window.localStorage.getItem(SHOP_SEED_KEY) || "1") || 1);
      const rotations = Math.floor((tickNow - deadline) / SHOP_REFRESH_MS) + 1;
      const nextSeed = currentSeed + rotations;
      const nextDeadline = deadline + rotations * SHOP_REFRESH_MS;
      window.localStorage.setItem(SHOP_SEED_KEY, String(nextSeed));
      window.localStorage.setItem(SHOP_REFRESH_AT_KEY, String(nextDeadline));
      setSeed(nextSeed);
      setRefreshAt(nextDeadline);
      setStatus("The daily shop refreshed. New animals are available.");
    }, 1000);

    let cancelled = false;
    const readLocal = () => {
      try {
        return parseSave(JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) || "null"));
      } catch {
        return null;
      }
    };

    const local = readLocal();
    if (local) setSave(local);

    async function loadRemote() {
      try {
        const [saveResponse, conservationResponse] = await Promise.all([
          fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" }),
          fetch("/api/hatchery/chondro-breeder/conservation", { cache: "no-store" }),
        ]);
        const saveData = await saveResponse.json();
        if (!cancelled && saveResponse.ok) {
          setAuthenticated(Boolean(saveData.authenticated));
          setSave(parseSave(saveData.save?.state) ?? readLocal());
        }
        if (!cancelled && conservationResponse.ok) {
          const conservationData = await conservationResponse.json() as { status?: ConservationRow[] };
          setConservation(conservationData.status ?? []);
        }
      } catch {
        if (!cancelled) setSave(readLocal());
      }
    }

    void loadRemote();
    const onSaveChange = () => {
      const next = readLocal();
      if (next) setSave(next);
    };
    const onConservation = () => void loadRemote();
    window.addEventListener("arboreal-chondro-breeder-save-change", onSaveChange);
    window.addEventListener("chondro-conservation-updated", onConservation);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("arboreal-chondro-breeder-save-change", onSaveChange);
      window.removeEventListener("chondro-conservation-updated", onConservation);
    };
  }, []);

  const offers = useMemo(() => buildOffers(seed, conservation), [seed, conservation]);
  const purchased = useMemo(() => new Set(save?.purchasedStoreIds ?? []), [save?.purchasedStoreIds]);
  const installedFootprint = enclosureFootprint(save?.enclosures);
  const capacity = animalHousingCapacity(save?.enclosures);
  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms: save?.facilityRooms });
  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - installedFootprint);
  const openSlots = Math.max(0, capacity - (save?.colony.length ?? 0));
  const refreshRemaining = refreshAt > 0 && now > 0 ? Math.max(0, refreshAt - now) : SHOP_REFRESH_MS;

  function buyEnclosure(type: EnclosureType) {
    if (!save || busy || roomEnclosureSlots <= 0 || save.cash < enclosurePrices[type]) return;
    setBusy(`enclosure:${type}`);
    setStatus(`Installing ${enclosureDisplay[type].label}…`);
    window.dispatchEvent(new CustomEvent("arboreal-chondro-enclosure-action", {
      detail: { action: "buy-enclosure", type },
    }));
    window.setTimeout(() => {
      setBusy(null);
      setStatus(`${enclosureDisplay[type].label} purchased.`);
    }, 350);
  }

  async function buy(offer: Offer) {
    if (!save || busy || purchased.has(offer.id) || save.cash < offer.price) return;
    if (!hasCompatibleHousing(save.enclosures, save.colony, offer.lifeStage)) {
      setStatus(`${offer.name} needs compatible housing. ${housingRequirement(offer.lifeStage)}.`);
      return;
    }

    setBusy(offer.id);
    setStatus("");
    const next: GameSave = {
      ...save,
      cash: save.cash - offer.price,
      colony: [...save.colony, offer],
      purchasedStoreIds: [...(save.purchasedStoreIds ?? []), offer.id],
    };

    try {
      window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(next));
      setSave(next);
      window.dispatchEvent(new Event("arboreal-chondro-breeder-save-change"));
      if (authenticated) {
        const response = await fetch("/api/hatchery/chondro-breeder/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) throw new Error("save failed");
      }
      setStatus(`${offer.name} purchased and added to your colony.`);
    } catch {
      setStatus("That purchase could not be saved. Your local game state was preserved.");
    } finally {
      setBusy(null);
    }
  }

  if (!save) {
    return <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6"><div className="rounded-[24px] border border-white/[.06] bg-white/[.02] p-5 text-sm text-white/40">Loading animal market…</div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
      <section className="mb-4 overflow-hidden rounded-[26px] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.08),transparent_38%),#07110d] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-100/55">Housing shop</div>
            <h3 className="mt-2 text-xl font-semibold text-white/80">Two enclosures. Clear rules.</h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/38">Chondro Dojo 2 Stacks provide two individual spaces. PVC Enclosures provide one individual full-size space. Animals are never cohabitated.</p>
          </div>
          <div className="rounded-xl border border-white/[.07] bg-black/15 px-4 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/32">Facility</div>
            <div className="mt-1 text-sm font-black text-emerald-100/72">{capacity} animal spaces · {roomEnclosureSlots} install slots</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["Chondro Dojo Bin", "PVC Arboreal"] as EnclosureType[]).map((type) => {
            const price = enclosurePrices[type];
            const owned = Number(save.enclosures?.[type] ?? 0);
            const unavailable = busy !== null || roomEnclosureSlots <= 0 || save.cash < price;
            return (
              <article key={type} className="overflow-hidden rounded-[22px] border border-white/[.07] bg-black/15">
                <div className="relative aspect-[16/8] overflow-hidden border-b border-white/[.06] bg-black/25">
                  <EnclosureDiagram type={type} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10">
                    <div className="text-lg font-semibold text-white">{enclosureDisplay[type].label}</div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="mb-3 text-[11px] leading-5 text-white/40">{enclosureDisplay[type].detail}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.12em] text-white/30">Owned</div>
                      <div className="mt-1 text-sm font-semibold text-white/70">{owned} · {type === "Chondro Dojo Bin" ? "2 individual spaces each" : "1 individual space each"}</div>
                    </div>
                    <div className="text-lg font-semibold text-emerald-200/78">{money(price)}</div>
                  </div>
                  <button type="button" disabled={unavailable} onClick={() => buyEnclosure(type)} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-[#06100c] disabled:opacity-30">
                    {roomEnclosureSlots <= 0 ? "Need facility space" : save.cash < price ? `Need ${money(price)}` : busy === `enclosure:${type}` ? "Installing…" : `Buy ${enclosureDisplay[type].label}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-sky-300/15 bg-sky-300/[.025] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-sky-100/55">Green Tree Python market</div>
            <h3 className="mt-2 text-xl font-semibold text-white/80">20 daily listings</h3>
            <p className="mt-1 text-xs text-white/35">Browse the current rotation. Every card shows the housing type the animal can actually use.</p>
          </div>
          <div className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.14em] text-sky-100/45">Next refresh</div>
            <div className="mt-1 tabular-nums text-sm font-black text-sky-100/80">{formatCountdown(refreshRemaining)}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-white/32">
          <span>Swipe to browse {offers.length} listings</span>
          <span>{openSlots} total spaces open · cash {money(save.cash)}</span>
        </div>

        <div aria-label="Scrollable Green Tree Python market listings" className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(125,211,252,.28)_transparent]">
          {offers.map((offer) => {
            const sold = purchased.has(offer.id);
            const effect = conservation.find((row) => row.subspecies === offer.subspecies);
            const compatibleHousing = hasCompatibleHousing(save.enclosures, save.colony, offer.lifeStage);
            return (
              <article key={offer.id} className="w-[82%] shrink-0 snap-start rounded-2xl border border-white/[.06] bg-black/10 p-3 sm:w-[48%] lg:w-[calc((100%-1.5rem)/3)]">
                <ChondroSnakeIcon
                  subspecies={offer.subspecies}
                  name={offer.name}
                  lifeStage={offer.lifeStage}
                  neonateColor={offer.neonateColor}
                  compact
                />
                <div className="mt-3 font-semibold text-white/78">{offer.name}</div>
                <div className="mt-1 text-[10px] text-white/36">{offer.sex} · {offer.lifeStage} · {offer.subspecies}</div>
                <div className={`mt-1 text-[10px] font-semibold ${offer.neonateColor === "Red" ? "text-red-100/65" : "text-amber-100/65"}`}>Neonate color · {offer.neonateColor}</div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[.08em] text-sky-100/48">Housing · {housingRequirement(offer.lifeStage)}</div>
                {offer.source === "Import" && effect && Number(effect.stewardship_score) > 0 ? <div className="mt-2 text-[9px] font-semibold text-emerald-100/55">Conservation-supported import · stewardship {Number(effect.stewardship_score).toFixed(1)}</div> : null}
                <div className="mt-3 rounded-xl border border-white/[.06] p-2 text-[10px] leading-5 text-white/42">
                  {offer.geneticsTested ? `HB ${offer.highBlack}% · HW ${offer.highWhite}% · Blue ${offer.blueStripe}% · Yellow ${offer.yellowRetention}% · Blotches ${offer.blotches}%` : "Trait percentages untested and hidden"}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-200/75">{money(offer.price)}</span>
                  <button type="button" disabled={sold || busy !== null || save.cash < offer.price || !compatibleHousing} onClick={() => void buy(offer)} className="rounded-lg bg-amber-200 px-3 py-2 text-[10px] font-black text-[#17130a] disabled:opacity-30">
                    {sold ? "Purchased" : !compatibleHousing ? "Need housing" : save.cash < offer.price ? "Need cash" : busy === offer.id ? "Buying…" : "Buy"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {status ? <div role="status" className="mt-3 rounded-xl border border-sky-300/10 bg-sky-300/[.035] px-3 py-2 text-xs text-sky-100/70">{status}</div> : null}
      </section>
    </div>
  );
}
