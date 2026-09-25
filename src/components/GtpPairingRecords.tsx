"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RegistryAnimal = {
  id: string;
  registryCode?: string;
  name: string;
  sex?: string;
  locality?: string;
  contributor?: { username?: string | null; displayName?: string | null } | null;
};

type Pairing = {
  id: string;
  dam_id: string;
  sire_id: string;
  pairing_year?: number | null;
  pairing_code?: string | null;
  notes?: string | null;
  visibility: "private" | "public";
  created_at: string;
};

function animalLabel(animal: RegistryAnimal) {
  const steward = animal.contributor?.displayName || animal.contributor?.username;
  return `${animal.name}${animal.registryCode ? ` · ${animal.registryCode}` : ""}${steward ? ` · ${steward}` : ""}`;
}

export function GtpPairingRecords() {
  const [own, setOwn] = useState<RegistryAnimal[]>([]);
  const [published, setPublished] = useState<RegistryAnimal[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [damId, setDamId] = useState("");
  const [sireId, setSireId] = useState("");
  const [pairingYear, setPairingYear] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [status, setStatus] = useState("Loading pairing records…");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setCheckFailed(false);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const [ownResponse, publicResponse, pairingResponse] = await Promise.all([
        fetch("/api/genetics/pedigree", { cache: "no-store", signal: controller.signal }),
        fetch("/api/genetics/pedigree/public", { cache: "no-store", signal: controller.signal }),
        fetch("/api/genetics/pairings", { cache: "no-store", signal: controller.signal }),
      ]);
      if (ownResponse.status === 401 || pairingResponse.status === 401) {
        setSignedIn(false);
        setStatus("Sign in to keep pairing records.");
        return;
      }
      const ownData = await ownResponse.json().catch(() => null) as { animals?: RegistryAnimal[]; error?: string } | null;
      const publicData = await publicResponse.json().catch(() => null) as { animals?: RegistryAnimal[]; error?: string } | null;
      const pairingData = await pairingResponse.json().catch(() => null) as { pairings?: Pairing[]; error?: string } | null;
      if (!ownResponse.ok) throw new Error(ownData?.error || "Could not load your registered animals.");
      if (!publicResponse.ok) throw new Error(publicData?.error || "Could not load the public registry.");
      if (!pairingResponse.ok) throw new Error(pairingData?.error || "Could not load pairing records.");
      const ownAnimals = Array.isArray(ownData?.animals) ? ownData.animals : [];
      const publicAnimals = Array.isArray(publicData?.animals) ? publicData.animals : [];
      const records = Array.isArray(pairingData?.pairings) ? pairingData.pairings : [];
      setOwn(ownAnimals);
      setPublished(publicAnimals);
      setPairings(records);
      setSignedIn(true);
      const choices = [...ownAnimals, ...publicAnimals.filter((animal) => !ownAnimals.some((ownAnimal) => ownAnimal.id === animal.id))];
      setDamId((current) => current || choices[0]?.id || "");
      setSireId((current) => current || choices.find((animal) => animal.id !== choices[0]?.id)?.id || "");
      setStatus(records.length ? `${records.length} pairing record${records.length === 1 ? "" : "s"} saved.` : "No pairing records yet. These are keeper-reported and optional.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("The sign-in check timed out. Check your connection and try again.");
      } else {
        setStatus(error instanceof Error ? error.message : "Could not load pairing records.");
      }
      setCheckFailed(true);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  useEffect(() => { void load(); }, []);

  const animals = useMemo(() => {
    const map = new Map<string, RegistryAnimal>();
    for (const animal of published) map.set(animal.id, animal);
    for (const animal of own) map.set(animal.id, { ...map.get(animal.id), ...animal });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [own, published]);
  const byId = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);

  async function createPairing() {
    if (!damId || !sireId || damId === sireId) {
      setStatus("Choose two different registered animals.");
      return;
    }
    setBusy(true);
    setStatus("Saving pairing record…");
    try {
      const response = await fetch("/api/genetics/pairings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ damId, sireId, pairingYear, pairingCode, notes, visibility }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not save pairing record.");
      setPairingCode("");
      setNotes("");
      await load();
      setStatus("Pairing record saved. Parent ownership was not changed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save pairing record.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisibility(pairing: Pairing) {
    setBusy(true);
    try {
      const next = pairing.visibility === "public" ? "private" : "public";
      const response = await fetch("/api/genetics/pairings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pairing.id, visibility: next }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not update pairing.");
      await load();
      setStatus(`Pairing is now ${next}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update pairing.");
    } finally {
      setBusy(false);
    }
  }

  async function removePairing(pairing: Pairing) {
    if (!window.confirm("Delete this pairing record? This does not change any animal or pedigree parent links.")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/genetics/pairings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pairing.id }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not delete pairing.");
      await load();
      setStatus("Pairing record deleted. Pedigree links were left unchanged.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete pairing.");
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === false) return <section className="panel rounded-[26px] p-5 sm:p-6"><div className="section-kicker">Breeding records</div><h2 className="mt-2 text-xl font-semibold text-white/80">Keep optional pairing history.</h2><p className="mt-2 text-xs leading-5 text-white/40">Pairing records can connect animals owned by different keepers without transferring either animal.</p><Link href="/login?next=/genetics" className="primary-action mt-4 inline-flex !min-h-0 !px-4 !py-2.5 !text-xs">Sign in to record pairings</Link></section>;

  return (
    <section className="panel rounded-[26px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Breeding records</div>
          <h2 className="mt-2 text-xl font-semibold text-white/80">Keeper-reported pairing history.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Record an actual pairing without changing ownership. Either parent can belong to another keeper as long as that animal is published in the registry. Pairing records are private by default.</p>
        </div>
        <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/40">OPTIONAL · LAX BY DESIGN</span>
      </div>

      {checkFailed ? (
        <div role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-500/[.07] p-3">
          <p className="text-xs font-bold text-red-100/85">Couldn&apos;t check your sign-in status.</p>
          <p className="mt-1 text-xs leading-5 text-white/45">{status}</p>
          <button type="button" onClick={() => void load()} className="mt-3 rounded-xl border border-white/[.12] px-4 py-2 text-xs font-bold text-white/75 transition hover:border-white/25 hover:text-white">Retry</button>
        </div>
      ) : (
        <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>
      )}

      {animals.length >= 2 ? <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28">Dam
          <select value={damId} onChange={(event) => setDamId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">{animals.map((animal) => <option key={animal.id} value={animal.id}>{animalLabel(animal)}</option>)}</select>
        </label>
        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28">Sire
          <select value={sireId} onChange={(event) => setSireId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">{animals.map((animal) => <option key={animal.id} value={animal.id}>{animalLabel(animal)}</option>)}</select>
        </label>
        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28">Pairing year <span className="font-normal text-white/20">optional</span>
          <input value={pairingYear} onChange={(event) => setPairingYear(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))} inputMode="numeric" placeholder="2026" className="mt-2 w-full rounded-xl border border-white/[.07] bg-black/20 px-3 py-3 text-sm normal-case tracking-normal text-white/65" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28">Pairing / clutch code <span className="font-normal text-white/20">optional</span>
          <input value={pairingCode} onChange={(event) => setPairingCode(event.target.value)} placeholder="Your internal pairing ID" className="mt-2 w-full rounded-xl border border-white/[.07] bg-black/20 px-3 py-3 text-sm normal-case tracking-normal text-white/65" />
        </label>
        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28 lg:col-span-2">Notes <span className="font-normal text-white/20">optional</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Breeding loan, partnership, pairing dates, clutch notes, etc." className="mt-2 w-full rounded-xl border border-white/[.07] bg-black/20 px-3 py-3 text-sm normal-case tracking-normal text-white/65" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
          <label className="flex items-center gap-2 text-xs text-white/45"><input type="checkbox" checked={visibility === "public"} onChange={(event) => setVisibility(event.target.checked ? "public" : "private")} /> Publish this pairing</label>
          <button type="button" disabled={busy || damId === sireId} onClick={() => void createPairing()} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c] disabled:opacity-30">Save pairing</button>
        </div>
      </div> : <div className="mt-5 rounded-2xl border border-dashed border-white/[.07] p-5 text-center text-xs text-white/30">You need access to at least two registered animals before creating a pairing record.</div>}

      {pairings.length ? <div className="mt-6 border-t border-white/[.06] pt-5"><div className="mb-3 text-[10px] font-black uppercase tracking-[.13em] text-white/25">Your saved pairings</div><div className="grid gap-3 md:grid-cols-2">{pairings.map((pairing) => {
        const dam = byId.get(pairing.dam_id);
        const sire = byId.get(pairing.sire_id);
        return <article key={pairing.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-semibold text-white/68">{dam?.name || "Unavailable dam"} × {sire?.name || "Unavailable sire"}</div><div className="mt-1 text-[10px] text-white/30">{pairing.pairing_code || "No pairing code"}{pairing.pairing_year ? ` · ${pairing.pairing_year}` : ""}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${pairing.visibility === "public" ? "border-emerald-300/12 text-emerald-100/55" : "border-white/[.07] text-white/35"}`}>{pairing.visibility.toUpperCase()}</span></div>
          {pairing.notes ? <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/37">{pairing.notes}</p> : null}
          <div className="mt-4 flex gap-3"><button type="button" disabled={busy} onClick={() => void toggleVisibility(pairing)} className="text-[10px] font-bold text-emerald-200/60 disabled:opacity-30">Make {pairing.visibility === "public" ? "private" : "public"}</button><button type="button" disabled={busy} onClick={() => void removePairing(pairing)} className="text-[10px] font-bold text-white/28 disabled:opacity-30">Delete</button></div>
        </article>;
      })}</div></div> : null}
    </section>
  );
}
