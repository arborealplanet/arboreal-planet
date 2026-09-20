"use client";

import { useEffect, useMemo, useState } from "react";
import { SnakeSorterScanner } from "@/components/SnakeSorterScanner";

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
  training_eligible: boolean;
  created_at: string;
};

type ReferenceMedia = {
  id: string;
  animal_id: string;
  original_name: string | null;
  mime_type: string | null;
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

  useEffect(() => { void load(); }, []);

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

  async function addReference(formData: FormData) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/snake-sorter/references", { method: "POST", body: formData });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const failed = Array.isArray(data.failed) && data.failed.length ? ` ${data.failed.length} image(s) were skipped.` : "";
      setMessage(`Reference animal added.${failed}`);
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

      <div className="mt-6 panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="section-kicker">Reference library</div><h2 className="mt-2 text-2xl font-semibold">Collected animals</h2></div>
          <button onClick={() => void load()} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/40 hover:text-white/65">Refresh</button>
        </div>
        {loading ? <div className="py-12 text-center text-sm text-white/28">Loading Snake Sorter references…</div> :
          animals.length === 0 ? <div className="py-12 text-center text-sm text-white/28">No reference animals yet.</div> :
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-[9px] font-black uppercase tracking-[.1em] text-white/25"><tr><th className="pb-3 pr-5">Taxon</th><th className="pb-3 pr-5">Locality</th><th className="pb-3 pr-5">Stage</th><th className="pb-3 pr-5">Color</th><th className="pb-3 pr-5">Confidence</th><th className="pb-3 pr-5">Images</th><th className="pb-3">Training</th></tr></thead>
              <tbody>{animals.map((animal) => <tr key={animal.id} className="border-t border-white/[.05] text-white/48"><td className="py-4 pr-5 font-semibold text-white/68">{animal.taxon}<div className="mt-1 text-[10px] font-normal text-white/23">{animal.animal_code || animal.source_name || animal.source_type}</div></td><td className="py-4 pr-5">{animal.locality || "—"}</td><td className="py-4 pr-5 capitalize">{animal.life_stage}</td><td className="py-4 pr-5 capitalize">{animal.neonate_color.replace("_", " ")}</td><td className="py-4 pr-5 capitalize">{animal.label_confidence}</td><td className="py-4 pr-5">{mediaCount.get(animal.id) ?? 0}</td><td className="py-4">{animal.training_eligible ? <span className="text-emerald-200/60">Eligible</span> : <span className="text-amber-100/50">Hold</span>}</td></tr>)}</tbody>
            </table>
          </div>
        }
      </div>
    </section>
  );
}
