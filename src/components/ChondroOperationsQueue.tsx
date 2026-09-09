"use client";

import { useEffect, useMemo, useState } from "react";
import { ROOM_EXPANSIONS } from "@/lib/chondro-facility-limits";

type BreedingStage = "cycling" | "pairing" | "laying" | "incubation" | "hatch-day";
type Save = {
  colony?: Array<{ id: string; name?: string }>;
  breedingCycle?: { damId: string; sireId: string; stage: BreedingStage; completesAt: number } | null;
  geneticTestsPending?: Array<{ snakeId: string; completesAt: number }>;
  facilityConstruction?: { roomId: string; completesAt: number } | null;
};

type QueueItem = { id: string; label: string; detail: string; completesAt: number; kind: "breeding" | "testing" | "construction" };

const STAGE_LABELS: Record<BreedingStage, string> = {
  cycling: "Cycling",
  pairing: "Pairing",
  laying: "Laying",
  incubation: "Incubation",
  "hatch-day": "Hatch Day",
};

function remaining(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function ChondroOperationsQueue() {
  const [save, setSave] = useState<Save | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setNow(Date.now());
    async function load() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok && data.save?.state) setSave(data.save.state as Save);
      } catch {}
    }
    void load();
    const refresh = window.setInterval(load, 30_000);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const queue = useMemo<QueueItem[]>(() => {
    if (!save) return [];
    const animals = new Map((save.colony ?? []).map((animal) => [animal.id, animal.name || animal.id]));
    const items: QueueItem[] = [];
    if (save.breedingCycle) {
      const cycle = save.breedingCycle;
      items.push({
        id: `breeding-${cycle.damId}-${cycle.sireId}`,
        label: STAGE_LABELS[cycle.stage],
        detail: `${animals.get(cycle.damId) ?? cycle.damId} × ${animals.get(cycle.sireId) ?? cycle.sireId}`,
        completesAt: cycle.completesAt,
        kind: "breeding",
      });
    }
    for (const job of save.geneticTestsPending ?? []) {
      items.push({
        id: `test-${job.snakeId}`,
        label: "Genetic Test",
        detail: animals.get(job.snakeId) ?? job.snakeId,
        completesAt: job.completesAt,
        kind: "testing",
      });
    }
    if (save.facilityConstruction) {
      const build = save.facilityConstruction;
      const room = ROOM_EXPANSIONS.find((item) => item.id === build.roomId);
      items.push({
        id: `construction-${build.roomId}`,
        label: "Construction",
        detail: room?.name ?? build.roomId,
        completesAt: build.completesAt,
        kind: "construction",
      });
    }
    return items.sort((a, b) => a.completesAt - b.completesAt);
  }, [save]);

  return (
    <section className="mx-auto mt-3 max-w-7xl px-5 sm:px-6">
      <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/45">Operations Queue</div>
            <div className="mt-1 text-xs text-white/32">Breeding · testing · construction · offline progress</div>
          </div>
          <div className="rounded-full border border-white/[.07] px-3 py-1 text-[10px] font-bold text-white/38">{queue.length} active</div>
        </div>
        {queue.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/[.06] bg-white/[.018] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-xs font-bold text-white/68">{item.label}</div><div className="mt-1 truncate text-[10px] text-white/34">{item.detail}</div></div>
                  <div className={`rounded-lg border px-2 py-1 text-[9px] font-black ${item.kind === "breeding" ? "border-amber-200/15 text-amber-100/65" : item.kind === "testing" ? "border-sky-300/15 text-sky-100/65" : "border-emerald-300/15 text-emerald-100/65"}`}>{remaining(item.completesAt - now)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="mt-3 text-xs text-white/27">No active operations. Start a breeding cycle, submit a test or build a room to populate the queue.</div>}
      </div>
    </section>
  );
}
