"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GTP_LOCALITY_TAXON } from "@/lib/green-tree-python-taxa";

type Contributor = { username?: string | null; displayName?: string | null; avatarUrl?: string | null };
type PublicAnimal = {
  id: string;
  registryCode?: string;
  name: string;
  sex?: string;
  locality?: string;
  breederId?: string;
  hatchYear?: string;
  damId?: string | null;
  sireId?: string | null;
  recordStatus?: "keeper_reported" | "breeder_confirmed" | "reviewed";
  photoUrl?: string;
  contributor?: Contributor | null;
  updatedAt?: string;
};

function taxonFor(locality?: string) {
  if (!locality || locality === "Mixed / Unknown") return "Mixed / unknown subspecies";
  return GTP_LOCALITY_TAXON[locality as keyof typeof GTP_LOCALITY_TAXON] ?? "Locality label not mapped";
}

function recordStatusLabel(status?: PublicAnimal["recordStatus"]) {
  if (status === "breeder_confirmed") return "Breeder confirmed";
  if (status === "reviewed") return "Reviewed record";
  return "Keeper reported";
}

export function GtpPublicLineageDatabase() {
  const [animals, setAnimals] = useState<PublicAnimal[]>([]);
  const [query, setQuery] = useState("");
  const [taxon, setTaxon] = useState("All taxa");
  const [locality, setLocality] = useState("All localities");
  const [sex, setSex] = useState("All sexes");
  const [recordStatus, setRecordStatus] = useState("All record statuses");
  const [status, setStatus] = useState("Loading public lineage records…");

  async function load() {
    try {
      const response = await fetch("/api/genetics/pedigree/public", { cache: "no-store" });
      const data = await response.json().catch(() => null) as { animals?: PublicAnimal[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not load public lineage records.");
      const next = Array.isArray(data?.animals) ? data.animals : [];
      setAnimals(next);
      setStatus(next.length ? `${next.length} public animal${next.length === 1 ? "" : "s"} in the database.` : "No animals have been published yet. The database will grow as keepers opt in.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load public lineage records.");
    }
  }

  useEffect(() => { void load(); }, []);

  const byId = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);
  const taxa = useMemo(() => [...new Set(animals.map((animal) => taxonFor(animal.locality)))].sort(), [animals]);
  const localities = useMemo(() => [...new Set(animals.map((animal) => animal.locality || "Mixed / Unknown"))].sort(), [animals]);
  const sexes = useMemo(() => [...new Set(animals.map((animal) => animal.sex || "Unknown"))].sort(), [animals]);
  const recordStatuses = useMemo(() => [...new Set(animals.map((animal) => recordStatusLabel(animal.recordStatus)))].sort(), [animals]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return animals.filter((animal) => {
      const animalTaxon = taxonFor(animal.locality);
      const animalLocality = animal.locality || "Mixed / Unknown";
      const animalSex = animal.sex || "Unknown";
      const animalRecordStatus = recordStatusLabel(animal.recordStatus);
      const matchesSearch = !needle || [animal.name, animal.registryCode, animal.locality, animal.breederId, animal.hatchYear, animalTaxon, animalRecordStatus, animal.contributor?.displayName, animal.contributor?.username]
        .some((value) => String(value ?? "").toLowerCase().includes(needle));
      return matchesSearch
        && (taxon === "All taxa" || animalTaxon === taxon)
        && (locality === "All localities" || animalLocality === locality)
        && (sex === "All sexes" || animalSex === sex)
        && (recordStatus === "All record statuses" || animalRecordStatus === recordStatus);
    });
  }, [animals, query, taxon, locality, sex, recordStatus]);

  function resetFilters() {
    setQuery("");
    setTaxon("All taxa");
    setLocality("All localities");
    setSex("All sexes");
    setRecordStatus("All record statuses");
  }

  return (
    <div className="space-y-5">
      <div className="panel rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="section-kicker">Community lineage records</div>
            <h2 className="mt-2 text-2xl font-semibold text-white/80">Search published Green Tree Python pedigrees.</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Only animals their keepers explicitly chose to publish appear here. New records are labeled Keeper reported; stronger record statuses are reserved for trusted confirmation or review.</p>
          </div>
          <label className="w-full text-xs text-white/38 md:max-w-sm">Search animal, registry ID, locality, subspecies or keeper
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. AP-GTP, Jayapura, utaraensis" className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-[10px] font-bold uppercase tracking-[.11em] text-white/28">Subspecies / taxon
            <select value={taxon} onChange={(event) => setTaxon(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">
              <option>All taxa</option>
              {taxa.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[.11em] text-white/28">Reported locality
            <select value={locality} onChange={(event) => setLocality(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">
              <option>All localities</option>
              {localities.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[.11em] text-white/28">Sex
            <select value={sex} onChange={(event) => setSex(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">
              <option>All sexes</option>
              {sexes.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[.11em] text-white/28">Record status
            <select value={recordStatus} onChange={(event) => setRecordStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">
              <option>All record statuses</option>
              {recordStatuses.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={resetFilters} className="self-end rounded-xl border border-emerald-300/15 px-4 py-3 text-xs font-bold text-emerald-200/70">Reset filters</button>
        </div>

        <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status} {animals.length ? `${filtered.length} currently shown.` : ""}</div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((animal) => {
            const dam = animal.damId ? byId.get(animal.damId) : null;
            const sire = animal.sireId ? byId.get(animal.sireId) : null;
            const contributor = animal.contributor;
            const contributorLabel = contributor?.displayName || contributor?.username || null;
            const statusLabel = recordStatusLabel(animal.recordStatus);
            return (
              <article key={animal.id} className="panel-soft overflow-hidden rounded-[22px]">
                {animal.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={animal.photoUrl} alt={`${animal.name} pedigree photo`} className="h-48 w-full border-b border-white/[.055] object-cover" />
                ) : null}
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="block truncate text-lg font-semibold text-white/78 transition hover:text-emerald-100">{animal.name}</Link>
                      <div className="mt-1 text-[10px] text-white/32">{animal.registryCode ? `${animal.registryCode} · ` : ""}{animal.sex || "Unknown"}{animal.hatchYear ? ` · ${animal.hatchYear}` : ""}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5"><span className="rounded-full border border-emerald-300/10 px-2 py-1 text-[9px] font-bold text-emerald-100/60">PUBLIC</span><span className="rounded-full border border-white/[.07] px-2 py-1 text-[9px] font-bold text-white/45">{statusLabel}</span></div>
                  </div>

                  {contributorLabel ? <div className="mt-4 flex items-center gap-2 border-y border-white/[.05] py-3">
                    {contributor?.avatarUrl ? <img src={contributor.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="grid h-8 w-8 place-items-center rounded-full border border-white/[.07] text-[9px] font-bold text-white/30">AP</div>}
                    <div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[.11em] text-white/22">Record steward</div>{contributor?.username ? <Link href={`/keepers/${encodeURIComponent(contributor.username)}`} className="truncate text-xs font-semibold text-white/55 hover:text-emerald-100">{contributorLabel}</Link> : <div className="truncate text-xs font-semibold text-white/55">{contributorLabel}</div>}</div>
                  </div> : null}

                  <div className="mt-4 rounded-xl border border-white/[.055] bg-black/10 p-3">
                    <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Reported locality</div>
                    <div className="mt-1 text-sm font-semibold text-white/65">{animal.locality || "Mixed / Unknown"}</div>
                    <div className="mt-1 text-xs italic text-emerald-100/48">{taxonFor(animal.locality)}</div>
                  </div>

                  {animal.breederId ? <div className="mt-3 text-xs text-white/38"><span className="text-white/25">Breeder ID:</span> {animal.breederId}</div> : null}

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-white/[.055] p-3"><div className="text-[9px] font-black uppercase tracking-[.11em] text-white/22">Dam</div><div className="mt-1 truncate text-white/55">{dam?.name || (animal.damId ? "Private / unpublished" : "Unknown")}</div></div>
                    <div className="rounded-xl border border-white/[.055] p-3"><div className="text-[9px] font-black uppercase tracking-[.11em] text-white/22">Sire</div><div className="mt-1 truncate text-white/55">{sire?.name || (animal.sireId ? "Private / unpublished" : "Unknown")}</div></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2"><Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="text-xs font-bold text-emerald-200/70">Open lineage record →</Link><Link href={`/genetics/database/${encodeURIComponent(animal.id)}/report`} className="text-[10px] font-bold text-white/32 hover:text-white/55">Report record</Link></div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel-soft rounded-[22px] p-8 text-center text-sm text-white/32">{animals.length ? "No published records match those filters." : "The public lineage database is ready for the first opt-in records."}</div>
      )}
    </div>
  );
}
