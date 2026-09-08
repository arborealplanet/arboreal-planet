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

type RegionInfo = {
  short: string;
  full: string;
  range: string;
  focus: string;
  localityContext: string;
  tradeLabels: string[];
  mapLabel: string;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";
const labels: Record<Subspecies, { short: string; full: string }> = {
  "Morelia azurea azurea": { short: "M. a. azurea", full: "Morelia azurea azurea" },
  "Morelia azurea pulcher": { short: "M. a. pulcher", full: "Morelia azurea pulcher" },
  "Morelia azurea utaraensis": { short: "M. a. utaraensis", full: "Morelia azurea utaraensis" },
  "Morelia viridis": { short: "M. viridis", full: "Morelia viridis" },
};

const regionInfo: Record<Subspecies, RegionInfo> = {
  "Morelia azurea azurea": {
    short: "M. a. azurea",
    full: "Morelia azurea azurea",
    range: "Cenderawasih Bay / Schouten Islands region of Indonesian New Guinea, including Biak, Numfor and Supiori.",
    focus: "Island populations separated from mainland New Guinea can preserve distinctive population histories. Conservation work here is best understood at the population and habitat level, not as a license to treat a hobby locality label as an exact collection coordinate.",
    localityContext: "Biak and Numfor are useful husbandry/pedigree labels in the game. They point toward island population history, but a label alone does not prove a snake's exact capture site or complete ancestry.",
    tradeLabels: ["Biak", "Numfor", "Supiori"],
    mapLabel: "Cenderawasih Bay islands",
  },
  "Morelia azurea pulcher": {
    short: "M. a. pulcher",
    full: "Morelia azurea pulcher",
    range: "Vogelkop / Bird's Head Peninsula region of western New Guinea, Indonesia; the taxon's type locality is near Manokwari.",
    focus: "This region is geographically complex. In-game stewardship treats pure subspecies ancestry as the biological unit while still preserving locality/trade names as historical context.",
    localityContext: "Manokwari, Sorong and other hobby locality names can be valuable pedigree clues, but they should not be interpreted as GPS-level provenance. Formal taxonomic range and hobby trade labels do not always line up perfectly.",
    tradeLabels: ["Manokwari", "Sorong", "Timika*"],
    mapLabel: "Bird's Head / Vogelkop",
  },
  "Morelia azurea utaraensis": {
    short: "M. a. utaraensis",
    full: "Morelia azurea utaraensis",
    range: "Northern New Guinea, from Papua in Indonesia eastward across northern Papua New Guinea toward the Huon Peninsula/Lae region.",
    focus: "A broad northern-New-Guinea subspecies means animals represented by different locality labels can still belong to the same subspecies. That is why the game rewards healthy pure-subspecies pairings instead of penalizing every locality cross.",
    localityContext: "Cyclops, Jayapura, Lereh and Wamena are retained as hobby/pedigree references. They help tell a breeding-history story without claiming exact collection sites.",
    tradeLabels: ["Cyclops", "Jayapura", "Lereh", "Wamena*"],
    mapLabel: "Northern New Guinea",
  },
  "Morelia viridis": {
    short: "M. viridis",
    full: "Morelia viridis",
    range: "Southern and other parts of New Guinea plus nearby islands including Aru; the species also occurs in northeastern Cape York, Australia.",
    focus: "The southern green python occupies a wider regional system than any one hobby locality name suggests. Stewardship therefore follows species-level purity here while pedigree labels stay visible for breeding history.",
    localityContext: "Aru and Merauke are useful game pedigree labels. The species' natural distribution extends beyond those two labels, so the map shows the broader biological range rather than only the hobby market categories.",
    tradeLabels: ["Aru", "Merauke", "southern New Guinea", "Cape York"],
    mapLabel: "Southern New Guinea / Aru",
  },
};

function parseSave(value: unknown): GameSave | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as GameSave;
}

function eligible(snake: Snake) {
  if (!snake.id || snake.classification !== "Pure" || !snake.subspecies) return false;
  return Number(snake.ancestry?.[snake.subspecies] ?? 0) >= 99.9;
}

function statusFor(payload: Payload | null, subspecies: Subspecies) {
  return payload?.status.find((row) => row.subspecies === subspecies) ?? null;
}

function OriginMap({ selected, onSelect }: { selected: Subspecies; onSelect: (value: Subspecies) => void }) {
  const active = (value: Subspecies) => selected === value;
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/[.07] bg-[#071510] p-3 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_35%,rgba(52,211,153,.09),transparent_38%),radial-gradient(circle_at_20%_70%,rgba(56,189,248,.07),transparent_32%)]" />
      <svg viewBox="0 0 1000 470" role="img" aria-label="Stylized educational map of New Guinea and nearby regions" className="relative z-10 h-auto w-full">
        <rect x="0" y="0" width="1000" height="470" rx="28" fill="#071510" />
        <path d="M214 234 C280 176 358 145 459 151 C535 126 643 139 731 173 C798 199 841 231 866 266 C807 273 758 286 701 301 C639 324 574 326 508 308 C431 330 348 318 290 290 C254 273 226 252 214 234Z" fill="#17372b" stroke="#3f6c58" strokeWidth="3" />
        <path d="M151 190 C173 166 202 157 226 166 C244 175 247 194 230 208 C208 221 177 218 158 205Z" fill="#17372b" stroke="#3f6c58" strokeWidth="3" />
        <ellipse cx="135" cy="218" rx="14" ry="9" fill="#17372b" stroke="#3f6c58" strokeWidth="2" />
        <ellipse cx="116" cy="199" rx="11" ry="7" fill="#17372b" stroke="#3f6c58" strokeWidth="2" />
        <ellipse cx="191" cy="342" rx="12" ry="19" fill="#17372b" stroke="#3f6c58" strokeWidth="2" />
        <ellipse cx="216" cy="352" rx="10" ry="16" fill="#17372b" stroke="#3f6c58" strokeWidth="2" />
        <path d="M825 347 C868 332 906 346 925 381 C913 406 885 429 847 446 C835 414 827 383 825 347Z" fill="#17372b" stroke="#3f6c58" strokeWidth="3" />

        <path d="M108 183 C127 169 153 165 170 178 C159 194 143 210 119 218 C105 208 101 195 108 183Z" fill={active("Morelia azurea azurea") ? "#34d399" : "#1d5f49"} opacity="0.86" />
        <path d="M214 231 C245 194 278 172 320 164 C331 183 322 218 296 249 C266 258 238 251 214 231Z" fill={active("Morelia azurea pulcher") ? "#fbbf24" : "#6b5420"} opacity="0.82" />
        <path d="M300 182 C410 145 575 143 715 177 C777 193 819 216 847 243 C774 240 713 246 649 260 C541 249 426 247 321 265 C311 236 304 207 300 182Z" fill={active("Morelia azurea utaraensis") ? "#38bdf8" : "#235b70"} opacity="0.78" />
        <path d="M301 267 C407 247 531 249 649 262 C723 251 795 248 857 268 C813 294 756 312 695 326 C620 350 519 343 448 326 C383 330 327 308 301 267Z" fill={active("Morelia viridis") ? "#a3e635" : "#4a6724"} opacity="0.72" />
        <ellipse cx="202" cy="346" rx="34" ry="25" fill={active("Morelia viridis") ? "#a3e635" : "#4a6724"} opacity="0.76" />
        <path d="M835 350 C873 341 900 354 916 380 C899 404 875 424 849 438 C839 407 834 379 835 350Z" fill={active("Morelia viridis") ? "#a3e635" : "#4a6724"} opacity="0.42" />

        <g fontFamily="system-ui, sans-serif" fill="#e7fff4">
          <text x="375" y="228" fontSize="19" opacity="0.75">NEW GUINEA</text>
          <text x="826" y="460" fontSize="11" opacity="0.5">Cape York</text>
          <text x="168" y="385" fontSize="11" opacity="0.5">Aru Islands</text>
        </g>

        <g>
          <circle cx="129" cy="194" r={active("Morelia azurea azurea") ? 12 : 9} fill="#34d399" stroke="#d1fae5" strokeWidth="2" />
          <circle cx="263" cy="207" r={active("Morelia azurea pulcher") ? 12 : 9} fill="#fbbf24" stroke="#fef3c7" strokeWidth="2" />
          <circle cx="548" cy="195" r={active("Morelia azurea utaraensis") ? 12 : 9} fill="#38bdf8" stroke="#e0f2fe" strokeWidth="2" />
          <circle cx="548" cy="301" r={active("Morelia viridis") ? 12 : 9} fill="#a3e635" stroke="#ecfccb" strokeWidth="2" />
        </g>
      </svg>

      <div className="relative z-20 mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(regionInfo) as Subspecies[]).map((subspecies) => (
          <button
            key={subspecies}
            type="button"
            onClick={() => onSelect(subspecies)}
            className={`rounded-xl border px-3 py-2 text-left text-xs transition ${active(subspecies) ? "border-emerald-200/30 bg-emerald-200/[.08] text-emerald-50" : "border-white/[.06] bg-black/10 text-white/40 hover:border-white/[.12]"}`}
          >
            <div className="font-black">{regionInfo[subspecies].short}</div>
            <div className="mt-1 text-[9px] opacity-65">{regionInfo[subspecies].mapLabel}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChondroConservationPartnerships() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [save, setSave] = useState<GameSave | null>(null);
  const [selected, setSelected] = useState("");
  const [mapSubspecies, setMapSubspecies] = useState<Subspecies>("Morelia azurea utaraensis");
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
  const mapInfo = regionInfo[mapSubspecies];
  const mapStatus = statusFor(payload, mapSubspecies);

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
      if (chosen.subspecies) setMapSubspecies(chosen.subspecies);
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
                  <button key={row.subspecies} type="button" onClick={() => setMapSubspecies(row.subspecies)} className={`rounded-2xl border p-4 text-left transition ${mapSubspecies === row.subspecies ? "border-emerald-200/25 bg-emerald-200/[.045]" : "border-white/[.06] bg-black/10 hover:border-white/[.12]"}`}>
                    <div className="text-[10px] font-black uppercase tracking-[.12em] text-emerald-100/50">{label?.short ?? row.subspecies}</div>
                    <div className="mt-1 text-xs italic text-white/30">{label?.full ?? row.subspecies}</div>
                    <div className="mt-4 flex items-end justify-between gap-3"><span className="text-2xl font-semibold text-white/72">{Number(row.stewardship_score).toFixed(1)}</span><span className="text-[9px] uppercase text-white/25">stewardship / 100</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-emerald-300/55" style={{ width: `${Math.min(100, Number(row.stewardship_score))}%` }} /></div>
                    <div className="mt-4 space-y-1 text-[10px] text-white/38">
                      <div>{row.contribution_count} community animal{Number(row.contribution_count) === 1 ? "" : "s"} contributed</div>
                      <div>Import representation: +{availabilityGain}% weighting</div>
                      <div>Import phenotype shift: +{row.phenotype_bonus} points</div>
                    </div>
                    <div className="mt-3 text-[9px] font-black uppercase tracking-[.1em] text-emerald-100/45">View origin region →</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-[28px] border border-sky-300/10 bg-sky-300/[.018] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.15em] text-sky-100/50">Interactive origin explorer</div>
                  <h3 className="mt-2 text-2xl font-semibold text-white/80">Where the subspecies comes from</h3>
                  <p className="mt-2 max-w-3xl text-xs leading-5 text-white/36">The highlighted areas are deliberately broad. They teach regional distribution without pretending hobby locality names are exact collection coordinates.</p>
                </div>
                <div className="rounded-2xl border border-white/[.06] bg-black/10 px-4 py-3 text-right">
                  <div className="text-[9px] uppercase text-white/25">Selected program</div>
                  <div className="mt-1 font-semibold text-emerald-100/70">{mapInfo.short}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
                <OriginMap selected={mapSubspecies} onSelect={setMapSubspecies} />
                <div className="rounded-[24px] border border-white/[.07] bg-black/10 p-5">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-emerald-100/50">{mapInfo.short}</div>
                  <div className="mt-1 text-sm italic text-white/38">{mapInfo.full}</div>
                  <div className="mt-5 text-[9px] font-black uppercase tracking-[.12em] text-white/25">Broad natural range</div>
                  <p className="mt-2 text-sm leading-6 text-white/48">{mapInfo.range}</p>
                  <div className="mt-5 text-[9px] font-black uppercase tracking-[.12em] text-white/25">Why this matters in the game</div>
                  <p className="mt-2 text-xs leading-5 text-white/38">{mapInfo.focus}</p>
                  <div className="mt-5 text-[9px] font-black uppercase tracking-[.12em] text-white/25">Locality / trade context</div>
                  <p className="mt-2 text-xs leading-5 text-white/38">{mapInfo.localityContext}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mapInfo.tradeLabels.map((item) => <span key={item} className="rounded-full border border-white/[.07] px-2.5 py-1 text-[9px] text-white/38">{item}</span>)}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[.06] p-3"><div className="text-[9px] uppercase text-white/25">Community transfers</div><div className="mt-1 text-xl font-semibold text-white/65">{mapStatus?.contribution_count ?? 0}</div></div>
                    <div className="rounded-xl border border-white/[.06] p-3"><div className="text-[9px] uppercase text-white/25">Stewardship</div><div className="mt-1 text-xl font-semibold text-emerald-100/65">{Number(mapStatus?.stewardship_score ?? 0).toFixed(1)}</div></div>
                  </div>
                  <p className="mt-4 text-[10px] leading-4 text-white/25">* Some hobby locality labels do not map neatly onto formal taxonomic boundaries. They remain in the game as pedigree/trade history, not proof of exact provenance.</p>
                </div>
              </div>
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

            <div className="mt-5 rounded-2xl border border-white/[.05] bg-black/10 p-4 text-xs leading-5 text-white/30">
              Educational range notes are based on modern green-python taxonomy and broad distribution summaries. The map is intentionally schematic, not a field-collection map. Future versions can add sourced habitat, legal-trade and conservation-history lessons for each region.
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
