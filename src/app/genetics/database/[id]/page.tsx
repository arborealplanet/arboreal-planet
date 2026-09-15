import Link from "next/link";
import { notFound } from "next/navigation";
import { GTP_LOCALITY_TAXON } from "@/lib/green-tree-python-taxa";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type PublicRecord = {
  id: string;
  name: string;
  sex: string | null;
  locality_label: string | null;
  breeder_animal_id: string | null;
  hatch_year: number | null;
  dam_id: string | null;
  sire_id: string | null;
  photo_path: string | null;
  updated_at: string;
};

async function publicRecord(id: string) {
  const fields = "id,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,photo_path,updated_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&visibility=eq.public&select=${fields}&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json() as PublicRecord[];
  return rows[0] ?? null;
}

async function publicDescendants(id: string) {
  const fields = "id,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,photo_path,updated_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&or=(dam_id.eq.${encodeURIComponent(id)},sire_id.eq.${encodeURIComponent(id)})&select=${fields}&order=hatch_year.desc.nullslast&limit=100`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [] as PublicRecord[];
  return await response.json() as PublicRecord[];
}

function taxonFor(locality: string | null) {
  if (!locality || locality === "Mixed / Unknown") return "Mixed / unknown subspecies";
  return GTP_LOCALITY_TAXON[locality as keyof typeof GTP_LOCALITY_TAXON] ?? "Locality label not mapped";
}

function MiniRecord({ animal, relationship }: { animal: PublicRecord | null; relationship: string }) {
  if (!animal) return <div className="rounded-2xl border border-dashed border-white/[.07] p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">{relationship}</div><div className="mt-2 text-sm text-white/30">Private, unpublished or unknown</div></div>;
  return <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="panel-soft interactive-card rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">{relationship}</div><div className="mt-2 font-semibold text-white/68">{animal.name}</div><div className="mt-1 text-xs text-white/35">{animal.locality_label || "Mixed / Unknown"}</div></Link>;
}

export default async function PublicLineageRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await publicRecord(id);
  if (!animal) notFound();

  const [dam, sire, descendants] = await Promise.all([
    animal.dam_id ? publicRecord(animal.dam_id) : Promise.resolve(null),
    animal.sire_id ? publicRecord(animal.sire_id) : Promise.resolve(null),
    publicDescendants(animal.id),
  ]);
  const locality = animal.locality_label || "Mixed / Unknown";
  const taxon = taxonFor(animal.locality_label);

  return <main className="mx-auto max-w-7xl px-5 py-10 pb-20 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/genetics/database" className="text-xs font-bold text-emerald-200/70">← Public lineage database</Link>
      <Link href="/genetics" className="text-xs font-bold text-white/40">Genetics tools →</Link>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="panel overflow-hidden rounded-[28px]">
        {animal.photo_path ? <div className="grid-surface border-b border-white/[.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/genetics/pedigree/photo?id=${encodeURIComponent(animal.id)}`} alt={`${animal.name} pedigree photo`} className="max-h-[620px] w-full object-cover" />
        </div> : <div className="grid-surface grid min-h-64 place-items-center border-b border-white/[.06] text-center text-white/15"><div><div className="text-5xl">◇</div><div className="mt-3 text-xs uppercase tracking-[.15em]">No public photo</div></div></div>}
        <div className="p-6 sm:p-8">
          <div className="section-kicker">Published lineage record</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.04em] text-white/88">{animal.name}</h1>
          <div className="mt-3 text-sm text-white/38">{animal.sex || "Unknown sex"}{animal.hatch_year ? ` · Hatched ${animal.hatch_year}` : ""}</div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Reported locality</div><div className="mt-2 font-semibold text-white/68">{locality}</div></div>
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Arboreal Planet grouping</div><div className="mt-2 font-semibold text-emerald-100/65">{taxon}</div></div>
            {animal.breeder_animal_id ? <div className="panel-soft rounded-2xl p-4 sm:col-span-2"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Breeder / animal ID</div><div className="mt-2 font-semibold text-white/68">{animal.breeder_animal_id}</div></div> : null}
          </div>

          <p className="mt-6 text-xs leading-6 text-white/36">Locality is shown as the keeper-reported line label. Arboreal Planet uses the broader subspecies grouping for biological context; the locality label is not presented as independently verified geographic origin.</p>
        </div>
      </section>

      <div className="space-y-5">
        <section className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Parents</div>
          <h2 className="mt-2 text-2xl font-semibold text-white/78">Published parentage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><MiniRecord animal={dam} relationship="Dam"/><MiniRecord animal={sire} relationship="Sire"/></div>
          <p className="mt-4 text-[10px] leading-5 text-white/28">A parent can be linked in the keeper's private pedigree without appearing here. Private relatives stay hidden until their owner publishes them.</p>
        </section>

        <section className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Descendants</div>
          <div className="mt-2 flex items-end justify-between gap-3"><h2 className="text-2xl font-semibold text-white/78">Published offspring</h2><span className="text-xs font-bold text-white/30">{descendants.length}</span></div>
          {descendants.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{descendants.map((child) => <Link key={child.id} href={`/genetics/database/${encodeURIComponent(child.id)}`} className="panel-soft interactive-card rounded-2xl p-4"><div className="font-semibold text-white/65">{child.name}</div><div className="mt-1 text-xs text-white/32">{child.locality_label || "Mixed / Unknown"}{child.hatch_year ? ` · ${child.hatch_year}` : ""}</div></Link>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-white/[.07] p-6 text-center text-sm text-white/28">No published offspring are linked yet.</div>}
        </section>
      </div>
    </div>
  </main>;
}
