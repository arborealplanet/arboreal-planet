"use client";

import { useEffect, useMemo, useState } from "react";
import { SnakeSorterScanner } from "@/components/SnakeSorterScanner";
import { SnakeSorterReferenceManager } from "@/components/SnakeSorterReferenceManager";
import { SnakeSorterModelStatus } from "@/components/SnakeSorterModelStatus";
import { SnakeSorterScanHistory } from "@/components/SnakeSorterScanHistory";

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/snake-sorter/references", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setAnimals(data.animals ?? []);
      setMedia(data.media ?? []);
    }
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
      .finally(() => undefined);
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const youngStages = new Set(["hatchling", "neonate", "juvenile"]);
    const redYoung = animals.filter((a) => youngStages.has(a.life_stage) && a.neonate_color === "red").length;
    const yellowYoung = animals.filter((a) => youngStages.has(a.life_stage) && a.neonate_color === "yellow").length;
    const hatchlings = animals.filter((a) => a.life_stage === "hatchling").length;
    const neonates = animals.filter((a) => a.life_stage === "neonate").length;
    const adults = animals.filter((a) => a.life_stage === "adult").length;
    const eligible = animals.filter((a) => a.training_eligible).length;
    return { animals: animals.length, images: media.length, redYoung, yellowYoung, hatchlings, neonates, adults, eligible };
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
        hatchlings: rows.filter((animal) => animal.life_stage === "hatchling").length,
        neonates: rows.filter((animal) => animal.life_stage === "neonate").length,
        juveniles: rows.filter((animal) => animal.life_stage === "juvenile").length,
        adults: rows.filter((animal) => animal.life_stage === "adult").length,
        redYoung: rows.filter((animal) => ["hatchling","neonate","juvenile"].includes(animal.life_stage) && animal.neonate_color === "red").length,
        yellowYoung: rows.filter((animal) => ["hatchling","neonate","juvenile"].includes(animal.life_stage) && animal.neonate_color === "yellow").length,
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

    const eligibleApproved = approved.filter((animal) =>
      animal.training_eligible && animal.rights_status !== "unknown"
    );
    const eligibleIds = new Set(eligibleApproved.map((animal) => animal.id));
    const eligibleWithAcceptedMedia = new Set(
      acceptedMedia.filter((item) => eligibleIds.has(item.animal_id)).map((item) => item.animal_id)
    );
    const approvedTrainingNoAcceptedMedia = eligibleApproved.filter((animal) => !eligibleWithAcceptedMedia.has(animal.id)).length;
    const approvedTrainingRightsUnknown = approved.filter((animal) => animal.training_eligible && (!animal.rights_status || animal.rights_status === "unknown")).length;

    const targetTaxa = ["Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis"] as const;
    const taxonSplitCoverage = targetTaxa.map((taxon) => {
      const rows = eligibleApproved.filter((animal) => animal.taxon === taxon);
      return {
        taxon,
        train: rows.filter((animal) => animal.dataset_split === "train").length,
        validation: rows.filter((animal) => animal.dataset_split === "validation").length,
        test: rows.filter((animal) => animal.dataset_split === "test").length,
      };
    });

    const readinessBlockers: string[] = [];
    if (!eligibleApproved.length) readinessBlockers.push("No approved, rights-reviewed training animals yet.");
    if (approvedUnassigned.some((animal) => animal.training_eligible)) readinessBlockers.push("Approved training animals still need dataset splits.");
    if (approvedTrainingRightsUnknown) readinessBlockers.push(`${approvedTrainingRightsUnknown} approved training animal(s) still have unknown rights status.`);
    if (approvedTrainingNoAcceptedMedia) readinessBlockers.push(`${approvedTrainingNoAcceptedMedia} approved training animal(s) have no accepted image.`);
    for (const row of taxonSplitCoverage) {
      if (!row.train) readinessBlockers.push(`${row.taxon} has no train individual.`);
      if (!row.validation) readinessBlockers.push(`${row.taxon} has no validation individual.`);
      if (!row.test) readinessBlockers.push(`${row.taxon} has no test individual.`);
    }

    const readinessWarnings: string[] = [];
    if (approvedMissingCoreViews) readinessWarnings.push(`${approvedMissingCoreViews} approved animal(s) are missing one or more core photographic views.`);
    const structurallyReady = readinessBlockers.length === 0;

    const youngStages = new Set(["hatchling", "neonate", "juvenile"]);
    const youngTargets = [
      ["M. a. azurea · red young", "Morelia azurea azurea", "red"],
      ["M. a. azurea · yellow young", "Morelia azurea azurea", "yellow"],
      ["M. a. pulcher · red young", "Morelia azurea pulcher", "red"],
      ["M. a. pulcher · yellow young", "Morelia azurea pulcher", "yellow"],
      ["M. a. utaraensis · red young", "Morelia azurea utaraensis", "red"],
      ["M. a. utaraensis · yellow young", "Morelia azurea utaraensis", "yellow"],
      ["M. viridis · yellow young", "Morelia viridis", "yellow"],
    ] as const;

    const adultTargets = [
      ["M. a. azurea · adults", "Morelia azurea azurea"],
      ["M. a. pulcher · adults", "Morelia azurea pulcher"],
      ["M. a. utaraensis · adults", "Morelia azurea utaraensis"],
      ["M. viridis · adults", "Morelia viridis"],
    ] as const;

    const collectionTargets = [
      ...youngTargets.map(([label, taxon, color]) => ({
        label,
        count: animals.filter((animal) => animal.taxon === taxon && youngStages.has(animal.life_stage) && animal.neonate_color === color).length,
      })),
      ...adultTargets.map(([label, taxon]) => ({
        label,
        count: animals.filter((animal) => animal.taxon === taxon && animal.life_stage === "adult").length,
      })),
    ].map((target) => ({
      ...target,
      priority: target.count < 10 ? "High" : target.count < 25 ? "Medium" : "Lower",
    })).sort((a, b) => a.count - b.count);

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
      approvedTrainingNoAcceptedMedia,
      approvedTrainingRightsUnknown,
      taxonSplitCoverage,
      readinessBlockers,
      readinessWarnings,
      structurallyReady,
      collectionTargets,
    };
  }, [animals, media, mediaCount]);

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
          ["Hatchlings", stats.hatchlings],
          ["Neonates", stats.neonates],
          ["Adults", stats.adults],
          ["Red young", stats.redYoung],
          ["Yellow young", stats.yellowYoung],
          ["Training eligible", stats.eligible],
        ].map(([name, value]) => (
          <div key={String(name)} className="panel rounded-2xl p-4">
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/26">{name}</div>
            <div className="mt-2 text-2xl font-semibold text-white/72">{value}</div>
          </div>
        ))}
      </div>

      <div id="snake-sorter-scanner" className="mt-6 scroll-mt-6"><SnakeSorterScanner onReferenceAdded={() => void load()} /></div>

      <div className="mt-6"><SnakeSorterScanHistory /></div>

      <div id="snake-sorter-models" className="mt-6 scroll-mt-6"><SnakeSorterModelStatus /></div>

      <div id="snake-sorter-collection-protocol" className="mt-6 panel scroll-mt-6 rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker">Reference collection protocol</div>
            <h2 className="mt-2 text-2xl font-semibold">What to collect for each known snake</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">Consistency matters more than perfect studio photography. One individual record can follow the same snake from hatchling through adulthood.</p>
          </div>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.04] px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-emerald-100/60">Distinct animals first</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/[.06] bg-black/[.07] p-4">
            <div className="text-[9px] font-black uppercase tracking-[.1em] text-sky-100/45">Minimum useful set</div>
            <div className="mt-3 space-y-2">
              {[
                "One clear full-body image",
                "One clear head image",
                "One dorsal / top-down view",
                "One lateral body view",
                "Stage + red/yellow phase",
                "Taxon/locality provenance",
              ].map((item) => <div key={item} className="flex gap-2 text-[11px] leading-5 text-white/36"><span className="text-sky-200/45">✓</span><span>{item}</span></div>)}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/[.06] bg-black/[.07] p-4">
            <div className="text-[9px] font-black uppercase tracking-[.1em] text-emerald-100/45">Preferred set</div>
            <div className="mt-3 space-y-2">
              {[
                "Full body + head + dorsal",
                "Left and right lateral views",
                "Tail / posterior markings",
                "Neutral-lighting image",
                "Capture date or approximate age",
                "Repeat images as the snake develops",
              ].map((item) => <div key={item} className="flex gap-2 text-[11px] leading-5 text-white/36"><span className="text-emerald-200/45">✓</span><span>{item}</span></div>)}
            </div>
          </div>

          <div className="rounded-[24px] border border-amber-300/10 bg-amber-300/[.02] p-4">
            <div className="text-[9px] font-black uppercase tracking-[.1em] text-amber-100/45">Collection priorities</div>
            <div className="mt-3 space-y-2">
              {[
                "More unique individuals beats more repeats",
                "Collect both red and yellow young animals",
                "Keep adults — they help the shared encoder",
                "Keep difficult look-alike examples",
                "Link multiple ages to the same known animal",
                "Avoid using uncertain ancestry as clean ground truth",
              ].map((item) => <div key={item} className="flex gap-2 text-[11px] leading-5 text-white/36"><span className="text-amber-200/40">•</span><span>{item}</span></div>)}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[.055] bg-black/[.06] px-4 py-3 text-[10px] leading-5 text-white/25">
          Do not discard unusual animals. If provenance is questionable, add them as provisional / possible mixed / hold rather than forcing them into a clean training class. Those difficult examples are valuable for later rejection and mislabel detection.
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div id="snake-sorter-reference" className="panel scroll-mt-6 rounded-[28px] p-5 sm:p-6">
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
                <option value="hatchling">Hatchling</option><option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option><option value="unknown">Unknown</option>
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

            <label className={label}>Related / split group
              <input name="split_group" className={`${field} mt-2`} placeholder="Optional clutch / sibling / line group" />
              <span className="mt-2 block text-[10px] normal-case tracking-normal text-white/22">Animals in the same group stay together in train / validation / test.</span>
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
                    {[["Animals",row.total],["Images",row.images],["Hatch",row.hatchlings],["Neo",row.neonates],["Juv",row.juveniles],["Adult",row.adults],["Red young",row.redYoung],["Yellow young",row.yellowYoung]].map(([name,value]) => <div key={String(name)}><div className="text-lg font-semibold text-white/58">{value}</div><div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/20">{name}</div></div>)}
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
            <div className={`mt-4 rounded-2xl border p-4 ${diagnostics.structurallyReady ? "border-emerald-300/12 bg-emerald-300/[.025]" : "border-amber-300/12 bg-amber-300/[.025]"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.1em] text-white/24">Training readiness</div>
                  <div className="mt-1 text-sm font-semibold text-white/55">{diagnostics.structurallyReady ? "Structurally ready for an experimental training run" : "Dataset structure still has blockers"}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${diagnostics.structurallyReady ? "border-emerald-300/15 text-emerald-100/60" : "border-amber-300/15 text-amber-100/55"}`}>{diagnostics.structurallyReady ? "Ready to experiment" : "Blocked"}</span>
              </div>
              <div className="mt-3 space-y-2">
                {diagnostics.taxonSplitCoverage.map((row) => (
                  <div key={row.taxon} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-xl border border-white/[.045] bg-black/[.05] px-3 py-2">
                    <span className="truncate text-[10px] text-white/36">{row.taxon}</span>
                    <span className={`text-[9px] ${row.train ? "text-emerald-100/50" : "text-rose-100/45"}`}>T {row.train}</span>
                    <span className={`text-[9px] ${row.validation ? "text-emerald-100/50" : "text-rose-100/45"}`}>V {row.validation}</span>
                    <span className={`text-[9px] ${row.test ? "text-emerald-100/50" : "text-rose-100/45"}`}>X {row.test}</span>
                  </div>
                ))}
              </div>
              {diagnostics.readinessBlockers.length > 0 && <div className="mt-3 space-y-1">{diagnostics.readinessBlockers.slice(0,8).map((item) => <div key={item} className="text-[9px] leading-4 text-amber-50/38">• {item}</div>)}</div>}
              {diagnostics.readinessWarnings.length > 0 && <div className="mt-3 border-t border-white/[.05] pt-3">{diagnostics.readinessWarnings.map((item) => <div key={item} className="text-[9px] leading-4 text-white/24">• {item}</div>)}</div>}
              <p className="mt-3 text-[9px] leading-4 text-white/18">Passing these checks means the split structure is valid enough to run an experiment. It does not mean the dataset is large or diverse enough for a production model.</p>
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
