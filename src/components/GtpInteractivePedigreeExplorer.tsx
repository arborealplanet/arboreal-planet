"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
};

type RelativeSlot = {
  id: string | null;
  label: string;
  animal: PublicAnimal | null;
};

function RelativeCard({ slot, compact = false }: { slot: RelativeSlot; compact?: boolean }) {
  if (!slot.animal) {
    return (
      <div className={`rounded-2xl border border-dashed border-white/[.07] bg-black/10 ${compact ? "p-3" : "p-4"}`}>
        <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/22">{slot.label}</div>
        <div className="mt-2 text-xs text-white/28">{slot.id ? "Private / unpublished" : "Unknown"}</div>
      </div>
    );
  }

  const animal = slot.animal;
  return (
    <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className={`interactive-card block overflow-hidden rounded-2xl border border-white/[.07] bg-black/10 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-3">
        {animal.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={animal.photoUrl} alt="" className={`${compact ? "h-10 w-10" : "h-12 w-12"} shrink-0 rounded-xl object-cover`} />
        ) : null}
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/22">{slot.label}</div>
          <div className={`mt-1 truncate font-semibold text-white/68 ${compact ? "text-xs" : "text-sm"}`}>{animal.name}</div>
          <div className="mt-1 truncate text-[10px] text-white/30">{animal.locality || "Mixed / Unknown"}{animal.hatchYear ? ` · ${animal.hatchYear}` : ""}</div>
        </div>
      </div>
    </Link>
  );
}

export function GtpInteractivePedigreeExplorer({ focusId }: { focusId: string }) {
  const [animals, setAnimals] = useState<PublicAnimal[]>([]);
  const [status, setStatus] = useState("Loading lineage explorer…");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/genetics/pedigree/public", { cache: "no-store" });
        const data = await response.json().catch(() => null) as { animals?: PublicAnimal[]; error?: string } | null;
        if (!response.ok) throw new Error(data?.error || "Could not load pedigree network.");
        if (!active) return;
        const next = Array.isArray(data?.animals) ? data.animals : [];
        setAnimals(next);
        setStatus("");
      } catch (error) {
        if (!active) return;
        setStatus(error instanceof Error ? error.message : "Could not load pedigree network.");
      }
    })();
    return () => { active = false; };
  }, []);

  const byId = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);
  const focus = byId.get(focusId) ?? null;

  const dam = focus?.damId ? byId.get(focus.damId) ?? null : null;
  const sire = focus?.sireId ? byId.get(focus.sireId) ?? null : null;
  const grandparents: RelativeSlot[] = [
    { id: dam?.damId ?? null, label: "Maternal granddam", animal: dam?.damId ? byId.get(dam.damId) ?? null : null },
    { id: dam?.sireId ?? null, label: "Maternal grandsire", animal: dam?.sireId ? byId.get(dam.sireId) ?? null : null },
    { id: sire?.damId ?? null, label: "Paternal granddam", animal: sire?.damId ? byId.get(sire.damId) ?? null : null },
    { id: sire?.sireId ?? null, label: "Paternal grandsire", animal: sire?.sireId ? byId.get(sire.sireId) ?? null : null },
  ];
  const children = focus ? animals.filter((animal) => animal.damId === focus.id || animal.sireId === focus.id) : [];
  const grandChildren = focus ? animals.filter((animal) => children.some((child) => animal.damId === child.id || animal.sireId === child.id)) : [];

  if (status) return <div className="panel rounded-[26px] p-5 text-xs text-white/40">{status}</div>;
  if (!focus) return null;

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-kicker">Interactive pedigree</div>
          <h2 className="mt-2 text-2xl font-semibold text-white/78">Trace ancestors and descendants.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/36">Tap any published relative to move through the lineage. Private or unpublished relatives stay masked.</p>
        </div>
        <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/35">2 generations each direction</span>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[760px] space-y-5">
          <div>
            <div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Grandparents</div>
            <div className="grid grid-cols-4 gap-3">{grandparents.map((slot) => <RelativeCard key={slot.label} slot={slot} compact />)}</div>
          </div>

          <div>
            <div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Parents</div>
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
              <RelativeCard slot={{ id: focus.damId ?? null, label: "Dam", animal: dam }} />
              <RelativeCard slot={{ id: focus.sireId ?? null, label: "Sire", animal: sire }} />
            </div>
          </div>

          <div className="mx-auto max-w-xl rounded-[24px] border border-emerald-300/15 bg-emerald-300/[.035] p-5 text-center shadow-[0_0_50px_rgba(16,185,129,.06)]">
            {focus.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={focus.photoUrl} alt="" className="mx-auto h-24 w-24 rounded-2xl object-cover" />
            ) : null}
            <div className="mt-3 text-[9px] font-black uppercase tracking-[.15em] text-emerald-100/40">Focused animal</div>
            <div className="mt-2 text-2xl font-semibold text-white/84">{focus.name}</div>
            <div className="mt-1 text-xs text-white/34">{focus.locality || "Mixed / Unknown"}{focus.hatchYear ? ` · ${focus.hatchYear}` : ""}</div>
          </div>

          <div>
            <div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Published offspring</div>
            {children.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children.map((child) => <RelativeCard key={child.id} slot={{ id: child.id, label: "Offspring", animal: child }} compact />)}</div> : <div className="rounded-2xl border border-dashed border-white/[.07] p-5 text-center text-xs text-white/28">No published offspring linked yet.</div>}
          </div>

          {grandChildren.length ? (
            <div>
              <div className="mb-2 text-center text-[9px] font-black uppercase tracking-[.15em] text-white/20">Published grandchildren</div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{grandChildren.slice(0, 12).map((child) => <RelativeCard key={child.id} slot={{ id: child.id, label: "Grandchild", animal: child }} compact />)}</div>
              {grandChildren.length > 12 ? <div className="mt-2 text-center text-[10px] text-white/25">Showing 12 of {grandChildren.length} published grandchildren.</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-5 text-white/25 sm:hidden">Swipe sideways to explore the full pedigree tree.</p>
    </section>
  );
}
