import Link from "next/link";
import { notFound } from "next/navigation";
import { GtpInteractivePedigreeExplorer } from "@/components/GtpInteractivePedigreeExplorer";
import { GTP_LOCALITY_TAXON } from "@/lib/green-tree-python-taxa";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type PublicRecord = {
  id: string;
  registry_code: string;
  owner_id: string;
  breeder_profile_id: string | null;
  name: string;
  sex: string | null;
  locality_label: string | null;
  breeder_animal_id: string | null;
  hatch_year: number | null;
  dam_id: string | null;
  sire_id: string | null;
  photo_path: string | null;
  record_status: "keeper_reported" | "breeder_confirmed" | "reviewed";
  updated_at: string;
};
type PublicProfile = { username: string | null; display_name: string | null; avatar_url: string | null };
type OwnershipHistory = {
  transfer_id: string;
  transferred_at: string;
  from_username: string | null;
  from_display_name: string | null;
  to_username: string | null;
  to_display_name: string | null;
};

const PUBLIC_FIELDS = "id,registry_code,owner_id,breeder_profile_id,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,photo_path,record_status,updated_at";

async function publicRecord(id: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&visibility=eq.public&select=${PUBLIC_FIELDS}&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json() as PublicRecord[];
  return rows[0] ?? null;
}

async function publicProfile(id: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=username,display_name,avatar_url&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json() as PublicProfile[];
  return rows[0] ?? null;
}

async function publicDescendants(id: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&or=(dam_id.eq.${encodeURIComponent(id)},sire_id.eq.${encodeURIComponent(id)})&select=${PUBLIC_FIELDS}&order=hatch_year.desc.nullslast&limit=100`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [] as PublicRecord[];
  return await response.json() as PublicRecord[];
}

async function publicSiblings(animal: PublicRecord) {
  const parentFilters = [
    animal.dam_id ? `dam_id.eq.${encodeURIComponent(animal.dam_id)}` : null,
    animal.sire_id ? `sire_id.eq.${encodeURIComponent(animal.sire_id)}` : null,
  ].filter((value): value is string => Boolean(value));
  if (!parentFilters.length) return [] as PublicRecord[];
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&id=neq.${encodeURIComponent(animal.id)}&or=(${parentFilters.join(",")})&select=${PUBLIC_FIELDS}&order=hatch_year.desc.nullslast&limit=100`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [] as PublicRecord[];
  return await response.json() as PublicRecord[];
}

async function publicOwnershipHistory(id: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/public_gtp_pedigree_transfer_history`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ p_animal_id: id }),
    cache: "no-store",
  });
  if (!response.ok) return [] as OwnershipHistory[];
  return await response.json() as OwnershipHistory[];
}

function taxonFor(locality: string | null) {
  if (!locality || locality === "Mixed / Unknown") return "Mixed / unknown subspecies";
  return GTP_LOCALITY_TAXON[locality as keyof typeof GTP_LOCALITY_TAXON] ?? "Locality label not mapped";
}

function recordStatusLabel(status: PublicRecord["record_status"] | null | undefined) {
  if (status === "breeder_confirmed") return "Breeder confirmed";
  if (status === "reviewed") return "Reviewed record";
  return "Keeper reported";
}

function MiniRecord({ animal, relationship, steward }: { animal: PublicRecord | null; relationship: string; steward?: PublicProfile | null }) {
  if (!animal) return <div className="rounded-2xl border border-dashed border-white/[.07] p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">{relationship}</div><div className="mt-2 text-sm text-white/30">Private, unpublished or unknown</div></div>;
  const stewardLabel = steward?.display_name || steward?.username || null;
  return <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="panel-soft interactive-card rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">{relationship}</div><div className="mt-2 font-semibold text-white/68">{animal.name}</div><div className="mt-1 text-xs text-white/35">{animal.registry_code} · {animal.locality_label || "Mixed / Unknown"}</div>{stewardLabel ? <div className="mt-2 text-[10px] text-emerald-100/38">Current steward: {stewardLabel}</div> : null}</Link>;
}

function RelatedAnimal({ animal, relationship }: { animal: PublicRecord; relationship: string }) {
  return <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="panel-soft interactive-card rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/23">{relationship}</div><div className="mt-1 font-semibold text-white/65">{animal.name}</div><div className="mt-1 text-[10px] text-white/31">{animal.registry_code} · {animal.locality_label || "Mixed / Unknown"}{animal.hatch_year ? ` · ${animal.hatch_year}` : ""}</div></Link>;
}

export default async function PublicLineageRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await publicRecord(id);
  if (!animal) notFound();

  const [dam, sire, descendants, siblings, contributor, confirmedBreeder, ownershipHistory] = await Promise.all([
    animal.dam_id ? publicRecord(animal.dam_id) : Promise.resolve(null),
    animal.sire_id ? publicRecord(animal.sire_id) : Promise.resolve(null),
    publicDescendants(animal.id),
    publicSiblings(animal),
    publicProfile(animal.owner_id),
    animal.breeder_profile_id ? publicProfile(animal.breeder_profile_id) : Promise.resolve(null),
    publicOwnershipHistory(animal.id),
  ]);
  const [damSteward, sireSteward] = await Promise.all([
    dam ? publicProfile(dam.owner_id) : Promise.resolve(null),
    sire ? publicProfile(sire.owner_id) : Promise.resolve(null),
  ]);
  const fullSiblings = siblings.filter((sibling) => Boolean(animal.dam_id && animal.sire_id && sibling.dam_id === animal.dam_id && sibling.sire_id === animal.sire_id));
  const fullSiblingIds = new Set(fullSiblings.map((sibling) => sibling.id));
  const halfSiblings = siblings.filter((sibling) => !fullSiblingIds.has(sibling.id));
  const locality = animal.locality_label || "Mixed / Unknown";
  const taxon = taxonFor(animal.locality_label);
  const contributorLabel = contributor?.display_name || contributor?.username || null;
  const confirmedBreederLabel = confirmedBreeder?.display_name || confirmedBreeder?.username || null;
  const recordStatus = recordStatusLabel(animal.record_status);

  return <main className="mx-auto max-w-7xl px-5 py-10 pb-20 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/genetics/database" className="text-xs font-bold text-emerald-200/70">← Public lineage database</Link>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/genetics/database/${encodeURIComponent(animal.id)}/card`} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.035] px-3 py-2 text-xs font-bold text-emerald-100/70">Print / share pedigree</Link>
        <Link href={`/genetics/database/${encodeURIComponent(animal.id)}/report`} className="rounded-xl border border-white/[.08] px-3 py-2 text-xs font-bold text-white/45">Report record</Link>
        <Link href="/genetics" className="text-xs font-bold text-white/40">Genetics tools →</Link>
      </div>
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
          <div className="mt-2 font-mono text-xs font-bold tracking-[.08em] text-emerald-200/60">{animal.registry_code}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-sm text-white/38">{animal.sex || "Unknown sex"}{animal.hatch_year ? ` · Hatched ${animal.hatch_year}` : ""}</span><span className="rounded-full border border-white/[.08] px-2.5 py-1 text-[10px] font-bold text-white/48">{recordStatus}</span></div>

          {contributorLabel ? <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[.06] bg-black/10 p-3">
            {contributor?.avatar_url ? <img src={contributor.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full border border-white/[.07] text-[10px] font-bold text-white/30">AP</div>}
            <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Current record steward</div>{contributor?.username ? <Link href={`/keepers/${encodeURIComponent(contributor.username)}`} className="mt-1 block text-sm font-semibold text-white/62 hover:text-emerald-100">{contributorLabel}</Link> : <div className="mt-1 text-sm font-semibold text-white/62">{contributorLabel}</div>}</div>
          </div> : null}

          {confirmedBreederLabel ? <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-3">
            {confirmedBreeder?.avatar_url ? <img src={confirmedBreeder.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/10 text-[10px] font-bold text-emerald-100/40">AP</div>}
            <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/45">Confirmed breeder</div>{confirmedBreeder?.username ? <Link href={`/keepers/${encodeURIComponent(confirmedBreeder.username)}`} className="mt-1 block text-sm font-semibold text-emerald-100/68 hover:text-emerald-100">{confirmedBreederLabel}</Link> : <div className="mt-1 text-sm font-semibold text-emerald-100/68">{confirmedBreederLabel}</div>}</div>
          </div> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Reported locality</div><div className="mt-2 font-semibold text-white/68">{locality}</div></div>
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Arboreal Planet grouping</div><div className="mt-2 font-semibold text-emerald-100/65">{taxon}</div></div>
            {animal.breeder_animal_id ? <div className="panel-soft rounded-2xl p-4 sm:col-span-2"><div className="text-[9px] font-black uppercase tracking-[.13em] text-white/25">Breeder / animal ID</div><div className="mt-2 font-semibold text-white/68">{animal.breeder_animal_id}</div></div> : null}
          </div>

          <p className="mt-6 text-xs leading-6 text-white/36">Locality is shown as the keeper-reported line label. Arboreal Planet uses the broader subspecies grouping for biological context; the locality label is not presented as independently verified geographic origin. Breeder confirmation means the named Arboreal Planet account confirmed producing this animal; it is not independent geographic-locality verification.</p>
        </div>
      </section>

      <div className="space-y-5">
        <section className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Parents</div>
          <h2 className="mt-2 text-2xl font-semibold text-white/78">Published parentage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><MiniRecord animal={dam} relationship="Dam" steward={damSteward}/><MiniRecord animal={sire} relationship="Sire" steward={sireSteward}/></div>
          <p className="mt-4 text-[10px] leading-5 text-white/28">Parentage does not imply ownership. A dam or sire may belong to another keeper through a breeding loan, partnership or outside breeding. Private relatives stay hidden until their own steward publishes them.</p>
        </section>

        {(fullSiblings.length || halfSiblings.length) ? <section className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Sibling network</div>
          <div className="mt-2 flex items-end justify-between gap-3"><h2 className="text-xl font-semibold text-white/75">Published siblings</h2><span className="text-xs font-bold text-white/30">{siblings.length}</span></div>
          {fullSiblings.length ? <div className="mt-4"><div className="mb-2 text-[9px] font-black uppercase tracking-[.12em] text-white/24">Full siblings · same published dam and sire</div><div className="grid gap-2 sm:grid-cols-2">{fullSiblings.slice(0, 12).map((sibling) => <RelatedAnimal key={sibling.id} animal={sibling} relationship="Full sibling" />)}</div></div> : null}
          {halfSiblings.length ? <div className="mt-4"><div className="mb-2 text-[9px] font-black uppercase tracking-[.12em] text-white/24">Half siblings · one shared published parent</div><div className="grid gap-2 sm:grid-cols-2">{halfSiblings.slice(0, 12).map((sibling) => <RelatedAnimal key={sibling.id} animal={sibling} relationship="Half sibling" />)}</div></div> : null}
          {(fullSiblings.length > 12 || halfSiblings.length > 12) ? <div className="mt-3 text-[10px] text-white/25">Showing up to 12 records in each sibling group.</div> : null}
        </section> : null}

        <section className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Descendants</div>
          <div className="mt-2 flex items-end justify-between gap-3"><h2 className="text-2xl font-semibold text-white/78">Published offspring</h2><span className="text-xs font-bold text-white/30">{descendants.length}</span></div>
          {descendants.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{descendants.map((child) => <Link key={child.id} href={`/genetics/database/${encodeURIComponent(child.id)}`} className="panel-soft interactive-card rounded-2xl p-4"><div className="font-semibold text-white/65">{child.name}</div><div className="mt-1 text-xs text-white/32">{child.registry_code} · {child.locality_label || "Mixed / Unknown"}{child.hatch_year ? ` · ${child.hatch_year}` : ""}</div></Link>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-white/[.07] p-6 text-center text-sm text-white/28">No published offspring are linked yet.</div>}
        </section>

        {ownershipHistory.length ? <section className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Ownership history</div>
          <h2 className="mt-2 text-xl font-semibold text-white/75">Publicly shared transfers</h2>
          <div className="mt-4 space-y-2">{ownershipHistory.map((entry) => {
            const from = entry.from_display_name || entry.from_username || "Private keeper";
            const to = entry.to_display_name || entry.to_username || "Private keeper";
            return <div key={entry.transfer_id} className="rounded-xl border border-white/[.055] p-3 text-xs text-white/42"><span className="font-semibold text-white/58">{from}</span> → <span className="font-semibold text-white/58">{to}</span><span className="ml-2 text-white/24">{new Date(entry.transferred_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div>;
          })}</div>
          <p className="mt-3 text-[10px] leading-5 text-white/25">Only completed transfers explicitly marked public are shown here, and private keeper profiles remain anonymous.</p>
        </section> : null}
      </div>
    </div>

    <div className="mt-6">
      <GtpInteractivePedigreeExplorer focusId={animal.id} />
    </div>
  </main>;
}
