"use client";

import { useEffect, useMemo, useState } from "react";
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
  specialPhenotypeLabel?: string;
};

type Offer = Snake & { price: number; featured?: boolean };
type GameSave = {
  cash: number;
  colony: Snake[];
  enclosures: Record<string, number>;
  purchasedStoreIds?: string[];
  [key: string]: unknown;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const SHOP_SEED_KEY = "arboreal_chondro_expanded_shop_seed_v1";
const SPECIAL_IDS = new Set(["SPECIAL-CYCLOPS-A++-RED-M", "SPECIAL-CYCLOPS-A++-RED-F"]);

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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ordinaryTrait(random: () => number) {
  const r = random();
  if (r < 0.48) return 0;
  if (r < 0.78) return 1 + Math.floor(random() * 10);
  if (r < 0.92) return 11 + Math.floor(random() * 15);
  if (r < 0.98) return 26 + Math.floor(random() * 25);
  if (r < 0.997) return 51 + Math.floor(random() * 25);
  return 76 + Math.floor(random() * 25);
}

function makeBaseSnake(id: string, locality: Locality, sex: Sex, neonateColor: "Red" | "Yellow", lifeStage: LifeStage, source: "Captive Bred" | "Import", random: () => number): Snake {
  const subspecies = localitySubspecies[locality];
  const geneticsTested = random() < 0.22;
  return {
    id,
    name: `${locality} ${source === "Import" ? "Import" : "CB"}`,
    sex,
    source,
    subspecies,
    locality,
    neonateColor,
    lifeStage,
    highBlack: ordinaryTrait(random),
    highWhite: ordinaryTrait(random),
    blueStripe: ordinaryTrait(random),
    yellowRetention: ordinaryTrait(random),
    blotches: ordinaryTrait(random),
    geneticsTested,
    phenotypeScore: 66 + Math.floor(random() * 35),
    localityAncestry: { [locality]: 100 },
    body: subspecies,
    tail: subspecies === "Morelia azurea utaraensis" ? "Matching body color and pattern" : "Black-dipped",
    eyes: subspecies,
    head: subspecies,
    pattern: locality,
    color: locality,
    nidoStatus: random() < 0.42 ? "Negative" : "Unknown",
    condition: source === "Import" ? "Fair" : "Good",
    classification: "Pure",
    generation: 1,
    parentIds: [],
    ancestry: { [subspecies]: 100 },
    notes: "",
    breederInitials: null,
  };
}

function priceSnake(snake: Snake) {
  const stage = snake.lifeStage === "Hatchling" ? 0.58 : snake.lifeStage === "Neonate" ? 0.76 : snake.lifeStage === "Subadult" ? 1 : 1.28;
  const traits = snake.highBlack + snake.highWhite + snake.blueStripe + snake.yellowRetention + snake.blotches;
  const testedPremium = snake.geneticsTested ? traits * 10 : 0;
  const phenotypePremium = Math.max(0, snake.phenotypeScore - 70) * 40;
  const value = (snake.source === "Import" ? 900 : 2050) + (snake.neonateColor === "Red" ? 600 : 0) + (snake.nidoStatus === "Negative" ? 425 : 0) + (snake.geneticsTested ? 350 : 0) + testedPremium + phenotypePremium;
  return Math.max(500, Math.round((value * stage) / 25) * 25);
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
    specialPhenotypeLabel: "A++ Cyclops phenotype",
    price: 5000,
    featured: true,
  };
}

function buildOffers(seed: number): Offer[] {
  const random = rng(seed * 7919 + 20260908);
  const stages: LifeStage[] = ["Hatchling", "Neonate", "Subadult", "Adult"];
  const randomOffers: Offer[] = Array.from({ length: 18 }, (_, index) => {
    const locality = localities[Math.floor(random() * localities.length)];
    const sex: Sex = random() < 0.5 ? "Male" : "Female";
    const color: "Red" | "Yellow" = random() < 0.4 ? "Red" : "Yellow";
    const source: "Captive Bred" | "Import" = random() < 0.57 ? "Captive Bred" : "Import";
    const stage = stages[Math.floor(random() * stages.length)];
    const snake = makeBaseSnake(`EXPANDED-${seed}-${index}`, locality, sex, color, stage, source, random);
    return { ...snake, price: priceSnake(snake) };
  });
  return [specialCyclops("Male"), specialCyclops("Female"), ...randomOffers];
}

function parseSave(value: unknown): GameSave | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const save = value as Partial<GameSave>;
  if (typeof save.cash !== "number" || !Array.isArray(save.colony) || !save.enclosures) return null;
  return save as GameSave;
}

export function ChondroBreederExpandedShop() {
  const [save, setSave] = useState<GameSave | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [seed, setSeed] = useState(1);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const storedSeed = Number(window.localStorage.getItem(SHOP_SEED_KEY) || "1");
    setSeed(Number.isFinite(storedSeed) && storedSeed > 0 ? storedSeed : 1);

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
          if (cloud) window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(cloud));
          return;
        }
      } catch {}
      if (!cancelled) setSave(local);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const decorate = () => {
      for (const node of document.querySelectorAll<HTMLElement>("article, [role='dialog']")) {
        const text = node.textContent || "";
        if (![...SPECIAL_IDS].some((id) => text.includes(id))) continue;
        for (const badge of node.querySelectorAll<HTMLElement>("span")) {
          if (badge.textContent?.trim() === "A+ Cyclops phenotype") badge.textContent = "A++ Cyclops phenotype";
        }
      }
    };
    decorate();
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const offers = useMemo(() => buildOffers(seed), [seed]);
  const purchased = new Set(save?.purchasedStoreIds ?? []);
  const capacity = Object.values(save?.enclosures ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const openSlots = Math.max(0, capacity - (save?.colony.length ?? 0));
  const pageSize = 5;
  const pageCount = Math.ceil(offers.length / pageSize);
  const visible = offers.slice(page * pageSize, page * pageSize + pageSize);

  function refreshShop() {
    const next = seed + 1;
    setSeed(next);
    setPage(0);
    window.localStorage.setItem(SHOP_SEED_KEY, String(next));
    setStatus("Shop refreshed. The two featured Cyclops remain reserved in the lineup until purchased.");
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
      setStatus(`${offer.name} joined your colony. Reloading the game state…`);
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      setStatus("That purchase could not be saved. Nothing was intentionally removed from your game.");
    } finally {
      setBusy(null);
    }
  }

  if (!save) return null;

  return (
    <section className="mx-auto mt-6 max-w-7xl px-5 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border border-sky-300/10 bg-sky-300/[.02]">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-sky-100/45">Expanded snake shop</div>
            <div className="mt-2 text-xl font-semibold text-white/80">20 snakes available</div>
            <div className="mt-1 text-xs text-white/34">5 at a time · {openSlots} colony space{openSlots === 1 ? "" : "s"} open · cash {money(save.cash)}</div>
          </div>
          <div className="rounded-full border border-white/[.08] px-3 py-2 text-xs font-bold text-white/45">{open ? "Collapse ▴" : "Open shop ▾"}</div>
        </button>

        {open ? (
          <div className="border-t border-white/[.06] p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs leading-5 text-white/34">The random lineup can be refreshed whenever you want. Featured animals remain until your save records them as purchased.</div>
              <button type="button" onClick={refreshShop} className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-2 text-xs font-black text-sky-100/70">Refresh shop</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {visible.map((offer) => {
                const sold = purchased.has(offer.id);
                return (
                  <article key={offer.id} className={`rounded-3xl border p-4 ${offer.featured ? "border-amber-200/25 bg-amber-200/[.035]" : "border-white/[.06] bg-white/[.015]"}`}>
                    <ChondroSnakeIcon subspecies={offer.subspecies} name={offer.name} traits={{ highBlack: offer.highBlack, highWhite: offer.highWhite, blueStripe: offer.blueStripe, yellowRetention: offer.yellowRetention, blotches: offer.blotches }} compact />
                    <div className="mt-3 font-semibold text-white/75">{offer.name}</div>
                    <div className="mt-1 text-[10px] text-white/30">{offer.id}</div>
                    <div className="mt-2 text-[10px] text-white/40">{offer.sex} · {offer.lifeStage} · {offer.locality} · {offer.neonateColor} neonate</div>
                    {offer.specialPhenotypeLabel ? <div className="mt-2 inline-flex rounded-full border border-amber-200/20 bg-amber-200/[.04] px-2.5 py-1 text-[9px] font-black text-amber-100/75">{offer.specialPhenotypeLabel}</div> : <div className="mt-2 text-[10px] text-amber-100/50">Phenotype score {offer.phenotypeScore}</div>}
                    <div className="mt-3 rounded-xl border border-white/[.06] p-3 text-[10px] leading-5 text-white/40">
                      {offer.geneticsTested ? <>HB {offer.highBlack}% · HW {offer.highWhite}% · Blue {offer.blueStripe}% · Yellow {offer.yellowRetention}% · Blotches {offer.blotches}%</> : <>Genetics untested · exact percentages hidden</>}
                    </div>
                    <div className="mt-2 text-[10px] text-white/35">Nido: <span className={offer.nidoStatus === "Negative" ? "text-emerald-200/70" : "text-white/45"}>{offer.nidoStatus}</span></div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="font-semibold text-emerald-200/75">{money(offer.price)}</div>
                      <button type="button" disabled={sold || busy !== null || openSlots <= 0 || save.cash < offer.price} onClick={() => void buy(offer)} className="rounded-xl bg-amber-200 px-3 py-2 text-[10px] font-black text-[#17130a] disabled:opacity-30">{sold ? "Purchased" : openSlots <= 0 ? "Need space" : save.cash < offer.price ? "Need cash" : busy === offer.id ? "Buying…" : "Buy"}</button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setPage((value) => (value - 1 + pageCount) % pageCount)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">← Previous 5</button>
              <div className="text-xs text-white/30">Page {page + 1} of {pageCount}</div>
              <button type="button" onClick={() => setPage((value) => (value + 1) % pageCount)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">Next 5 →</button>
            </div>
            {status ? <div role="status" className="mt-4 rounded-xl border border-sky-300/10 bg-sky-300/[.025] p-3 text-xs text-sky-100/60">{status}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
