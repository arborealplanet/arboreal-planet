"use client";

import { useMemo, useState } from "react";

export type SnakeReferenceAnimal = {
  id: string;
  animal_code: string | null;
  split_group?: string | null;
  taxon: string;
  locality: string | null;
  life_stage: string;
  neonate_color: string;
  label_confidence: string;
  purity_status: string;
  source_type: string;
  source_name: string | null;
  source_url?: string | null;
  notes?: string | null;
  review_status?: string;
  review_notes?: string | null;
  dataset_split?: string;
  rights_status?: string;
  rights_notes?: string | null;
  training_eligible: boolean;
  challenge_eligible?: boolean;
  created_at: string;
};

export type SnakeReferenceMedia = {
  id: string;
  animal_id: string;
  original_name: string | null;
  mime_type: string | null;
  created_at: string;
  url?: string;
  view_type?: string;
  quality_status?: string;
  is_primary?: boolean;
  life_stage_override?: string | null;
  neonate_color_override?: string | null;
  capture_date?: string | null;
  approximate_age_days?: number | null;
};

type Detail = { animal: SnakeReferenceAnimal; media: SnakeReferenceMedia[] };

const field = "w-full rounded-2xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/18 focus:border-emerald-300/20";
const mini = "rounded-xl border border-white/[.07] bg-black/10 px-3 py-2 text-[10px] font-bold text-white/45 transition hover:border-emerald-300/15 hover:text-white/65";

export function SnakeSorterReferenceManager({
  animals,
  media,
  onRefresh,
}: {
  animals: SnakeReferenceAnimal[];
  media: SnakeReferenceMedia[];
  onRefresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [taxon, setTaxon] = useState("all");
  const [stage, setStage] = useState("all");
  const [color, setColor] = useState("all");
  const [review, setReview] = useState("all");
  const [split, setSplit] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [purity, setPurity] = useState("all");
  const [rights, setRights] = useState("all");
  const [training, setTraining] = useState("all");
  const [challenge, setChallenge] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const mediaCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of media) map.set(item.animal_id, (map.get(item.animal_id) ?? 0) + 1);
    return map;
  }, [media]);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return animals.filter((animal) => {
      if (taxon !== "all" && animal.taxon !== taxon) return false;
      if (stage !== "all" && animal.life_stage !== stage) return false;
      if (color !== "all" && animal.neonate_color !== color) return false;
      if (review !== "all" && (animal.review_status ?? "pending") !== review) return false;
      if (split !== "all" && (animal.dataset_split ?? "unassigned") !== split) return false;
      if (confidence !== "all" && animal.label_confidence !== confidence) return false;
      if (purity !== "all" && animal.purity_status !== purity) return false;
      if (rights !== "all" && (animal.rights_status ?? "unknown") !== rights) return false;
      if (training === "eligible" && !animal.training_eligible) return false;
      if (training === "excluded" && animal.training_eligible) return false;
      if (challenge === "eligible" && !animal.challenge_eligible) return false;
      if (challenge === "excluded" && animal.challenge_eligible) return false;
      if (attentionOnly) {
        const needsAttention =
          (animal.review_status ?? "pending") !== "approved" ||
          ["provisional","uncertain"].includes(animal.label_confidence) ||
          ["possible_mixed","hybrid","unknown"].includes(animal.purity_status) ||
          !animal.rights_status || animal.rights_status === "unknown" ||
          (animal.training_eligible && (!animal.dataset_split || animal.dataset_split === "unassigned"));
        if (!needsAttention) return false;
      }
      if (!normalized) return true;
      return [animal.animal_code, animal.split_group, animal.taxon, animal.locality, animal.source_name, animal.source_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [animals, query, taxon, stage, color, review, split, confidence, purity, rights, training, challenge, attentionOnly]);

  async function openAnimal(id: string) {
    setDetailLoading(true);
    setMessage("");
    const response = await fetch(`/api/snake-sorter/references/${id}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setDetail(data);
    else setMessage(data.error ?? "Could not load reference animal.");
    setDetailLoading(false);
  }

  async function saveAnimal(formData: FormData) {
    if (!detail) return;
    setSaving(true);
    setMessage("");
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries());
    payload.training_eligible = formData.get("training_eligible") === "true";
    payload.challenge_eligible = formData.get("challenge_eligible") === "true";
    const response = await fetch(`/api/snake-sorter/references/${detail.animal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage("Reference animal saved.");
      await Promise.all([openAnimal(detail.animal.id), onRefresh()]);
    } else setMessage(data.error ?? "Could not save reference animal.");
    setSaving(false);
  }

  async function addImages(formData: FormData) {
    if (!detail) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/snake-sorter/references/${detail.animal.id}`, { method: "POST", body: formData });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const duplicates = Array.isArray(data.duplicates) && data.duplicates.length ? ` ${data.duplicates.length} exact duplicate(s) skipped.` : "";
      const failed = Array.isArray(data.failed) && data.failed.length ? ` ${data.failed.length} failed.` : "";
      setMessage(`Added ${data.uploaded ?? 0} image(s).${duplicates}${failed}`);
      await Promise.all([openAnimal(detail.animal.id), onRefresh()]);
    } else setMessage(data.error ?? "Could not add images.");
    setSaving(false);
  }

  async function removeMedia(id: string) {
    if (!detail) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/snake-sorter/media/${id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("Reference image removed.");
      await Promise.all([openAnimal(detail.animal.id), onRefresh()]);
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "Could not remove image.");
    }
    setSaving(false);
  }


  async function updateMedia(item: SnakeReferenceMedia, patch: Partial<Pick<SnakeReferenceMedia, "view_type" | "quality_status" | "is_primary" | "life_stage_override" | "neonate_color_override" | "capture_date" | "approximate_age_days">>) {
    if (!detail) return;
    const payload = {
      view_type: patch.view_type ?? item.view_type ?? "unknown",
      quality_status: patch.quality_status ?? item.quality_status ?? "accepted",
      is_primary: patch.is_primary ?? item.is_primary ?? false,
      life_stage_override: patch.life_stage_override ?? item.life_stage_override ?? "",
      neonate_color_override: patch.neonate_color_override ?? item.neonate_color_override ?? "",
      capture_date: patch.capture_date ?? item.capture_date ?? "",
      approximate_age_days: patch.approximate_age_days ?? item.approximate_age_days ?? null,
    };
    const response = await fetch(`/api/snake-sorter/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not update image metadata.");
      return;
    }
    setDetail((current) => current ? {
      ...current,
      media: current.media.map((mediaItem) => mediaItem.id === item.id ? { ...mediaItem, ...payload } : mediaItem),
    } : current);
    setMessage("Image metadata updated.");
  }


  async function assignSplits() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/snake-sorter/splits", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(`Dataset splits assigned. ${data.changed ?? 0} record(s) changed.`);
      await onRefresh();
      if (detail) await openAnimal(detail.animal.id);
    } else setMessage(data.error ?? "Could not assign dataset splits.");
    setSaving(false);
  }

  const statusClass = (value: string) => {
    if (value === "approved") return "border-emerald-300/15 bg-emerald-300/[.05] text-emerald-100/65";
    if (value === "hold") return "border-amber-300/15 bg-amber-300/[.05] text-amber-100/65";
    if (value === "rejected") return "border-rose-300/15 bg-rose-300/[.05] text-rose-100/65";
    return "border-white/[.08] bg-white/[.025] text-white/38";
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <section className="panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="section-kicker">Reference library</div><h2 className="mt-2 text-2xl font-semibold">Animals & review queue</h2></div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={saving} onClick={() => void assignSplits()} className={mini}>Auto-assign splits</button>
            <a href="/api/snake-sorter/export?format=csv" className={mini}>Export CSV</a>
            <a href="/api/snake-sorter/export?format=json" className={mini}>Export JSON</a>
            <div className="rounded-full border border-white/[.07] px-3 py-2 text-[10px] font-bold text-white/30">{rows.length} shown</div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${field} sm:col-span-2`} placeholder="Search animal code, locality, source…" />
          <select value={taxon} onChange={(e) => setTaxon(e.target.value)} className={field}>
            <option value="all">All taxa</option>
            <option>Morelia azurea azurea</option><option>Morelia azurea pulcher</option><option>Morelia azurea utaraensis</option><option>Morelia viridis</option><option>Unknown / review</option>
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
            <option value="all">All stages</option><option value="hatchling">Hatchling</option><option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option><option value="unknown">Unknown</option>
          </select>
          <select value={color} onChange={(e) => setColor(e.target.value)} className={field}>
            <option value="all">All colors</option><option value="red">Red</option><option value="yellow">Yellow</option><option value="not_applicable">Not applicable</option><option value="unknown">Unknown</option>
          </select>
          <select value={review} onChange={(e) => setReview(e.target.value)} className={field}>
            <option value="all">All review states</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="hold">Hold</option><option value="rejected">Rejected</option>
          </select>
          <select value={split} onChange={(e) => setSplit(e.target.value)} className={field}>
            <option value="all">All dataset splits</option><option value="unassigned">Unassigned</option><option value="train">Train</option><option value="validation">Validation</option><option value="test">Test</option>
          </select>
          <select value={confidence} onChange={(e) => setConfidence(e.target.value)} className={field}>
            <option value="all">All label confidence</option><option value="confirmed">Confirmed</option><option value="strong">Strong</option><option value="provisional">Provisional</option><option value="uncertain">Uncertain</option>
          </select>
          <select value={purity} onChange={(e) => setPurity(e.target.value)} className={field}>
            <option value="all">All ancestry states</option><option value="known_pure">Known pure</option><option value="believed_pure">Believed pure</option><option value="possible_mixed">Possible mixed</option><option value="hybrid">Hybrid</option><option value="unknown">Unknown</option>
          </select>
          <select value={rights} onChange={(e) => setRights(e.target.value)} className={field}>
            <option value="all">All rights states</option><option value="owned_by_owner">Owned by me</option><option value="permission_granted">Permission granted</option><option value="private_reference_only">Private reference only</option><option value="unknown">Unknown rights</option>
          </select>
          <select value={training} onChange={(e) => setTraining(e.target.value)} className={field}>
            <option value="all">All training states</option><option value="eligible">Training eligible</option><option value="excluded">Reference only / excluded</option>
          </select>
          <select value={challenge} onChange={(e) => setChallenge(e.target.value)} className={field}>
            <option value="all">All challenge states</option><option value="eligible">Challenge / OOD eligible</option><option value="excluded">Not challenge eligible</option>
          </select>
          <button type="button" onClick={() => setAttentionOnly((value) => !value)} className={`${mini} ${attentionOnly ? "border-amber-300/20 bg-amber-300/[.05] text-amber-100/65" : ""}`}>{attentionOnly ? "Showing needs attention" : "Needs attention"}</button>
          <button type="button" onClick={() => { setQuery(""); setTaxon("all"); setStage("all"); setColor("all"); setReview("all"); setSplit("all"); setConfidence("all"); setPurity("all"); setRights("all"); setTraining("all"); setChallenge("all"); setAttentionOnly(false); }} className={mini}>Reset filters</button>
        </div>

        <div className="mt-5 max-h-[760px] space-y-2 overflow-y-auto pr-1">
          {rows.length === 0 ? <div className="rounded-2xl border border-dashed border-white/[.08] p-8 text-center text-xs text-white/25">No animals match these filters.</div> :
            rows.map((animal) => {
              const active = detail?.animal.id === animal.id;
              const reviewValue = animal.review_status ?? "pending";
              return <button type="button" key={animal.id} onClick={() => void openAnimal(animal.id)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-emerald-300/20 bg-emerald-300/[.04]" : "border-white/[.055] bg-black/[.06] hover:border-white/[.1]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/65">{animal.animal_code || animal.locality || "Uncoded reference"}</div>
                    <div className="mt-1 truncate text-[10px] italic text-white/30">{animal.taxon}</div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${statusClass(reviewValue)}`}>{reviewValue}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[9px] uppercase tracking-[.06em] text-white/25">
                  <span>{animal.locality || "No locality"}</span><span>•</span><span>{animal.life_stage}</span><span>•</span><span>{animal.neonate_color.replace("_"," ")}</span><span>•</span><span>{mediaCount.get(animal.id) ?? 0} images</span><span>•</span><span>{animal.dataset_split ?? "unassigned"}</span>{animal.split_group && <><span>•</span><span>group {animal.split_group}</span></>}
                </div>
              </button>;
            })
          }
        </div>
      </section>

      <section className="panel rounded-[28px] p-5 sm:p-6">
        {detailLoading ? <div className="grid min-h-[420px] place-items-center text-sm text-white/28">Loading reference animal…</div> :
        !detail ? <div className="grid min-h-[420px] place-items-center text-center"><div><div className="text-4xl text-white/14">◇</div><div className="mt-4 text-sm font-semibold text-white/38">Select an animal to review it</div><div className="mt-2 text-xs text-white/22">Its photos, provenance, review state and dataset split will appear here.</div></div></div> :
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="section-kicker">Reference animal</div>
              <h3 className="mt-2 text-2xl font-semibold">{detail.animal.animal_code || detail.animal.locality || "Uncoded reference"}</h3>
              <div className="mt-1 text-xs italic text-white/30">{detail.animal.taxon}</div>
            </div>
            <span className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] ${statusClass(detail.animal.review_status ?? "pending")}`}>{detail.animal.review_status ?? "pending"}</span>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.12em] text-white/28">Reference photos</div><div className="mt-1 text-[10px] text-white/20">{detail.media.length} image(s) attached to this individual</div></div></div>
            {detail.media.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {detail.media.map((item) => <div key={item.id} className="overflow-hidden rounded-2xl border border-white/[.06] bg-black/15">
                <div className="relative aspect-square bg-black/25">
                  <img src={item.url} alt="" className="h-full w-full object-contain" />
                  {item.is_primary && <span className="absolute left-2 top-2 rounded-full border border-emerald-300/15 bg-black/65 px-2 py-1 text-[8px] font-black uppercase tracking-[.08em] text-emerald-100/70">Primary</span>}
                </div>
                <div className="space-y-2 p-2">
                  <div className="flex items-center gap-2"><div className="min-w-0 flex-1 truncate text-[9px] text-white/28">{item.original_name || "reference image"}</div><button disabled={saving} type="button" onClick={() => void removeMedia(item.id)} className="rounded-lg px-2 py-1 text-[9px] font-bold text-rose-200/45 hover:bg-rose-300/[.05] hover:text-rose-200">Remove</button></div>
                  <select value={item.view_type ?? "unknown"} onChange={(e) => void updateMedia(item,{view_type:e.target.value})} className="w-full rounded-xl border border-white/[.06] bg-black/20 px-2 py-1.5 text-[9px] text-white/45 outline-none">
                    <option value="unknown">View: unknown</option><option value="full_body">Full body</option><option value="head">Head</option><option value="dorsal">Dorsal</option><option value="left_lateral">Left lateral</option><option value="right_lateral">Right lateral</option><option value="tail">Tail</option><option value="other">Other</option>
                  </select>
                  <select value={item.quality_status ?? "accepted"} onChange={(e) => void updateMedia(item,{quality_status:e.target.value})} className="w-full rounded-xl border border-white/[.06] bg-black/20 px-2 py-1.5 text-[9px] text-white/45 outline-none">
                    <option value="accepted">Image accepted</option><option value="hold">Hold image</option><option value="rejected">Reject image</option>
                  </select>
                  <select value={item.life_stage_override ?? ""} onChange={(e) => void updateMedia(item,{life_stage_override:e.target.value})} className="w-full rounded-xl border border-white/[.06] bg-black/20 px-2 py-1.5 text-[9px] text-white/45 outline-none">
                    <option value="">Use animal stage</option><option value="hatchling">Hatchling</option><option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option><option value="unknown">Unknown</option>
                  </select>
                  <select value={item.neonate_color_override ?? ""} onChange={(e) => void updateMedia(item,{neonate_color_override:e.target.value})} className="w-full rounded-xl border border-white/[.06] bg-black/20 px-2 py-1.5 text-[9px] text-white/45 outline-none">
                    <option value="">Use animal color</option><option value="red">Red</option><option value="yellow">Yellow</option><option value="not_applicable">Not applicable</option><option value="unknown">Unknown</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={item.capture_date ?? ""} onChange={(e) => void updateMedia(item,{capture_date:e.target.value})} className="rounded-xl border border-white/[.06] bg-black/20 px-2 py-1.5 text-[9px] text-white/45 outline-none" />
                    <input type="number" min="0" placeholder="Age days" value={item.approximate_age_days ?? ""} onChange={(e) => void updateMedia(item,{approximate_age_days:e.target.value ? Number(e.target.value) : null})} className="rounded-xl border border-white/[.06] bg-black/20 px-2 py-1.5 text-[9px] text-white/45 outline-none" />
                  </div>
                  <label className="flex items-center gap-2 text-[9px] text-white/28"><input type="checkbox" checked={Boolean(item.is_primary)} onChange={(e) => void updateMedia(item,{is_primary:e.target.checked})} className="h-3.5 w-3.5 accent-emerald-300" />Primary representative image</label>
                </div>
              </div>)}
            </div> : <div className="mt-3 rounded-2xl border border-dashed border-white/[.08] p-8 text-center text-xs text-white/22">No images attached yet.</div>}

            <form action={addImages} className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[.055] bg-black/[.06] p-3">
              <input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple required className="min-w-0 flex-1 text-[10px] text-white/30 file:mr-3 file:rounded-xl file:border-0 file:bg-white/[.06] file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white/50" />
              <button disabled={saving} className={mini}>Add photos</button>
            </form>
          </div>

          <form key={detail.animal.id} action={saveAnimal} className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Taxon<select name="taxon" defaultValue={detail.animal.taxon} className={`${field} mt-2`}><option>Morelia azurea azurea</option><option>Morelia azurea pulcher</option><option>Morelia azurea utaraensis</option><option>Morelia viridis</option><option>Unknown / review</option></select></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Locality<input name="locality" defaultValue={detail.animal.locality ?? ""} className={`${field} mt-2`} /></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Animal code<input name="animal_code" defaultValue={detail.animal.animal_code ?? ""} className={`${field} mt-2`} /></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Related / split group<input name="split_group" defaultValue={detail.animal.split_group ?? ""} className={`${field} mt-2`} placeholder="Optional clutch / sibling / line group" /></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Life stage<select name="life_stage" defaultValue={detail.animal.life_stage} className={`${field} mt-2`}><option value="hatchling">Hatchling</option><option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option><option value="unknown">Unknown</option></select></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Neonate color<select name="neonate_color" defaultValue={detail.animal.neonate_color} className={`${field} mt-2`}><option value="red">Red</option><option value="yellow">Yellow</option><option value="not_applicable">Not applicable</option><option value="unknown">Unknown</option></select></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Label confidence<select name="label_confidence" defaultValue={detail.animal.label_confidence} className={`${field} mt-2`}><option value="confirmed">Confirmed</option><option value="strong">Strong</option><option value="provisional">Provisional</option><option value="uncertain">Uncertain</option></select></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Purity<select name="purity_status" defaultValue={detail.animal.purity_status} className={`${field} mt-2`}><option value="known_pure">Known pure</option><option value="believed_pure">Believed pure</option><option value="possible_mixed">Possible mixed</option><option value="hybrid">Hybrid</option><option value="unknown">Unknown</option></select></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Source type<select name="source_type" defaultValue={detail.animal.source_type} className={`${field} mt-2`}><option value="personal">Personal</option><option value="breeder">Breeder</option><option value="listing">Listing</option><option value="publication">Publication</option><option value="other">Other</option></select></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Source name<input name="source_name" defaultValue={detail.animal.source_name ?? ""} className={`${field} mt-2`} /></label>
            <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Source URL<input name="source_url" type="url" defaultValue={detail.animal.source_url ?? ""} className={`${field} mt-2`} /></label>

            <div className="sm:col-span-2 mt-2 rounded-2xl border border-amber-300/10 bg-amber-300/[.02] p-4">
              <div className="text-[9px] font-black uppercase tracking-[.12em] text-amber-100/42">Dataset governance</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Review status<select name="review_status" defaultValue={detail.animal.review_status ?? "pending"} className={`${field} mt-2`}><option value="pending">Pending review</option><option value="approved">Approved</option><option value="hold">Hold / questionable</option><option value="rejected">Rejected</option></select></label>
                <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Dataset split<select name="dataset_split" defaultValue={detail.animal.dataset_split ?? "unassigned"} className={`${field} mt-2`}><option value="unassigned">Unassigned</option><option value="train">Train</option><option value="validation">Validation</option><option value="test">Test</option></select></label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Rights / use status<select name="rights_status" defaultValue={detail.animal.rights_status ?? "unknown"} className={`${field} mt-2`}><option value="owned_by_owner">Owned by me</option><option value="permission_granted">Permission granted</option><option value="private_reference_only">Private reference only</option><option value="unknown">Unknown / not reviewed</option></select></label>
                <label className="text-[9px] font-black uppercase tracking-[.1em] text-white/28">Rights notes<input name="rights_notes" defaultValue={detail.animal.rights_notes ?? ""} className={`${field} mt-2 normal-case tracking-normal`} /></label>
              </div>
              <label className="mt-3 flex items-center gap-3 rounded-xl border border-white/[.05] p-3 text-xs text-white/40"><input name="training_eligible" value="true" type="checkbox" defaultChecked={detail.animal.training_eligible} className="h-4 w-4 accent-emerald-300" />Candidate for future model training/validation</label>
              <label className="mt-3 flex items-start gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[.02] p-3 text-xs text-white/40"><input name="challenge_eligible" value="true" type="checkbox" defaultChecked={Boolean(detail.animal.challenge_eligible)} className="mt-0.5 h-4 w-4 accent-amber-300" /><span><span className="block text-amber-50/55">Challenge / OOD example</span><span className="mt-1 block text-[9px] leading-4 text-white/22">Held out of clean classifier supervision; useful for rejection and difficult-case evaluation.</span></span></label>
              <label className="mt-3 block text-[9px] font-black uppercase tracking-[.1em] text-white/28">Review notes<textarea name="review_notes" defaultValue={detail.animal.review_notes ?? ""} className={`${field} mt-2 min-h-20 resize-y normal-case tracking-normal`} placeholder="Why approved, held or rejected; label concerns; provenance issues…" /></label>
            </div>

            <label className="sm:col-span-2 text-[9px] font-black uppercase tracking-[.1em] text-white/28">General notes<textarea name="notes" defaultValue={detail.animal.notes ?? ""} className={`${field} mt-2 min-h-24 resize-y normal-case tracking-normal`} /></label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button disabled={saving} className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black text-[#06100c] disabled:opacity-50">{saving ? "Saving…" : "Save animal"}</button>{message && <span className="text-xs text-white/38">{message}</span>}</div>
          </form>
        </div>}
      </section>
    </div>
  );
}
