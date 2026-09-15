"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Contributor = { username?: string | null; displayName?: string | null };
type Relation = { status: "unknown" | "private_or_unpublished" | "public"; id?: string; name?: string | null };
type PublicAnimal = {
  id: string;
  name: string;
  sex?: string;
  locality?: string;
  breederId?: string;
  hatchYear?: string;
  dam?: Relation;
  sire?: Relation;
  photoUrl?: string;
  contributor?: Contributor | null;
  confirmedProducers?: Contributor[];
};
type PairingOffspring = { id?: string | null; registryCode?: string | null; name?: string | null; sex?: string | null; locality?: string | null; hatchYear?: number | null };
type PublicPairing = {
  id: string;
  damId?: string | null;
  sireId?: string | null;
  pairingYear?: number | null;
  pairingCode?: string | null;
  notes?: string | null;
  reporter?: Contributor | null;
  offspring?: PairingOffspring[];
};
type RelativeSlot = { label: string; relation: Relation; animal: PublicAnimal | null };

function stewardLabel(animal: PublicAnimal) {
  return animal.contributor?.displayName || animal.contributor?.username || null;
}

function relationAnimal(relation: Relation | undefined, byId: Map<string, PublicAnimal>) {
  return relation?.status === "public" && relation.id ? byId.get(relation.id) ?? null : null;
}

function RelativeCard({ slot, compact = false }: { slot: RelativeSlot; compact?: boolean }) {
  if (!slot.animal) {
    return (
      <div className={`rounded-2xl border border-dashed border-white/[.07] bg-black/10 ${compact ? "p-3" : "p-4"}`}>
        <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/22">{slot.label}</div>
        <div className="mt-2 text-xs text-white/28">{slot.relation.status === "private_or_unpublished" ? "Private / unpublished" : "Unknown"}</div>
      </div>
    );
  }

  const animal = slot.animal;
  const steward = stewardLabel(animal);
  return (
    <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className={`interactive-card block overflow-hidden rounded-2xl border border-white/[.07] bg-black/10 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-3">
        {animal.photoUrl ? <img src={animal.photoUrl} alt="" className={`${compact ? "h-10 w-10" : "h-12 w-12"} shrink-0 rounded-xl object-cover`} /> : null}
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/22">{slot.label}</div>
          <div className={`mt-1 truncate font-semibold text-white/68 ${compact ? "text-xs" : "text-sm"}`}>{animal.name}</div>
          <div className="mt-1 truncate text-[10px] text-white/30">{animal.locality || "Mixed / Unknown"}{animal.hatchYear ? ` · ${animal.hatchYear}` : ""}</div>
          {steward ? <div className="mt-1 truncate text-[9px] text-emerald-100/38">Current steward: {steward}</div> : null}
        </div>
      </div>
    </Link>
  );
}

export function GtpInteractivePedigreeExplorer({ focusId }: { focusId: string }) {
  const [animals, setAnimals] = useState<PublicAnimal[]>([]);
  const [pairings, setPairings] = useState<PublicPairing[]>([]);
  const [status, setStatus] = useState("Loading lineage explorer…");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [animalResponse, pairingResponse] = await Promise.all([
          fetch(`/api/genetics/pedigree/public/${encodeURIComponent(focusId)}/graph`, { cache: "no-store" }),
          fetch(`/api/genetics/pairings/public?animalId=${encodeURIComponent(focusId)}`, { cache: "no-store" }),
        ]);
        const animalData = await animalResponse.json().catch(() => null) as { animals?: PublicAnimal[]; error?: string } | null;
        const pairingData = await pairingResponse.json().catch(() => null) as { pairings?: PublicPairing[]; error?: string } | null;
        if (!animalResponse.ok) throw new Error(animalData?.error || "Could not load pedigree network.");
        if (!pairingResponse.ok) throw new Error(pairingData?.error || "Could not load public pairing history.");
        if (!active) return;
        setAnimals(Array.isArray(animalData?.animals) ? animalData.animals : []);
        setPairings(Array.isArray(pairingData?.pairings) ? pairingData.pairings : []);
        setStatus("");
      } catch (error) {
        if (!active) return;
        setStatus(error instanceof Error ? error.message : "Could not load pedigree network.");
      }
    })();
    return () => { active = false; };
  }, [focusId]);

  const byId = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);
  const focus = byId.get(focusId) ?? null;
  const dam = focus ? relationAnimal(focus.dam, byId) : null;
  const sire = focus ? relationAnimal(focus.sire, byId) : null;
  const grandparents: RelativeSlot[] = [
    { relation: dam?.dam ?? { status: "unknown" }, label: "Maternal granddam", animal: dam ? relationAnimal(dam.dam, byId) : null },
    { relation: dam?.sire ?? { status: "unknown" }, label: "Maternal grandsire", animal: dam ? relationAnimal(dam.sire, byId) : null },
    { relation: sire?.dam ?? { status: "unknown" }, label: "Paternal granddam", animal: sire ? relationAnimal(sire.dam, byId) : null },
    { relation: sire?.sire ?? { status: "unknown" }, label: "Paternal grandsire", animal: sire ? relationAnimal(sire.sire, byId) : null },
  ];
  const children = focus ? animals.filter((animal) => animal.dam?.id === focus.id || animal.sire?.id === focus.id) : [];
  const childIds = new Set(children.map((child) => child.id));
  const grandChildren = focus ? animals.filter((animal) => (animal.dam?.id && childIds.has(animal.dam.id)) || (animal.sire?.id && childIds.has(animal.sire.id))) : [];
  const focusSteward = focus ? stewardLabel(focus) : null;
  const focusProducers = focus?.confirmedProducers ?? [];

  if (status) return <div className="panel rounded-[26px] p-5 text-xs text-white/40">{status}</div>;
  if (!focus) return null;

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-kicker">Interactive pedigree</div>
          <h2 className="mt-2 text-2xl font-semibold text-white/78">Trace ancestors, descendants and published pairings.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/36">Tap any published relative to move through the lineage. Parentage, producer credits and current stewardship are separate, so outside breedings and co-produced clutches do not imply shared ownership. Private or unpublished relatives stay masked.</p>
        </div>
        <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/35">2 generations each direction</span>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[760px] space-y-5">
          <div><div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Grandparents</div><div className="grid grid-cols-4 gap-3">{grandparents.map((slot) => <RelativeCard key={slot.label} slot={slot} compact />)}</div></div>

          <div><div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Parents</div><div className="mx-auto grid max-w-3xl grid-cols-2 gap-3"><RelativeCard slot={{ relation: focus.dam ?? { status: "unknown" }, label: "Dam", animal: dam }} /><RelativeCard slot={{ relation: focus.sire ?? { status: "unknown" }, label: "Sire", animal: sire }} /></div></div>

          <div className="mx-auto max-w-xl rounded-[24px] border border-emerald-300/15 bg-emerald-300/[.035] p-5 text-center shadow-[0_0_50px_rgba(16,185,129,.06)]">
            {focus.photoUrl ? <img src={focus.photoUrl} alt="" className="mx-auto h-24 w-24 rounded-2xl object-cover" /> : null}
            <div className="mt-3 text-[9px] font-black uppercase tracking-[.15em] text-emerald-100/40">Focused animal</div><div className="mt-2 text-2xl font-semibold text-white/84">{focus.name}</div><div className="mt-1 text-xs text-white/34">{focus.locality || "Mixed / Unknown"}{focus.hatchYear ? ` · ${focus.hatchYear}` : ""}</div>
            {focusSteward ? <div className="mt-2 text-[10px] text-emerald-100/42">Current steward: {focusSteward}</div> : null}
            {focusProducers.length ? <div className="mt-3 border-t border-emerald-300/10 pt-3"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-100/35">Confirmed producer{focusProducers.length === 1 ? "" : "s"}</div><div className="mt-2 flex flex-wrap justify-center gap-2">{focusProducers.map((producer, index) => { const label = producer.displayName || producer.username || `Producer ${index + 1}`; return producer.username ? <Link key={`${producer.username}-${index}`} href={`/keepers/${encodeURIComponent(producer.username)}`} className="rounded-lg border border-emerald-300/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100/62">{label}</Link> : <span key={`${label}-${index}`} className="rounded-lg border border-emerald-300/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100/62">{label}</span>; })}</div></div> : null}
          </div>

          <div><div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Published offspring</div>{children.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children.map((child) => <RelativeCard key={child.id} slot={{ relation: { status: "public", id: child.id, name: child.name }, label: "Offspring", animal: child }} compact />)}</div> : <div className="rounded-2xl border border-dashed border-white/[.07] p-5 text-center text-xs text-white/28">No published offspring linked yet.</div>}</div>

          {grandChildren.length ? <div><div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Published grandchildren</div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{grandChildren.slice(0,12).map((child) => <RelativeCard key={child.id} slot={{ relation: { status: "public", id: child.id, name: child.name }, label: "Grandchild", animal: child }} compact />)}</div>{grandChildren.length > 12 ? <div className="mt-2 text-center text-[10px] text-white/25">Showing 12 of {grandChildren.length} published grandchildren.</div> : null}</div> : null}
        </div>
      </div>

      {pairings.length ? <div className="mt-6 border-t border-white/[.06] pt-5">
        <div className="flex items-end justify-between gap-3"><div><div className="section-kicker">Breeding history</div><h3 className="mt-2 text-xl font-semibold text-white/72">Published pairing records</h3></div><span className="text-xs font-bold text-white/30">{pairings.length}</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{pairings.map((pairing) => {
          const partnerId = pairing.damId === focus.id ? pairing.sireId : pairing.damId;
          const partner = partnerId ? byId.get(partnerId) ?? null : null;
          const reporter = pairing.reporter?.displayName || pairing.reporter?.username || "Keeper reported";
          const clutch = pairing.offspring ?? [];
          return <div key={pairing.id} className="rounded-2xl border border-white/[.06] bg-black/10 p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Published pairing</div><div className="mt-1 font-semibold text-white/66">{focus.name} × {partner?.name || "Private / unpublished partner"}</div><div className="mt-1 text-[10px] text-white/30">{pairing.pairingCode || "No pairing code"}{pairing.pairingYear ? ` · ${pairing.pairingYear}` : ""}</div>{pairing.notes ? <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/36">{pairing.notes}</p> : null}{clutch.length ? <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[.025] p-3"><div className="text-[9px] font-black uppercase tracking-[.11em] text-emerald-100/40">Explicitly grouped offspring · {clutch.length}</div><div className="mt-2 flex flex-wrap gap-2">{clutch.map((offspring,index) => offspring.id ? <Link key={offspring.id} href={`/genetics/database/${encodeURIComponent(offspring.id)}`} className="rounded-lg border border-emerald-300/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100/60">{offspring.name || offspring.registryCode || `Offspring ${index + 1}`}</Link> : null)}</div></div> : null}<div className="mt-3 text-[9px] text-emerald-100/35">Reported by: {reporter}</div>{partner ? <Link href={`/genetics/database/${encodeURIComponent(partner.id)}`} className="mt-2 inline-flex text-[10px] font-bold text-emerald-200/60">Open partner record →</Link> : null}</div>;
        })}</div>
        <p className="mt-3 text-[10px] leading-5 text-white/25">Pairing and clutch grouping are keeper-reported history. A pairing does not transfer ownership or automatically prove offspring; grouped offspring are records whose existing dam/sire already match that pairing.</p>
      </div> : null}

      <p className="mt-3 text-[10px] leading-5 text-white/25 sm:hidden">Swipe sideways to explore the full pedigree tree.</p>
    </section>
  );
}
