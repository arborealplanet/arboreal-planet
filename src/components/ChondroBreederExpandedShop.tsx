"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";
import { animalHousingCapacity, enclosureFootprint, roomCapacityFromSave } from "@/lib/chondro-facility-limits";

type Sex = "Male" | "Female";
type Locality = "Biak" | "Numfor" | "Manokwari" | "Arfak" | "Sorong" | "Timika" | "Kofiau" | "Cyclops" | "Jayapura" | "Lereh" | "Wamena" | "Yapen" | "Aru" | "Merauke";
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

type Offer = Snake & { price: number; featured?: boolean; specialLabel?: string };
type EnclosureType = "Chondro Dojo Bin" | "PVC Arboreal";
type GameSave = { cash: number; colony: Snake[]; enclosures: Record<string, number>; facilityRooms?: Record<string, number>; purchasedStoreIds?: string[]; [key: string]: unknown };

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const SHOP_SEED_KEY = "arboreal_chondro_expanded_shop_seed_v2";
const SHOP_REFRESH_AT_KEY = "arboreal_chondro_expanded_shop_refresh_at_v1";
const SHOP_REFRESH_MS = 24 * 60 * 60 * 1000;
// Legacy compatibility marker retained for the Chondro prebuild guard.
// Standalone Repti-Shop purchases now persist directly instead of relying on
// the old arboreal-chondro-enclosure-action event listener.
const enclosurePrices: Record<EnclosureType, number> = { "Chondro Dojo Bin": 250, "PVC Arboreal": 650 };
const enclosureDisplay: Record<EnclosureType, { label: string; detail: string }> = {
  "Chondro Dojo Bin": { label: "Chondro Dojo 2 Stack", detail: "Two space-saving neonate enclosures sold as one stack. The stack uses one facility slot and provides two neonate spaces." },
  "PVC Arboreal": { label: "PVC Arboreal Enclosure", detail: "Permanent front-opening arboreal housing required for adult Green Tree Pythons and older Emerald Tree Boas." },
};
const subspeciesList: Subspecies[] = ["Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis"];
const localitiesBySubspecies: Record<Subspecies, Locality[]> = {
  "Morelia azurea azurea": ["Biak", "Numfor"],
  "Morelia azurea pulcher": ["Manokwari", "Arfak", "Sorong", "Timika", "Kofiau"],
  "Morelia azurea utaraensis": ["Cyclops", "Jayapura", "Lereh", "Wamena", "Yapen"],
  "Morelia viridis": ["Aru", "Merauke"],
};

type SpriteQaItem = {
  id: string;
  label: string;
  detail: string;
  subspecies: Subspecies;
  locality?: string;
  neonateColor: "Red" | "Yellow";
  lifeStage: LifeStage;
  classification: "Pure" | "Hybrid" | "Designer";
  ancestry?: Partial<Record<Subspecies, number>>;
  localityAncestry?: Record<string, number>;
  phenotypeScore?: number;
  spriteSeed: string;
};

const spriteQaPureLocalities: Array<{
  locality: Locality;
  subspecies: Subspecies;
  colors: Array<"Red" | "Yellow">;
}> = [
  { locality: "Biak", subspecies: "Morelia azurea azurea", colors: ["Red", "Yellow"] },
  { locality: "Numfor", subspecies: "Morelia azurea azurea", colors: ["Red", "Yellow"] },
  { locality: "Manokwari", subspecies: "Morelia azurea pulcher", colors: ["Red", "Yellow"] },
  { locality: "Arfak", subspecies: "Morelia azurea pulcher", colors: ["Red", "Yellow"] },
  { locality: "Sorong", subspecies: "Morelia azurea pulcher", colors: ["Red", "Yellow"] },
  { locality: "Timika", subspecies: "Morelia azurea pulcher", colors: ["Red", "Yellow"] },
  { locality: "Kofiau", subspecies: "Morelia azurea pulcher", colors: ["Yellow"] },
  { locality: "Cyclops", subspecies: "Morelia azurea utaraensis", colors: ["Red", "Yellow"] },
  { locality: "Jayapura", subspecies: "Morelia azurea utaraensis", colors: ["Red", "Yellow"] },
  { locality: "Lereh", subspecies: "Morelia azurea utaraensis", colors: ["Red", "Yellow"] },
  { locality: "Wamena", subspecies: "Morelia azurea utaraensis", colors: ["Red", "Yellow"] },
  { locality: "Yapen", subspecies: "Morelia azurea utaraensis", colors: ["Red", "Yellow"] },
  { locality: "Aru", subspecies: "Morelia viridis", colors: ["Yellow"] },
  { locality: "Merauke", subspecies: "Morelia viridis", colors: ["Yellow"] },
];

const spriteQaItems: SpriteQaItem[] = [
  ...spriteQaPureLocalities.flatMap(({ locality, subspecies, colors }) =>
    colors.flatMap((neonateColor) =>
      (["Neonate", "Adult"] as LifeStage[]).map((lifeStage) => ({
        id: `qa-pure-${locality.toLowerCase()}-${neonateColor.toLowerCase()}-${lifeStage.toLowerCase()}`,
        label: `${locality} · ${neonateColor}`,
        detail: lifeStage === "Neonate" ? "Juvenile · Hatchling / Neonate" : "Adult · Subadult / Adult",
        subspecies,
        locality,
        neonateColor,
        lifeStage,
        classification: "Pure" as const,
        localityAncestry: { [locality]: 100 },
        ancestry: { [subspecies]: 100 },
        spriteSeed: `qa-pure-${locality}-${neonateColor}-${lifeStage}`,
      })),
    ),
  ),
  {
    id: "qa-manokwari-aplus-1",
    label: "Manokwari · Red A+ #1",
    detail: "Special adult phenotype variant",
    subspecies: "Morelia azurea pulcher",
    locality: "Manokwari",
    neonateColor: "Red",
    lifeStage: "Adult",
    classification: "Pure",
    localityAncestry: { Manokwari: 100 },
    ancestry: { "Morelia azurea pulcher": 100 },
    phenotypeScore: 95,
    spriteSeed: "manokwari-a-plus-variant-1",
  },
  {
    id: "qa-manokwari-aplus-2",
    label: "Manokwari · Red A+ #2",
    detail: "Special adult phenotype variant",
    subspecies: "Morelia azurea pulcher",
    locality: "Manokwari",
    neonateColor: "Red",
    lifeStage: "Adult",
    classification: "Pure",
    localityAncestry: { Manokwari: 100 },
    ancestry: { "Morelia azurea pulcher": 100 },
    phenotypeScore: 95,
    spriteSeed: "manokwari-a-plus-variant-2",
  },
  {
    id: "qa-sorong-aplus-yellow",
    label: "Sorong · Yellow A+",
    detail: "Special adult phenotype variant",
    subspecies: "Morelia azurea pulcher",
    locality: "Sorong",
    neonateColor: "Yellow",
    lifeStage: "Adult",
    classification: "Pure",
    localityAncestry: { Sorong: 100 },
    ancestry: { "Morelia azurea pulcher": 100 },
    phenotypeScore: 95,
    spriteSeed: "qa-sorong-a-plus",
  },
  {
    id: "qa-designer-red-juvenile",
    label: "Designer · Red",
    detail: "Juvenile designer pool",
    subspecies: "Morelia azurea pulcher",
    neonateColor: "Red",
    lifeStage: "Neonate",
    classification: "Designer",
    spriteSeed: "qa-designer-red-juvenile",
  },
  {
    id: "qa-designer-adult",
    label: "Designer · Adult",
    detail: "Adult designer pool",
    subspecies: "Morelia azurea pulcher",
    neonateColor: "Yellow",
    lifeStage: "Adult",
    classification: "Designer",
    spriteSeed: "qa-designer-adult",
  },
  {
    id: "qa-pulcher-utaraensis-red",
    label: "Pulcher × Utaraensis · Red",
    detail: "Hybrid juvenile",
    subspecies: "Morelia azurea pulcher",
    locality: "Mixed Locality",
    neonateColor: "Red",
    lifeStage: "Neonate",
    classification: "Hybrid",
    ancestry: { "Morelia azurea pulcher": 50, "Morelia azurea utaraensis": 50 },
    spriteSeed: "qa-pulcher-utaraensis-red",
  },
  {
    id: "qa-pulcher-utaraensis-yellow",
    label: "Pulcher × Utaraensis · Yellow",
    detail: "Hybrid juvenile",
    subspecies: "Morelia azurea pulcher",
    locality: "Mixed Locality",
    neonateColor: "Yellow",
    lifeStage: "Neonate",
    classification: "Hybrid",
    ancestry: { "Morelia azurea pulcher": 50, "Morelia azurea utaraensis": 50 },
    spriteSeed: "qa-pulcher-utaraensis-yellow",
  },
  {
    id: "qa-wamena-aru-red",
    label: "Wamena × Aru · Red",
    detail: "Exact hybrid juvenile",
    subspecies: "Morelia azurea utaraensis",
    locality: "Mixed Locality",
    neonateColor: "Red",
    lifeStage: "Neonate",
    classification: "Hybrid",
    ancestry: { "Morelia azurea utaraensis": 50, "Morelia viridis": 50 },
    localityAncestry: { Wamena: 50, Aru: 50 },
    spriteSeed: "qa-wamena-aru-red",
  },
  {
    id: "qa-wamena-merauke-red",
    label: "Wamena × Merauke · Red",
    detail: "Exact hybrid juvenile",
    subspecies: "Morelia azurea utaraensis",
    locality: "Mixed Locality",
    neonateColor: "Red",
    lifeStage: "Neonate",
    classification: "Hybrid",
    ancestry: { "Morelia azurea utaraensis": 50, "Morelia viridis": 50 },
    localityAncestry: { Wamena: 50, Merauke: 50 },
    spriteSeed: "qa-wamena-merauke-red",
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
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
  if (roll < 0.5) return 0;
  if (roll < 0.79) return 1 + Math.floor(random() * 10);
  if (roll < 0.93) return 11 + Math.floor(random() * 15);
  if (roll < 0.98) return 26 + Math.floor(random() * 25);
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
  const source: Snake["source"] = random() < 0.6 ? "Captive Bred" : "Import";
  const subspecies = chooseSubspecies(random, source, effects);
  const localities = localitiesBySubspecies[subspecies];
  const locality = localities[Math.floor(random() * localities.length)];
  const sex: Sex = random() < 0.5 ? "Male" : "Female";
  const neonateColor: "Red" | "Yellow" =
    subspecies === "Morelia viridis" || locality === "Kofiau"
      ? "Yellow"
      : random() < 0.4
        ? "Red"
        : "Yellow";
  const stages: LifeStage[] = ["Hatchling", "Neonate", "Subadult", "Adult"];
  const lifeStage = stages[Math.floor(random() * stages.length)];
  const geneticsTested = random() < 0.22;
  const nidoStatus: Snake["nidoStatus"] = random() < 0.42 ? "Negative" : "Unknown";
  const conservationBonus = source === "Import" ? Number(effects.get(subspecies)?.phenotype_bonus ?? 0) : 0;
  const phenotypeScore = Math.min(100, 66 + Math.floor(random() * 35) + conservationBonus);
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

function makeStarterSave(): GameSave {
  return {
    started: false,
    cash: 30000,
    colony: [],
    tested: [],
    damId: "",
    sireId: "",
    clutch: null,
    clutchHistory: [],
    holdbacks: [],
    season: 1,
    sales: [],
    transfers: [],
    enclosures: {
      "Chondro Dojo Bin": 0,
      "PVC Arboreal": 0,
    },
    purchasedStoreIds: [],
    careerReputation: 0,
    facilityRooms: { "starter-room": 1 },
    facilityConstruction: null,
    breedingCycle: null,
    geneticTestsPending: [],
    femaleRecovery: {},
    seasonCarePaid: 0,
    breedingMessage: "",
    clutchEstablished: false,
    updatedAt: Date.now(),
  };
}

async function persistStandaloneShopSave(save: GameSave, authenticated: boolean) {
  const persisted = { ...save, updatedAt: Date.now() };
  window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(persisted));
  window.dispatchEvent(new Event("arboreal-chondro-breeder-save-change"));
  if (!authenticated) return;
  const response = await fetch("/api/hatchery/chondro-breeder/save", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(persisted),
  });
  if (!response.ok) throw new Error("save failed");
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
    if (!Number.isFinite(storedRefreshAt) || storedRefreshAt <= 0) {
      storedRefreshAt = current + SHOP_REFRESH_MS;
    } else if (current >= storedRefreshAt) {
      const rotations = Math.floor((current - storedRefreshAt) / SHOP_REFRESH_MS) + 1;
      storedSeed += rotations;
      storedRefreshAt += rotations * SHOP_REFRESH_MS;
    }

    window.localStorage.setItem(SHOP_SEED_KEY, String(storedSeed));
    window.localStorage.setItem(SHOP_REFRESH_AT_KEY, String(storedRefreshAt));
    window.setTimeout(() => {
      setSeed(storedSeed);
      setRefreshAt(storedRefreshAt);
      setNow(current);
    }, 0);

    const rotationTimer = window.setInterval(() => {
      const tickNow = Date.now();
      setNow(tickNow);
      let deadline = Number(window.localStorage.getItem(SHOP_REFRESH_AT_KEY) || "0");
      let currentSeed = Number(window.localStorage.getItem(SHOP_SEED_KEY) || "1");
      if (!Number.isFinite(currentSeed) || currentSeed < 1) currentSeed = 1;
      if (!Number.isFinite(deadline) || deadline <= 0) {
        deadline = tickNow + SHOP_REFRESH_MS;
        window.localStorage.setItem(SHOP_REFRESH_AT_KEY, String(deadline));
        setRefreshAt(deadline);
        return;
      }
      if (tickNow < deadline) {
        setRefreshAt(deadline);
        return;
      }
      const rotations = Math.floor((tickNow - deadline) / SHOP_REFRESH_MS) + 1;
      const nextSeed = currentSeed + rotations;
      const nextDeadline = deadline + rotations * SHOP_REFRESH_MS;
      window.localStorage.setItem(SHOP_SEED_KEY, String(nextSeed));
      window.localStorage.setItem(SHOP_REFRESH_AT_KEY, String(nextDeadline));
      setSeed(nextSeed);
      setRefreshAt(nextDeadline);
      setStatus("The daily shop refreshed automatically. A new set of listings is available.");
    }, 1000);

    let cancelled = false;
    async function load() {
      let local: GameSave | null = null;
      try { local = parseSave(JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) || "null")); } catch {}
      try {
        const [saveResponse, conservationResponse] = await Promise.all([
          fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" }),
          fetch("/api/hatchery/chondro-breeder/conservation", { cache: "no-store" }),
        ]);
        const saveData = await saveResponse.json();
        if (!cancelled && saveResponse.ok) {
          const isAuthenticated = Boolean(saveData.authenticated);
          const cloud = parseSave(saveData.save?.state);
          const resolved = cloud ?? local ?? makeStarterSave();
          setAuthenticated(isAuthenticated);
          setSave(resolved);
          if (!cloud && !local) {
            try {
              await persistStandaloneShopSave(resolved, isAuthenticated);
            } catch {
              // Keep the locally initialized starter save usable even if cloud persistence is temporarily unavailable.
            }
          }
        } else if (!cancelled) {
          const resolved = local ?? makeStarterSave();
          setSave(resolved);
          if (!local) {
            try {
              await persistStandaloneShopSave(resolved, false);
            } catch {}
          }
        }
        if (!cancelled && conservationResponse.ok) {
          const conservationData = await conservationResponse.json() as { status?: ConservationRow[] };
          setConservation(conservationData.status ?? []);
        }
        return;
      } catch {}
      if (!cancelled) {
        const resolved = local ?? makeStarterSave();
        setSave(resolved);
        if (!local) {
          try {
            await persistStandaloneShopSave(resolved, false);
          } catch {}
        }
      }
    }

    void load();
    const dataTimer = window.setInterval(load, 5000);
    const onConservation = () => void load();
    const onSaveChange = () => void load();
    window.addEventListener("chondro-conservation-updated", onConservation);
    window.addEventListener("arboreal-chondro-breeder-save-change", onSaveChange);
    return () => {
      cancelled = true;
      window.clearInterval(rotationTimer);
      window.clearInterval(dataTimer);
      window.removeEventListener("chondro-conservation-updated", onConservation);
      window.removeEventListener("arboreal-chondro-breeder-save-change", onSaveChange);
    };
  }, []);

  const offers = useMemo(() => buildOffers(seed, conservation), [seed, conservation]);
  const purchased = useMemo(() => new Set(save?.purchasedStoreIds ?? []), [save?.purchasedStoreIds]);
  const installedFootprint = enclosureFootprint(save?.enclosures);
  const capacity = animalHousingCapacity(save?.enclosures);
  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms: save?.facilityRooms });
  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - installedFootprint);
  const colony = save?.colony ?? [];
  const dojoCapacity = Math.max(0, Number(save?.enclosures?.["Chondro Dojo Bin"] ?? 0) || 0) * 2;
  const pvcCapacity = Math.max(0, Number(save?.enclosures?.["PVC Arboreal"] ?? 0) || 0);
  const olderAnimals = colony.filter((animal) => animal.lifeStage === "Adult").length;
  const juvenileAnimals = Math.max(0, colony.length - olderAnimals);
  const pvcAfterRequiredOlderHousing = Math.max(0, pvcCapacity - olderAnimals);
  const juvenilesInDojo = Math.min(juvenileAnimals, dojoCapacity);
  const juvenilesNeedingPvc = Math.max(0, juvenileAnimals - juvenilesInDojo);
  const openPvcSlots = Math.max(0, pvcAfterRequiredOlderHousing - juvenilesNeedingPvc);
  const openDojoSlots = Math.max(0, dojoCapacity - juvenilesInDojo);
  const openSlots = openDojoSlots + openPvcSlots;

  function housingAvailableFor(offer: Offer) {
    if (offer.lifeStage === "Adult") return openPvcSlots > 0;
    return openSlots > 0;
  }

  const refreshRemaining = refreshAt > 0 && now > 0 ? Math.max(0, refreshAt - now) : SHOP_REFRESH_MS;

  async function buyEnclosure(type: EnclosureType) {
    if (!save || busy || roomEnclosureSlots <= 0 || save.cash < enclosurePrices[type]) return;
    const price = enclosurePrices[type];
    const next: GameSave = {
      ...save,
      cash: save.cash - price,
      enclosures: {
        ...save.enclosures,
        [type]: Number(save.enclosures?.[type] ?? 0) + 1,
      },
    };
    setBusy(`enclosure:${type}`);
    setStatus(`Buying ${type}…`);
    try {
      await persistStandaloneShopSave(next, authenticated);
      setSave(next);
      setStatus(`${type} purchased. Your snake capacity increased by ${type === "Chondro Dojo Bin" ? 2 : 1}.`);
    } catch {
      setStatus("That enclosure purchase could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function buy(offer: Offer) {
    if (!save || busy || purchased.has(offer.id) || !housingAvailableFor(offer) || save.cash < offer.price) return;
    setBusy(offer.id);
    setStatus("");
    const next: GameSave = {
      ...save,
      cash: save.cash - offer.price,
      colony: [...save.colony, offer],
      purchasedStoreIds: [...(save.purchasedStoreIds ?? []), offer.id],
    };
    try {
      await persistStandaloneShopSave(next, authenticated);
      setSave(next);
      setStatus(`${offer.name} purchased. It is now in your colony.`);
    } catch {
      setStatus("That purchase could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  if (!save) {
    return <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6"><div className="rounded-[24px] border border-white/[.06] bg-white/[.02] p-5 text-sm text-white/40">Loading snake store…</div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
      <section className="mb-4 overflow-hidden rounded-[26px] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,.09),transparent_44%),#07110d] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-44 w-32 shrink-0 sm:h-56 sm:w-40">
            <Image src="/branding/shopkeeper-bunn-portrait.png" alt="Bunn, the Arboreal Keeper shopkeeper, holding a green tree python" fill sizes="(max-width: 640px) 128px, 160px" className="object-contain object-bottom" />
          </div>
          <div className="min-w-0 flex-1 basis-64">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-100/55">Shopkeeper</div>
            <h3 className="mt-2 text-xl font-semibold text-white/85">Howdy! Bunn here.</h3>
            <p className="mt-1 max-w-xl text-xs leading-5 text-white/40">Buy your housing before your snakes — every chondro needs a home. The Dojo 2 Stack is where the neonates start out.</p>
          </div>
        </div>
      </section>
      <section className="mb-4 overflow-hidden rounded-[26px] border border-violet-300/15 bg-[radial-gradient(circle_at_top_left,rgba(196,181,253,.08),transparent_38%),#0a0810] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-100/60">Sprite QA · All game animals</div>
            <h3 className="mt-2 text-xl font-semibold text-white/82">Check every sprite slot in one place.</h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/40">This strip is for artwork review only; these cards are not store listings. Juvenile cards verify the shared Hatchling/Neonate art. Adult cards verify the shared Subadult/Adult art. Any unresolved slot will say Sprite pending instead of borrowing unrelated artwork.</p>
          </div>
          <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.04] px-4 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.14em] text-violet-100/45">QA slots</div>
            <div className="mt-1 text-sm font-black text-violet-100/80">{spriteQaItems.length}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-white/32">
          <span>Swipe horizontally to inspect every registered or pending sprite slot.</span>
          <span>Pure · Hybrid · Designer · Specials</span>
        </div>

        <div
          aria-label="Sprite QA carousel"
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(196,181,253,.28)_transparent]"
        >
          {spriteQaItems.map((item) => (
            <article key={item.id} className="w-[78%] shrink-0 snap-start rounded-2xl border border-white/[.065] bg-black/15 p-3 sm:w-[260px]">
              <ChondroSnakeIcon
                subspecies={item.subspecies}
                name={item.label}
                lifeStage={item.lifeStage}
                neonateColor={item.neonateColor}
                locality={item.locality}
                classification={item.classification}
                ancestry={item.ancestry}
                localityAncestry={item.localityAncestry}
                phenotypeScore={item.phenotypeScore}
                spriteSeed={item.spriteSeed}
                compact
              />
              <div className="mt-3 text-sm font-semibold text-white/78">{item.label}</div>
              <div className="mt-1 text-[10px] leading-4 text-white/36">{item.detail}</div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-[.1em]">
                <span className="rounded-full border border-white/[.07] px-2 py-1 text-white/45">{item.classification}</span>
                <span className={`rounded-full border px-2 py-1 ${item.neonateColor === "Red" ? "border-red-200/15 text-red-100/60" : "border-amber-100/15 text-amber-100/60"}`}>{item.neonateColor}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-[26px] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.08),transparent_38%),#07110d] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-100/55">Enclosures</div>
            <h3 className="mt-2 text-xl font-semibold text-white/80">Buy housing before you buy snakes.</h3>
            <p className="mt-1 text-xs leading-5 text-white/38">A PVC enclosure uses one facility slot for one snake and is required for adult Green Tree Pythons. A Chondro Dojo 2 Stack uses one facility slot and can house neonate or subadult Green Tree Pythons. Your facility currently has {roomEnclosureSlots} installation slot{roomEnclosureSlots === 1 ? "" : "s"} open.</p>
          </div>
          <div className="rounded-xl border border-white/[.07] bg-black/15 px-4 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/32">Animal capacity</div>
            <div className="mt-1 text-sm font-black text-emerald-100/72">{capacity} total · {openSlots} open</div>
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
                  {type === "Chondro Dojo Bin" ? (
                    <Image src="/hatchery/game/pvc-enclosure.webp" alt="Illustrated Chondro Dojo enclosure with white PVC perches" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-[center_64%] opacity-90" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(110,231,183,.10),transparent_42%),#07100c] p-5" aria-label="PVC arboreal enclosure diagram">
                      <div className="relative h-[82%] w-[62%] rounded-xl border-2 border-white/35 bg-white/[.035] shadow-[inset_0_0_0_4px_rgba(255,255,255,.025)]">
                        <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/15" />
                        <div className="absolute left-[12%] right-[12%] top-[34%] h-2 rounded-full bg-white/55" />
                        <div className="absolute left-[18%] right-[18%] top-[58%] h-2 rounded-full bg-white/45" />
                        <div className="absolute bottom-[9%] right-[10%] h-6 w-10 rounded-t-full border border-sky-100/30 bg-sky-100/10" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10">
                    <div className="text-lg font-semibold text-white">{enclosureDisplay[type].label}</div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="mb-3 text-[11px] leading-5 text-white/38">{enclosureDisplay[type].detail}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.12em] text-white/30">Owned</div>
                      <div className="mt-1 text-sm font-semibold text-white/70">{owned} owned · {type === "Chondro Dojo Bin" ? "+2 snake capacity per set" : "+1 snake capacity each"}</div>
                    </div>
                    <div className="text-lg font-semibold text-emerald-200/78">{money(price)}</div>
                  </div>
                  <button type="button" disabled={unavailable} onClick={() => buyEnclosure(type)} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-[#06100c] disabled:opacity-30">
                    {roomEnclosureSlots <= 0 ? "Need another facility room" : save.cash < price ? `Need ${money(price)}` : busy === `enclosure:${type}` ? "Installing…" : `Buy ${enclosureDisplay[type].label}`}
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
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-sky-100/55">Expanded daily listings</div>
            <h3 className="mt-2 text-xl font-semibold text-white/80">20 snakes available now</h3>
            <p className="mt-1 text-xs text-white/35">Swipe left or right through the full store. Three snake cards display together when the screen has enough room.</p>
          </div>
          <div className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-4 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.14em] text-sky-100/45">Next shop refresh</div>
            <div className="mt-1 tabular-nums text-sm font-black text-sky-100/80">{formatCountdown(refreshRemaining)}</div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/[.055] bg-black/10 px-3 py-2 text-[10px] leading-5 text-white/38">
          Inventory rotates automatically every 24 hours. Closing the game does not reset the timer; overdue rotations are applied when you return.
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-white/32">
          <span>Swipe to browse all {offers.length} listings</span>
          <span>{openSlots} open animal space{openSlots === 1 ? "" : "s"} · {openPvcSlots} adult-ready · cash {money(save.cash)}</span>
        </div>

        <div
          aria-label="Scrollable snake store listings"
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(125,211,252,.28)_transparent]"
        >
          {offers.map((offer) => {
            const sold = purchased.has(offer.id);
            const effect = conservation.find((row) => row.subspecies === offer.subspecies);
            return (
              <article
                key={offer.id}
                className={`w-[82%] shrink-0 snap-start rounded-2xl border p-3 sm:w-[48%] lg:w-[calc((100%-1.5rem)/3)] ${offer.featured ? "border-amber-200/25 bg-amber-200/[.035]" : "border-white/[.06] bg-black/10"}`}
              >
                <ChondroSnakeIcon
                  subspecies={offer.subspecies}
                  name={offer.name}
                  traits={{ highBlack: offer.highBlack, highWhite: offer.highWhite, blueStripe: offer.blueStripe, yellowRetention: offer.yellowRetention, blotches: offer.blotches }}
                  lifeStage={offer.lifeStage}
                  neonateColor={offer.neonateColor}
                  locality={offer.locality}
                  classification={offer.classification}
                  ancestry={offer.ancestry}
                  localityAncestry={offer.localityAncestry}
                  phenotypeScore={offer.phenotypeScore}
                  spriteSeed={offer.id}
                  compact
                />
                <div className="mt-3 font-semibold text-white/75">{offer.name}</div>
                <div className="mt-1 text-[10px] text-white/32">{offer.sex} · {offer.lifeStage} · {offer.locality}</div>
                <div className={`mt-1 text-[10px] font-semibold ${offer.neonateColor === "Red" ? "text-red-100/65" : "text-amber-100/65"}`}>Neonate color: {offer.neonateColor}</div>
                {offer.specialLabel ? <div className="mt-2 rounded-full border border-amber-200/20 px-2 py-1 text-center text-[9px] font-black uppercase text-amber-100/75">{offer.specialLabel}</div> : null}
                {offer.source === "Import" && effect && Number(effect.stewardship_score) > 0 ? <div className="mt-2 text-[9px] font-semibold text-emerald-100/55">Conservation-supported import · stewardship {Number(effect.stewardship_score).toFixed(1)}</div> : null}
                <div className="mt-3 rounded-xl border border-white/[.06] p-2 text-[10px] leading-5 text-white/42">
                  {offer.geneticsTested ? `HB ${offer.highBlack}% · HW ${offer.highWhite}% · Blue ${offer.blueStripe}% · Yellow ${offer.yellowRetention}%` : "Genetics untested · percentages hidden"}<br />
                  Nido: <span className={offer.nidoStatus === "Negative" ? "text-emerald-200/70" : "text-white/45"}>{offer.nidoStatus}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-200/75">{money(offer.price)}</span>
                  <button type="button" disabled={sold || busy !== null || save.cash < offer.price || !housingAvailableFor(offer)} onClick={() => void buy(offer)} className="rounded-lg bg-amber-200 px-3 py-2 text-[10px] font-black text-[#17130a] disabled:opacity-30">
                    {sold ? "Purchased" : !housingAvailableFor(offer) ? (offer.lifeStage === "Adult" ? "Need PVC" : "Need space") : "Buy"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {status ? <div role="status" className="mt-3 text-xs text-sky-100/65">{status}</div> : null}
      </section>
    </div>
  );
}
