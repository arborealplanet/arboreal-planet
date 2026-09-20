"use client";

import { useEffect, useMemo, useState } from "react";
import { SnakeSorterScanner } from "@/components/SnakeSorterScanner";
import { SnakeSorterReferenceManager } from "@/components/SnakeSorterReferenceManager";
import { SnakeSorterModelStatus } from "@/components/SnakeSorterModelStatus";

type ReferenceAnimal = {
  id: string;
  animal_code: string | null;
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
  created_at: string;
};

type ReferenceMedia = {
  id: string;
  animal_id: string;
  original_name: string | null;
  mime_type: string | null;
  view_type?: string;
  quality_status?: string;
  is_primary?: boolean;
  file_size_bytes?: number | null;
  created_at: string;
};

const field = "w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/18 focus:border-emerald-300/20";
const label = "block text-[10px] font-black uppercase tracking-[.12em] text-white/32";

export function SnakeSorterWorkspace() {
  const [animals, setAnimals] = useState<ReferenceAnimal[]>([]);
  const [media, setMedia] = useState<ReferenceMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/snake-sorter/references", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setAnimals(data.animals ?? []);
      setMedia(data.media ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/snake-sorter/references", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setAnimals(data.animals ?? []);
        setMedia(data.media ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const red = animals.filter((a) => a.neonate_color === "red").length;
    const yellow = animals.filter((a) => a.neonate_color === "yellow").length;
    const eligible = animals.filter((a) => a.training_eligible).length;
    return { animals: animals.length, images: media.length, red, yellow, eligible };
  }, [animals, media]);

  const mediaCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of media) counts.set(item.animal_id, (counts.get(item.animal_id) ?? 0) + 1);
    return counts;
  }, [media]);


  const taxonStats = useMemo(() => {
    const taxa = ["Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis"];
    return taxa.map((taxon) => {
      const rows = animals.filter((animal) => animal.taxon === taxon);
      return {
        taxon,
        total: rows.length,
        red: rows.filter((animal) => animal.neonate_color === "red").length,
        yellow: rows.filter((animal) => animal.neonate_color === "yellow").length,
        images: rows.reduce((sum, animal) => sum + (mediaCount.get(animal.id) ?? 0), 0),
      };
    });
  }, [animals, mediaCount]);


  const diagnostics = useMemo(() => {
    const approved = animals.filter((animal) => animal.review_status === "approved");
    const pending = animals.filter((animal) => !animal.review_status || animal.review_status === "pending");
    const noImages = animals.filter((animal) => (mediaCount.get(animal.id) ?? 0) === 0);
    const approvedUnassigned = approved.filter((animal) => !animal.dataset_split || animal.dataset_split === "unassigned");
    const acceptedMedia = media.filter((item) => (item.quality_status ?? "accepted") === "accepted");
    const approvedIds = new Set(approved.map((animal) => animal.id));
    const approvedViewCoverage = approved.map((animal) => {
      const views = new Set(acceptedMedia.filter((item) => item.animal_id === animal.id).map((item) => item.view_type ?? "unknown"));
      return {
        id: animal.id,
        hasFullBody: views.has("full_body"),
        hasHead: views.has("head"),
        hasDorsal: views.has("dorsal"),
        hasLateral: views.has("left_lateral") || views.has("right_lateral"),
      };
    });
    const approvedMissingCoreViews = approvedViewCoverage.filter((row) => !(row.hasFullBody && row.hasHead && row.hasDorsal && row.hasLateral)).length;
    const rejectedImages = media.filter((item) => item.quality_status === "rejected").length;
    const heldImages = media.filter((item) => item.quality_status === "hold").length;
    const acceptedApprovedImages = acceptedMedia.filter((item) => approvedIds.has(item.animal_id)).length;
    const train = approved.filter((animal) => animal.dataset_split === "train").length;
    const validation = approved.filter((animal) => animal.dataset_split === "validation").length;
    const test = approved.filter((animal) => animal.dataset_split === "test").length;

    const targets = [
      ["M. a. azurea · red neonate", "Morelia azurea azurea", "red"],
      ["M. a. azurea · yellow neonate", "Morelia azurea azurea", "yellow"],
      ["M. a. pulcher · red neonate", "Morelia azurea pulcher", "red"],
      ["M. a. pulcher · yellow neonate", "Morelia azurea pulcher", "yellow"],
      ["M. a. utaraensis · red neonate", "Morelia azurea utaraensis", "red"],
      ["M. a. utaraensis · yellow neonate", "Morelia azurea utaraensis", "yellow"],
      ["M. viridis · yellow neonate", "Morelia viridis", "yellow"],
    ] as const;

    const collectionTargets = targets.map(([label, taxon, color]) => {
      const count = animals.filter((animal) => animal.taxon === taxon && animal.life_stage === "neonate" && animal.neonate_color === color).length;
      const priority = count < 10 ? "High" : count < 25 ? "Medium" : "Lower";
      return { label, count, priority };
    }).sort((a, b) => a.count - b.count);

    return {
      approved: approved.length,
      pending: pending.length,
      noImages: noImages.length,
      approvedUnassigned: approvedUnassigned.length,
      approvedMissingCoreViews,
      acceptedApprovedImages,
      rejectedImages,
      heldImages,
      train,
      validation,
      test,
      collectionTargets,
    };
  }, [animals, mediaCount]);

  async function addReference(formData: FormData) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/snake-sorter/references", { method: "POST", body: formData });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const failed = Array.isArray(data.failed) && data.failed.length ? ` ${data.failed.length} image(s) failed.` : "";
      const duplicates = Array.isArray(data.duplicates) && data.duplicates.length ? ` ${data.duplicates.length} exact duplicate image(s) were not added.` : "";
      setMessage(`Reference animal added.${duplicates}${failed}`);
      await load();
    } else {
      setMessage(data.error ?? "Could not add reference animal.");
    }
    setSaving(false);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Reference animals", stats.animals],
          ["Reference images", stats.images],
          ["Red neonates", stats.red],
          ["Yellow neonates", stats.yellow],
          ["Training eligible", stats.eligible],
        ].map(([name, value]) => (
          <div key={String(name)} className="panel rounded-2xl p-4">
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/26">{name}</div>
            <div className="mt-2 text-2xl font-semibold text-white/72">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6"><SnakeSorterScanner /></div>

      <div className="mt-6"><SnakeSorterModelStatus /></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Reference intake</div>
          <h2 className="mt-3 text-2xl font-semibold">Add a known animal</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/38">These are deliberate reference records. Nothing from the scan workspace is automatically promoted into this library.</p>

          <form action={addReference} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className={label}>Taxon
              <select name="taxon" className={`${field} mt-2`} defaultValue="Morelia azurea utaraensis">
                <option>Morelia azurea azurea</option>
                <option>Morelia azurea pulcher</option>
                <option>Morelia azurea utaraensis</option>
                <option>Morelia viridis</option>
                <option>Unknown / review</option>
              </select>
            </label>

            <label className={label}>Locality
              <input name="locality" className={`${field} mt-2`} placeholder="Jayapura, Cyclops, Aru…" />
            </label>

            <label className={label}>Life stage
              <select name="life_stage" className={`${field} mt-2`} defaultValue="neonate">
                <option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option><option value="unknown">Unknown</option>
              </select>
            </label>

            <label className={label}>Neonate color
              <select name="neonate_color" className={`${field} mt-2`} defaultValue="red">
                <option value="red">Red</option><option value="yellow">Yellow</option><option value="not_applicable">Not applicable</option><option value="unknown">Unknown</option>
              </select>
            </label>

            <label className={label}>Label confidence
              <select name="label_confidence" className={`${field} mt-2`} defaultValue="provisional">
                <option value="confirmed">Confirmed</option><option value="strong">Strong</option><option value="provisional">Provisional</option><option value="uncertain">Uncertain</option>
              </select>
            </label>

            <label className={label}>Purity / ancestry
              <select name="purity_status" className={`${field} mt-2`} defaultValue="unknown">
                <option value="known_pure">Known pure</option><option value="believed_pure">Believed pure</option><option value="possible_mixed">Possible mixed</option><option value="hybrid">Hybrid</option><option value="unknown">Unknown</option>
              </select>
            </label>

            <label className={label}>Source type
              <select name="source_type" className={`${field} mt-2`} defaultValue="breeder">
                <option value="personal">Personal</option><option value="breeder">Breeder</option><option value="listing">Listing</option><option value="publication">Publication</option><option value="other">Other</option>
              </select>
            </label>

            <label className={label}>Animal ID / code
              <input name="animal_code" className={`${field} mt-2`} placeholder="Optional individual identifier" />
            </label>

            <label className={label}>Source name
              <input name="source_name" className={`${field} mt-2`} placeholder="Breeder, publication, collection…" />
            </label>

            <label className={label}>Source URL
              <input name="source_url" type="url" className={`${field} mt-2`} placeholder="Optional source link" />
            </label>

            <label className={label}>Rights / use status
              <select name="rights_status" className={`${field} mt-2`} defaultValue="unknown">
                <option value="owned_by_owner">Owned by me</option>
                <option value="permission_granted">Permission granted</option>
                <option value="private_reference_only">Private reference only</option>
                <option value="unknown">Unknown / not reviewed</option>
              </select>
            </label>

            <label className={label}>Rights notes
              <input name="rights_notes" className={`${field} mt-2`} placeholder="Permission, source restrictions, attribution notes…" />
            </label>

            <label className={`${label} sm:col-span-2`}>Reference images
              <input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className={`${field} mt-2 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-[#06100c]`} />
              <span className="mt-2 block text-[10px] normal-case tracking-normal text-white/22">Up to 12 JPG, PNG or WebP images per intake; 15 MB each.</span>
            </label>

            <label className={`${label} sm:col-span-2`}>Notes
              <textarea name="notes" className={`${field} mt-2 min-h-28 resize-y leading-6`} placeholder="Phenotype notes, provenance, uncertainty, special context…" />
            </label>

            <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-white/[.06] bg-black/10 p-4 text-xs text-white/45">
              <input name="training_eligible" value="true" defaultChecked type="checkbox" className="h-4 w-4 accent-emerald-300" />
              Eligible for future training/validation after owner review
            </label>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <button disabled={saving} className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black text-[#06100c] disabled:opacity-50">{saving ? "Saving…" : "Add reference animal"}</button>
              {message && <span className="text-xs text-white/42">{message}</span>}
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="panel rounded-[28px] p-5 sm:p-6">
            <div className="section-kicker">Dataset health</div>
            <h2 className="mt-3 text-2xl font-semibold">Coverage by taxon</h2>
            <p className="mt-2 text-sm leading-6 text-white/32">This view will help us spot weak areas before training so one color phase, locality or individual cannot dominate the model.</p>
            <div className="mt-5 space-y-3">
              {taxonStats.map((row) => (
                <div key={row.taxon} className="rounded-2xl border border-white/[.06] bg-black/[.08] p-4">
                  <div className="text-sm font-semibold text-white/62">{row.taxon}</div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[["Animals",row.total],["Images",row.images],["Red",row.red],["Yellow",row.yellow]].map(([name,value]) => <div key={String(name)}><div className="text-lg font-semibold text-white/58">{value}</div><div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/20">{name}</div></div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-[28px] p-5 sm:p-6">
            <div className="section-kicker">Dataset diagnostics</div>
            <h2 className="mt-3 text-2xl font-semibold">Collection priorities</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[["Approved",diagnostics.approved],["Pending review",diagnostics.pending],["No images",diagnostics.noImages],["Approved / unassigned",diagnostics.approvedUnassigned],["Missing core views",diagnostics.approvedMissingCoreViews],["Accepted approved images",diagnostics.acceptedApprovedImages],["Held images",diagnostics.heldImages],["Rejected images",diagnostics.rejectedImages]].map(([name,value]) => <div key={String(name)} className="rounded-2xl border border-white/[.055] bg-black/[.07] p-3"><div className="text-lg font-semibold text-white/60">{value}</div><div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/22">{name}</div></div>)}
            </div>
            <div className="mt-4 rounded-2xl border border-white/[.055] bg-black/[.07] p-4">
              <div className="text-[9px] font-black uppercase tracking-[.1em] text-white/24">Approved split balance</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><div className="text-lg font-semibold text-white/58">{diagnostics.train}</div><div className="text-[8px] uppercase text-white/20">Train</div></div><div><div className="text-lg font-semibold text-white/58">{diagnostics.validation}</div><div className="text-[8px] uppercase text-white/20">Validation</div></div><div><div className="text-lg font-semibold text-white/58">{diagnostics.test}</div><div className="text-[8px] uppercase text-white/20">Test</div></div></div>
            </div>
            <div className="mt-4 space-y-2">
              {diagnostics.collectionTargets.map((target) => <div key={target.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.05] bg-black/[.06] px-3 py-2.5"><div><div className="text-[11px] font-semibold text-white/48">{target.label}</div><div className="mt-1 text-[9px] text-white/20">{target.count} individual(s)</div></div><span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${target.priority==="High"?"border-rose-300/15 bg-rose-300/[.04] text-rose-100/55":target.priority==="Medium"?"border-amber-300/15 bg-amber-300/[.04] text-amber-100/55":"border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/55"}`}>{target.priority}</span></div>)}
            </div>
            <p className="mt-4 text-[10px] leading-5 text-white/20">Priority labels are collection guidance only; they do not mean a group is scientifically sufficient for training.</p>
          </div>

          <div className="panel rounded-[28px] p-5 sm:p-6">
            <div className="section-kicker">System readiness</div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Owner-only access", "Live"],
                ["Reference animal database", "Live"],
                ["Private reference image storage", "Live"],
                ["Photo upload", "Live"],
                ["Video upload", "Live"],
                ["Live camera preview", "Live"],
                ["Live video recording", "Live"],
                ["Still capture", "Live"],
                ["Local video frame sampling", "Live"],
                ["Scan/reference separation", "Live"],
                ["Multi-view analysis API", "Ready"],
                ["Vision classifier", "Needs trained model"],
                ["Nearest-reference search", "Needs embeddings"],
              ].map(([name, status]) => <div key={name} className="flex items-center justify-between gap-4 border-b border-white/[.05] pb-3 last:border-0 last:pb-0"><span className="text-white/45">{name}</span><span className={status === "Live" || status === "Ready" ? "text-emerald-200/60" : "text-white/25"}>{status}</span></div>)}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6">
        <SnakeSorterReferenceManager animals={animals} media={media} onRefresh={load} />
      </div>
    </section>
  );
}
