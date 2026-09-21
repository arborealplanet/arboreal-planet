"use client";

import { useEffect, useMemo, useState } from "react";

type Candidate = {
  id: string;
  source_type: string;
  source_key: string;
  source_url: string;
  media_url: string | null;
  title: string | null;
  seller_or_observer: string | null;
  photographer: string | null;
  license: string | null;
  attribution: string | null;
  taxon_raw: string | null;
  locality_raw: string | null;
  provisional_taxon: string | null;
  provisional_locality: string | null;
  life_stage_hint: string | null;
  neonate_color_hint: string | null;
  rights_status: string;
  review_status: string;
  exclusion_reason: string | null;
  staged_storage_path: string | null;
  staged_mime_type: string | null;
  staged_bytes: number | null;
  staged_at: string | null;
  acquisition_error: string | null;
  promoted_reference_animal_id: string | null;
  promoted_at: string | null;
  discovered_at: string;
};

type Profile = {
  id: string;
  name: string;
  source_type: string;
  target_locality: string | null;
  enabled: boolean;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  permission_required: number;
  staged: number;
  open_license: number;
  metadata_only: number;
};

const button = "rounded-xl border border-white/[.07] bg-black/[.06] px-3 py-2 text-[9px] font-black text-white/42 disabled:opacity-35";
const select = "rounded-xl border border-white/[.07] bg-black/15 px-3 py-2 text-[10px] text-white/48 outline-none";

function sourceLabel(value: string) {
  if (value === "morphmarket") return "MorphMarket";
  if (value === "wikimedia") return "Wikimedia";
  if (value === "smithsonian") return "Smithsonian";
  if (value === "inaturalist") return "iNaturalist";
  if (value === "gbif") return "GBIF";
  return value.replaceAll("_"," ");
}

function statusClass(value: string) {
  if (value === "approved") return "border-emerald-300/12 text-emerald-100/50";
  if (value === "rejected") return "border-rose-300/12 text-rose-100/45";
  if (value === "permission_required") return "border-amber-300/12 text-amber-100/50";
  return "border-white/[.07] text-white/30";
}

export function SnakeSorterAcquisitionQueue({ onPromoted }: { onPromoted?: () => Promise<void> | void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ total:0,pending:0,approved:0,rejected:0,permission_required:0,staged:0,open_license:0,metadata_only:0 });
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/snake-sorter/acquisition", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not load acquisition queue.");
      return;
    }
    setCandidates(data.candidates ?? []);
    setProfiles(data.profiles ?? []);
    setStats(data.stats ?? stats);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/snake-sorter/acquisition", { cache:"no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ok,data}) => {
        if (cancelled) return;
        if (!ok) {
          setMessage(data.error ?? "Could not load acquisition queue.");
          return;
        }
        setCandidates(data.candidates ?? []);
        setProfiles(data.profiles ?? []);
        setStats(data.stats ?? stats);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => candidates.filter((candidate) => {
    if (source !== "all" && candidate.source_type !== source) return false;
    if (status !== "all" && candidate.review_status !== status) return false;
    return true;
  }), [candidates, source, status]);

  async function stageOpenMedia() {
    setBusy("stage");
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 12 }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(`Open-license staging: ${data.staged ?? 0} staged, ${data.duplicates ?? 0} duplicates, ${data.errors ?? 0} errors.`);
      await load();
    } else {
      setMessage(data.error ?? "Could not stage open-license media.");
    }
    setBusy("");
  }

  async function review(id: string, reviewStatus: "approved" | "rejected" | "permission_required" | "pending") {
    setBusy(id);
    setMessage("");
    const response = await fetch("/api/snake-sorter/acquisition", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, review_status: reviewStatus }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not update candidate.");
    await load();
    setBusy("");
  }

  async function promote(candidate: Candidate, formData: FormData) {
    setBusy(`promote-${candidate.id}`);
    setMessage("");

    const payload = {
      candidate_id: candidate.id,
      taxon: String(formData.get("taxon") ?? "Unknown / review"),
      locality: String(formData.get("locality") ?? ""),
      life_stage: String(formData.get("life_stage") ?? "unknown"),
      neonate_color: String(formData.get("neonate_color") ?? "unknown"),
      label_confidence: String(formData.get("label_confidence") ?? "provisional"),
      purity_status: String(formData.get("purity_status") ?? "unknown"),
      view_type: String(formData.get("view_type") ?? "unknown"),
      animal_code: String(formData.get("animal_code") ?? ""),
      split_group: String(formData.get("split_group") ?? ""),
      training_eligible: formData.get("training_eligible") === "true",
      challenge_eligible: formData.get("challenge_eligible") === "true",
      challenge_expectation: String(formData.get("challenge_expectation") ?? "review"),
    };

    const response = await fetch("/api/snake-sorter/acquisition/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      setMessage(`Candidate promoted into the reference library as animal ${data.animal_id}.`);
      await load();
      await onPromoted?.();
    } else {
      setMessage(data.error ?? "Could not promote candidate.");
    }
    setBusy("");
  }

  const sources = [...new Set(candidates.map((candidate) => candidate.source_type))].sort();

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Acquisition queue</div>
          <h2 className="mt-2 text-2xl font-semibold">Harvested reference candidates</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">Public/open sources are collected here first. MorphMarket remains metadata-only. Staged media stays outside the reference/training library until you deliberately promote it later.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className={button}>Refresh</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void stageOpenMedia()} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-3 py-2 text-[9px] font-black text-emerald-100/60 disabled:opacity-35">{busy === "stage" ? "Staging…" : "Stage open-license media"}</button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {[
          ["Total", stats.total],
          ["Pending", stats.pending],
          ["Staged", stats.staged],
          ["Approved", stats.approved],
          ["Rejected", stats.rejected],
          ["Permission", stats.permission_required],
          ["Open license", stats.open_license],
          ["Metadata only", stats.metadata_only],
        ].map(([name,value]) => <div key={String(name)} className="rounded-2xl border border-white/[.055] bg-black/[.06] p-3"><div className="text-lg font-semibold text-white/55">{value}</div><div className="mt-1 text-[8px] font-black uppercase tracking-[.07em] text-white/20">{name}</div></div>)}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={source} onChange={(event) => setSource(event.target.value)} className={select}>
          <option value="all">All sources</option>
          {sources.map((value) => <option key={value} value={value}>{sourceLabel(value)}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={select}>
          <option value="all">All review states</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="permission_required">Permission required</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-[9px] text-white/18">{profiles.filter((profile) => profile.enabled).length} acquisition profile(s) enabled</span>
      </div>

      {message && <div className="mt-4 rounded-xl border border-white/[.06] bg-black/[.05] px-3 py-2 text-[10px] leading-5 text-white/36">{message}</div>}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {filtered.length === 0 && <div className="lg:col-span-2 rounded-2xl border border-white/[.05] bg-black/[.04] p-4 text-[10px] text-white/20">No candidates match these filters.</div>}
        {filtered.map((candidate) => (
          <article key={candidate.id} className="overflow-hidden rounded-[22px] border border-white/[.055] bg-black/[.06]">
            <div className="flex min-h-36">
              <div className="w-36 shrink-0 bg-black/20">
                {candidate.staged_storage_path ? (
                  <img src={`/api/snake-sorter/acquisition/media/${encodeURIComponent(candidate.id)}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full min-h-36 place-items-center px-3 text-center text-[9px] leading-4 text-white/16">{candidate.source_type === "morphmarket" ? "Metadata only — listing image not copied" : candidate.rights_status === "open_license" ? "Open media not staged yet" : "No staged media"}</div>
                )}
              </div>
              <div className="min-w-0 flex-1 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/55">{candidate.title || candidate.locality_raw || candidate.source_key}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-white/[.06] px-2 py-0.5 text-[8px] text-white/28">{sourceLabel(candidate.source_type)}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[8px] ${statusClass(candidate.review_status)}`}>{candidate.review_status.replaceAll("_"," ")}</span>
                      <span className="rounded-full border border-white/[.06] px-2 py-0.5 text-[8px] text-white/24">{candidate.rights_status.replaceAll("_"," ")}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {candidate.staged_storage_path && <span className="rounded-full border border-emerald-300/12 px-2 py-1 text-[8px] font-black uppercase text-emerald-100/45">Staged</span>}
                    {candidate.promoted_reference_animal_id && <span className="rounded-full border border-sky-300/12 px-2 py-1 text-[8px] font-black uppercase text-sky-100/45">Promoted</span>}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[9px]">
                  <div><div className="uppercase tracking-[.07em] text-white/16">Locality claim</div><div className="mt-0.5 text-white/34">{candidate.provisional_locality || candidate.locality_raw || "—"}</div></div>
                  <div><div className="uppercase tracking-[.07em] text-white/16">Taxon raw</div><div className="mt-0.5 text-white/34">{candidate.taxon_raw || "—"}</div></div>
                  <div><div className="uppercase tracking-[.07em] text-white/16">Source / observer</div><div className="mt-0.5 truncate text-white/34">{candidate.seller_or_observer || candidate.photographer || "—"}</div></div>
                  <div><div className="uppercase tracking-[.07em] text-white/16">License</div><div className="mt-0.5 truncate text-white/34">{candidate.license || "—"}</div></div>
                </div>

                {candidate.acquisition_error && <div className="mt-3 rounded-xl border border-rose-300/10 bg-rose-300/[.025] px-3 py-2 text-[9px] leading-4 text-rose-50/40">{candidate.acquisition_error}</div>}
                {candidate.exclusion_reason && <div className="mt-3 text-[9px] leading-4 text-white/22">Excluded: {candidate.exclusion_reason}</div>}

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={candidate.source_url} target="_blank" rel="noreferrer" className={button}>Open source</a>
                  <button type="button" disabled={busy === candidate.id} onClick={() => void review(candidate.id,"approved")} className="rounded-xl border border-emerald-300/12 bg-emerald-300/[.025] px-3 py-2 text-[9px] font-black text-emerald-100/50 disabled:opacity-35">Approve candidate</button>
                  <button type="button" disabled={busy === candidate.id} onClick={() => void review(candidate.id,"permission_required")} className="rounded-xl border border-amber-300/12 bg-amber-300/[.025] px-3 py-2 text-[9px] font-black text-amber-100/48 disabled:opacity-35">Permission needed</button>
                  <button type="button" disabled={busy === candidate.id} onClick={() => void review(candidate.id,"rejected")} className="rounded-xl border border-rose-300/12 bg-rose-300/[.025] px-3 py-2 text-[9px] font-black text-rose-100/45 disabled:opacity-35">Reject</button>
                </div>
                {candidate.review_status === "approved" && candidate.rights_status === "open_license" && candidate.staged_storage_path && !candidate.promoted_reference_animal_id && (
                  <form onSubmit={(event) => { event.preventDefault(); void promote(candidate, new FormData(event.currentTarget)); }} className="mt-4 rounded-2xl border border-sky-300/10 bg-sky-300/[.02] p-3">
                    <div className="text-[9px] font-black uppercase tracking-[.09em] text-sky-100/45">Promote to reference library</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Taxon
                        <select name="taxon" defaultValue="Unknown / review" className={`${select} mt-1 w-full`}>
                          <option>Unknown / review</option>
                          <option>Morelia azurea azurea</option>
                          <option>Morelia azurea pulcher</option>
                          <option>Morelia azurea utaraensis</option>
                          <option>Morelia viridis</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Locality
                        <input name="locality" defaultValue={candidate.provisional_locality || candidate.locality_raw || ""} className={`${select} mt-1 w-full`} />
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Life stage
                        <select name="life_stage" defaultValue={["hatchling","neonate","juvenile","subadult","adult","unknown"].includes(candidate.life_stage_hint || "") ? candidate.life_stage_hint || "unknown" : "unknown"} className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="hatchling">Hatchling</option><option value="neonate">Neonate</option><option value="juvenile">Juvenile</option><option value="subadult">Subadult</option><option value="adult">Adult</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Color phase
                        <select name="neonate_color" defaultValue={candidate.neonate_color_hint || "unknown"} className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="red">Red</option><option value="yellow">Yellow</option><option value="not_applicable">Not applicable</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Label confidence
                        <select name="label_confidence" defaultValue="provisional" className={`${select} mt-1 w-full`}>
                          <option value="provisional">Provisional</option><option value="uncertain">Uncertain</option><option value="strong">Strong</option><option value="confirmed">Confirmed</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Ancestry / purity
                        <select name="purity_status" defaultValue="unknown" className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="possible_mixed">Possible mixed</option><option value="believed_pure">Believed pure</option><option value="known_pure">Known pure</option><option value="hybrid">Hybrid</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Image view
                        <select name="view_type" defaultValue="unknown" className={`${select} mt-1 w-full`}>
                          <option value="unknown">Unknown</option><option value="full_body">Full body</option><option value="head">Head</option><option value="dorsal">Dorsal</option><option value="left_lateral">Left lateral</option><option value="right_lateral">Right lateral</option><option value="tail">Tail</option><option value="other">Other</option>
                        </select>
                      </label>
                      <label className="text-[8px] font-black uppercase tracking-[.07em] text-white/20">Animal code
                        <input name="animal_code" placeholder="Optional" className={`${select} mt-1 w-full`} />
                      </label>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-xl border border-white/[.05] px-3 py-2 text-[9px] text-white/28"><input type="checkbox" name="training_eligible" value="true" className="accent-emerald-300" />Training eligible after normal reference review</label>
                      <label className="flex items-center gap-2 rounded-xl border border-white/[.05] px-3 py-2 text-[9px] text-white/28"><input type="checkbox" name="challenge_eligible" value="true" className="accent-amber-300" />Challenge / OOD candidate</label>
                    </div>
                    <input type="hidden" name="challenge_expectation" value="review" />
                    <input type="hidden" name="split_group" value="" />
                    <button type="submit" disabled={busy === `promote-${candidate.id}`} className="mt-3 rounded-xl border border-sky-300/15 bg-sky-300/[.04] px-3 py-2 text-[9px] font-black text-sky-100/60 disabled:opacity-35">{busy === `promote-${candidate.id}` ? "Promoting…" : "Promote with these labels"}</button>
                    <div className="mt-2 text-[8px] leading-4 text-white/18">Defaults are intentionally conservative. Choosing a clean taxon does not bypass the normal reference review/split/snapshot rules.</div>
                  </form>
                )}
                {candidate.promoted_reference_animal_id && <div className="mt-3 rounded-xl border border-sky-300/10 bg-sky-300/[.02] px-3 py-2 text-[9px] text-sky-100/40">Promoted to reference animal {candidate.promoted_reference_animal_id}.</div>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/[.05] bg-black/[.04] px-3 py-2 text-[9px] leading-4 text-white/20">
        Candidate approval is not reference-library promotion. It means the source is worth using/reviewing further. Reference/training promotion remains a separate deliberate owner action.
      </div>
    </section>
  );
}
