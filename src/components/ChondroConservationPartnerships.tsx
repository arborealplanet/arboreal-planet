"use client";

import { useEffect, useMemo, useState } from "react";

type Subspecies = "Morelia azurea azurea" | "Morelia azurea pulcher" | "Morelia azurea utaraensis" | "Morelia viridis";
type Snake = {
  id?: string;
  name?: string;
  subspecies?: Subspecies;
  classification?: string;
  ancestry?: Partial<Record<Subspecies, number>>;
  phenotypeScore?: number;
  generation?: number;
  locality?: string;
};
type GameSave = { colony?: Snake[] };
type StatusRow = {
  subspecies: Subspecies;
  contribution_count: number;
  stewardship_score: number;
  import_multiplier: number;
  phenotype_bonus: number;
};
type OwnContribution = {
  snake_id: string;
  subspecies: Subspecies;
  phenotype_score: number;
  generation: number;
  contributed_at: string;
};

type Payload = { authenticated: boolean; status: StatusRow[]; own: OwnContribution[] };

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const labels: Record<Subspecies, { short: string; full: string }> = {
  "Morelia azurea azurea": { short: "M. a. azurea", full: "Morelia azurea azurea" },
  "Morelia azurea pulcher": { short: "M. a. pulcher", full: "Morelia azurea pulcher" },
  "Morelia azurea utaraensis": { short: "M. a. utaraensis", full: "Morelia azurea utaraensis" },
  "Morelia viridis": { short: "M. viridis", full: "Morelia viridis" },
};

function parseSave(value: unknown): GameSave | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as GameSave;
}

function eligible(snake: Snake) {
  if (!snake.id || snake.classification !== "Pure" || !snake.subspecies) return false;
  return Number(snake.ancestry?.[snake.subspecies] ?? 0) >= 99.9;
}

export function ChondroConservationPartnerships() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [save, setSave] = useState<GameSave | null>(null);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    let local: GameSave | null = null;
    try { local = parseSave(JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) || "null")); } catch {}

    try {
      const [saveResponse, conservationResponse] = await Promise.all([
        fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" }),
        fetch("/api/hatchery/chondro-breeder/conservation", { cache: "no-store" }),
      ]);
      const saveData = await saveResponse.json();
      const conservationData = await conservationResponse.json();
      if (saveResponse.ok) setSave(parseSave(saveData.save?.state) ?? local);
      else setSave(local);
      if (conservationResponse.ok) setPayload(conservationData as Payload);
      else setPayload(null);
    } catch {
      setSave(local);
      setPayload(null);
    }
  }

  useEffect(() => { void load(); }, []);

  const eligibleAnimals = useMemo(() => (save?.colony ?? []).filter(eligible), [save]);
  const chosen = eligibleAnimals.find((snake) => snake.id === selected) ?? null;

  async function contribute() {
    if (!chosen?.id || busy) return;
    const label = chosen.name || chosen.id;
    if (!window.confirm(`Transfer ${label} to the in-country conservation partnership? This permanently removes the animal from your active colony.`)) return;
    setBusy(true);
    setStatus("Transferring animal to the conservation partnership…");
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/conservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snakeId: chosen.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error ?? "That transfer could not be completed.");
        return;
      }
      setStatus(`${label} entered the conservation partnership. Community import odds have been recalculated.`);
      setSelected("");
      await load();
      window.dispatchEvent(new Event("chondro-conservation-updated"));
    } catch {
      setStatus("The conservation transfer could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto mt-6 max-w-7xl px-5 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border border-emerald-300/12 bg-emerald-300/[.025]">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-100/50">Conservation partnerships</div>
            <div className="mt-2 text-xl font-semibold text-white/82">Breed responsibly. Strengthen the regional program.</div>
            <div className="mt-1 max-w-3xl text-xs leading-5 text-white/36">Send pure-subspecies animals to in-country conservation and breeding partners. Community participation gradually improves that subspecies&apos; representation and phenotype quality in future import listings.</div>
          </div>
          <div className="rounded-full border border-white/[.08] px-3 py-2 text-xs font-bold text-white/45">{open ? "Collapse ▴" : "Open program ▾"}</div>
        </button>

        {open ? (
          <div className="border-t border-white/[.06] p-5 sm:p-6">
            <div className="rounded-2xl border border-amber-200/10 bg-amber-200/[.025] p-4 text-xs leading-5 text-white/42">
              This is an educational game abstraction. It represents coordinated transfers to qualified in-country conservation/breeding programs—not private release of captive reptiles into wild habitat. Locality names remain useful pedigree context, while eligibility is based on pure subspecies ancestry.
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(payload?.status ?? []).map((row) => {
                const label = labels[row.subspecies];
                const availabilityGain = Math.round((Number(row.import_multiplier) - 1) * 100);
                return (
                  <article key={row.subspecies} className="rounded-2xl border border-white/[.06] bg-black/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[.12em] text-emerald-100/50">{label?.short ?? row.subspecies}</div>
                    <div className="mt-1 text-xs italic text-white/30">{label?.full ?? row.subspecies}</div>
                    <div className="mt-4 flex items-end justify-between gap-3"><span className="text-2xl font-semibold text-white/72">{Number(row.stewardship_score).toFixed(1)}</span><span className="text-[9px] uppercase text-white/25">stewardship / 100</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-emerald-300/55" style={{ width: `${Math.min(100, Number(row.stewardship_score))}%` }} /></div>
                    <div className="mt-4 space-y-1 text-[10px] text-white/38">
                      <div>{row.contribution_count} community animal{Number(row.contribution_count) === 1 ? "" : "s"} contributed</div>
                      <div>Import representation: +{availabilityGain}% weighting</div>
                      <div>Import phenotype floor shift: +{row.phenotype_bonus} points</div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-2xl border border-white/[.06] p-5">
                <div className="text-[10px] font-black uppercase tracking-[.13em] text-white/30">Contribute an animal</div>
                <p className="mt-2 text-sm leading-6 text-white/40">Eligible animals must be classified Pure and at least 99.9% of a single subspecies. Locality-mixed animals within that same subspecies still qualify.</p>
                <select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-4 h-12 w-full rounded-xl border border-white/[.08] bg-black/30 px-3 text-sm text-white/70">
                  <option value="">Choose an eligible animal</option>
                  {eligibleAnimals.map((snake) => <option key={snake.id} value={snake.id}>{snake.name || snake.id} · {labels[snake.subspecies!]?.short ?? snake.subspecies} · {snake.locality ?? "pedigree unknown"} · Gen {snake.generation ?? 1}</option>)}
                </select>
                {chosen ? <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[.02] p-3 text-xs text-white/42">Phenotype score {Math.round(Number(chosen.phenotypeScore ?? 0))} · {labels[chosen.subspecies!]?.full}</div> : null}
                <button type="button" disabled={!chosen || busy || !payload?.authenticated} onClick={() => void contribute()} className="mt-4 rounded-xl bg-emerald-200 px-5 py-3 text-xs font-black text-[#102016] disabled:opacity-30">{busy ? "Transferring…" : "Send to conservation partnership"}</button>
                {!eligibleAnimals.length ? <div className="mt-3 text-xs text-white/28">No eligible pure-subspecies animals are currently available in your colony.</div> : null}
                {status ? <div role="status" className="mt-3 text-xs text-emerald-100/65">{status}</div> : null}
              </div>

              <div className="rounded-2xl border border-white/[.06] p-5">
                <div className="text-[10px] font-black uppercase tracking-[.13em] text-white/30">Your conservation record</div>
                <div className="mt-3 text-3xl font-semibold text-white/72">{payload?.own.length ?? 0}</div>
                <div className="mt-1 text-xs text-white/30">animals contributed</div>
                <div className="mt-4 space-y-2">
                  {(payload?.own ?? []).slice(0, 5).map((item) => <div key={item.snake_id} className="rounded-xl border border-white/[.05] px-3 py-2 text-xs text-white/40"><span className="font-semibold text-emerald-100/60">{labels[item.subspecies]?.short}</span> · phenotype {Math.round(Number(item.phenotype_score))} · Gen {item.generation}</div>)}
                  {payload && !payload.own.length ? <div className="text-xs text-white/28">Your first qualifying contribution will appear here.</div> : null}
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-white/28">A map view is the next layer: each subspecies card can open an educational origin-region panel showing the broader area represented by the animals, with sourced notes about geography, trade, and conservation rather than pretending locality labels identify exact capture sites.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
