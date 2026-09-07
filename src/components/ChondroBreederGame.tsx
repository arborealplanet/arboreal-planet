"use client";

import { useMemo, useState } from "react";

type Subspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type Locality = "Biak" | "Numfor" | "Manokwari" | "Sorong" | "Timika" | "Cyclops" | "Jayapura" | "Lereh" | "Wamena" | "Aru" | "Merauke";
type Sex = "Male" | "Female";
type Source = "Captive Bred" | "Import";

type Snake = {
  id: string;
  name: string;
  sex: Sex;
  source: Source;
  subspecies: Subspecies;
  locality: Locality;
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
  nidoStatus: "Unknown" | "Negative" | "Positive";
  condition: "Excellent" | "Good" | "Fair";
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

const STARTING_CASH = 30000;

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

const makeSnake = (
  id: string,
  name: string,
  sex: Sex,
  source: Source,
  locality: Locality,
  neonateColor: "Red" | "Yellow",
  highBlack: number,
  highWhite: number,
  blueStripe: number,
  yellowRetention: number,
  condition: Snake["condition"] = "Good",
): Snake => ({
  id,
  name,
  sex,
  source,
  locality,
  subspecies: localitySubspecies[locality],
  neonateColor,
  highBlack,
  highWhite,
  blueStripe,
  yellowRetention,
  body: localitySubspecies[locality],
  tail: localitySubspecies[locality],
  eyes: localitySubspecies[locality],
  head: localitySubspecies[locality],
  pattern: locality,
  color: locality,
  nidoStatus: "Unknown",
  condition,
});

const starterPaths: StarterPath[] = [
  {
    id: "safe",
    name: "The Safe Start",
    tagline: "Cleaner stock. Fewer surprises.",
    description: "Begin with two captive-bred animals, a comfortable testing budget and a conservative enclosure plan.",
    setupCost: 8950,
    enclosurePlan: "4 Chondro Dojo bins · 2 quarantine bins · starter incubator",
    risk: "Low",
    animals: [
      makeSnake("SAFE-F-01", "Manokwari F1", "Female", "Captive Bred", "Manokwari", "Red", 10, 4, 16, 28, "Excellent"),
      makeSnake("SAFE-M-01", "Sorong M1", "Male", "Captive Bred", "Sorong", "Yellow", 4, 2, 20, 18, "Excellent"),
    ],
  },
  {
    id: "importer",
    name: "The Importer",
    tagline: "More animals. More uncertainty.",
    description: "Spend less per animal and start with four imports. The upside is genetic opportunity; the downside is health and quarantine pressure.",
    setupCost: 7800,
    enclosurePlan: "6 Chondro Dojo bins · 4 quarantine bins · starter incubator",
    risk: "High",
    animals: [
      makeSnake("IMP-F-01", "Biak Import", "Female", "Import", "Biak", "Red", 15, 4, 4, 22, "Fair"),
      makeSnake("IMP-M-01", "Cyclops Import", "Male", "Import", "Cyclops", "Yellow", 2, 8, 38, 5, "Good"),
      makeSnake("IMP-F-02", "Aru Import", "Female", "Import", "Aru", "Yellow", 1, 18, 24, 6, "Fair"),
      makeSnake("IMP-M-02", "Timika Import", "Male", "Import", "Timika", "Red", 9, 3, 14, 20, "Fair"),
    ],
  },
  {
    id: "locality",
    name: "The Locality Breeder",
    tagline: "Start focused and build a family.",
    description: "Begin with a matched Cyclops pair and enough room to hold back offspring. Strong foundation, narrower genetic options.",
    setupCost: 10150,
    enclosurePlan: "4 Chondro Dojo bins · 2 PVC display enclosures · 2 quarantine bins · starter incubator",
    risk: "Moderate",
    animals: [
      makeSnake("LOC-F-01", "Cyclops F1", "Female", "Captive Bred", "Cyclops", "Yellow", 3, 10, 42, 4, "Excellent"),
      makeSnake("LOC-M-01", "Cyclops M1", "Male", "Captive Bred", "Cyclops", "Yellow", 5, 8, 48, 3, "Excellent"),
    ],
  },
  {
    id: "opportunist",
    name: "The Opportunist",
    tagline: "One known animal. One wildcard.",
    description: "Mix a quality captive-bred female with a cheaper import male and keep more cash available for the next opportunity.",
    setupCost: 6900,
    enclosurePlan: "4 Chondro Dojo bins · 2 quarantine bins · starter incubator",
    risk: "Moderate",
    animals: [
      makeSnake("OPP-F-01", "Aru F1", "Female", "Captive Bred", "Aru", "Yellow", 2, 20, 28, 5, "Excellent"),
      makeSnake("OPP-M-01", "Biak Import", "Male", "Import", "Biak", "Red", 17, 3, 5, 26, "Fair"),
    ],
  },
];

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const traitLabel = (value: number) => {
  if (value >= 85) return "Extreme";
  if (value >= 60) return "Strong";
  if (value >= 35) return "Moderate";
  if (value >= 15) return "Noticeable";
  return "Background";
};

export function ChondroBreederGame() {
  const [started, setStarted] = useState(false);
  const [selectedPath, setSelectedPath] = useState<StarterPath | null>(null);
  const [confirmedPath, setConfirmedPath] = useState<StarterPath | null>(null);
  const [tested, setTested] = useState<string[]>([]);

  const cash = useMemo(() => confirmedPath ? STARTING_CASH - confirmedPath.setupCost - tested.length * 125 : STARTING_CASH, [confirmedPath, tested]);

  function testSnake(id: string) {
    if (tested.includes(id) || cash < 125) return;
    setTested((current) => [...current, id]);
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
        <section className="panel overflow-hidden rounded-[32px] p-7 sm:p-10">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200/55">Start Your Dream Sweepstakes</div>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">You won {money(STARTING_CASH)}.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/45">A sweepstakes you entered months ago just changed your life. The prize is enough to start the chondro breeding program you always wanted — but not enough to make every choice at once.</p>
          <div className="mt-8 rounded-3xl border border-amber-200/10 bg-amber-200/[.03] p-5">
            <div className="text-xs font-bold text-amber-100/65">The same opening for every player.</div>
            <p className="mt-2 text-sm leading-6 text-white/36">Your decisions, hidden animal variables, imports, health, pairings and selective breeding determine what happens after this point.</p>
          </div>
          <button onClick={() => setStarted(true)} className="mt-8 rounded-2xl bg-amber-200 px-6 py-3 text-sm font-black text-[#17130a]">Start the journey</button>
        </section>
      </div>
    );
  }

  if (!confirmedPath) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="section-kicker">Opening decision</div><h1 className="mt-2 text-3xl font-semibold">Choose how your colony begins.</h1></div>
          <div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-5 py-3"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-white/25">Available cash</div><div className="mt-1 text-xl font-semibold text-emerald-200/80">{money(STARTING_CASH)}</div></div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {starterPaths.map((path) => <button key={path.id} onClick={() => setSelectedPath(path)} className={`panel-soft rounded-[26px] p-6 text-left transition ${selectedPath?.id === path.id ? "ring-1 ring-amber-200/45" : "hover:bg-white/[.035]"}`}>
            <div className="flex items-start justify-between gap-4"><div><div className="text-xl font-semibold">{path.name}</div><div className="mt-1 text-xs font-semibold text-amber-100/45">{path.tagline}</div></div><span className="rounded-full border border-white/[.07] px-3 py-1 text-[10px] uppercase tracking-[.12em] text-white/35">{path.risk} risk</span></div>
            <p className="mt-4 text-sm leading-6 text-white/38">{path.description}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">{path.animals.map((animal) => <div key={animal.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-4"><div className="text-sm font-semibold text-white/65">{animal.name}</div><div className="mt-1 text-[11px] text-white/28">{animal.sex} · {animal.source} · {animal.locality}</div><div className="mt-3 flex gap-2 text-[10px] text-white/32"><span>HB {animal.highBlack}%</span><span>HW {animal.highWhite}%</span><span>Blue {animal.blueStripe}%</span></div></div>)}</div>
            <div className="mt-5 border-t border-white/[.05] pt-4 text-xs text-white/30"><div>{path.enclosurePlan}</div><div className="mt-1">Opening spend: <span className="font-semibold text-white/48">{money(path.setupCost)}</span> · Cash left: <span className="font-semibold text-emerald-200/60">{money(STARTING_CASH - path.setupCost)}</span></div></div>
          </button>)}
        </div>

        <div className="mt-6 flex justify-end"><button disabled={!selectedPath} onClick={() => selectedPath && setConfirmedPath(selectedPath)} className="rounded-2xl bg-amber-200 px-6 py-3 text-sm font-black text-[#17130a] disabled:cursor-not-allowed disabled:opacity-30">Commit to this start</button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="section-kicker">Your first colony</div><h1 className="mt-2 text-3xl font-semibold">{confirmedPath.name}</h1><p className="mt-2 text-sm text-white/34">{confirmedPath.enclosurePlan}</p></div>
        <div className="grid grid-cols-2 gap-2 text-right"><div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3"><div className="text-[9px] uppercase tracking-[.14em] text-white/24">Cash</div><div className="mt-1 font-semibold text-emerald-200/75">{money(cash)}</div></div><div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3"><div className="text-[9px] uppercase tracking-[.14em] text-white/24">Animals</div><div className="mt-1 font-semibold text-white/65">{confirmedPath.animals.length}</div></div></div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {confirmedPath.animals.map((animal) => {
          const hasTest = tested.includes(animal.id);
          return <article key={animal.id} className="panel rounded-[28px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-2xl font-semibold">{animal.name}</div><div className="mt-1 text-xs text-white/30">{animal.id} · {animal.sex} · {animal.neonateColor} neonate</div></div><span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${animal.source === "Import" ? "border-amber-200/15 text-amber-100/55" : "border-emerald-300/15 text-emerald-200/55"}`}>{animal.source}</span></div>
            <div className="mt-5 rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="text-xs font-semibold text-white/55">{animal.subspecies}</div><div className="mt-1 text-[11px] text-white/28">Locality: {animal.locality} · Condition: {animal.condition}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["High Black", animal.highBlack], ["High White", animal.highWhite], ["Blue Stripe", animal.blueStripe], ["Yellow Retention", animal.yellowRetention]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/[.06] p-3"><div className="text-[9px] uppercase tracking-[.11em] text-white/23">{label}</div><div className="mt-2 text-lg font-semibold text-white/62">{value}%</div><div className="text-[9px] text-white/24">{traitLabel(Number(value))}</div></div>)}</div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-black/10 p-4"><div><div className="text-[10px] font-bold uppercase tracking-[.12em] text-white/25">Nido status</div><div className="mt-1 text-sm font-semibold text-white/55">{hasTest ? "Negative" : "Unknown"}</div></div><button disabled={hasTest || cash < 125} onClick={() => testSnake(animal.id)} className="rounded-xl border border-white/[.08] bg-white/[.03] px-4 py-2 text-xs font-bold text-white/55 disabled:opacity-35">{hasTest ? "Test complete" : "Order Nido test · $125"}</button></div>
          </article>;
        })}
      </div>

      <section className="panel-soft mt-6 rounded-[28px] p-6">
        <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-300/50">Prototype milestone 1</div>
        <h2 className="mt-2 text-xl font-semibold">The colony exists. The next build adds the first breeding season.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/34">This foundation already locks the four subspecies/locality map, starter economy, import-vs-captive-bred choice, line percentages, health uncertainty and Nido testing. Breeding, clutch generation, enclosure assignment and persistent saves are the next systems to connect.</p>
      </section>
    </div>
  );
}
