"use client";

import { useMemo, useState } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";

type Subspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type Locality = "Biak" | "Numfor" | "Manokwari" | "Sorong" | "Timika" | "Cyclops" | "Jayapura" | "Lereh" | "Wamena" | "Aru" | "Merauke";
type Sex = "Male" | "Female";
type Source = "Captive Bred" | "Import";
type Classification = "Pure" | "Hybrid" | "Designer";
type NidoStatus = "Unknown" | "Negative" | "Positive";
type TraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention";

type Snake = {
  id: string;
  name: string;
  sex: Sex;
  source: Source;
  subspecies: Subspecies;
  locality: Locality | "Designer";
  neonateColor: "Red" | "Yellow";
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  body: string;
  tail: string;
  eyes: string;
  head: string;
  pattern: string;
  color: string;
  nidoStatus: NidoStatus;
  condition: "Excellent" | "Good" | "Fair";
  classification: Classification;
  generation: number;
  parentIds: string[];
  ancestry: Partial<Record<Subspecies, number>>;
};

type StarterPath = {
  id: "safe" | "importer" | "locality" | "opportunist";
  name: string;
  tagline: string;
  description: string;
  animals: Snake[];
  setupCost: number;
  enclosurePlan: string;
  risk: "Low" | "Moderate" | "High";
};

type Clutch = { id: string; dam: Snake; sire: Snake; offspring: Snake[] };
type Sale = { id: string; name: string; value: number; season: number };

const STARTING_CASH = 30000;
const NIDO_TEST_COST = 125;

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

function makeSnake(id: string, name: string, sex: Sex, source: Source, locality: Locality, neonateColor: "Red" | "Yellow", highBlack: number, highWhite: number, blueStripe: number, yellowRetention: number, condition: Snake["condition"] = "Good"): Snake {
  const subspecies = localitySubspecies[locality];
  return {
    id, name, sex, source, locality, subspecies, neonateColor,
    highBlack, highWhite, blueStripe, yellowRetention,
    body: subspecies,
    tail: subspecies === "Morelia azurea utaraensis" ? "Matching body color and pattern" : "Black-dipped",
    eyes: subspecies,
    head: subspecies,
    pattern: locality,
    color: locality,
    nidoStatus: "Unknown",
    condition,
    classification: "Pure",
    generation: 1,
    parentIds: [],
    ancestry: { [subspecies]: 100 },
  };
}

const starterPaths: StarterPath[] = [
  {
    id: "safe", name: "The Safe Start", tagline: "Cleaner stock. Fewer surprises.", risk: "Low",
    description: "Two captive-bred animals, a comfortable testing budget and a conservative enclosure plan.",
    setupCost: 8950, enclosurePlan: "4 Chondro Dojo bins · 2 quarantine bins · starter incubator",
    animals: [
      makeSnake("SAFE-F-01", "Manokwari F1", "Female", "Captive Bred", "Manokwari", "Red", 10, 4, 16, 28, "Excellent"),
      makeSnake("SAFE-M-01", "Sorong M1", "Male", "Captive Bred", "Sorong", "Yellow", 4, 2, 20, 18, "Excellent"),
    ],
  },
  {
    id: "importer", name: "The Importer", tagline: "More animals. More uncertainty.", risk: "High",
    description: "Four cheaper imports create more genetic opportunity, but also more health and quarantine pressure.",
    setupCost: 7800, enclosurePlan: "6 Chondro Dojo bins · 4 quarantine bins · starter incubator",
    animals: [
      makeSnake("IMP-F-01", "Biak Import", "Female", "Import", "Biak", "Red", 15, 4, 4, 22, "Fair"),
      makeSnake("IMP-M-01", "Cyclops Import", "Male", "Import", "Cyclops", "Yellow", 2, 8, 38, 5, "Good"),
      makeSnake("IMP-F-02", "Aru Import", "Female", "Import", "Aru", "Yellow", 1, 18, 24, 6, "Fair"),
      makeSnake("IMP-M-02", "Timika Import", "Male", "Import", "Timika", "Red", 9, 3, 14, 20, "Fair"),
    ],
  },
  {
    id: "locality", name: "The Locality Breeder", tagline: "Start focused and build a family.", risk: "Moderate",
    description: "A matched Cyclops pair with enough room to hold back the animals that move your project forward.",
    setupCost: 10150, enclosurePlan: "4 Chondro Dojo bins · 2 PVC display enclosures · 2 quarantine bins · starter incubator",
    animals: [
      makeSnake("LOC-F-01", "Cyclops F1", "Female", "Captive Bred", "Cyclops", "Yellow", 3, 10, 42, 4, "Excellent"),
      makeSnake("LOC-M-01", "Cyclops M1", "Male", "Captive Bred", "Cyclops", "Yellow", 5, 8, 48, 3, "Excellent"),
    ],
  },
  {
    id: "opportunist", name: "The Opportunist", tagline: "One known animal. One wildcard.", risk: "Moderate",
    description: "A quality captive-bred female, one cheaper import male, and more cash kept in reserve.",
    setupCost: 6900, enclosurePlan: "4 Chondro Dojo bins · 2 quarantine bins · starter incubator",
    animals: [
      makeSnake("OPP-F-01", "Aru F1", "Female", "Captive Bred", "Aru", "Yellow", 2, 20, 28, 5, "Excellent"),
      makeSnake("OPP-M-01", "Biak Import", "Male", "Import", "Biak", "Red", 17, 3, 5, 26, "Fair"),
    ],
  },
];

const traitRows: [string, TraitKey][] = [["High Black", "highBlack"], ["High White", "highWhite"], ["Blue Stripe", "blueStripe"], ["Yellow Retention", "yellowRetention"]];
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const pick = <T,>(a: T, b: T) => Math.random() < 0.5 ? a : b;

function inheritLineTrait(a: number, b: number) {
  const midpoint = (a + b) / 2;
  const ordinary = midpoint + (Math.random() + Math.random() - 1) * 18;
  const rareOutlier = Math.random() < 0.055 ? (Math.random() < 0.72 ? 10 + Math.random() * 12 : -(8 + Math.random() * 10)) : 0;
  const raw = ordinary + rareOutlier;
  const topResistance = raw > 85 ? (raw - 85) * 0.45 : 0;
  return clamp(raw - topResistance);
}

function combineAncestry(a: Snake, b: Snake) {
  const output: Partial<Record<Subspecies, number>> = {};
  const keys = Object.keys({ ...a.ancestry, ...b.ancestry }) as Subspecies[];
  for (const key of keys) output[key] = Math.round((((a.ancestry[key] ?? 0) + (b.ancestry[key] ?? 0)) / 2) * 10) / 10;
  return output;
}

function classifyPair(a: Snake, b: Snake): Classification {
  if (a.classification !== "Pure" || b.classification !== "Pure") return "Designer";
  return a.subspecies === b.subspecies ? "Pure" : "Hybrid";
}

function makeOffspring(dam: Snake, sire: Snake, clutchId: string, index: number): Snake {
  const classification = classifyPair(dam, sire);
  const ancestry = combineAncestry(dam, sire);
  const structuralParent = pick(dam, sire);
  const pureSameSubspecies = classification === "Pure" && dam.subspecies === sire.subspecies;
  const locality = pureSameSubspecies ? pick(dam.locality, sire.locality) : "Designer";
  return {
    id: `${clutchId}-${String(index + 1).padStart(2, "0")}`,
    name: `Hatchling ${index + 1}`,
    sex: Math.random() < 0.5 ? "Male" : "Female",
    source: "Captive Bred",
    subspecies: pureSameSubspecies ? dam.subspecies : structuralParent.subspecies,
    locality,
    neonateColor: pick(dam.neonateColor, sire.neonateColor),
    highBlack: inheritLineTrait(dam.highBlack, sire.highBlack),
    highWhite: inheritLineTrait(dam.highWhite, sire.highWhite),
    blueStripe: inheritLineTrait(dam.blueStripe, sire.blueStripe),
    yellowRetention: inheritLineTrait(dam.yellowRetention, sire.yellowRetention),
    body: pick(dam.body, sire.body),
    tail: pick(dam.tail, sire.tail),
    eyes: pick(dam.eyes, sire.eyes),
    head: pick(dam.head, sire.head),
    pattern: pick(dam.pattern, sire.pattern),
    color: pick(dam.color, sire.color),
    nidoStatus: "Unknown",
    condition: "Good",
    classification,
    generation: Math.max(dam.generation, sire.generation) + 1,
    parentIds: [dam.id, sire.id],
    ancestry,
  };
}

function createClutch(dam: Snake, sire: Snake): Clutch {
  const clutchId = `CL-${Date.now().toString(36).toUpperCase()}`;
  const size = 5 + Math.floor(Math.random() * 5);
  return { id: clutchId, dam, sire, offspring: Array.from({ length: size }, (_, i) => makeOffspring(dam, sire, clutchId, i)) };
}

function traitLabel(value: number) {
  if (value >= 85) return "Extreme";
  if (value >= 60) return "Strong";
  if (value >= 35) return "Moderate";
  if (value >= 15) return "Noticeable";
  return "Background";
}

function saleValue(animal: Snake) {
  const traits = [animal.highBlack, animal.highWhite, animal.blueStripe, animal.yellowRetention];
  const average = traits.reduce((sum, value) => sum + value, 0) / traits.length;
  const strongest = Math.max(...traits);
  const secondStrongest = [...traits].sort((a, b) => b - a)[1] ?? 0;
  let value = 325 + average * 13 + strongest * 19 + secondStrongest * 5;
  if (animal.classification === "Hybrid") value *= 1.08;
  if (animal.classification === "Designer") value *= 1.16;
  if (animal.generation >= 3) value *= 1 + Math.min(0.18, (animal.generation - 2) * 0.04);
  if (animal.condition === "Excellent") value *= 1.08;
  if (animal.condition === "Fair") value *= 0.82;
  if (animal.nidoStatus === "Negative") value *= 1.08;
  if (animal.nidoStatus === "Unknown") value *= 0.9;
  return Math.max(250, Math.round(value / 25) * 25);
}

export function ChondroBreederGame() {
  const [started, setStarted] = useState(false);
  const [selectedPath, setSelectedPath] = useState<StarterPath | null>(null);
  const [confirmedPath, setConfirmedPath] = useState<StarterPath | null>(null);
  const [colony, setColony] = useState<Snake[]>([]);
  const [tested, setTested] = useState<string[]>([]);
  const [damId, setDamId] = useState("");
  const [sireId, setSireId] = useState("");
  const [clutch, setClutch] = useState<Clutch | null>(null);
  const [holdbacks, setHoldbacks] = useState<string[]>([]);
  const [season, setSeason] = useState(1);
  const [sales, setSales] = useState<Sale[]>([]);

  const saleIncome = useMemo(() => sales.reduce((sum, sale) => sum + sale.value, 0), [sales]);
  const cash = useMemo(() => confirmedPath ? STARTING_CASH - confirmedPath.setupCost - tested.length * NIDO_TEST_COST + saleIncome : STARTING_CASH, [confirmedPath, tested, saleIncome]);
  const females = colony.filter((a) => a.sex === "Female");
  const males = colony.filter((a) => a.sex === "Male");
  const dam = colony.find((a) => a.id === damId) ?? null;
  const sire = colony.find((a) => a.id === sireId) ?? null;

  function confirmStarter(path: StarterPath) { setConfirmedPath(path); setColony(path.animals.map((a) => ({ ...a }))); }

  function testSnake(id: string) {
    if (tested.includes(id) || cash < NIDO_TEST_COST) return;
    setTested((current) => [...current, id]);
    setColony((current) => current.map((animal) => animal.id !== id ? animal : { ...animal, nidoStatus: Math.random() < (animal.source === "Import" ? 0.12 : 0.018) ? "Positive" : "Negative" }));
  }

  function sellSnake(animal: Snake) {
    if (animal.nidoStatus === "Positive") return;
    const value = saleValue(animal);
    setSales((current) => [{ id: animal.id, name: animal.name, value, season }, ...current]);
    setColony((current) => current.filter((candidate) => candidate.id !== animal.id));
    if (damId === animal.id) setDamId("");
    if (sireId === animal.id) setSireId("");
  }

  function breedSelected() { if (dam && sire) { setClutch(createClutch(dam, sire)); setHoldbacks([]); } }
  function keepHatchling(id: string) { setHoldbacks((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]); }
  function finishClutch() {
    if (!clutch) return;
    setColony((current) => [...current, ...clutch.offspring.filter((baby) => holdbacks.includes(baby.id))]);
    setClutch(null); setHoldbacks([]); setDamId(""); setSireId(""); setSeason((current) => current + 1);
  }

  if (!started) return <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6"><section className="panel overflow-hidden rounded-[32px] p-7 sm:p-10"><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200/55">Start Your Dream Sweepstakes</div><h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">You won {money(STARTING_CASH)}.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-white/45">You finally have enough to start a small chondro program — but not enough to make every choice at once.</p><button onClick={() => setStarted(true)} className="mt-8 rounded-2xl bg-amber-200 px-6 py-3 text-sm font-black text-[#17130a]">Start the journey</button></section></div>;

  if (!confirmedPath) return <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="section-kicker">Opening decision</div><h1 className="mt-2 text-3xl font-semibold">Choose how your colony begins.</h1></div><div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-5 py-3"><div className="text-[9px] uppercase tracking-[.16em] text-white/25">Available cash</div><div className="mt-1 text-xl font-semibold text-emerald-200/80">{money(STARTING_CASH)}</div></div></div><div className="mt-7 grid gap-4 lg:grid-cols-2">{starterPaths.map((path) => <button key={path.id} onClick={() => setSelectedPath(path)} className={`panel-soft rounded-[26px] p-6 text-left transition ${selectedPath?.id === path.id ? "ring-1 ring-amber-200/45" : "hover:bg-white/[.035]"}`}><div className="flex items-start justify-between gap-4"><div><div className="text-xl font-semibold">{path.name}</div><div className="mt-1 text-xs font-semibold text-amber-100/45">{path.tagline}</div></div><span className="rounded-full border border-white/[.07] px-3 py-1 text-[10px] uppercase tracking-[.12em] text-white/35">{path.risk} risk</span></div><p className="mt-4 text-sm leading-6 text-white/38">{path.description}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{path.animals.map((animal) => <div key={animal.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-3"><ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} compact /><div className="mt-3 text-sm font-semibold text-white/65">{animal.name}</div><div className="mt-1 text-[11px] text-white/28">{animal.sex} · {animal.source} · {animal.locality}</div><div className="mt-2 text-[10px] text-white/32">HB {animal.highBlack}% · HW {animal.highWhite}% · Blue {animal.blueStripe}%</div></div>)}</div><div className="mt-5 border-t border-white/[.05] pt-4 text-xs text-white/30">{path.enclosurePlan}<div className="mt-1">Opening spend: {money(path.setupCost)} · Cash left: {money(STARTING_CASH - path.setupCost)}</div></div></button>)}</div><div className="mt-6 flex justify-end"><button disabled={!selectedPath} onClick={() => selectedPath && confirmStarter(selectedPath)} className="rounded-2xl bg-amber-200 px-6 py-3 text-sm font-black text-[#17130a] disabled:opacity-30">Commit to this start</button></div></div>;

  return <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="section-kicker">Chondro Breeder · Season {season}</div><h1 className="mt-2 text-3xl font-semibold">{confirmedPath.name}</h1><p className="mt-2 text-sm text-white/34">{confirmedPath.enclosurePlan}</p></div><div className="grid grid-cols-3 gap-2 text-right"><div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3"><div className="text-[9px] uppercase tracking-[.14em] text-white/24">Cash</div><div className="mt-1 font-semibold text-emerald-200/75">{money(cash)}</div></div><div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3"><div className="text-[9px] uppercase tracking-[.14em] text-white/24">Sales</div><div className="mt-1 font-semibold text-amber-100/70">{money(saleIncome)}</div></div><div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3"><div className="text-[9px] uppercase tracking-[.14em] text-white/24">Colony</div><div className="mt-1 font-semibold text-white/65">{colony.length}</div></div></div></div>

    <section className="mt-7 panel rounded-[28px] p-6"><div className="section-kicker">Breeding room</div><h2 className="mt-2 text-2xl font-semibold">Build this season&apos;s pairing.</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="mb-2 block text-xs font-bold text-white/38">Female</span><select value={damId} onChange={(e) => setDamId(e.target.value)} className="w-full rounded-2xl border border-white/[.08] bg-black/30 px-4 py-3 text-sm"><option value="">Choose female</option>{females.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.locality}</option>)}</select></label><label><span className="mb-2 block text-xs font-bold text-white/38">Male</span><select value={sireId} onChange={(e) => setSireId(e.target.value)} className="w-full rounded-2xl border border-white/[.08] bg-black/30 px-4 py-3 text-sm"><option value="">Choose male</option>{males.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.locality}</option>)}</select></label></div>{dam && sire ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><ChondroSnakeIcon subspecies={dam.subspecies} name={dam.name} compact /><ChondroSnakeIcon subspecies={sire.subspecies} name={sire.name} compact /><div className="sm:col-span-2 rounded-2xl border border-amber-200/10 bg-amber-200/[.025] p-4 text-sm text-white/45"><span className="font-semibold text-amber-100/65">Projected classification:</span> {classifyPair(dam, sire)}</div></div> : null}<button disabled={!dam || !sire || !!clutch} onClick={breedSelected} className="mt-5 rounded-2xl bg-amber-200 px-6 py-3 text-sm font-black text-[#17130a] disabled:opacity-30">Run breeding season</button></section>

    {clutch ? <section className="mt-6 panel rounded-[28px] p-6"><div className="section-kicker">{clutch.id}</div><h2 className="mt-2 text-2xl font-semibold">Clutch hatched · {clutch.offspring.length} offspring</h2><p className="mt-2 text-sm text-white/34">{clutch.dam.name} × {clutch.sire.name}</p><div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{clutch.offspring.map((baby) => { const kept = holdbacks.includes(baby.id); return <button key={baby.id} onClick={() => keepHatchling(baby.id)} className={`rounded-3xl border p-4 text-left transition ${kept ? "border-amber-200/35 bg-amber-200/[.05]" : "border-white/[.06] bg-white/[.015]"}`}><ChondroSnakeIcon subspecies={baby.subspecies} name={baby.name} compact /><div className="mt-3 flex items-start justify-between gap-3"><div><div className="font-semibold text-white/75">{baby.name}</div><div className="mt-1 text-[10px] text-white/28">{baby.sex} · {baby.neonateColor} neonate · Gen {baby.generation}</div></div><span className="rounded-full border border-white/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-white/38">{baby.classification}</span></div><div className="mt-4 grid grid-cols-2 gap-2">{traitRows.map(([label, key]) => <div key={key} className="rounded-xl border border-white/[.05] p-3"><div className="text-[9px] uppercase tracking-[.09em] text-white/22">{label}</div><div className="mt-1 text-lg font-semibold text-white/65">{baby[key]}%</div><div className="text-[9px] text-white/25">{traitLabel(baby[key])}</div></div>)}</div><div className="mt-3 text-[10px] text-white/28">Tail: {baby.tail}</div><div className="mt-3 text-[10px] font-bold uppercase tracking-[.12em] text-amber-100/50">{kept ? "Holdback selected" : "Tap to hold back"}</div></button>; })}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-4"><div className="text-sm text-white/38">Holdbacks: <span className="font-semibold text-white/65">{holdbacks.length}</span></div><button onClick={finishClutch} className="rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black text-[#06100c]">Close clutch & advance season</button></div></section> : null}

    {sales.length > 0 ? <section className="mt-6 panel-soft rounded-[28px] p-5"><div className="section-kicker">Recent sales</div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{sales.slice(0, 6).map((sale) => <div key={`${sale.id}-${sale.season}`} className="rounded-2xl border border-white/[.06] bg-black/10 p-3"><div className="text-sm font-semibold text-white/60">{sale.name}</div><div className="mt-1 text-[10px] text-white/28">Sold season {sale.season}</div><div className="mt-2 text-sm font-semibold text-emerald-200/70">+{money(sale.value)}</div></div>)}</div></section> : null}

    <section className="mt-6"><div className="section-kicker">Your colony</div><h2 className="mt-2 text-2xl font-semibold">Animals and project material</h2><p className="mt-2 text-sm text-white/32">Lower-expression animals sell for less. Stronger line traits, later generations, condition and a negative Nido test can raise value.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{colony.map((animal) => { const value = saleValue(animal); const canSell = animal.nidoStatus !== "Positive"; return <article key={animal.id} className="panel rounded-[28px] p-5"><ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} /><div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><div className="text-xl font-semibold">{animal.name}</div><div className="mt-1 text-xs text-white/30">{animal.id} · {animal.sex} · {animal.classification} · Gen {animal.generation}</div></div><span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${animal.source === "Import" ? "border-amber-200/15 text-amber-100/55" : "border-emerald-300/15 text-emerald-200/55"}`}>{animal.source}</span></div><div className="mt-3 text-xs text-white/35">{animal.subspecies} · {animal.locality} · Tail: {animal.tail}</div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{traitRows.map(([label, key]) => <div key={key} className="rounded-2xl border border-white/[.06] p-3"><div className="text-[9px] uppercase tracking-[.1em] text-white/23">{label}</div><div className="mt-2 text-lg font-semibold text-white/62">{animal[key]}%</div></div>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.05] pt-4"><div className="text-xs text-white/32">Nido: <span className={animal.nidoStatus === "Positive" ? "font-semibold text-red-200/75" : animal.nidoStatus === "Negative" ? "font-semibold text-emerald-200/70" : "text-white/42"}>{animal.nidoStatus}</span></div><div className="flex flex-wrap gap-2">{animal.nidoStatus === "Unknown" ? <button disabled={cash < NIDO_TEST_COST} onClick={() => testSnake(animal.id)} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55 disabled:opacity-30">Buy Nido test · {money(NIDO_TEST_COST)}</button> : null}<button disabled={!canSell} onClick={() => sellSnake(animal)} className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-2 text-xs font-bold text-emerald-200/75 disabled:cursor-not-allowed disabled:border-red-300/10 disabled:bg-red-300/[.03] disabled:text-red-200/35">{canSell ? `Sell · ${money(value)}` : "Cannot sell Nido+"}</button></div></div></article>; })}</div></section>
  </div>;
}
