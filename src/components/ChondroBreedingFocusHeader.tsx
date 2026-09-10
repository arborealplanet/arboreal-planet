"use client";

import { useEffect, useMemo, useState } from "react";

type Animal = { id?: string; name?: string };
type Cycle = { damId?: string; sireId?: string; stage?: string; completesAt?: number };
type Clutch = { offspring?: unknown[] };
type Save = { colony?: Animal[]; breedingCycle?: Cycle | null; clutch?: Clutch | null; clutchEstablished?: boolean; season?: number };

const stages = [
  ["cycling", "Cycle"],
  ["pairing", "Pair"],
  ["gestation", "Develop"],
  ["separate-pair", "Separate"],
  ["pre-lay", "Pre-lay"],
  ["laying", "Lay"],
  ["incubation", "Incubate"],
  ["hatch-day", "Hatch"],
] as const;

export function ChondroBreedingFocusHeader() {
  const [save, setSave] = useState<Save>({});
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok) setSave(data.save?.state ?? {});
      } catch {}
    }
    void load();
    const refresh = () => void load();
    const tick = () => setNow(Date.now());
    const firstTick = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener("chondro-conservation-updated", refresh);
    window.addEventListener("arboreal-chondro-favorites-change", refresh);
    return () => {
      active = false;
      window.clearTimeout(firstTick);
      window.clearInterval(timer);
      window.removeEventListener("chondro-conservation-updated", refresh);
      window.removeEventListener("arboreal-chondro-favorites-change", refresh);
    };
  }, []);

  const cycle = save.breedingCycle ?? null;
  const currentIndex = cycle?.stage ? stages.findIndex(([id]) => id === cycle.stage) : -1;
  const pair = useMemo(() => {
    const colony = save.colony ?? [];
    const dam = colony.find((animal) => animal.id === cycle?.damId)?.name;
    const sire = colony.find((animal) => animal.id === cycle?.sireId)?.name;
    return dam && sire ? `${dam} × ${sire}` : null;
  }, [save.colony, cycle?.damId, cycle?.sireId]);
  const remaining = cycle?.completesAt && now ? Math.max(0, cycle.completesAt - now) : 0;
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  const clutchCount = Array.isArray(save.clutch?.offspring) ? save.clutch!.offspring!.length : 0;

  return (
    <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
      <div className="panel overflow-hidden rounded-[28px]">
        <div className="grid gap-4 border-b border-white/[.06] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <div className="section-kicker">Active breeding workflow</div>
            <h2 className="mt-2 text-xl font-semibold text-white/82">{cycle ? pair || "Breeding cycle in progress" : clutchCount ? `${clutchCount} offspring in the current clutch` : "No active breeding cycle"}</h2>
            <p className="mt-2 text-sm leading-6 text-white/46">{cycle ? `Current stage: ${stages[currentIndex]?.[1] ?? cycle.stage}. ${remaining > 0 ? `${hours ? `${hours}h ` : ""}${minutes}m remaining.` : "Ready to advance."}` : clutchCount ? (save.clutchEstablished ? "The clutch is established and ready for individual management." : "Complete clutch establishment before individual holdback or sale decisions.") : "Choose a compatible pair below when your animals are conditioned and ready."}</p>
          </div>
          <div className="rounded-2xl border border-white/[.07] bg-black/15 px-4 py-3 text-right">
            <div className="text-[9px] font-bold uppercase tracking-[.13em] text-white/34">Season</div>
            <div className="mt-1 text-2xl font-semibold text-white/72">{save.season ?? 1}</div>
          </div>
        </div>

        <div className="overflow-x-auto p-4 sm:p-5">
          <div className="flex min-w-[720px] items-center gap-2">
            {stages.map(([id, label], index) => {
              const complete = currentIndex > index;
              const active = currentIndex === index;
              return <div key={id} className="flex flex-1 items-center gap-2"><div className={`flex min-h-14 flex-1 items-center justify-center rounded-xl border px-2 text-center text-[10px] font-bold uppercase tracking-[.08em] transition ${active ? "border-emerald-300/28 bg-emerald-300/[.09] text-emerald-100" : complete ? "border-emerald-300/10 bg-emerald-300/[.035] text-emerald-100/48" : "border-white/[.06] bg-white/[.018] text-white/30"}`}>{complete ? "✓ " : ""}{label}</div>{index < stages.length - 1 ? <span className="text-white/16">→</span> : null}</div>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
