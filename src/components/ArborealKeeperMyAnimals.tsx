"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";
import {
  ARBOREAL_KEEPER_ENCLOSURES,
  type KeeperEnclosureId,
} from "@/lib/arboreal-keeper-enclosures";
import {
  ARBOREAL_KEEPER_SPECIES_BY_ID,
  type KeeperAssetVariant,
} from "@/lib/arboreal-keeper-species";
import {
  EMERALD_KEEPER_SAVE_KEY,
  emeraldSpeciesDisplayName,
  sanitizeEmeraldKeeperSave,
  type EmeraldAnimal,
  type EmeraldHousingUnit,
} from "@/lib/arboreal-keeper-emerald-engine";

type GtpAnimal = {
  id: string;
  name: string;
  sex?: string;
  lifeStage?: string;
  locality?: string;
  subspecies?: string;
  neonateColor?: "Red" | "Yellow";
  generation?: number;
  classification?: string;
  highBlack?: number;
  highWhite?: number;
  blueStripe?: number;
  yellowRetention?: number;
  blotches?: number;
};

type GtpSave = {
  colony?: GtpAnimal[];
  enclosures?: Record<string, number>;
};

type AnimalKind = "gtp" | "northern" | "basin";
type StageFilter = "All" | "Neonate" | "Subadult" | "Adult";

type UnifiedAnimal =
  | { kind: "gtp"; id: string; name: string; sex: string; stage: string; species: string; animal: GtpAnimal }
  | { kind: "northern" | "basin"; id: string; name: string; sex: string; stage: string; species: string; animal: EmeraldAnimal };

const CHONDRO_SAVE_KEY = "arboreal_chondro_breeder_v2";
const CHONDRO_SAVE_EVENT = "arboreal-chondro-breeder-save-change";
const EMERALD_SAVE_EVENT = "arboreal-keeper-emerald-save-updated";
const EMERALD_CLOUD_EVENT = "arboreal-keeper-emerald-cloud-loaded";

function normalizeStage(stage: string | undefined) {
  if (!stage) return "Unknown";
  if (stage === "Hatchling") return "Neonate";
  return stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase();
}

function loadLocalGtpSave(): GtpSave {
  try {
    const raw = window.localStorage.getItem(CHONDRO_SAVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GtpSave;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadLocalEmeraldSave() {
  try {
    const raw = window.localStorage.getItem(EMERALD_KEEPER_SAVE_KEY);
    return raw ? sanitizeEmeraldKeeperSave(JSON.parse(raw)) : sanitizeEmeraldKeeperSave(null);
  } catch {
    return sanitizeEmeraldKeeperSave(null);
  }
}

function emeraldRegistryAsset(animal: EmeraldAnimal): KeeperAssetVariant | null {
  if (!animal.assetId) return null;
  return ARBOREAL_KEEPER_SPECIES_BY_ID[animal.speciesId].assets.find((asset) => asset.id === animal.assetId) ?? null;
}

function emeraldSpriteStyle(animal: EmeraldAnimal): CSSProperties | null {
  const id = animal.assetId ?? "";
  const resolvedPath = emeraldRegistryAsset(animal)?.path ?? animal.assetPath;
  if (!resolvedPath) return null;

  let columns = 1;
  let rows = 1;
  let column = 0;
  let row = 0;

  if (id.startsWith("etb_northern_")) {
    const order = [
      "etb_northern_neonate_red_01",
      "etb_northern_neonate_green_01",
      "etb_northern_neonate_anaconda_01",
      "etb_northern_subadult_01",
      "etb_northern_adult_standard_01",
      "etb_northern_adult_standard_02",
      "etb_northern_adult_standard_03",
      "etb_northern_adult_anaconda_01",
    ];
    const index = order.indexOf(id);
    if (index < 0) return null;
    columns = 4;
    rows = 2;
    column = index % columns;
    row = Math.floor(index / columns);
  } else if (id.startsWith("etb_basin_neonate_")) {
    const index = Number(id.slice(-2)) - 1;
    if (!Number.isFinite(index) || index < 0 || index > 5) return null;
    columns = 3;
    rows = 2;
    column = index % columns;
    row = Math.floor(index / columns);
  } else if (id.startsWith("etb_basin_subadult_")) {
    const index = Number(id.slice(-2)) - 1;
    if (!Number.isFinite(index) || index < 0 || index > 2) return null;
    columns = 3;
    rows = 2;
    column = index;
    row = 0;
  } else if (id.startsWith("etb_basin_adult_")) {
    const index = Number(id.slice(-2)) - 1;
    if (!Number.isFinite(index) || index < 0 || index > 2) return null;
    columns = 3;
    rows = 2;
    column = index;
    row = 1;
  } else {
    return null;
  }

  const x = columns === 1 ? 0 : (column / (columns - 1)) * 100;
  const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
  return {
    backgroundImage: `url("${resolvedPath}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
  };
}

function housingForEmerald(animal: EmeraldAnimal, units: EmeraldHousingUnit[]) {
  const unit = units.find((candidate) => candidate.occupantId === animal.id);
  if (!unit) return { label: "Unassigned", detail: "Needs compatible housing" };
  const enclosure = ARBOREAL_KEEPER_ENCLOSURES.find((candidate) => candidate.id === unit.enclosureId);
  return {
    label: enclosure?.displayName ?? unit.enclosureId,
    detail: "Individual enclosure",
  };
}

function eligibleGtpHousing(stage: string) {
  const normalized = normalizeStage(stage);
  if (normalized === "Adult") return "PVC Enclosure";
  if (normalized === "Neonate") return "Chondro Dojo 2 Stack";
  if (normalized === "Subadult") return "Chondro Dojo 2 Stack / PVC Enclosure";
  return "Eligible GTP housing";
}

function EmeraldPortrait({ animal }: { animal: EmeraldAnimal }) {
  const style = emeraldSpriteStyle(animal);
  const directPath = emeraldRegistryAsset(animal)?.path ?? animal.assetPath;
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] border border-white/[.06] bg-[radial-gradient(circle_at_50%_35%,rgba(52,211,153,.12),transparent_46%),#020605]">
      {style ? (
        <div className="absolute inset-1 rounded-[16px] bg-black" style={style} role="img" aria-label={`${emeraldSpeciesDisplayName(animal.speciesId)} game artwork`} />
      ) : directPath ? (
        <Image src={directPath} alt={`${emeraldSpeciesDisplayName(animal.speciesId)} game artwork`} fill sizes="240px" className="object-contain p-1" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-3xl text-emerald-100/25">◆</div>
      )}
    </div>
  );
}

function GtpPortrait({ animal }: { animal: GtpAnimal }) {
  return (
    <div className="mx-auto max-w-[240px]">
      <ChondroSnakeIcon
        subspecies={animal.subspecies as never}
        name={animal.name}
        lifeStage={animal.lifeStage}
        neonateColor={animal.neonateColor}
        traits={{
          highBlack: Number(animal.highBlack ?? 0),
          highWhite: Number(animal.highWhite ?? 0),
          blueStripe: Number(animal.blueStripe ?? 0),
          yellowRetention: Number(animal.yellowRetention ?? 0),
          blotches: Number(animal.blotches ?? 0),
        }}
        compact
      />
    </div>
  );
}

export function ArborealKeeperMyAnimals() {
  const [gtpSave, setGtpSave] = useState<GtpSave>({});
  const [emeraldAnimals, setEmeraldAnimals] = useState<EmeraldAnimal[]>([]);
  const [emeraldHousing, setEmeraldHousing] = useState<EmeraldHousingUnit[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"All" | AnimalKind>("All");
  const [stage, setStage] = useState<StageFilter>("All");
  const [sex, setSex] = useState("All");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const syncLocal = () => {
      const localGtp = loadLocalGtpSave();
      const emerald = loadLocalEmeraldSave();
      if (cancelled) return;
      setGtpSave(localGtp);
      setEmeraldAnimals(emerald.animals);
      setEmeraldHousing(emerald.housingUnits);
      setHydrated(true);
    };

    async function syncCloudGtp() {
      syncLocal();
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const payload = await response.json() as { save?: { state?: GtpSave } };
        if (!cancelled && response.ok && payload.save?.state) setGtpSave(payload.save.state);
      } catch {
        // Local save remains authoritative while offline.
      }
    }

    void syncCloudGtp();
    const sync = () => syncLocal();
    window.addEventListener(CHONDRO_SAVE_EVENT, sync);
    window.addEventListener(EMERALD_SAVE_EVENT, sync);
    window.addEventListener(EMERALD_CLOUD_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      cancelled = true;
      window.removeEventListener(CHONDRO_SAVE_EVENT, sync);
      window.removeEventListener(EMERALD_SAVE_EVENT, sync);
      window.removeEventListener(EMERALD_CLOUD_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const allAnimals = useMemo<UnifiedAnimal[]>(() => {
    const gtps: UnifiedAnimal[] = (gtpSave.colony ?? []).map((animal) => ({
      kind: "gtp",
      id: animal.id,
      name: animal.name || "Unnamed Green Tree Python",
      sex: animal.sex || "Unknown",
      stage: normalizeStage(animal.lifeStage),
      species: "Green Tree Python",
      animal,
    }));
    const emeralds: UnifiedAnimal[] = emeraldAnimals.map((animal) => ({
      kind: animal.speciesId === "northern_emerald_tree_boa" ? "northern" : "basin",
      id: animal.id,
      name: animal.name || emeraldSpeciesDisplayName(animal.speciesId),
      sex: animal.sex,
      stage: normalizeStage(animal.lifeStage),
      species: emeraldSpeciesDisplayName(animal.speciesId),
      animal,
    }));
    return [...gtps, ...emeralds];
  }, [gtpSave.colony, emeraldAnimals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allAnimals.filter((animal) => {
      if (kind !== "All" && animal.kind !== kind) return false;
      if (stage !== "All" && animal.stage !== stage) return false;
      if (sex !== "All" && animal.sex !== sex) return false;
      if (!q) return true;
      const extra = animal.kind === "gtp"
        ? `${animal.animal.locality ?? ""} ${animal.animal.subspecies ?? ""} ${animal.animal.classification ?? ""}`
        : `${animal.animal.phase} ${animal.animal.neonateColor ?? ""}`;
      return `${animal.name} ${animal.species} ${extra}`.toLowerCase().includes(q);
    });
  }, [allAnimals, query, kind, stage, sex]);

  const counts = useMemo(() => ({
    total: allAnimals.length,
    gtp: allAnimals.filter((animal) => animal.kind === "gtp").length,
    northern: allAnimals.filter((animal) => animal.kind === "northern").length,
    basin: allAnimals.filter((animal) => animal.kind === "basin").length,
  }), [allAnimals]);

  if (!hydrated) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div className="rounded-[26px] border border-white/[.06] bg-white/[.02] p-5 text-sm text-white/40">Loading your animals…</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border border-emerald-300/12 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.065),transparent_32%),#04100b] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-100/45">Shared collection</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white/88">My Animals</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/42">Green Tree Pythons, Northern Emerald Tree Boas and Amazon Basin Emerald Tree Boas now appear together here. Species-specific breeding tools stay separate underneath the shared collection.</p>
          </div>
          <div className="rounded-2xl border border-white/[.065] bg-black/20 px-4 py-3 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/28">Collection</div>
            <div className="mt-1 text-2xl font-semibold text-white/78">{counts.total}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CountCard label="Green Tree Pythons" value={counts.gtp} />
          <CountCard label="Northern Emeralds" value={counts.northern} />
          <CountCard label="Amazon Basin Emeralds" value={counts.basin} />
          <CountCard label="Showing" value={filtered.length} accent />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, species, locality…"
            className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/75 outline-none focus:border-emerald-300/25"
          />
          <select value={kind} onChange={(event) => setKind(event.target.value as "All" | AnimalKind)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/65">
            <option value="All">All species</option>
            <option value="gtp">Green Tree Python</option>
            <option value="northern">Northern Emerald Tree Boa</option>
            <option value="basin">Amazon Basin Emerald Tree Boa</option>
          </select>
          <select value={stage} onChange={(event) => setStage(event.target.value as StageFilter)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/65">
            <option value="All">All life stages</option>
            <option value="Neonate">Neonate</option>
            <option value="Subadult">Subadult</option>
            <option value="Adult">Adult</option>
          </select>
          <select value={sex} onChange={(event) => setSex(event.target.value)} className="rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-xs text-white/65">
            <option value="All">All sexes</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => {
            if (entry.kind === "gtp") {
              const animal = entry.animal;
              return (
                <article key={`gtp:${entry.id}`} className="rounded-[22px] border border-white/[.06] bg-black/15 p-3">
                  <GtpPortrait animal={animal} />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white/82">{entry.name}</div>
                      <div className="mt-1 text-[10px] text-white/38">Green Tree Python · {entry.sex} · {entry.stage}</div>
                    </div>
                    <SpeciesBadge>Python</SpeciesBadge>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/[.055] bg-white/[.02] px-3 py-2 text-[10px] leading-5 text-white/42">
                    <div>{animal.subspecies || "Green Tree Python"}{animal.locality ? ` · ${animal.locality}` : ""}</div>
                    <div>Housing: {eligibleGtpHousing(animal.lifeStage ?? "")}</div>
                    <div className="text-white/27">Individual enclosure assignment will migrate from the existing GTP housing pool.</div>
                  </div>
                </article>
              );
            }

            const animal = entry.animal;
            const housing = housingForEmerald(animal, emeraldHousing);
            return (
              <article key={`emerald:${entry.id}`} className="rounded-[22px] border border-white/[.06] bg-black/15 p-3">
                <EmeraldPortrait animal={animal} />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/82">{entry.name}</div>
                    <div className="mt-1 text-[10px] text-white/38">{entry.species} · {entry.sex} · {entry.stage}</div>
                  </div>
                  <SpeciesBadge>Boa</SpeciesBadge>
                </div>
                <div className="mt-3 rounded-xl border border-white/[.055] bg-white/[.02] px-3 py-2 text-[10px] leading-5 text-white/42">
                  <div>{animal.phase === "anaconda" ? "Anaconda Phase · " : ""}Gen {animal.generation}</div>
                  <div>Housing: <span className={housing.label === "Unassigned" ? "text-amber-100/70" : "text-emerald-100/65"}>{housing.label}</span></div>
                  <div className="text-white/27">{housing.detail}</div>
                </div>
              </article>
            );
          })}
        </div>

        {!filtered.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/[.08] p-7 text-center text-sm text-white/35">No animals match the current filters.</div>
        ) : null}
      </div>
    </section>
  );
}

function CountCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? "border-emerald-300/12 bg-emerald-300/[.035]" : "border-white/[.055] bg-black/15"}`}>
      <div className="text-[8px] font-black uppercase tracking-[.12em] text-white/28">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent ? "text-emerald-100/75" : "text-white/72"}`}>{value}</div>
    </div>
  );
}

function SpeciesBadge({ children }: { children: string }) {
  return <span className="shrink-0 rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em] text-emerald-100/55">{children}</span>;
}
