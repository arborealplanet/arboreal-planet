"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GTP_LOCALITY_TAXON,
  type GtpLocality,
  type GtpTaxon,
} from "@/lib/green-tree-python-taxa";

type Sex = "Unknown" | "Male" | "Female";
type TreeAnimal = {
  id: string;
  name: string;
  sex: Sex;
  locality: GtpLocality | "Mixed / Unknown";
  breederId: string;
  hatchYear: string;
  notes: string;
  damId: string | null;
  sireId: string | null;
};

type Ancestry = Partial<Record<GtpTaxon, number>>;

const STORAGE_KEY = "arboreal_gtp_family_tree_v1";
const localities = Object.keys(GTP_LOCALITY_TAXON) as GtpLocality[];

function combine(a: Ancestry, b: Ancestry): Ancestry {
  const keys = new Set<GtpTaxon>([...(Object.keys(a) as GtpTaxon[]), ...(Object.keys(b) as GtpTaxon[])]);
  const out: Ancestry = {};
  for (const key of keys) {
    const value = Math.round((((a[key] ?? 0) + (b[key] ?? 0)) / 2) * 10) / 10;
    if (value > 0) out[key] = value;
  }
  return out;
}

function founderAncestry(animal: TreeAnimal): Ancestry {
  if (animal.locality === "Mixed / Unknown") return {};
  return { [GTP_LOCALITY_TAXON[animal.locality]]: 100 };
}

function ancestryFor(animal: TreeAnimal, byId: Map<string, TreeAnimal>, seen = new Set<string>()): Ancestry {
  if (seen.has(animal.id)) return {};
  const nextSeen = new Set(seen).add(animal.id);
  const dam = animal.damId ? byId.get(animal.damId) : null;
  const sire = animal.sireId ? byId.get(animal.sireId) : null;
  if (dam && sire) return combine(ancestryFor(dam, byId, nextSeen), ancestryFor(sire, byId, nextSeen));
  return founderAncestry(animal);
}

function ancestryEntries(ancestry: Ancestry) {
  return (Object.entries(ancestry) as Array<[GtpTaxon, number]>)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1]);
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatAncestry(ancestry: Ancestry) {
  const entries = ancestryEntries(ancestry);
  if (!entries.length) return "Subspecies ancestry unknown";
  return entries.map(([taxon, value]) => `${formatPercent(value)} ${taxon}`).join(" · ");
}

function ancestryLabel(ancestry: Ancestry) {
  const entries = ancestryEntries(ancestry);
  if (!entries.length) return "Unknown ancestry";
  if (entries.length === 1 && entries[0][1] >= 99.9) return `Pure ${entries[0][0]}`;
  return "Mixed subspecies ancestry";
}

function newAnimal(patch: Partial<TreeAnimal> = {}): TreeAnimal {
  return {
    id: crypto.randomUUID(),
    name: "",
    sex: "Unknown",
    locality: "Mixed / Unknown",
    breederId: "",
    hatchYear: "",
    notes: "",
    damId: null,
    sireId: null,
    ...patch,
  };
}

function descendantIds(rootId: string, animals: TreeAnimal[]) {
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    for (const animal of animals) {
      if ((animal.damId === current || animal.sireId === current) && !result.has(animal.id)) {
        result.add(animal.id);
        queue.push(animal.id);
      }
    }
  }
  return result;
}

function AnimalNode({ animal, byId, depth = 0 }: { animal: TreeAnimal; byId: Map<string, TreeAnimal>; depth?: number }) {
  const ancestry = ancestryFor(animal, byId);
  const dam = animal.damId ? byId.get(animal.damId) : null;
  const sire = animal.sireId ? byId.get(animal.sireId) : null;
  return (
    <div className="min-w-0">
      <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="text-sm font-semibold text-white/78">{animal.name || "Unnamed animal"}</div>
          <span className="rounded-full border border-emerald-300/10 px-2 py-1 text-[9px] font-bold text-emerald-100/55">{ancestryLabel(ancestry)}</span>
        </div>
        <div className="mt-1 text-[10px] text-white/35">{animal.sex} · {animal.locality}</div>
        <div className="mt-2 text-[10px] leading-5 text-emerald-100/55">{formatAncestry(ancestry)}</div>
        {animal.breederId ? <div className="mt-1 text-[10px] text-white/30">ID: {animal.breederId}</div> : null}
        {animal.hatchYear ? <div className="mt-1 text-[10px] text-white/30">Hatched: {animal.hatchYear}</div> : null}
      </div>
      {depth < 3 && (dam || sire) ? (
        <div className="mt-3 grid gap-3 border-l border-white/[.08] pl-4 md:grid-cols-2">
          {dam ? <AnimalNode animal={dam} byId={byId} depth={depth + 1} /> : <div className="rounded-xl border border-dashed border-white/[.06] p-3 text-xs text-white/25">Dam unknown</div>}
          {sire ? <AnimalNode animal={sire} byId={byId} depth={depth + 1} /> : <div className="rounded-xl border border-dashed border-white/[.06] p-3 text-xs text-white/25">Sire unknown</div>}
        </div>
      ) : null}
    </div>
  );
}

export function GtpFamilyTreeMaker() {
  const [animals, setAnimals] = useState<TreeAnimal[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<TreeAnimal>(() => newAnimal());
  const [status, setStatus] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TreeAnimal[];
      if (Array.isArray(parsed)) {
        setAnimals(parsed);
        if (parsed[0]) setSelectedId(parsed[0].id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(animals)); } catch {}
  }, [animals]);

  const byId = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const selectedAncestry = selected ? ancestryFor(selected, byId) : {};
  const blockedParentIds = selected ? descendantIds(selected.id, animals) : new Set<string>();

  function saveDraft() {
    const name = draft.name.trim();
    if (!name) return;
    const saved = { ...draft, name };
    setAnimals((current) => [...current, saved]);
    setSelectedId(saved.id);
    setDraft(newAnimal());
    setStatus(`${saved.name} added to the pedigree.`);
  }

  function updateAnimal(id: string, patch: Partial<TreeAnimal>) {
    setAnimals((current) => current.map((animal) => animal.id === id ? { ...animal, ...patch } : animal));
  }

  function startOffspringFromSelected() {
    if (!selected) return;
    setDraft(newAnimal(selected.sex === "Female" ? { damId: selected.id } : selected.sex === "Male" ? { sireId: selected.id } : { damId: selected.id }));
    setStatus(`New offspring form started from ${selected.name}.`);
  }

  function startOffspringFromPair(damId: string, sireId: string) {
    setDraft(newAnimal({ damId: damId || null, sireId: sireId || null }));
    setStatus("New offspring form started with both parents selected.");
  }

  function deleteSelected() {
    if (!selected) return;
    const ok = window.confirm(`Delete ${selected.name}? Offspring records will be kept, but their link to this parent will be cleared.`);
    if (!ok) return;
    setAnimals((current) => current
      .filter((animal) => animal.id !== selected.id)
      .map((animal) => ({
        ...animal,
        damId: animal.damId === selected.id ? null : animal.damId,
        sireId: animal.sireId === selected.id ? null : animal.sireId,
      })));
    setSelectedId("");
    setStatus(`${selected.name} deleted. Parent links were repaired.`);
  }

  function exportTree() {
    const blob = new Blob([JSON.stringify({ version: 1, animals }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "arboreal-planet-gtp-pedigree.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Pedigree backup exported.");
  }

  async function importTree(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as { animals?: TreeAnimal[] } | TreeAnimal[];
      const incoming = Array.isArray(parsed) ? parsed : parsed.animals;
      if (!Array.isArray(incoming)) throw new Error("Invalid pedigree file");
      const cleaned = incoming.filter((item) => item && typeof item.id === "string" && typeof item.name === "string");
      setAnimals(cleaned);
      setSelectedId(cleaned[0]?.id ?? "");
      setStatus(`Imported ${cleaned.length} animal${cleaned.length === 1 ? "" : "s"}.`);
    } catch {
      setStatus("Could not import that pedigree file.");
    }
  }

  const potentialDams = animals.filter((a) => a.sex !== "Male");
  const potentialSires = animals.filter((a) => a.sex !== "Female");

  return (
    <section className="panel rounded-[30px] p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">Family tree maker</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em]">Build a real pedigree.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/46">Add your actual animals, connect dams and sires, and let Arboreal Planet carry subspecies ancestry through the family tree. Records are saved in this browser for now.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!animals.length} onClick={exportTree} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55 disabled:opacity-30">Export backup</button>
          <button type="button" onClick={() => importRef.current?.click()} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">Import backup</button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTree(file); event.target.value = ""; }} />
        </div>
      </div>

      {status ? <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div> : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-[24px] border border-white/[.07] bg-black/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-white/70">Add animal</div>
            {(draft.damId || draft.sireId) ? <button type="button" onClick={() => setDraft(newAnimal())} className="text-[10px] font-bold text-white/35">Clear parents</button> : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/38">Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
            <label className="text-xs text-white/38">Sex<select value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value as Sex })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option>Unknown</option><option>Male</option><option>Female</option></select></label>
            <label className="text-xs text-white/38">Locality label<select value={draft.locality} onChange={(e) => setDraft({ ...draft, locality: e.target.value as TreeAnimal["locality"] })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option>Mixed / Unknown</option>{localities.map((locality) => <option key={locality}>{locality}</option>)}</select></label>
            <label className="text-xs text-white/38">Breeder / animal ID<input value={draft.breederId} onChange={(e) => setDraft({ ...draft, breederId: e.target.value })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
            <label className="text-xs text-white/38">Hatch year<input inputMode="numeric" value={draft.hatchYear} onChange={(e) => setDraft({ ...draft, hatchYear: e.target.value.replace(/[^0-9]/g, "").slice(0,4) })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
            <div className="hidden sm:block" />
            <label className="text-xs text-white/38">Dam<select value={draft.damId ?? ""} onChange={(e) => setDraft({ ...draft, damId: e.target.value || null })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option value="">Unknown / founder</option>{potentialDams.map((a) => <option key={a.id} value={a.id}>{a.name || "Unnamed"}</option>)}</select></label>
            <label className="text-xs text-white/38">Sire<select value={draft.sireId ?? ""} onChange={(e) => setDraft({ ...draft, sireId: e.target.value || null })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option value="">Unknown / founder</option>{potentialSires.map((a) => <option key={a.id} value={a.id}>{a.name || "Unnamed"}</option>)}</select></label>
            <label className="text-xs text-white/38 sm:col-span-2">Notes<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-white/[.08] bg-black/25 p-3 text-base text-white/75" /></label>
          </div>
          <button type="button" disabled={!draft.name.trim()} onClick={saveDraft} className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-[#06100c] disabled:opacity-30">Add to family tree</button>
        </div>

        <div className="rounded-[24px] border border-white/[.07] bg-black/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white/70">Pedigree view</div>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="rounded-xl border border-white/[.08] bg-black/25 px-3 py-2 text-sm text-white/70"><option value="">Choose animal</option>{animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          </div>
          {selected ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-100/45">Selected animal</div><div className="mt-1 font-semibold text-white/75">{ancestryLabel(selectedAncestry)}</div></div>
                <button type="button" onClick={startOffspringFromSelected} className="rounded-xl border border-emerald-300/15 px-3 py-2 text-[10px] font-bold text-emerald-100/65">Create offspring from this animal</button>
              </div>
              <div className="mt-2 text-xs leading-5 text-white/40">{formatAncestry(selectedAncestry)}</div>
            </div>
          ) : null}
          <div className="mt-5">{selected ? <AnimalNode animal={selected} byId={byId} /> : <div className="rounded-2xl border border-dashed border-white/[.07] p-8 text-center text-sm text-white/28">Add an animal to start your tree.</div>}</div>
        </div>
      </div>

      {selected ? (
        <div className="mt-5 rounded-[24px] border border-white/[.06] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-sm font-semibold text-white/70">Edit selected animal</div><div className="mt-1 text-[10px] text-white/28">Changes save automatically in this browser.</div></div>
            <button type="button" onClick={deleteSelected} className="rounded-xl border border-red-300/15 px-3 py-2 text-[10px] font-bold text-red-100/60">Delete animal</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-xs text-white/38">Name<input value={selected.name} onChange={(e) => updateAnimal(selected.id, { name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
            <label className="text-xs text-white/38">Sex<select value={selected.sex} onChange={(e) => updateAnimal(selected.id, { sex: e.target.value as Sex })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option>Unknown</option><option>Male</option><option>Female</option></select></label>
            <label className="text-xs text-white/38">Locality label<select value={selected.locality} onChange={(e) => updateAnimal(selected.id, { locality: e.target.value as TreeAnimal["locality"] })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option>Mixed / Unknown</option>{localities.map((locality) => <option key={locality}>{locality}</option>)}</select></label>
            <label className="text-xs text-white/38">Breeder / animal ID<input value={selected.breederId} onChange={(e) => updateAnimal(selected.id, { breederId: e.target.value })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
            <label className="text-xs text-white/38">Hatch year<input inputMode="numeric" value={selected.hatchYear} onChange={(e) => updateAnimal(selected.id, { hatchYear: e.target.value.replace(/[^0-9]/g, "").slice(0,4) })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
            <div className="hidden md:block" />
            <label className="text-xs text-white/38">Dam<select value={selected.damId ?? ""} onChange={(e) => updateAnimal(selected.id, { damId: e.target.value || null })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option value="">Unknown / founder</option>{animals.filter((a) => a.id !== selected.id && !blockedParentIds.has(a.id) && a.sex !== "Male").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="text-xs text-white/38">Sire<select value={selected.sireId ?? ""} onChange={(e) => updateAnimal(selected.id, { sireId: e.target.value || null })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option value="">Unknown / founder</option>{animals.filter((a) => a.id !== selected.id && !blockedParentIds.has(a.id) && a.sex !== "Female").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="text-xs text-white/38 md:col-span-2">Notes<textarea value={selected.notes} onChange={(e) => updateAnimal(selected.id, { notes: e.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-white/[.08] bg-black/25 p-3 text-base text-white/75" /></label>
          </div>
          {selected.damId || selected.sireId ? <button type="button" onClick={() => startOffspringFromPair(selected.damId ?? "", selected.sireId ?? "")} className="mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[.035] px-4 py-2.5 text-xs font-bold text-amber-100/65">Create another offspring from this pairing</button> : null}
        </div>
      ) : null}
    </section>
  );
}
