"use client";

import { useEffect, useRef, useState } from "react";
import { geneticTestingUnlocked } from "@/lib/chondro-facility-limits";

type Snake = {
  id: string;
  name: string;
  sex: "Male" | "Female";
  condition: "Excellent" | "Good" | "Fair";
  nidoStatus: "Unknown" | "Negative" | "Positive";
};

type BreedingStage = "cycling" | "pairing" | "laying" | "incubation" | "hatch-day";
type BreedingCycle = {
  damId: string;
  sireId: string;
  stage: BreedingStage;
  completesAt: number;
  startedAt: number;
};
type GeneticTestJob = { snakeId: string; completesAt: number };
type Save = {
  cash: number;
  season: number;
  colony: Snake[];
  damId?: string;
  sireId?: string;
  clutchHistory?: Array<{ id: string; dam: Snake }>;
  careerReputation?: number;
  facilityRooms?: Record<string, number>;
  breedingCycle?: BreedingCycle | null;
  geneticTestsPending?: GeneticTestJob[];
  femaleRecovery?: Record<string, number>;
  lastRecoveryClutchId?: string | null;
  seasonCarePaid?: number;
  breedingMessage?: string;
  [key: string]: unknown;
};

const GENETIC_TEST_COST = 350;
const SEASON_CARE_PER_ADULT = 180;
const STAGES: Array<{ id: BreedingStage; label: string; hours: number }> = [
  { id: "cycling", label: "Cycling", hours: 4 },
  { id: "pairing", label: "Pairing", hours: 8 },
  { id: "laying", label: "Laying", hours: 12 },
  { id: "incubation", label: "Incubation", hours: 24 },
  { id: "hatch-day", label: "Hatch Day", hours: 2 },
];

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const remaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

async function readSave(): Promise<Save | null> {
  try {
    const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
    const data = await response.json();
    return response.ok && data.save?.state ? (data.save.state as Save) : null;
  } catch {
    try {
      const raw = window.localStorage.getItem("arboreal_chondro_breeder_v2");
      return raw ? (JSON.parse(raw) as Save) : null;
    } catch { return null; }
  }
}

async function patchProgression(patch: Record<string, unknown>) {
  const response = await fetch("/api/hatchery/chondro-breeder/progression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch }),
  });
  if (!response.ok) throw new Error("progression save failed");
  try {
    const raw = window.localStorage.getItem("arboreal_chondro_breeder_v2");
    if (raw) {
      const local = JSON.parse(raw) as Record<string, unknown>;
      window.localStorage.setItem("arboreal_chondro_breeder_v2", JSON.stringify({ ...local, ...patch }));
    }
  } catch {}
}

function pairingChance(dam: Snake, sire: Snake) {
  let chance = 0.78;
  if (dam.condition === "Excellent") chance += 0.08;
  if (sire.condition === "Excellent") chance += 0.04;
  if (dam.condition === "Fair") chance -= 0.28;
  if (sire.condition === "Fair") chance -= 0.16;
  return Math.max(0.25, Math.min(0.94, chance));
}

function failureReason(dam: Snake, sire: Snake) {
  if (dam.condition === "Fair") return "The female did not cycle strongly enough to complete the pairing.";
  if (sire.condition === "Fair") return "The male showed poor breeding interest this cycle.";
  return Math.random() < 0.5 ? "No successful lock was observed." : "The female was unreceptive and the pairing was stopped.";
}

export function ChondroRealtimeProgression() {
  const [save, setSave] = useState<Save | null>(null);
  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState("");
  const bypassRef = useRef(false);
  const resolvingRef = useRef(false);

  async function refresh() {
    const next = await readSave();
    if (next) setSave(next);
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!save || resolvingRef.current) return;
    const latest = save.clutchHistory?.[0];
    if (!latest || latest.id === save.lastRecoveryClutchId) return;
    const damId = latest.dam?.id;
    if (!damId) return;
    resolvingRef.current = true;
    const recovery = { ...(save.femaleRecovery ?? {}) };
    recovery[damId] = Math.random() < 0.5 ? save.season : save.season + 1;
    void patchProgression({ femaleRecovery: recovery, lastRecoveryClutchId: latest.id })
      .then(refresh)
      .finally(() => { resolvingRef.current = false; });
  }, [save]);

  useEffect(() => {
    if (!save || resolvingRef.current) return;
    const cycle = save.breedingCycle;
    if (!cycle || cycle.completesAt > now) return;
    const dam = save.colony.find((animal) => animal.id === cycle.damId);
    const sire = save.colony.find((animal) => animal.id === cycle.sireId);
    if (!dam || !sire) {
      void patchProgression({ breedingCycle: null, breedingMessage: "Breeding cycle cancelled because one of the selected animals is no longer in the colony." }).then(refresh);
      return;
    }

    resolvingRef.current = true;
    const stageIndex = STAGES.findIndex((stage) => stage.id === cycle.stage);

    async function advance() {
      if (cycle.stage === "pairing") {
        if (Math.random() > pairingChance(dam, sire)) {
          await patchProgression({ breedingCycle: null, breedingMessage: failureReason(dam, sire) });
          setStatus("Pairing did not take this season.");
          return;
        }

        const colony = [...save!.colony];
        const positives = [dam, sire].filter((animal) => animal.nidoStatus === "Positive");
        for (const positive of positives) {
          if (Math.random() < 0.60) {
            const survivorColony = colony.filter((animal) => animal.id !== positive.id);
            await patchProgression({ colony: survivorColony, breedingCycle: null, breedingMessage: `${positive.name} was lost following a high-risk Nido-positive breeding attempt.` });
            window.location.reload();
            return;
          }
        }

        if (dam.nidoStatus === "Positive" && sire.nidoStatus !== "Positive" && Math.random() < 0.40) {
          const updated = colony.map((animal) => animal.id === sire.id ? { ...animal, nidoStatus: "Positive" as const } : animal);
          const laying = STAGES.find((stage) => stage.id === "laying")!;
          await patchProgression({ colony: updated, breedingCycle: { ...cycle, stage: "laying", completesAt: Date.now() + laying.hours * 3_600_000 }, breedingMessage: `${sire.name} became Nido Positive after exposure during breeding. Laying has started.` });
          window.location.reload();
          return;
        }
        if (sire.nidoStatus === "Positive" && dam.nidoStatus !== "Positive" && Math.random() < 0.40) {
          const updated = colony.map((animal) => animal.id === dam.id ? { ...animal, nidoStatus: "Positive" as const } : animal);
          const laying = STAGES.find((stage) => stage.id === "laying")!;
          await patchProgression({ colony: updated, breedingCycle: { ...cycle, stage: "laying", completesAt: Date.now() + laying.hours * 3_600_000 }, breedingMessage: `${dam.name} became Nido Positive after exposure during breeding. Laying has started.` });
          window.location.reload();
          return;
        }
      }

      if (cycle.stage === "hatch-day") {
        await patchProgression({ breedingCycle: null, breedingMessage: "Hatch Day is ready. Open Core Game to reveal the clutch." });
        setStatus("Hatch Day is ready.");
        window.setTimeout(() => {
          const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((node) => node.textContent?.trim() === "Run breeding season");
          if (button && !button.disabled) {
            bypassRef.current = true;
            button.click();
            window.setTimeout(() => { bypassRef.current = false; }, 0);
          }
        }, 100);
        return;
      }

      const nextStage = STAGES[stageIndex + 1];
      if (nextStage) {
        await patchProgression({ breedingCycle: { ...cycle, stage: nextStage.id, completesAt: Date.now() + nextStage.hours * 3_600_000 }, breedingMessage: `${nextStage.label} started.` });
      }
    }

    void advance().finally(() => {
      resolvingRef.current = false;
      void refresh();
    });
  }, [save, now]);

  useEffect(() => {
    if (!save || resolvingRef.current) return;
    const jobs = save.geneticTestsPending ?? [];
    const ready = jobs.filter((job) => job.completesAt <= now);
    if (!ready.length) return;
    resolvingRef.current = true;
    const colony = save.colony.map((animal) => ready.some((job) => job.snakeId === animal.id) ? { ...animal, geneticsTested: true } : animal) as unknown as Snake[];
    const pending = jobs.filter((job) => job.completesAt > now);
    void patchProgression({ colony, geneticTestsPending: pending })
      .then(() => { setStatus(`${ready.length} genetic test${ready.length === 1 ? " is" : "s are"} ready.`); window.location.reload(); })
      .finally(() => { resolvingRef.current = false; });
  }, [save, now]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (bypassRef.current || !save) return;
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>("button");
      if (!button) return;
      const label = button.textContent?.trim() ?? "";

      if (label === "Run breeding season") {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (save.breedingCycle) { setStatus("A breeding cycle is already in progress."); return; }
        const dam = save.colony.find((animal) => animal.id === save.damId);
        const sire = save.colony.find((animal) => animal.id === save.sireId);
        if (!dam || !sire) { setStatus("Choose an adult female and male first."); return; }
        const recoverySeason = Number(save.femaleRecovery?.[dam.id] ?? 0);
        if (recoverySeason > save.season) { setStatus(`${dam.name} needs another full year of recovery before breeding again.`); return; }
        if (save.seasonCarePaid !== save.season) { setStatus("Provide this season's food and care before starting a breeding cycle."); return; }
        if ((dam.nidoStatus === "Positive" || sire.nidoStatus === "Positive") && !window.confirm("HIGH RISK PAIRING: A Nido Positive animal has a 60% chance of dying when bred and may infect its partner. Continue?")) return;
        const first = STAGES[0];
        void patchProgression({ breedingCycle: { damId: dam.id, sireId: sire.id, stage: first.id, startedAt: Date.now(), completesAt: Date.now() + first.hours * 3_600_000 }, breedingMessage: "Cycling started." }).then(refresh);
        setStatus("Cycling started. Progress continues while you are offline.");
        return;
      }

      if (label.startsWith("Genetic test ·")) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        if (!geneticTestingUnlocked(save)) { setStatus("Genetic testing unlocks at 1,500 breeder reputation or with a Research & Conservation Wing."); return; }
        const article = button.closest("article");
        const animal = save.colony.find((candidate) => article?.textContent?.includes(candidate.id));
        if (!animal) { setStatus("Could not identify that animal for testing."); return; }
        if ((save.geneticTestsPending ?? []).some((job) => job.snakeId === animal.id)) { setStatus(`${animal.name} already has a test in progress.`); return; }
        if (save.cash < GENETIC_TEST_COST) { setStatus("Not enough cash for testing."); return; }
        const jobs = [...(save.geneticTestsPending ?? []), { snakeId: animal.id, completesAt: Date.now() + 12 * 3_600_000 }];
        void patchProgression({ cash: save.cash - GENETIC_TEST_COST, geneticTestsPending: jobs }).then(refresh);
        setStatus(`${animal.name}'s genetic panel was submitted. Results in 12 hours.`);
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [save]);

  async function paySeasonCare() {
    if (!save || save.seasonCarePaid === save.season) return;
    const adults = save.colony.length;
    const cost = Math.max(SEASON_CARE_PER_ADULT, adults * SEASON_CARE_PER_ADULT);
    if (save.cash < cost) { setStatus("Not enough cash to cover this season's food and care."); return; }
    await patchProgression({ cash: save.cash - cost, seasonCarePaid: save.season });
    setStatus(`Season ${save.season} food and care provided for ${money(cost)}.`);
    await refresh();
  }

  if (!save) return null;
  const cycle = save.breedingCycle;
  const currentStage = cycle ? STAGES.find((stage) => stage.id === cycle.stage) : null;
  const adults = save.colony.length;
  const careCost = Math.max(SEASON_CARE_PER_ADULT, adults * SEASON_CARE_PER_ADULT);
  const tests = save.geneticTestsPending ?? [];

  return (
    <div className="mx-auto mt-4 max-w-7xl px-5 sm:px-6">
      <div className="rounded-2xl border border-emerald-300/10 bg-[#07100d]/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/45">Real-time breeder operations</div><div className="mt-1 text-xs text-white/35">Offline timers · seasonal care · recovery · testing</div></div>
          {save.seasonCarePaid === save.season ? <span className="rounded-full border border-emerald-300/15 px-3 py-1 text-[10px] font-bold text-emerald-100/60">Season {save.season} care complete</span> : <button onClick={() => void paySeasonCare()} className="rounded-xl bg-emerald-300 px-3 py-2 text-[10px] font-black text-[#06100c]">Provide season care · {money(careCost)}</button>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[.06] p-3 text-[10px] text-white/40">Breeding: <strong className="text-white/65">{currentStage ? `${currentStage.label} · ${remaining(cycle!.completesAt - now)}` : "Ready"}</strong></div>
          <div className="rounded-xl border border-white/[.06] p-3 text-[10px] text-white/40">Genetics: <strong className="text-white/65">{geneticTestingUnlocked(save) ? "Unlocked · 12h turnaround" : "Locked until 1,500 rep"}</strong></div>
          <div className="rounded-xl border border-white/[.06] p-3 text-[10px] text-white/40">Tests pending: <strong className="text-white/65">{tests.length}</strong></div>
        </div>
        {(status || save.breedingMessage) ? <div role="status" className="mt-3 text-xs text-amber-100/65">{status || save.breedingMessage}</div> : null}
      </div>
    </div>
  );
}
