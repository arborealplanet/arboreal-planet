"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";

type Sex = "Male" | "Female";
type Locality = "Biak" | "Numfor" | "Manokwari" | "Sorong" | "Timika" | "Cyclops" | "Jayapura" | "Lereh" | "Wamena" | "Aru" | "Merauke";
type Subspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type LifeStage = "Hatchling" | "Neonate" | "Subadult" | "Adult";

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

type Offer = Snake & { price: number; featured?: boolean; specialLabel?: string };
type GameSave = {
  cash: number;
  colony: Snake[];
  enclosures: Record<string, number>;
  purchasedStoreIds?: string[];
  [key: string]: unknown;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const SHOP_SEED_KEY = "arboreal_chondro_expanded_shop_seed_v2";
const localitySubspecies: Record<Locality, Subspecies> = {
  Biak: "Morelia azurea azurea",
  Numfor: "Morelia azurea azurea",
  Manokwari: "Morelia azurea pulcher",
  Sorong: "Morelia azurea pulcher",
  Timika: "Morelia azurea pulcher",
  Cyclops: "Morelia azurea utaraensis",
  Jayapura: "Morelia azurea utaraensis",
  Lereh: "Morelia azurea utaraensis",
  Wamena: "Morelia azurea utaraensis",
  Aru: "Morelia viridis",
  Merauke: "Morelia viridis",
};
const localities = Object.keys(localitySubspecies) as Locality[];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
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
  if (roll < 0.5) return 0;
  if (roll < 0.79) return 1 + Math.floor(random() * 10);
  if (roll < 0.93) return 11 + Math.floor(random() * 15);
  if (roll < 0.98) return 26 + Math.floor(random() * 25);
  if (roll < 0.997) return 51 + Math.floor(random() * 25);
  return 76 + Math.floor(random() * 25);
}

function makeRandomOffer(seed: number, index: number, random: () => number): Offer {
  const locality = localities[Math.floor(random() * localities.length)];
  const subspecies = localitySubspecies[locality];
  const sex: Sex = random() < 0.5 ? "Male" : "Female";
  const neonateColor: "Red" | "Yellow" = random() < 0.4 ? "Red" : "Yellow";
  const source: "Captive Bred" | "Import" = random() < 0.6 ? "Captive Bred" : "Import";
  const stages: LifeStage[] = ["Hatchling", "Neonate", "Subadult", "Adult"];
  const lifeStage = stages[Math.floor(random() * stages.length)];
  const geneticsTested = random() < 0.22;
  const nidoStatus: Snake["nidoStatus"] = random() < 0.42 ? "Negative" : "Unknown";
  const phenotypeScore = 66 + Math.floor(random() * 35);
  const highBlack = ordinaryTrait(random);
  const highWhite = ordinaryTrait(random);
  const blueStripe = ordinaryTrait(random);
  const yellowRetention = ordinaryTrait(random);
  const blotches = ordinaryTrait(random);
  const stageMultiplier = lifeStage === "Hatchling" ? 0.58 : lifeStage === "Neonate" ? 0.76 : lifeStage === "Subadult" ? 1 : 1.28;
  const testedTraits = geneticsTested ? (highBlack + highWhite + blueStripe + yellowRetention + blotches) * 10 : 0;
  const base = (source === "Import" ? 900 : 2050) + (neonateColor === "Red" ? 600 : 0) + (nidoStatus === "Negative" ? 425 : 0) + (geneticsTested ? 350 : 0) + testedTraits + Math.max(0, phenotypeScore - 70) * 40;
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
    nidoStatus,
    condition: source === "Import" ? "Fair" : "Good",
    classification: "Pure",
    generation: 1,
    parentIds: [],
    ancestry: { [subspecies]: 100 },
    notes: "",
    breederInitials: null,
    price,
  };
}

function specialCyclops(sex: Sex): Offer {
  const suffix = sex === "Male" ? "M" : "F";
  return {
    id: `SPECIAL-CYCLOPS-A++-RED-${suffix}`,
    name: `A++ Cyclops Red ${sex}`,
    sex,
    source: "Captive Bred",
    subspecies: "Morelia azurea utaraensis",
    locality: "Cyclops",
    neonateColor: "Red",
    lifeStage: "Neonate",
    highBlack: 0,
    highWhite: 0,
    blueStripe: 100,
    yellowRetention: 0,
    blotches: 0,
    geneticsTested: true,
    phenotypeScore: 100,
    localityAncestry: { Cyclops: 100 },
    body: "Morelia azurea utaraensis",
    tail: "Matching body color and pattern",
    eyes: "Morelia azurea utaraensis",
    head: "Morelia azurea utaraensis",
    pattern: "Cyclops",
    color: "Cyclops",
    nidoStatus: "Negative",
    condition: "Excellent",
    classification: "Pure",
    generation: 1,
    parentIds: [],
    ancestry: { "Morelia azurea utaraensis": 100 },
    notes: "Special A++ Cyclops phenotype shop animal.",
    breederInitials: null,
    price: 5000,
    featured: true,
    specialLabel: "A++ Cyclops phenotype",
  };
}

function buildOffers(seed: number) {
  const random = rng(seed * 7919 + 20260908);
  return [specialCyclops("Male"), specialCyclops("Female"), ...Array.from({ length: 18 }, (_, index) => makeRandomOffer(seed, index, random))];
}

function parseSave(value: unknown): GameSave | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const save = value as Partial<GameSave>;
  if (typeof save.cash !== "number" || !Array.isArray(save.colony) || !save.enclosures) return null;
  return save as GameSave;
}

export function ChondroBreederExpandedShop() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [save, setSave] = useState<GameSave | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [seed, setSeed] = useState(1);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const heading = [...document.querySelectorAll("h2")].find((node) => node.textContent?.includes("Most are ordinary. The special ones matter."));
      const section = heading?.closest("section");
      if (!section) return;
      const existing = section.querySelector<HTMLElement>("[data-expanded-shop-mount]");
      if (existing) {
        setMount(existing);
        return;
      }
      const node = document.createElement("div");
      node.dataset.expandedShopMount = "true";
      node.className = "mt-6";
      const originalStore = section.querySelector<HTMLElement>(".mx-auto.mt-6.max-w-2xl");
      section.insertBefore(node, originalStore ?? null);
      setMount(node);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(SHOP_SEED_KEY) || "1");
    window.setTimeout(() => setSeed(Number.isFinite(stored) && stored > 0 ? stored : 1), 0);
    let cancelled = false;
    async function load() {
      let local: GameSave | null = null;
      try { local = parseSave(JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) || "null")); } catch {}
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) {
          setAuthenticated(Boolean(data.authenticated));
          const cloud = parseSave(data.save?.state);
          setSave(cloud ?? local);
          return;
        }
      } catch {}
      if (!cancelled) setSave(local);
    }
    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const offers = useMemo(() => buildOffers(seed), [seed]);
  const purchased = useMemo(() => new Set(save?.purchasedStoreIds ?? []), [save?.purchasedStoreIds]);
  const capacity = Object.values(save?.enclosures ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const openSlots = Math.max(0, capacity - (save?.colony.length ?? 0));
  const visible = offers.slice(page * 5, page * 5 + 5);
  const pageCount = Math.ceil(offers.length / 5);

  function refreshShop() {
    const next = seed + 1;
    setSeed(next);
    setPage(0);
    window.localStorage.setItem(SHOP_SEED_KEY, String(next));
    setStatus("Shop refreshed. The two A++ Cyclops remain available until purchased.");
  }

  async function buy(offer: Offer) {
    if (!save || busy || purchased.has(offer.id) || openSlots <= 0 || save.cash < offer.price) return;
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
      if (authenticated) {
        const response = await fetch("/api/hatchery/chondro-breeder/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) throw new Error("save failed");
      }
      setSave(next);
      setStatus(`${offer.name} purchased. Updating your colony…`);
      window.setTimeout(() => window.location.reload(), 250);
    } catch {
      setStatus("That purchase could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  if (!mount || !save) return null;

  return createPortal(
    <div className="rounded-[24px] border border-sky-300/15 bg-sky-300/[.025] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-sky-100/55">Expanded daily listings</div>
          <h3 className="mt-2 text-xl font-semibold text-white/80">20 snakes available now</h3>
          <p className="mt-1 text-xs text-white/35">The A++ Cyclops pair is pinned first. Browse five listings at a time or refresh the other 18 animals.</p>
        </div>
        <button type="button" onClick={refreshShop} className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-2 text-xs font-black text-sky-100/75">Refresh shop</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {visible.map((offer) => {
          const sold = purchased.has(offer.id);
          return (
            <article key={offer.id} className={`rounded-2xl border p-3 ${offer.featured ? "border-amber-200/25 bg-amber-200/[.035]" : "border-white/[.06] bg-black/10"}`}>
              <ChondroSnakeIcon subspecies={offer.subspecies} name={offer.name} traits={{ highBlack: offer.highBlack, highWhite: offer.highWhite, blueStripe: offer.blueStripe, yellowRetention: offer.yellowRetention, blotches: offer.blotches }} compact />
              <div className="mt-3 font-semibold text-white/75">{offer.name}</div>
              <div className="mt-1 text-[10px] text-white/32">{offer.sex} · {offer.lifeStage} · {offer.locality}</div>
              <div className="mt-1 text-[10px] font-semibold text-red-100/65">Neonate color: {offer.neonateColor}</div>
              {offer.specialLabel ? <div className="mt-2 rounded-full border border-amber-200/20 px-2 py-1 text-center text-[9px] font-black uppercase text-amber-100/75">{offer.specialLabel}</div> : null}
              <div className="mt-3 rounded-xl border border-white/[.06] p-2 text-[10px] leading-5 text-white/42">
                {offer.geneticsTested ? `HB ${offer.highBlack}% · HW ${offer.highWhite}% · Blue ${offer.blueStripe}% · Yellow ${offer.yellowRetention}%` : "Genetics untested · percentages hidden"}<br />
                Nido: <span className={offer.nidoStatus === "Negative" ? "text-emerald-200/70" : "text-white/45"}>{offer.nidoStatus}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-semibold text-emerald-200/75">{money(offer.price)}</span>
                <button type="button" disabled={sold || busy !== null || save.cash < offer.price || openSlots <= 0} onClick={() => void buy(offer)} className="rounded-lg bg-amber-200 px-3 py-2 text-[10px] font-black text-[#17130a] disabled:opacity-30">{sold ? "Purchased" : openSlots <= 0 ? "Need space" : "Buy"}</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setPage((value) => (value - 1 + pageCount) % pageCount)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">← Previous 5</button>
        <div className="text-xs text-white/32">Page {page + 1} of {pageCount} · {openSlots} open enclosure{openSlots === 1 ? "" : "s"} · cash {money(save.cash)}</div>
        <button type="button" onClick={() => setPage((value) => (value + 1) % pageCount)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">Next 5 →</button>
      </div>
      {status ? <div role="status" className="mt-3 text-xs text-sky-100/65">{status}</div> : null}
    </div>,
    mount,
  );
}
