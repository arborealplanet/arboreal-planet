"use client";

import {
  BREEDING_PROJECTS,
  FACILITY_TIERS,
  WARDROBE_UNLOCKS,
  facilityForId,
  nextFacility,
  rankForReputation,
  storeScoutCost,
} from "@/lib/chondro-progression";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function ChondroCareerPanel({
  cash,
  reputation,
  facilityId,
  scoutsUsedThisSeason,
  ownedWardrobe,
  completedProjects,
  onBuyFacility,
  onScoutStore,
  onBuyWardrobe,
}: {
  cash: number;
  reputation: number;
  facilityId: string;
  scoutsUsedThisSeason: number;
  ownedWardrobe: string[];
  completedProjects: string[];
  onBuyFacility?: (facilityId: string) => void;
  onScoutStore?: () => void;
  onBuyWardrobe?: (wardrobeId: string) => void;
}) {
  const rank = rankForReputation(reputation);
  const facility = facilityForId(facilityId);
  const upgrade = nextFacility(facilityId);
  const atMaxFacility = upgrade.id === facility.id;
  const scoutCost = storeScoutCost(reputation, scoutsUsedThisSeason);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
          <div className="text-[10px] uppercase tracking-[.2em] text-white/30">Breeder Rank</div>
          <div className="mt-2 text-lg font-black text-white">{rank.name}</div>
          <div className="mt-1 text-xs text-white/45">{reputation.toLocaleString()} reputation</div>
        </div>
        <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
          <div className="text-[10px] uppercase tracking-[.2em] text-white/30">Facility</div>
          <div className="mt-2 text-lg font-black text-white">{facility.name}</div>
          <div className="mt-1 text-xs text-white/45">+{facility.baseCapacityBonus} facility capacity</div>
        </div>
        <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
          <div className="text-[10px] uppercase tracking-[.2em] text-white/30">Store Scouting</div>
          <div className="mt-2 text-lg font-black text-white">{money(scoutCost)}</div>
          <button
            type="button"
            disabled={!onScoutStore || cash < scoutCost}
            onClick={onScoutStore}
            className="mt-3 rounded-full border border-emerald-300/20 px-3 py-1.5 text-xs font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Scout fresh stock
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/[.07] bg-white/[.015] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">Facility Progression</div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">
              Grow from a home setup into a purpose-built arboreal breeding operation. Facility upgrades add space and future breeder perks without replacing enclosure purchases.
            </p>
          </div>
          {!atMaxFacility ? (
            <button
              type="button"
              disabled={!onBuyFacility || cash < upgrade.purchaseCost || reputation < upgrade.reputationRequired}
              onClick={() => onBuyFacility?.(upgrade.id)}
              className="rounded-full border border-white/[.08] px-4 py-2 text-xs font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Upgrade to {upgrade.name} · {money(upgrade.purchaseCost)}
            </button>
          ) : (
            <span className="rounded-full border border-emerald-300/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-200">
              Maximum facility
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {FACILITY_TIERS.map((tier) => {
            const active = tier.id === facility.id;
            return (
              <div key={tier.id} className={`rounded-2xl border p-3 ${active ? "border-emerald-300/25 bg-emerald-300/[.04]" : "border-white/[.06] bg-black/10"}`}>
                <div className="text-xs font-bold text-white/75">{tier.name}</div>
                <div className="mt-1 text-[10px] leading-4 text-white/35">{tier.description}</div>
                <div className="mt-2 text-[10px] text-white/35">Rep {tier.reputationRequired.toLocaleString()} · {money(tier.purchaseCost)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[.07] bg-white/[.015] p-5">
        <div className="text-sm font-black text-white">Breeding Projects</div>
        <p className="mt-1 text-xs leading-5 text-white/40">Long-term goals give specific lines something to work toward and award cash plus breeder reputation.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {BREEDING_PROJECTS.map((project) => {
            const completed = completedProjects.includes(project.id);
            return (
              <div key={project.id} className={`rounded-2xl border p-4 ${completed ? "border-emerald-300/20 bg-emerald-300/[.035]" : "border-white/[.06] bg-black/10"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-bold text-white/75">{project.name}</div>
                  <span className="text-[9px] font-bold uppercase tracking-[.16em] text-white/30">{completed ? "Complete" : "Active"}</span>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-white/35">{project.description}</p>
                <div className="mt-3 text-[10px] text-emerald-200/70">{money(project.rewardCash)} · +{project.rewardReputation} rep</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[.07] bg-white/[.015] p-5">
        <div className="text-sm font-black text-white">Breeder Wardrobe</div>
        <p className="mt-1 text-xs leading-5 text-white/40">Cosmetic progression now, with room for actual character art later when the graphics pipeline is ready.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {WARDROBE_UNLOCKS.map((item) => {
            const owned = ownedWardrobe.includes(item.id);
            const unlocked = reputation >= item.reputationRequired;
            return (
              <div key={item.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-3">
                <div className="text-xs font-bold text-white/75">{item.name}</div>
                <p className="mt-1 text-[10px] leading-4 text-white/35">{item.description}</p>
                <div className="mt-2 text-[10px] text-white/35">Rep {item.reputationRequired.toLocaleString()} · {money(item.cashCost)}</div>
                <button
                  type="button"
                  disabled={owned || !unlocked || cash < item.cashCost || !onBuyWardrobe}
                  onClick={() => onBuyWardrobe?.(item.id)}
                  className="mt-3 rounded-full border border-white/[.08] px-3 py-1 text-[10px] font-bold text-white/60 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {owned ? "Owned" : unlocked ? "Buy" : "Locked"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
