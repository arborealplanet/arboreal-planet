"use client";

import { useEffect, useMemo, useState } from "react";
import { achievementReputation } from "@/lib/chondro-achievements";
import { animalMeetsContract, contractsForSeason } from "@/lib/chondro-contracts";
import {
  BREEDING_PROJECTS,
  WARDROBE_UNLOCKS,
  facilityForId,
  marketDemandForSeason,
  nextFacility,
  projectCompleted,
  rankForReputation,
  storeScoutCost,
} from "@/lib/chondro-progression";

type Snake = {
  id: string;
  name?: string;
  sex: "Male" | "Female";
  source: "Captive Bred" | "Import";
  subspecies: "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
  locality: string;
  classification: "Pure" | "Hybrid" | "Designer";
  generation: number;
  neonateColor: "Red" | "Yellow";
  nidoStatus: "Unknown" | "Negative" | "Positive";
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
};

type Save = {
  cash: number;
  colony: Snake[];
  clutchHistory?: Array<{ offspring?: Snake[] }>;
  enclosures: Record<string, number>;
  season: number;
  careerReputation?: number;
  facilityId?: string;
  claimedProjectIds?: string[];
  claimedContractIds?: string[];
  ownedWardrobe?: string[];
  selectedWardrobe?: string;
  scoutsUsedSeason?: number;
  scoutsUsedThisSeason?: number;
  [key: string]: unknown;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const SHOP_SEED_KEY = "arboreal_chondro_expanded_shop_seed_v2";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function ChondroCareerSystemsPanel() {
  const [save, setSave] = useState<Save | null>(null);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.save?.state) setSave(data.save.state as Save);
    } catch {}
  }

  useEffect(() => { void load(); }, []);

  const produced = useMemo(() => (save?.clutchHistory ?? []).flatMap((clutch) => clutch.offspring ?? []), [save]);
  const known = useMemo(() => [...(save?.colony ?? []), ...produced], [save, produced]);
  const achievementRep = useMemo(() => save ? achievementReputation(save) : 0, [save]);
  const careerRep = Number(save?.careerReputation ?? 0);
  const reputation = careerRep + achievementRep;
  const rank = rankForReputation(reputation);
  const facility = facilityForId(save?.facilityId);
  const upgrade = nextFacility(save?.facilityId);
  const claimedProjects = new Set(save?.claimedProjectIds ?? []);
  const claimedContracts = new Set(save?.claimedContractIds ?? []);
  const contracts = save ? contractsForSeason(save.season ?? 1, reputation) : [];
  const demand = save ? marketDemandForSeason(save.season ?? 1) : null;
  const scoutsUsed = save?.scoutsUsedSeason === save?.season ? Number(save?.scoutsUsedThisSeason ?? 0) : 0;
  const scoutCost = storeScoutCost(reputation, scoutsUsed);

  async function persist(next: Save, message: string, reload = true) {
    setBusy(message);
    setStatus("");
    try {
      window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(next));
      const response = await fetch("/api/hatchery/chondro-breeder/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("save failed");
      setSave(next);
      setStatus(message);
      if (reload) window.setTimeout(() => window.location.reload(), 250);
    } catch {
      setStatus("That career action could not be saved.");
    } finally {
      setBusy("");
    }
  }

  function claimProject(projectId: string) {
    if (!save || busy || claimedProjects.has(projectId)) return;
    const project = BREEDING_PROJECTS.find((item) => item.id === projectId);
    if (!project || !produced.some((animal) => projectCompleted(project, animal))) return;
    const next: Save = {
      ...save,
      cash: save.cash + project.rewardCash,
      careerReputation: careerRep + project.rewardReputation,
      claimedProjectIds: [...(save.claimedProjectIds ?? []), project.id],
    };
    void persist(next, `${project.name} completed · +${money(project.rewardCash)} · +${project.rewardReputation} reputation.`);
  }

  function claimContract(contractId: string) {
    if (!save || busy || claimedContracts.has(contractId)) return;
    const contract = contracts.find((item) => item.id === contractId);
    if (!contract || !known.some((animal) => animalMeetsContract(contract, animal))) return;
    const next: Save = {
      ...save,
      cash: save.cash + contract.rewardCash,
      careerReputation: careerRep + contract.rewardReputation,
      claimedContractIds: [...(save.claimedContractIds ?? []), contract.id],
    };
    void persist(next, `${contract.title} fulfilled · +${money(contract.rewardCash)} · +${contract.rewardReputation} reputation.`);
  }

  function buyFacility() {
    if (!save || busy || upgrade.id === facility.id || save.cash < upgrade.purchaseCost || reputation < upgrade.reputationRequired) return;
    const bonusDifference = Math.max(0, upgrade.baseCapacityBonus - facility.baseCapacityBonus);
    const enclosures = { ...save.enclosures };
    enclosures["Chondro Dojo Bin"] = Number(enclosures["Chondro Dojo Bin"] ?? 0) + bonusDifference;
    const next: Save = {
      ...save,
      cash: save.cash - upgrade.purchaseCost,
      facilityId: upgrade.id,
      enclosures,
    };
    void persist(next, `${upgrade.name} purchased. ${bonusDifference ? `Facility space increased by ${bonusDifference}.` : ""}`);
  }

  function scoutStock() {
    if (!save || busy || save.cash < scoutCost) return;
    const seed = Math.max(1, Number(window.localStorage.getItem(SHOP_SEED_KEY) || "1")) + 1;
    window.localStorage.setItem(SHOP_SEED_KEY, String(seed));
    const next: Save = {
      ...save,
      cash: save.cash - scoutCost,
      scoutsUsedSeason: save.season,
      scoutsUsedThisSeason: scoutsUsed + 1,
    };
    void persist(next, `Fresh stock scouted for ${money(scoutCost)}.`);
  }

  function buyWardrobe(id: string) {
    if (!save || busy) return;
    const item = WARDROBE_UNLOCKS.find((entry) => entry.id === id);
    const owned = new Set(save.ownedWardrobe ?? []);
    if (!item || owned.has(id) || reputation < item.reputationRequired || save.cash < item.cashCost) return;
    owned.add(id);
    const next: Save = { ...save, cash: save.cash - item.cashCost, ownedWardrobe: [...owned], selectedWardrobe: id };
    void persist(next, `${item.name} added to your breeder wardrobe.`);
  }

  function equipWardrobe(id: string) {
    if (!save || !(save.ownedWardrobe ?? []).includes(id)) return;
    void persist({ ...save, selectedWardrobe: id }, "Breeder outfit updated.", false);
  }

  if (!save) return <div className="rounded-2xl border border-white/[.06] p-4 text-xs text-white/35">Loading breeder career…</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Rank" value={rank.name} detail={`${reputation.toLocaleString()} reputation`} />
        <Stat label="Facility" value={facility.name} detail={`+${facility.baseCapacityBonus} facility spaces`} />
        <Stat label="Cash" value={money(save.cash)} detail={`Season ${save.season}`} />
        <Stat label="Market" value={demand ? `${String(demand.hotTrait).replace(/([A-Z])/g, " $1")} hot` : "—"} detail={demand ? `${Math.round((demand.hotTraitMultiplier - 1) * 100)}% demand premium` : ""} />
      </div>

      <section className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-sm font-bold text-white/75">Facility progression</div><div className="mt-1 text-[11px] text-white/35">Facility upgrades now add real colony capacity to the save.</div></div>
          {upgrade.id !== facility.id ? <button disabled={busy !== "" || save.cash < upgrade.purchaseCost || reputation < upgrade.reputationRequired} onClick={buyFacility} className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black text-[#07110c] disabled:opacity-30">Upgrade · {money(upgrade.purchaseCost)}</button> : <span className="text-xs font-bold text-emerald-200/65">Max facility</span>}
        </div>
        {upgrade.id !== facility.id ? <div className="mt-3 text-[10px] text-white/35">Next: {upgrade.name} · requires {upgrade.reputationRequired.toLocaleString()} rep · +{upgrade.baseCapacityBonus - facility.baseCapacityBonus} additional spaces</div> : null}
      </section>

      <section className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-sm font-bold text-white/75">Store scouting</div><div className="mt-1 text-[11px] text-white/35">Pay to immediately reroll the expanded snake listings instead of waiting.</div></div>
          <button disabled={busy !== "" || save.cash < scoutCost} onClick={scoutStock} className="rounded-xl border border-sky-300/20 px-4 py-2 text-xs font-black text-sky-100/75 disabled:opacity-30">Scout fresh stock · {money(scoutCost)}</button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="text-sm font-bold text-white/75">Breeding projects</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {BREEDING_PROJECTS.map((project) => {
            const done = claimedProjects.has(project.id);
            const ready = !done && produced.some((animal) => projectCompleted(project, animal));
            return <div key={project.id} className={`rounded-xl border p-3 ${done ? "border-emerald-300/20 bg-emerald-300/[.03]" : ready ? "border-amber-200/25 bg-amber-200/[.035]" : "border-white/[.06]"}`}><div className="text-xs font-bold text-white/70">{project.name}</div><div className="mt-1 text-[10px] leading-4 text-white/35">{project.description}</div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-emerald-100/55">{money(project.rewardCash)} · +{project.rewardReputation} rep</span><button disabled={!ready || busy !== ""} onClick={() => claimProject(project.id)} className="rounded-lg border border-white/[.08] px-2 py-1 text-[9px] font-bold text-white/55 disabled:opacity-25">{done ? "Claimed" : ready ? "Claim" : "In progress"}</button></div></div>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="text-sm font-bold text-white/75">Current client contracts</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {contracts.map((contract) => {
            const done = claimedContracts.has(contract.id);
            const ready = !done && known.some((animal) => animalMeetsContract(contract, animal));
            return <div key={contract.id} className={`rounded-xl border p-3 ${done ? "border-emerald-300/20" : ready ? "border-amber-200/25" : "border-white/[.06]"}`}><div className="text-[9px] uppercase tracking-[.14em] text-white/25">{contract.client}</div><div className="mt-1 text-xs font-bold text-white/70">{contract.title}</div><div className="mt-1 text-[10px] text-white/35">Expires season {contract.expiresSeason}</div><div className="mt-2 text-[10px] text-emerald-100/55">{money(contract.rewardCash)} · +{contract.rewardReputation} rep</div><button disabled={!ready || busy !== ""} onClick={() => claimContract(contract.id)} className="mt-2 rounded-lg border border-white/[.08] px-2 py-1 text-[9px] font-bold text-white/55 disabled:opacity-25">{done ? "Fulfilled" : ready ? "Fulfill" : "No match yet"}</button></div>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="text-sm font-bold text-white/75">Breeder wardrobe</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {WARDROBE_UNLOCKS.map((item) => {
            const owned = (save.ownedWardrobe ?? []).includes(item.id);
            const equipped = save.selectedWardrobe === item.id;
            return <button key={item.id} disabled={busy !== "" || (!owned && (reputation < item.reputationRequired || save.cash < item.cashCost))} onClick={() => owned ? equipWardrobe(item.id) : buyWardrobe(item.id)} className={`rounded-xl border px-3 py-2 text-left text-[10px] disabled:opacity-25 ${equipped ? "border-amber-200/30 bg-amber-200/[.05] text-amber-100/75" : "border-white/[.07] text-white/45"}`}><strong className="block text-xs">{equipped ? "★ " : ""}{item.name}</strong>{owned ? "Owned · tap to equip" : `${money(item.cashCost)} · ${item.reputationRequired} rep`}</button>;
          })}
        </div>
      </section>

      {status ? <div role="status" className="text-xs text-emerald-100/65">{status}</div> : null}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4"><div className="text-[9px] uppercase tracking-[.18em] text-white/25">{label}</div><div className="mt-1 text-base font-black text-white/75">{value}</div><div className="mt-1 text-[10px] text-white/30">{detail}</div></div>;
}
