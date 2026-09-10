"use client";

import { useEffect, useMemo, useState } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";

type Snake = {
  id: string;
  name: string;
  sex?: string;
  subspecies: string;
  locality?: string;
  neonateColor?: "Red" | "Yellow";
  highBlack?: number;
  highWhite?: number;
  blueStripe?: number;
  yellowRetention?: number;
  blotches?: number;
  geneticsTested?: boolean;
};
type Clutch = { id?: string; dam?: Snake; sire?: Snake; offspring?: Snake[] };
type Save = { clutch?: Clutch | null; clutchEstablished?: boolean; holdbacks?: string[] };

function strongestTrait(animal: Snake) {
  const rows = [
    ["Black", Number(animal.highBlack ?? 0)],
    ["White", Number(animal.highWhite ?? 0)],
    ["Blue", Number(animal.blueStripe ?? 0)],
    ["Yellow", Number(animal.yellowRetention ?? 0)],
    ["Blotches", Number(animal.blotches ?? 0)],
  ] as const;
  return rows.reduce((best, row) => row[1] > best[1] ? row : best, rows[0]);
}

export function ChondroActiveClutchShowcase() {
  const [save, setSave] = useState<Save>({});

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
    const timer = window.setInterval(load, 5000);
    window.addEventListener("arboreal-chondro-breeder-save-change", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("arboreal-chondro-breeder-save-change", refresh);
    };
  }, []);

  const clutch = save.clutch ?? null;
  const offspring = clutch?.offspring ?? [];
  const holdbacks = useMemo(() => new Set(save.holdbacks ?? []), [save.holdbacks]);
  if (!clutch || !offspring.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
      <div className="overflow-hidden rounded-[30px] border border-amber-200/12 bg-[radial-gradient(circle_at_25%_0%,rgba(251,191,36,.08),transparent_38%),#07100c]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[.055] p-5 sm:p-6">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.17em] text-amber-100/50">Active clutch</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white/90">{clutch.dam?.name ?? "Dam"} × {clutch.sire?.name ?? "Sire"}</h2>
            <p className="mt-2 text-sm text-white/44">{offspring.length} offspring · {save.clutchEstablished ? "established and ready for individual decisions" : "establish the clutch before holdback or sale decisions"}</p>
          </div>
          <div className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] ${save.clutchEstablished ? "border-emerald-300/18 bg-emerald-300/[.045] text-emerald-100/70" : "border-amber-200/18 bg-amber-200/[.045] text-amber-100/70"}`}>
            {save.clutchEstablished ? "Established" : "Establishment pending"}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offspring.map((baby) => {
              const strongest = strongestTrait(baby);
              const isHoldback = holdbacks.has(baby.id);
              return (
                <article key={baby.id} className={`rounded-[22px] border p-3 ${isHoldback ? "border-emerald-300/22 bg-emerald-300/[.035]" : "border-white/[.065] bg-black/14"}`}>
                  <div className="rounded-[18px] border border-white/[.045] bg-black/18 p-2">
                    <ChondroSnakeIcon
                      subspecies={baby.subspecies as never}
                      name={baby.name}
                      traits={{ highBlack: Number(baby.highBlack ?? 0), highWhite: Number(baby.highWhite ?? 0), blueStripe: Number(baby.blueStripe ?? 0), yellowRetention: Number(baby.yellowRetention ?? 0), blotches: Number(baby.blotches ?? 0) }}
                      lifeStage="Hatchling"
                      neonateColor={baby.neonateColor}
                    />
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white/80">{baby.name}</div>
                      <div className="mt-1 truncate text-[10px] text-white/36">{baby.sex ?? "Unsexed"} · {baby.locality ?? baby.subspecies}</div>
                    </div>
                    {isHoldback ? <span className="shrink-0 rounded-full border border-emerald-300/18 px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-emerald-100/70">Holdback</span> : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[.05] pt-3 text-[10px]">
                    <span className={baby.neonateColor === "Red" ? "text-red-100/62" : "text-amber-100/62"}>{baby.neonateColor ?? "Yellow"} neonate</span>
                    <span className="text-white/34">{baby.geneticsTested ? `${strongest[0]} ${strongest[1]}%` : "Traits untested"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
