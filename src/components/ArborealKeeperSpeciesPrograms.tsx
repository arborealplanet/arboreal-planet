"use client";

import { useEffect, useMemo, useState } from "react";
import { ARBOREAL_KEEPER_SPECIES } from "@/lib/arboreal-keeper-species";
import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";
import { ARBOREAL_KEEPER_PLANNED_SPECIES, type KeeperRoadmapLock } from "@/lib/arboreal-keeper-roadmap";

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";

const breedingModeLabel = {
  oviparous: "Egg-laying",
  viviparous: "Live-bearing",
} as const;

const difficultyLabel = {
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
} as const;

const lockLabel: Record<KeeperRoadmapLock, string> = {
  experience: "Experience",
  capital: "Capital",
  rarity: "Rarity",
  certification: "Certification",
};

function readReputation() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { careerReputation?: unknown };
    const value = Number(parsed.careerReputation ?? 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

export function ArborealKeeperSpeciesPrograms() {
  const [reputation, setReputation] = useState(0);

  useEffect(() => {
    const sync = () => setReputation(readReputation());
    const syncEconomy = (event: Event) => {
      const detail = (event as CustomEvent<{ reputation?: number }>).detail;
      if (typeof detail?.reputation === "number") setReputation(Math.max(0, detail.reputation));
      else sync();
    };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("arboreal-keeper-economy-updated", syncEconomy);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("arboreal-keeper-economy-updated", syncEconomy);
    };
  }, []);

  const keeperLevel = useMemo(() => keeperLevelFromReputation(reputation), [reputation]);

  return (
    <section className="mt-4 rounded-[28px] border border-white/[.065] bg-[#030806] p-4 shadow-[0_20px_60px_rgba(0,0,0,.22)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-200/50">
            Breeding programs
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-.035em] text-white sm:text-2xl">
            One facility. Multiple arboreal species.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
            Programs share the Animal Market, rooms, facility progression and compatible enclosure models. Species biology remains independent, and each snake occupies its own enclosure.
          </p>
        </div>
        <div className="shrink-0 rounded-full border border-emerald-300/10 bg-emerald-300/[.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/55">
          Keeper Level {keeperLevel}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {ARBOREAL_KEEPER_SPECIES.map((species) => {
          const unlocked = keeperLevel >= species.unlockLevel;
          return (
            <article
              key={species.id}
              className="relative overflow-hidden rounded-[24px] border border-white/[.065] bg-[#07110d] p-4"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-300/[.045] blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">
                      {species.animalGroup} · Keeper Level {species.unlockLevel}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-white/90">{species.displayName}</h3>
                    <div className="mt-0.5 text-xs italic text-white/38">{species.scientificName}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] ${unlocked ? "border-emerald-300/12 bg-emerald-300/[.05] text-emerald-100/55" : "border-white/[.07] bg-white/[.03] text-white/35"}`}>
                    {unlocked ? "Unlocked" : `Level ${species.unlockLevel}`}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                  <ProgramStat label="Breeding" value={breedingModeLabel[species.breedingMode]} />
                  <ProgramStat label="Care" value={difficultyLabel[species.careDifficulty]} />
                  <ProgramStat label="Value tier" value={`${species.valueTier}/5`} />
                  <ProgramStat label="Housing" value="Single animal" />
                </div>

                <div className="mt-4 border-t border-white/[.055] pt-3">
                  <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/30">Program flow</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {species.breedingStages.map((stage) => (
                      <span
                        key={stage.id}
                        className="rounded-full border border-white/[.06] bg-black/20 px-2 py-1 text-[10px] text-white/48"
                      >
                        {stage.label}
                      </span>
                    ))}
                  </div>
                </div>

                {species.id === "northern_emerald_tree_boa" ? (
                  <div className="mt-3 rounded-2xl border border-lime-300/10 bg-lime-300/[.035] px-3 py-2 text-[11px] leading-5 text-lime-50/55">
                    Red or green neonates. Anaconda Phase is restricted to green neonates and uses its own asset pool.
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/[.055] pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.16em] text-amber-100/42">Future programs</div>
            <h3 className="mt-1 text-lg font-semibold text-white/75">Locked animals stay visible before release.</h3>
          </div>
          <div className="text-[10px] text-white/28">Roadmap unlock levels can be rebalanced without changing species engines.</div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ARBOREAL_KEEPER_PLANNED_SPECIES.map((species) => {
            const levelEligible = keeperLevel >= species.unlockLevel;
            const certificationGate = species.lock === "certification";
            return (
              <article key={species.id} className="rounded-[20px] border border-white/[.055] bg-black/18 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[.14em] text-white/28">{species.group}</div>
                    <div className="mt-1.5 text-sm font-semibold text-white/68">{species.displayName}</div>
                    <div className="mt-0.5 text-[10px] italic text-white/28">{species.scientificName}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] ${levelEligible && !certificationGate ? "border-amber-200/12 bg-amber-200/[.045] text-amber-100/58" : "border-white/[.055] bg-white/[.02] text-white/30"}`}>
                    {certificationGate ? "Certificate" : levelEligible ? "Planned" : `L${species.unlockLevel}`}
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-white/35">{species.note}</p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[.045] pt-2 text-[9px] uppercase tracking-[.1em] text-white/25">
                  <span>{lockLabel[species.lock]} gate</span>
                  <span>Level {species.unlockLevel}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-white/[.055] bg-white/[.02] px-4 py-3 text-xs leading-5 text-white/42">
        Cross-compatible enclosure models do not imply cohabitation. Green Tree Pythons, Northern Emerald Tree Boas and Amazon Basin Emerald Tree Boas remain individually housed. Future group housing must be explicitly enabled for a species that supports it.
      </div>
    </section>
  );
}

function ProgramStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[.055] bg-black/20 px-3 py-2.5">
      <div className="text-[8px] font-black uppercase tracking-[.12em] text-white/25">{label}</div>
      <div className="mt-1 font-medium text-white/65">{value}</div>
    </div>
  );
}
