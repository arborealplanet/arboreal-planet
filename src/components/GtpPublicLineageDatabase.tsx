"use client";

import { useEffect, useMemo, useState } from "react";
import { GTP_LOCALITY_TAXON } from "@/lib/green-tree-python-taxa";

type PublicAnimal = {
  id: string;
  name: string;
  sex?: string;
  locality?: string;
  breederId?: string;
  hatchYear?: string;
  damId?: string | null;
  sireId?: string | null;
  photoUrl?: string;
  updatedAt?: string;
};

function taxonFor(locality?: string) {
  if (!locality || locality === "Mixed / Unknown") return "Mixed / unknown subspecies";
  return GTP_LOCALITY_TAXON[locality as keyof typeof GTP_LOCALITY_TAXON] ?? "Locality label not mapped";
}

export function GtpPublicLineageDatabase() {
  const [animals, setAnimals] = useState<PublicAnimal[]>([]);
  const [query, setQuery] = useState("");
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
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return animals;
    return animals.filter((animal) => [animal.name, animal.locality, animal.breederId, animal.hatchYear, taxonFor(animal.locality)].some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [animals, query]);

  return (
    <div className="space-y-5">
      <div className="panel rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="section-kicker">Community lineage records</div>
            <h2 className="mt-2 text-2xl font-semibold text-white/80">Search published Green Tree Python pedigrees.</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Only animals their keepers explicitly chose to publish appear here. A missing parent means that parent is unknown or has not been made public.</p>
          </div>
          <label className="w-full text-xs text-white/38 md:max-w-sm">Search name, ID, locality or subspecies
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Jayapura, GAB-023, utaraensis" className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/25 px-3 py-3 text-base text-white/75" />
          </label>
        </div>
        <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((animal) => {
            const dam = animal.damId ? byId.get(animal.damId) : null;
            const sire = animal.sireId ? byId.get(animal.sireId) : null;
            return (
              <article key={animal.id} className="panel-soft overflow-hidden rounded-[22px]">
                {animal.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={animal.photoUrl} alt={`${animal.name} pedigree photo`} className="h-48 w-full border-b border-white/[.055] object-cover" />
                ) : null}
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-white/78">{animal.name}</h3>
                      <div className="mt-1 text-[10px] text-white/32">{animal.sex || "Unknown"}{animal.hatchYear ? ` · ${animal.hatchYear}` : ""}</div>
                    </div>
                    <span className="rounded-full border border-emerald-300/10 px-2 py-1 text-[9px] font-bold text-emerald-100/60">PUBLIC</span>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[.055] bg-black/10 p-3">
                    <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Reported locality</div>
                    <div className="mt-1 text-sm font-semibold text-white/65">{animal.locality || "Mixed / Unknown"}</div>
                    <div className="mt-1 text-xs italic text-emerald-100/48">{taxonFor(animal.locality)}</div>
                  </div>

                  {animal.breederId ? <div className="mt-3 text-xs text-white/38"><span className="text-white/25">Animal ID:</span> {animal.breederId}</div> : null}

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-white/[.055] p-3"><div className="text-[9px] font-black uppercase tracking-[.11em] text-white/22">Dam</div><div className="mt-1 truncate text-white/55">{dam?.name || (animal.damId ? "Private / unpublished" : "Unknown")}</div></div>
                    <div className="rounded-xl border border-white/[.055] p-3"><div className="text-[9px] font-black uppercase tracking-[.11em] text-white/22">Sire</div><div className="mt-1 truncate text-white/55">{sire?.name || (animal.sireId ? "Private / unpublished" : "Unknown")}</div></div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel-soft rounded-[22px] p-8 text-center text-sm text-white/32">{animals.length ? "No published records match that search." : "The public lineage database is ready for the first opt-in records."}</div>
      )}
    </div>
  );
}
