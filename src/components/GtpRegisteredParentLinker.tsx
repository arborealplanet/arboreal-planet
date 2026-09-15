"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OwnAnimal = {
  id: string;
  registryCode?: string;
  name: string;
  damId?: string | null;
  sireId?: string | null;
};

type PublicAnimal = {
  id: string;
  registryCode?: string;
  name: string;
  sex?: string;
  locality?: string;
  contributor?: { username?: string | null; displayName?: string | null } | null;
};

export function GtpRegisteredParentLinker() {
  const [own, setOwn] = useState<OwnAnimal[]>([]);
  const [published, setPublished] = useState<PublicAnimal[]>([]);
  const [childId, setChildId] = useState("");
  const [role, setRole] = useState<"dam" | "sire">("dam");
  const [parentQuery, setParentQuery] = useState("");
  const [status, setStatus] = useState("Loading registered animals…");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  async function load() {
    try {
      const [ownResponse, publicResponse] = await Promise.all([
        fetch("/api/genetics/pedigree", { cache: "no-store" }),
        fetch("/api/genetics/pedigree/public", { cache: "no-store" }),
      ]);
      if (ownResponse.status === 401) {
        setSignedIn(false);
        setStatus("Sign in to link registered parents to your animals.");
        return;
      }
      const ownData = await ownResponse.json().catch(() => null) as { animals?: OwnAnimal[]; error?: string } | null;
      const publicData = await publicResponse.json().catch(() => null) as { animals?: PublicAnimal[]; error?: string } | null;
      if (!ownResponse.ok) throw new Error(ownData?.error || "Could not load your pedigree animals.");
      if (!publicResponse.ok) throw new Error(publicData?.error || "Could not load the public registry.");
      const ownAnimals = Array.isArray(ownData?.animals) ? ownData.animals : [];
      const publicAnimals = Array.isArray(publicData?.animals) ? publicData.animals : [];
      setOwn(ownAnimals);
      setPublished(publicAnimals);
      setSignedIn(true);
      setChildId((current) => current || ownAnimals[0]?.id || "");
      setStatus(ownAnimals.length ? "Link a published registered animal as a parent without changing ownership." : "Add and cloud-sync an animal first.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load registered animals.");
    }
  }

  useEffect(() => { void load(); }, []);

  const child = own.find((animal) => animal.id === childId) ?? null;
  const currentParentId = child ? (role === "dam" ? child.damId : child.sireId) : null;
  const currentParent = currentParentId
    ? published.find((animal) => animal.id === currentParentId) || own.find((animal) => animal.id === currentParentId) || null
    : null;

  const matches = useMemo(() => {
    const needle = parentQuery.trim().toLowerCase();
    if (!needle) return [];
    return published
      .filter((animal) => animal.id !== childId)
      .filter((animal) => [animal.registryCode, animal.name, animal.locality, animal.contributor?.displayName, animal.contributor?.username]
        .some((value) => String(value ?? "").toLowerCase().includes(needle)))
      .slice(0, 8);
  }, [published, parentQuery, childId]);

  async function setParent(parentRegistryCode: string) {
    if (!childId) return;
    setBusy(true);
    setStatus(parentRegistryCode ? `Linking registered ${role}…` : `Clearing ${role} link…`);
    try {
      const response = await fetch("/api/genetics/pedigree/parent-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, role, parentRegistryCode }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not update the parent link.");
      setParentQuery("");
      await load();
      setStatus(parentRegistryCode ? `Registered ${role} linked. Ownership was not changed.` : `${role === "dam" ? "Dam" : "Sire"} link cleared.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update the parent link.");
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === false) {
    return <section className="panel rounded-[26px] p-5 sm:p-6"><div className="section-kicker">Cross-keeper parentage</div><h2 className="mt-2 text-xl font-semibold text-white/80">Link registered parents across keepers.</h2><p className="mt-3 text-xs leading-5 text-white/40">Breeding loans, partnerships and outside breedings do not require an ownership transfer.</p><Link href="/login?next=/genetics" className="primary-action mt-4 inline-flex !min-h-0 !px-4 !py-2.5 !text-xs">Sign in to link parents</Link></section>;
  }

  return (
    <section className="panel rounded-[26px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Cross-keeper parentage</div>
          <h2 className="mt-2 text-xl font-semibold text-white/80">Link a registered dam or sire without transferring ownership.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Use this for breeding agreements, loans, partnerships or any pairing where the parents belong to different keepers. The parent must simply be published in the Arboreal Planet registry.</p>
        </div>
        <span className="rounded-full border border-emerald-300/12 px-3 py-1.5 text-[10px] font-bold text-emerald-100/55">OWNERSHIP STAYS SEPARATE</span>
      </div>

      <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>

      {own.length ? <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_.6fr_1.4fr]">
        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28">Your offspring / animal
          <select value={childId} onChange={(event) => setChildId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">
            {own.map((animal) => <option key={animal.id} value={animal.id}>{animal.name}{animal.registryCode ? ` · ${animal.registryCode}` : ""}</option>)}
          </select>
        </label>

        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28">Parent role
          <select value={role} onChange={(event) => setRole(event.target.value as "dam" | "sire")} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-3 text-xs normal-case tracking-normal text-white/65">
            <option value="dam">Dam</option>
            <option value="sire">Sire</option>
          </select>
        </label>

        <label className="text-[10px] font-black uppercase tracking-[.11em] text-white/28">Find published parent
          <input value={parentQuery} onChange={(event) => setParentQuery(event.target.value)} placeholder="AP-GTP-… or animal / keeper name" className="mt-2 w-full rounded-xl border border-white/[.07] bg-black/20 px-3 py-3 text-sm normal-case tracking-normal text-white/70" />
        </label>
      </div> : null}

      {child && <div className="mt-4 rounded-2xl border border-white/[.06] bg-black/10 p-4 text-xs text-white/42">
        <span className="font-bold text-white/58">Current {role}:</span> {currentParent ? `${currentParent.name}${"registryCode" in currentParent && currentParent.registryCode ? ` · ${currentParent.registryCode}` : ""}` : currentParentId ? "Linked private/unavailable record" : "Unknown / not linked"}
        {currentParentId ? <button type="button" disabled={busy} onClick={() => void setParent("")} className="ml-3 font-bold text-white/35 hover:text-white/60 disabled:opacity-30">Clear link</button> : null}
      </div>}

      {parentQuery.trim() ? <div className="mt-4 grid gap-2 md:grid-cols-2">
        {matches.length ? matches.map((animal) => {
          const keeper = animal.contributor?.displayName || animal.contributor?.username || "Public registry";
          return <button key={animal.id} type="button" disabled={busy || !animal.registryCode} onClick={() => animal.registryCode && void setParent(animal.registryCode)} className="rounded-2xl border border-white/[.06] bg-black/10 p-4 text-left transition hover:border-emerald-300/15 hover:bg-emerald-300/[.025] disabled:opacity-35">
            <div className="flex items-start justify-between gap-3"><div className="font-semibold text-white/68">{animal.name}</div><div className="font-mono text-[9px] font-bold text-emerald-100/50">{animal.registryCode || "NO REGISTRY ID"}</div></div>
            <div className="mt-1 text-[10px] text-white/32">{animal.sex || "Unknown sex"} · {animal.locality || "Mixed / Unknown"}</div>
            <div className="mt-2 text-[10px] text-white/25">Steward: {keeper}</div>
          </button>;
        }) : <div className="rounded-xl border border-dashed border-white/[.06] p-4 text-xs text-white/28 md:col-span-2">No published registry animal matches that search.</div>}
      </div> : null}
    </section>
  );
}
