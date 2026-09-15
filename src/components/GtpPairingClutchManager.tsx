"use client";

import { useEffect, useMemo, useState } from "react";

type Pairing = {
  id: string;
  dam_id: string;
  sire_id: string;
  pairing_year?: number | null;
  pairing_code?: string | null;
  visibility: "private" | "public";
};
type Animal = {
  id: string;
  registryCode?: string;
  name: string;
  damId?: string | null;
  sireId?: string | null;
  hatchYear?: string;
};
type LinkRow = { pairing_id: string; animal_id: string };

export function GtpPairingClutchManager() {
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [selectedPairingId, setSelectedPairingId] = useState("");
  const [status, setStatus] = useState("Loading clutch grouping…");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [pairingResponse, ownResponse, publicResponse, linksResponse] = await Promise.all([
        fetch("/api/genetics/pairings", { cache: "no-store" }),
        fetch("/api/genetics/pedigree", { cache: "no-store" }),
        fetch("/api/genetics/pedigree/public", { cache: "no-store" }),
        fetch("/api/genetics/pairings/offspring", { cache: "no-store" }),
      ]);
      if (pairingResponse.status === 401 || ownResponse.status === 401 || linksResponse.status === 401) {
        setStatus("Sign in to group offspring into pairing/clutch records.");
        return;
      }
      const pairingData = await pairingResponse.json().catch(() => null) as { pairings?: Pairing[]; error?: string } | null;
      const ownData = await ownResponse.json().catch(() => null) as { animals?: Animal[]; error?: string } | null;
      const publicData = await publicResponse.json().catch(() => null) as { animals?: Animal[]; error?: string } | null;
      const linkData = await linksResponse.json().catch(() => null) as { links?: LinkRow[]; error?: string } | null;
      if (!pairingResponse.ok) throw new Error(pairingData?.error || "Could not load pairings.");
      if (!ownResponse.ok) throw new Error(ownData?.error || "Could not load your animals.");
      if (!publicResponse.ok) throw new Error(publicData?.error || "Could not load public animals.");
      if (!linksResponse.ok) throw new Error(linkData?.error || "Could not load clutch links.");

      const nextPairings = Array.isArray(pairingData?.pairings) ? pairingData.pairings : [];
      const animalMap = new Map<string, Animal>();
      for (const animal of Array.isArray(publicData?.animals) ? publicData.animals : []) animalMap.set(animal.id, animal);
      for (const animal of Array.isArray(ownData?.animals) ? ownData.animals : []) animalMap.set(animal.id, { ...animalMap.get(animal.id), ...animal });
      const nextLinks = Array.isArray(linkData?.links) ? linkData.links : [];
      setPairings(nextPairings);
      setAnimals([...animalMap.values()]);
      setLinks(nextLinks);
      setSelectedPairingId((current) => current && nextPairings.some((pairing) => pairing.id === current) ? current : nextPairings[0]?.id || "");
      setStatus(nextPairings.length ? "Choose a pairing to group already-matching offspring into that reported clutch." : "Create a pairing record first if you want to use clutch grouping.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load clutch grouping.");
    }
  }

  useEffect(() => { void load(); }, []);

  const selectedPairing = pairings.find((pairing) => pairing.id === selectedPairingId) ?? null;
  const byId = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);
  const candidates = useMemo(() => {
    if (!selectedPairing) return [];
    return animals.filter((animal) => animal.damId === selectedPairing.dam_id && animal.sireId === selectedPairing.sire_id);
  }, [animals, selectedPairing]);
  const linkedIds = useMemo(() => new Set(links.filter((link) => link.pairing_id === selectedPairingId).map((link) => link.animal_id)), [links, selectedPairingId]);

  async function toggle(animalId: string) {
    if (!selectedPairing) return;
    const currentlyLinked = linkedIds.has(animalId);
    setBusyId(animalId);
    setStatus(currentlyLinked ? "Removing offspring from this clutch grouping…" : "Adding offspring to this clutch grouping…");
    try {
      const response = await fetch("/api/genetics/pairings/offspring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingId: selectedPairing.id, animalId, link: !currentlyLinked }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not update clutch grouping.");
      await load();
      setStatus(currentlyLinked ? "Offspring removed from this grouping. Its pedigree was not changed." : "Offspring linked to this reported pairing/clutch.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update clutch grouping.");
    } finally {
      setBusyId(null);
    }
  }

  return <section className="panel rounded-[26px] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-kicker">Optional clutch grouping</div><h2 className="mt-2 text-xl font-semibold text-white/80">Group offspring under a specific recorded pairing.</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">This is optional and does not create parentage. Arboreal Planet only offers animals whose existing pedigree already matches that pairing&apos;s dam and sire, so grouping a clutch cannot silently rewrite the family tree.</p></div><span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/38">NO APPROVAL GATE</span></div>
    <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>

    {pairings.length ? <>
      <label className="mt-5 block text-[10px] font-black uppercase tracking-[.11em] text-white/28">Pairing / clutch record
        <select value={selectedPairingId} onChange={(event) => setSelectedPairingId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">
          {pairings.map((pairing) => {
            const dam = byId.get(pairing.dam_id);
            const sire = byId.get(pairing.sire_id);
            return <option key={pairing.id} value={pairing.id}>{pairing.pairing_code || "Pairing"}{pairing.pairing_year ? ` · ${pairing.pairing_year}` : ""} · {dam?.name || "Dam"} × {sire?.name || "Sire"}</option>;
          })}
        </select>
      </label>

      {selectedPairing ? <div className="mt-5">
        <div className="text-[10px] font-black uppercase tracking-[.12em] text-white/25">Matching registered offspring</div>
        {candidates.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{candidates.map((animal) => {
          const linked = linkedIds.has(animal.id);
          return <button key={animal.id} type="button" disabled={busyId !== null} onClick={() => void toggle(animal.id)} className={`rounded-2xl border p-4 text-left transition disabled:opacity-35 ${linked ? "border-emerald-300/15 bg-emerald-300/[.035]" : "border-white/[.06] bg-black/10 hover:border-emerald-300/10"}`}>
            <div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-white/68">{animal.name}</div><div className="mt-1 font-mono text-[9px] text-emerald-100/40">{animal.registryCode || "Registered animal"}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${linked ? "border-emerald-300/15 text-emerald-100/60" : "border-white/[.07] text-white/32"}`}>{linked ? "IN CLUTCH" : "ADD"}</span></div>
            <div className="mt-2 text-[10px] text-white/28">{animal.hatchYear ? `Hatched ${animal.hatchYear}` : "Hatch year not entered"}</div>
          </button>;
        })}</div> : <div className="mt-3 rounded-2xl border border-dashed border-white/[.07] p-5 text-center text-xs text-white/28">No accessible registered offspring currently have this exact dam and sire.</div>}
      </div> : null}
    </> : null}
  </section>;
}
