"use client";

import { useEffect, useMemo, useState } from "react";
import { BREEDING_PROJECTS, projectCompleted } from "@/lib/chondro-progression";
import { CLUTCH_SIZE_PROFILES, clutchPairingKind } from "@/lib/chondro-clutch-size";
import { previewPairingInheritance } from "@/lib/chondro-genetics-preview";
import { DEFAULT_TRAIT_FOCUS, normalizeTraitFocus, traitFocusMatch, TRAIT_FOCUS_LABELS } from "@/lib/chondro-focus";
import { TRAIT_FOCUS_STORAGE_KEY } from "@/components/ChondroTraitFocusPanel";

type TraitKey = "highBlack" | "highWhite" | "blueStripe" | "yellowRetention" | "blotches";
type Snake = {
  id: string;
  name: string;
  sex: "Male" | "Female";
  source: "Captive Bred" | "Import";
  subspecies: "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
  locality: string;
  classification: "Pure" | "Hybrid" | "Designer";
  generation: number;
  neonateColor: "Red" | "Yellow";
  lifeStage: string;
  nidoStatus: "Unknown" | "Negative" | "Positive";
  condition: "Excellent" | "Good" | "Fair";
  geneticsTested?: boolean;
  highBlack: number;
  highWhite: number;
  blueStripe: number;
  yellowRetention: number;
  blotches: number;
};

type Save = {
  colony: Snake[];
  damId?: string;
  sireId?: string;
  favoriteIds?: string[];
  plannedPairings?: Array<{ id: string; damId: string; sireId: string; label: string; createdSeason: number }>;
  season?: number;
  [key: string]: unknown;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const traitKeys: TraitKey[] = ["highBlack", "highWhite", "blueStripe", "yellowRetention", "blotches"];
const traitLabel: Record<TraitKey, string> = {
  highBlack: "High Black",
  highWhite: "High White",
  blueStripe: "Blue",
  yellowRetention: "Yellow",
  blotches: "Blotches",
};

function offspringClassification(dam: Snake, sire: Snake): Snake["classification"] {
  if (dam.subspecies !== sire.subspecies) return "Hybrid";
  if (dam.classification === "Designer" || sire.classification === "Designer") return "Designer";
  if (dam.classification === "Hybrid" || sire.classification === "Hybrid") return "Hybrid";
  return "Pure";
}

function offspringLocality(dam: Snake, sire: Snake, classification: Snake["classification"]) {
  if (classification !== "Pure") return classification === "Designer" ? "Designer" : "Mixed Locality";
  return dam.locality === sire.locality ? dam.locality : "Mixed Locality";
}

function parentsAsTraits(animal: Snake) {
  return {
    highBlack: Number(animal.highBlack ?? 0),
    highWhite: Number(animal.highWhite ?? 0),
    blueStripe: Number(animal.blueStripe ?? 0),
    yellowRetention: Number(animal.yellowRetention ?? 0),
    blotches: Number(animal.blotches ?? 0),
  };
}

function chanceLabel(value: number) {
  if (value >= 50) return "High";
  if (value >= 20) return "Moderate";
  if (value >= 5) return "Low";
  if (value > 0) return "Rare";
  return "None";
}

export function ChondroPairingPlanner() {
  const [save, setSave] = useState<Save | null>(null);
  const [damId, setDamId] = useState("");
  const [sireId, setSireId] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    let local: Save | null = null;
    try { local = JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) || "null") as Save | null; } catch {}
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
      const data = await response.json();
      const next = response.ok && data.save?.state ? data.save.state as Save : local;
      if (next) {
        setSave(next);
        setDamId((current) => current || String(next.damId ?? ""));
        setSireId((current) => current || String(next.sireId ?? ""));
      }
    } catch { if (local) setSave(local); }
  }

  useEffect(() => { void load(); }, []);

  const adults = save?.colony.filter((a) => a.lifeStage === "Adult") ?? [];
  const females = adults.filter((a) => a.sex === "Female");
  const males = adults.filter((a) => a.sex === "Male");
  const dam = females.find((a) => a.id === damId) ?? null;
  const sire = males.find((a) => a.id === sireId) ?? null;
  const favorites = new Set(save?.favoriteIds ?? []);

  const preview = useMemo(() => {
    if (!dam || !sire) return null;
    const classification = offspringClassification(dam, sire);
    const locality = offspringLocality(dam, sire, classification);
    const generation = Math.max(Number(dam.generation ?? 1), Number(sire.generation ?? 1)) + 1;
    const inheritance = previewPairingInheritance(parentsAsTraits(dam), parentsAsTraits(sire), `${dam.id}:${sire.id}`);
    const projectedTraits = Object.fromEntries(traitKeys.map((key) => [key, Math.round(inheritance.traits[key].mean)])) as Record<TraitKey, number>;
    const kind = clutchPairingKind(dam, sire);
    const clutch = CLUTCH_SIZE_PROFILES[kind];
    const subspecies = dam.subspecies;
    const candidate = { subspecies, classification, locality, generation, neonateColor: dam.neonateColor, ...projectedTraits };
    const projects = BREEDING_PROJECTS.filter((project) => projectCompleted(project, candidate));
    let focus = DEFAULT_TRAIT_FOCUS;
    try { focus = normalizeTraitFocus(JSON.parse(window.localStorage.getItem(TRAIT_FOCUS_STORAGE_KEY) || "null")); } catch {}
    const focusMatch = traitFocusMatch(focus, projectedTraits);
    return { classification, locality, generation, inheritance, projectedTraits, clutch, projects, focusMatch };
  }, [dam, sire]);

  async function persist(next: Save, message: string, reload = false) {
    setSave(next);
    setStatus(message);
    try {
      window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(next));
      await fetch("/api/hatchery/chondro-breeder/save", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (reload) window.setTimeout(() => window.location.reload(), 220);
    } catch { setStatus("The pairing could not be saved."); }
  }

  function usePairing() {
    if (!save || !dam || !sire) return;
    void persist({ ...save, damId: dam.id, sireId: sire.id }, `${dam.name} × ${sire.name} loaded into the Core Game pairing selectors.`, true);
  }

  function savePairing() {
    if (!save || !dam || !sire) return;
    const pairings = save.plannedPairings ?? [];
    if (pairings.some((pair) => pair.damId === dam.id && pair.sireId === sire.id)) {
      setStatus("That pairing is already in your breeding queue.");
      return;
    }
    const pair = { id: `PAIR-${Date.now().toString(36)}`, damId: dam.id, sireId: sire.id, label: `${dam.name} × ${sire.name}`, createdSeason: Number(save.season ?? 1) };
    void persist({ ...save, plannedPairings: [pair, ...pairings].slice(0, 30) }, "Pairing saved to your breeding queue.");
  }

  function removePairing(id: string) {
    if (!save) return;
    void persist({ ...save, plannedPairings: (save.plannedPairings ?? []).filter((pair) => pair.id !== id) }, "Pairing removed.");
  }

  if (!save) return <div className="rounded-2xl border border-white/[.06] p-4 text-xs text-white/35">Loading pairing planner…</div>;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.55fr]">
        <ParentSelect label="Dam" value={damId} animals={females} favorites={favorites} onChange={setDamId} />
        <ParentSelect label="Sire" value={sireId} animals={males} favorites={favorites} onChange={setSireId} />
        <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
          <div className="text-[10px] font-black uppercase tracking-[.15em] text-white/30">Compatibility preview</div>
          {!preview ? <div className="mt-3 text-xs text-white/35">Choose an adult dam and sire to preview the pairing.</div> : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Mini label="Offspring" value={preview.classification} />
                <Mini label="Locality" value={preview.locality} />
                <Mini label="Generation" value={`F${preview.generation}`} />
                <Mini label="Clutch range" value={`${preview.clutch.min}–${preview.clutch.max}`} />
              </div>

              <div className="rounded-xl border border-white/[.06] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[9px] uppercase tracking-[.13em] text-white/25">Inheritance forecast</div>
                  <div className="text-[8px] text-white/20">{preview.inheritance.sampleCount.toLocaleString()} simulated offspring</div>
                </div>
                <div className="mt-3 space-y-2">
                  {traitKeys.map((key) => {
                    const odds = preview.inheritance.traits[key];
                    return (
                      <div key={key} className="grid grid-cols-[78px_1fr_auto] items-center gap-2 rounded-lg border border-white/[.04] px-2 py-2">
                        <div className="text-[9px] font-bold text-white/45">{traitLabel[key]}</div>
                        <div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-white/20" style={{ width: `${Math.max(2, Math.min(100, odds.mean))}%` }} /></div>
                          <div className="mt-1 text-[8px] text-white/24">Typical 80% range {odds.low}–{odds.high}%</div>
                        </div>
                        <div className="text-right"><div className="text-xs font-black text-white/65">{odds.mean}%</div><div className="text-[8px] text-white/25">mean</div></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <OddsMini label="70%+" value={preview.inheritance.chanceAny70} />
                <OddsMini label="85%+" value={preview.inheritance.chanceAny85} />
                <OddsMini label="95%+" value={preview.inheritance.chanceAny95} />
                <OddsMini label="100%" value={preview.inheritance.chanceAny100} />
              </div>

              <details className="rounded-xl border border-white/[.06] bg-black/10">
                <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-bold text-white/45 [&::-webkit-details-marker]:hidden">Detailed trait odds</summary>
                <div className="border-t border-white/[.05] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {traitKeys.map((key) => {
                      const odds = preview.inheritance.traits[key];
                      return <div key={key} className="rounded-lg border border-white/[.05] p-2 text-[9px] text-white/35"><strong className="text-white/55">{traitLabel[key]}</strong><br />70%+: {odds.chance70}% · 85%+: {odds.chance85}% · 95%+: {odds.chance95}% · 100%: {odds.chance100}%{odds.zeroChance > 0 ? <><br />0% expression: {odds.zeroChance}%</> : null}</div>;
                    })}
                  </div>
                </div>
              </details>

              <div className="text-[9px] leading-4 text-white/25">Forecasts use the game’s inheritance model, including the near-lock at 0% × 0%, suppressed weak 0% outcrosses, rare upward jumps, and the difficulty of reaching 95–100%. They are planning odds, not guaranteed clutch results.</div>
              {preview.focusMatch.matchedTargets.length ? <div className="text-[10px] text-amber-100/60">Trait Focus: {preview.focusMatch.matchedTargets.map((key) => TRAIT_FOCUS_LABELS[key]).join(", ")} · estimated score {preview.focusMatch.score}%</div> : null}
              {preview.projects.length ? <div className="text-[10px] text-emerald-100/60">Mean forecast reaches: {preview.projects.map((p) => p.name).join(" · ")}</div> : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={usePairing} className="rounded-xl bg-amber-200 px-3 py-2 text-[10px] font-black text-[#17130a]">Use in Core Game</button>
                <button type="button" onClick={savePairing} className="rounded-xl border border-white/[.08] px-3 py-2 text-[10px] font-bold text-white/55">Save Pairing</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(save.plannedPairings?.length ?? 0) > 0 ? (
        <div className="rounded-2xl border border-white/[.06] bg-black/10 p-4">
          <div className="flex items-center justify-between"><div className="text-xs font-bold text-white/60">Saved breeding queue</div><div className="text-[9px] text-white/25">{save.plannedPairings?.length}/30</div></div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {save.plannedPairings?.map((pair) => {
              const pairDam = save.colony.find((a) => a.id === pair.damId);
              const pairSire = save.colony.find((a) => a.id === pair.sireId);
              return <div key={pair.id} className="rounded-xl border border-white/[.06] p-3"><div className="text-xs font-bold text-white/65">{pair.label}</div><div className="mt-1 text-[9px] text-white/25">Saved season {pair.createdSeason}</div><div className="mt-2 flex gap-2"><button type="button" disabled={!pairDam || !pairSire} onClick={() => { setDamId(pair.damId); setSireId(pair.sireId); }} className="rounded-lg border border-white/[.08] px-2 py-1 text-[9px] text-white/50 disabled:opacity-25">Preview</button><button type="button" onClick={() => removePairing(pair.id)} className="rounded-lg border border-red-300/10 px-2 py-1 text-[9px] text-red-100/40">Remove</button></div></div>;
            })}
          </div>
        </div>
      ) : null}
      {status ? <div role="status" className="text-xs text-emerald-100/65">{status}</div> : null}
    </div>
  );
}

function ParentSelect({ label, value, animals, favorites, onChange }: { label: string; value: string; animals: Snake[]; favorites: Set<string>; onChange: (id: string) => void }) {
  const selected = animals.find((a) => a.id === value);
  return <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4"><div className="text-[10px] font-black uppercase tracking-[.15em] text-white/30">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-3 w-full rounded-xl border border-white/[.08] bg-black/30 px-3 py-2 text-xs text-white/65"><option value="">Choose {label.toLowerCase()}…</option>{animals.map((a) => <option key={a.id} value={a.id}>{favorites.has(a.id) ? "★ " : ""}{a.name} · {a.locality} · {a.classification}</option>)}</select>{selected ? <div className="mt-3 text-[10px] leading-5 text-white/35">{selected.subspecies}<br />{selected.locality} · F{selected.generation} · {selected.condition}<br />Nido: {selected.nidoStatus}</div> : <div className="mt-3 text-[10px] text-white/25">{animals.length} adult {label === "Dam" ? "females" : "males"} available</div>}</div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.06] p-2"><div className="text-[8px] uppercase tracking-[.12em] text-white/25">{label}</div><div className="mt-1 text-xs font-bold text-white/65">{value}</div></div>;
}

function OddsMini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/[.06] p-2 text-center"><div className="text-[8px] uppercase tracking-[.12em] text-white/25">{label}</div><div className="mt-1 text-xs font-black text-white/65">{value}%</div><div className="mt-1 text-[8px] text-white/22">{chanceLabel(value)}</div></div>;
}
