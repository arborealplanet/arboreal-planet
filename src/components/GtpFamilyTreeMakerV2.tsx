"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GTP_LOCALITY_TAXON, type GtpLocality, type GtpTaxon } from "@/lib/green-tree-python-taxa";

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
  photoDataUrl?: string;
  visibility?: "private" | "public";
};

type AncestryKey = GtpTaxon | "Unknown";
type Ancestry = Partial<Record<AncestryKey, number>>;

const STORAGE_KEY = "arboreal_gtp_family_tree_v1";
const localities = Object.keys(GTP_LOCALITY_TAXON) as GtpLocality[];
const UNKNOWN_ANCESTRY: Ancestry = { Unknown: 100 };
const EMPTY_IDS = new Set<string>();

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function combine(a: Ancestry, b: Ancestry): Ancestry {
  const keys = new Set<AncestryKey>([...(Object.keys(a) as AncestryKey[]), ...(Object.keys(b) as AncestryKey[])]);
  const out: Ancestry = {};
  for (const key of keys) {
    const value = roundPercent(((a[key] ?? 0) + (b[key] ?? 0)) / 2);
    if (value > 0) out[key] = value;
  }
  return out;
}

function founderAncestry(animal: TreeAnimal): Ancestry {
  if (animal.locality === "Mixed / Unknown") return UNKNOWN_ANCESTRY;
  return { [GTP_LOCALITY_TAXON[animal.locality]]: 100 };
}

function ancestryFor(animal: TreeAnimal, byId: Map<string, TreeAnimal>, seen = new Set<string>()): Ancestry {
  if (seen.has(animal.id)) return UNKNOWN_ANCESTRY;
  const nextSeen = new Set(seen).add(animal.id);
  const dam = animal.damId ? byId.get(animal.damId) : null;
  const sire = animal.sireId ? byId.get(animal.sireId) : null;

  if (dam && sire) return combine(ancestryFor(dam, byId, nextSeen), ancestryFor(sire, byId, nextSeen));
  if (dam) return combine(ancestryFor(dam, byId, nextSeen), UNKNOWN_ANCESTRY);
  if (sire) return combine(UNKNOWN_ANCESTRY, ancestryFor(sire, byId, nextSeen));
  return founderAncestry(animal);
}

function ancestryEntries(ancestry: Ancestry) {
  return (Object.entries(ancestry) as Array<[AncestryKey, number]>)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => a[0] === "Unknown" ? 1 : b[0] === "Unknown" ? -1 : b[1] - a[1]);
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatAncestry(ancestry: Ancestry) {
  return ancestryEntries(ancestry)
    .map(([key, value]) => key === "Unknown" ? `${formatPercent(value)} unknown ancestry` : `${formatPercent(value)} ${key}`)
    .join(" · ");
}

function ancestryLabel(ancestry: Ancestry) {
  const entries = ancestryEntries(ancestry);
  const unknown = ancestry.Unknown ?? 0;
  const known = entries.filter(([key]) => key !== "Unknown");
  if (!known.length) return "Unknown ancestry";
  if (unknown > 0) return "Partial ancestry known";
  if (known.length === 1 && known[0][1] >= 99.9) return `Pure ${known[0][0]}`;
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
    photoDataUrl: "",
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

async function compressAnimalPhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Please choose an image under 12 MB.");
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const maxSide = 640;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that image.");
    context.drawImage(image, 0, 0, width, height);
    const webp = canvas.toDataURL("image/webp", 0.76);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.76);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function AnimalPhoto({ animal, className = "h-20 w-20" }: { animal: TreeAnimal; className?: string }) {
  if (!animal.photoDataUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={animal.photoDataUrl} alt={`${animal.name || "Animal"} pedigree photo`} className={`${className} shrink-0 rounded-xl border border-white/[.08] object-cover`} />;
}

function AnimalNode({ animal, byId, depth = 0, trail = new Set<string>() }: { animal: TreeAnimal; byId: Map<string, TreeAnimal>; depth?: number; trail?: Set<string> }) {
  const ancestry = ancestryFor(animal, byId);
  const dam = animal.damId ? byId.get(animal.damId) : null;
  const sire = animal.sireId ? byId.get(animal.sireId) : null;
  const cycle = trail.has(animal.id);
  const nextTrail = new Set(trail).add(animal.id);

  if (cycle) return <div className="rounded-xl border border-amber-200/10 bg-amber-200/[.02] p-3 text-xs text-amber-100/45">Circular parent link detected in imported data.</div>;

  return (
    <div className="min-w-0">
      <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
        <div className="flex items-start gap-3">
          <AnimalPhoto animal={animal} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-sm font-semibold text-white/78">{animal.name || "Unnamed animal"}</div>
              <span className="rounded-full border border-emerald-300/10 px-2 py-1 text-[9px] font-bold text-emerald-100/55">{ancestryLabel(ancestry)}</span>
            </div>
            <div className="mt-1 text-[10px] text-white/35">{animal.sex} · {animal.locality}</div>
            <div className="mt-2 text-[10px] leading-5 text-emerald-100/55">{formatAncestry(ancestry)}</div>
            {animal.breederId ? <div className="mt-1 text-[10px] text-white/30">ID: {animal.breederId}</div> : null}
            {animal.hatchYear ? <div className="mt-1 text-[10px] text-white/30">Hatched: {animal.hatchYear}</div> : null}
          </div>
        </div>
      </div>
      {depth < 3 && (dam || sire) ? <div className="mt-3 grid gap-3 border-l border-white/[.08] pl-4 md:grid-cols-2">
        {dam ? <AnimalNode animal={dam} byId={byId} depth={depth + 1} trail={nextTrail} /> : <div className="rounded-xl border border-dashed border-white/[.06] p-3 text-xs text-white/25">Dam unknown · contributes 50% unknown ancestry</div>}
        {sire ? <AnimalNode animal={sire} byId={byId} depth={depth + 1} trail={nextTrail} /> : <div className="rounded-xl border border-dashed border-white/[.06] p-3 text-xs text-white/25">Sire unknown · contributes 50% unknown ancestry</div>}
      </div> : null}
    </div>
  );
}

type AnimalFieldsProps = {
  animal: TreeAnimal;
  onChange: (patch: Partial<TreeAnimal>) => void;
  onPhoto: (file?: File) => void;
  potentialDams: TreeAnimal[];
  potentialSires: TreeAnimal[];
  editing?: boolean;
  selectedId?: string;
  blockedParentIds?: Set<string>;
};

function AnimalFields({ animal, onChange, onPhoto, potentialDams, potentialSires, editing = false, selectedId, blockedParentIds = EMPTY_IDS }: AnimalFieldsProps) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-xs text-white/38">Name<input value={animal.name} onChange={(event) => onChange({ name: event.target.value })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
    <label className="text-xs text-white/38">Sex<select value={animal.sex} onChange={(event) => onChange({ sex: event.target.value as Sex })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option>Unknown</option><option>Male</option><option>Female</option></select></label>
    <label className="text-xs text-white/38">Locality label<select value={animal.locality} onChange={(event) => onChange({ locality: event.target.value as TreeAnimal["locality"] })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option>Mixed / Unknown</option>{localities.map((locality) => <option key={locality}>{locality}</option>)}</select></label>
    <label className="text-xs text-white/38">Breeder / animal ID<input value={animal.breederId} onChange={(event) => onChange({ breederId: event.target.value })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
    <label className="text-xs text-white/38">Hatch year<input inputMode="numeric" value={animal.hatchYear} onChange={(event) => onChange({ hatchYear: event.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" /></label>
    <label className="text-xs text-white/38">{editing ? "Replace / add photo" : "Photo"}<input type="file" accept="image/*" onChange={(event) => { onPhoto(event.target.files?.[0]); event.target.value = ""; }} className="mt-2 block w-full text-xs text-white/45 file:mr-3 file:rounded-xl file:border-0 file:bg-white/[.06] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white/65" /></label>
    {animal.photoDataUrl ? <div className="flex items-center gap-3 rounded-xl border border-white/[.06] p-3 sm:col-span-2"><AnimalPhoto animal={animal} className="h-20 w-20" /><button type="button" onClick={() => onChange({ photoDataUrl: "" })} className="text-xs font-bold text-white/52">Remove photo</button></div> : null}
    <label className="text-xs text-white/38">Dam<select value={animal.damId ?? ""} onChange={(event) => onChange({ damId: event.target.value || null })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option value="">Unknown / founder</option>{potentialDams.filter((parent) => !editing || (parent.id !== selectedId && !blockedParentIds.has(parent.id))).map((parent) => <option key={parent.id} value={parent.id}>{parent.name || "Unnamed"}</option>)}</select></label>
    <label className="text-xs text-white/38">Sire<select value={animal.sireId ?? ""} onChange={(event) => onChange({ sireId: event.target.value || null })} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75"><option value="">Unknown / founder</option>{potentialSires.filter((parent) => !editing || (parent.id !== selectedId && !blockedParentIds.has(parent.id))).map((parent) => <option key={parent.id} value={parent.id}>{parent.name || "Unnamed"}</option>)}</select></label>
    <label className="text-xs text-white/38 sm:col-span-2">Notes<textarea value={animal.notes} onChange={(event) => onChange({ notes: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-white/[.08] bg-black/25 p-3 text-base text-white/75" /></label>
  </div>;
}

export function GtpFamilyTreeMakerV2() {
  const [animals, setAnimals] = useState<TreeAnimal[]>([]);
  const [selectedId, setSelectedId] = useState("");
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
  const selectedAncestry = selected ? ancestryFor(selected, byId) : UNKNOWN_ANCESTRY;
  const blockedParentIds = selected ? descendantIds(selected.id, animals) : EMPTY_IDS;
  const potentialDams = animals.filter((animal) => animal.sex !== "Male");
  const potentialSires = animals.filter((animal) => animal.sex !== "Female");

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

  async function setPhoto(target: "draft" | "selected", file?: File) {
    if (!file) return;
    try {
      const photoDataUrl = await compressAnimalPhoto(file);
      if (target === "draft") setDraft((current) => ({ ...current, photoDataUrl }));
      else if (selected) updateAnimal(selected.id, { photoDataUrl });
      setStatus("Pedigree photo ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not use that image.");
    }
  }

  function startOffspringFromSelected() {
    if (!selected) return;
    const parentPatch = selected.sex === "Male" ? { sireId: selected.id } : { damId: selected.id };
    setDraft(newAnimal(parentPatch));
    setStatus(`New offspring form started from ${selected.name}.`);
  }

  function startOffspringFromPair(damId: string, sireId: string) {
    setDraft(newAnimal({ damId: damId || null, sireId: sireId || null }));
    setStatus("New offspring form started with both parents selected.");
  }

  function deleteSelected() {
    if (!selected || !window.confirm(`Delete ${selected.name}? Offspring will remain, but this parent link will be cleared.`)) return;
    setAnimals((current) => current.filter((animal) => animal.id !== selected.id).map((animal) => ({
      ...animal,
      damId: animal.damId === selected.id ? null : animal.damId,
      sireId: animal.sireId === selected.id ? null : animal.sireId,
    })));
    setSelectedId("");
    setStatus(`${selected.name} deleted. Parent links were repaired.`);
  }

  function exportTree() {
    const blob = new Blob([JSON.stringify({ version: 3, animals }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "arboreal-planet-gtp-pedigree.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Pedigree backup exported, including photos.");
  }

  async function importTree(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as { animals?: TreeAnimal[] } | TreeAnimal[];
      const incoming = Array.isArray(parsed) ? parsed : parsed.animals;
      if (!Array.isArray(incoming)) throw new Error("Invalid pedigree file");
      const cleaned = incoming.filter((item) => item && typeof item.id === "string" && typeof item.name === "string").map((item) => ({
        ...newAnimal(),
        ...item,
        id: item.id,
        name: item.name,
      }));
      setAnimals(cleaned);
      setSelectedId(cleaned[0]?.id ?? "");
      setStatus(`Imported ${cleaned.length} animal${cleaned.length === 1 ? "" : "s"}. Circular links, if present, are safely masked.`);
    } catch {
      setStatus("Could not import that pedigree file.");
    }
  }

  return <section className="panel rounded-[30px] p-5 sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="section-kicker">Family tree maker</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.035em]">Build a real pedigree.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/46">Add actual animals, photos and parent links. Known parents contribute their real half of the pedigree; an unknown parent remains explicitly unknown instead of being inferred from the offspring&apos;s locality label.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!animals.length} onClick={exportTree} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55 disabled:opacity-30">Export backup</button><button type="button" onClick={() => importRef.current?.click()} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/55">Import backup</button><input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTree(file); event.target.value = ""; }} /></div>
    </div>

    {status ? <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div> : null}

    <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-4 text-xs leading-5 text-emerald-100/48"><strong className="text-emerald-100/70">Ancestry rule:</strong> locality labels describe the reported line. They do not fill gaps in a linked pedigree. If only one parent is known, the other 50% is shown as unknown ancestry.</div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-[24px] border border-white/[.07] bg-black/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-semibold text-white/70">Add animal</div>{(draft.damId || draft.sireId) ? <button type="button" onClick={() => setDraft(newAnimal())} className="text-[10px] font-bold text-white/35">Clear parents</button> : null}</div>
        <div className="mt-4"><AnimalFields animal={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onPhoto={(file) => void setPhoto("draft", file)} potentialDams={potentialDams} potentialSires={potentialSires} /></div>
        <button type="button" disabled={!draft.name.trim()} onClick={saveDraft} className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-[#06100c] disabled:opacity-30">Add to family tree</button>
      </div>

      <div className="rounded-[24px] border border-white/[.07] bg-black/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm font-semibold text-white/70">Pedigree view</div><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-xl border border-white/[.08] bg-black/25 px-3 py-2 text-sm text-white/70"><option value="">Choose animal</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name}</option>)}</select></div>
        {selected ? <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-4"><div className="flex items-center gap-3"><AnimalPhoto animal={selected} className="h-20 w-20" /><div className="min-w-0 flex-1"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-100/45">Selected animal</div><div className="mt-1 font-semibold text-white/75">{ancestryLabel(selectedAncestry)}</div><div className="mt-2 text-xs leading-5 text-white/40">{formatAncestry(selectedAncestry)}</div></div></div><button type="button" onClick={startOffspringFromSelected} className="mt-3 rounded-xl border border-emerald-300/15 px-3 py-2 text-[10px] font-bold text-emerald-100/65">Create offspring from this animal</button></div> : null}
        <div className="mt-5">{selected ? <AnimalNode animal={selected} byId={byId} /> : <div className="rounded-2xl border border-dashed border-white/[.07] p-8 text-center text-sm text-white/28">Add an animal to start your tree.</div>}</div>
      </div>
    </div>

    {selected ? <div className="mt-5 rounded-[24px] border border-white/[.06] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-white/70">Edit selected animal</div><div className="mt-1 text-[10px] text-white/28">Changes save automatically in this browser.</div></div><button type="button" onClick={deleteSelected} className="rounded-xl border border-red-300/15 px-3 py-2 text-[10px] font-bold text-red-100/60">Delete animal</button></div><div className="mt-4"><AnimalFields animal={selected} editing selectedId={selected.id} blockedParentIds={blockedParentIds} onChange={(patch) => updateAnimal(selected.id, patch)} onPhoto={(file) => void setPhoto("selected", file)} potentialDams={potentialDams} potentialSires={potentialSires} /></div>{selected.damId || selected.sireId ? <button type="button" onClick={() => startOffspringFromPair(selected.damId ?? "", selected.sireId ?? "")} className="mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[.035] px-4 py-2.5 text-xs font-bold text-amber-100/65">Create another offspring from this pairing</button> : null}</div> : null}
  </section>;
}
