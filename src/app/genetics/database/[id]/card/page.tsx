import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GtpPedigreeCardActions } from "@/components/GtpPedigreeCardActions";
import { GTP_LOCALITY_TAXON } from "@/lib/green-tree-python-taxa";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type PublicRecord = {
  id: string;
  owner_id: string;
  name: string;
  sex: string | null;
  locality_label: string | null;
  breeder_animal_id: string | null;
  hatch_year: number | null;
  dam_id: string | null;
  sire_id: string | null;
  photo_path: string | null;
};

type PublicProfile = {
  username: string | null;
  display_name: string | null;
};

async function publicRecord(id: string | null) {
  if (!id) return null;
  const fields = "id,owner_id,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,photo_path";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&visibility=eq.public&select=${fields}&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json() as PublicRecord[];
  return rows[0] ?? null;
}

async function publicProfile(id: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=username,display_name&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json() as PublicProfile[];
  return rows[0] ?? null;
}

function taxonFor(locality: string | null) {
  if (!locality || locality === "Mixed / Unknown") return "Mixed / unknown subspecies";
  return GTP_LOCALITY_TAXON[locality as keyof typeof GTP_LOCALITY_TAXON] ?? "Locality label not mapped";
}

function RelativeBox({ title, animal }: { title: string; animal: PublicRecord | null }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[.025] p-3">
      <div className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">{title}</div>
      {animal ? (
        <>
          <div className="mt-1 text-sm font-bold text-black/78">{animal.name}</div>
          <div className="mt-1 text-[10px] text-black/48">{animal.locality_label || "Mixed / Unknown"}{animal.hatch_year ? ` · ${animal.hatch_year}` : ""}</div>
        </>
      ) : (
        <div className="mt-2 text-xs text-black/35">Private, unpublished or unknown</div>
      )}
    </div>
  );
}

export default async function PedigreeCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await publicRecord(id);
  if (!animal) notFound();

  const [dam, sire, contributor] = await Promise.all([
    publicRecord(animal.dam_id),
    publicRecord(animal.sire_id),
    publicProfile(animal.owner_id),
  ]);
  const [maternalGrandDam, maternalGrandSire, paternalGrandDam, paternalGrandSire] = await Promise.all([
    publicRecord(dam?.dam_id ?? null),
    publicRecord(dam?.sire_id ?? null),
    publicRecord(sire?.dam_id ?? null),
    publicRecord(sire?.sire_id ?? null),
  ]);

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "arboreal-planet.vercel.app";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const recordUrl = `${protocol}://${host}/genetics/database/${encodeURIComponent(animal.id)}`;
  const qrUrl = `https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(recordUrl)}`;
  const locality = animal.locality_label || "Mixed / Unknown";
  const taxon = taxonFor(animal.locality_label);
  const contributorLabel = contributor?.display_name || contributor?.username || "Anonymous contributor";

  return (
    <main className="min-h-screen bg-[#eef1ec] px-4 py-6 text-[#101713] print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[900px] items-center justify-between gap-3 print:hidden">
        <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="text-xs font-bold text-emerald-900/70">← Back to lineage record</Link>
        <GtpPedigreeCardActions recordUrl={recordUrl} animalName={animal.name} />
      </div>

      <article className="mx-auto max-w-[900px] overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-2xl shadow-black/10 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-black/10 bg-[#0d1712] px-6 py-5 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200/60">Arboreal Planet · Green Tree Python pedigree</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">{animal.name}</h1>
              <div className="mt-2 text-sm text-white/50">{animal.sex || "Unknown sex"}{animal.hatch_year ? ` · Hatched ${animal.hatch_year}` : ""}</div>
            </div>
            <div className="rounded-full border border-emerald-200/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-emerald-100/75">Public lineage record</div>
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[.88fr_1.12fr]">
          <section className="border-b border-black/10 bg-[#f6f7f4] lg:border-b-0 lg:border-r">
            {animal.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/genetics/pedigree/photo?id=${encodeURIComponent(animal.id)}`} alt={`${animal.name} pedigree photo`} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-center text-black/20"><div><div className="text-5xl">◇</div><div className="mt-2 text-[10px] font-bold uppercase tracking-[.14em]">No public photo</div></div></div>
            )}

            <div className="space-y-4 p-6 sm:p-7">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.13em] text-black/35">Reported locality</div>
                <div className="mt-1 text-xl font-bold text-black/78">{locality}</div>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.13em] text-black/35">Subspecies / taxon grouping</div>
                <div className="mt-1 text-sm font-semibold italic text-emerald-900/72">{taxon}</div>
              </div>
              {animal.breeder_animal_id ? <div><div className="text-[9px] font-black uppercase tracking-[.13em] text-black/35">Breeder / animal ID</div><div className="mt-1 text-sm font-bold text-black/68">{animal.breeder_animal_id}</div></div> : null}
              <div><div className="text-[9px] font-black uppercase tracking-[.13em] text-black/35">Contributed by</div><div className="mt-1 text-sm font-bold text-black/68">{contributorLabel}</div></div>
            </div>
          </section>

          <section className="p-6 sm:p-7">
            <div className="text-[10px] font-black uppercase tracking-[.15em] text-emerald-900/50">Three-generation pedigree</div>

            <div className="mt-5 grid gap-4">
              <div>
                <div className="mb-2 text-[9px] font-black uppercase tracking-[.12em] text-black/28">Maternal line</div>
                <div className="grid gap-2 sm:grid-cols-2"><RelativeBox title="Maternal granddam" animal={maternalGrandDam}/><RelativeBox title="Maternal grandsire" animal={maternalGrandSire}/></div>
                <div className="mx-auto h-4 w-px bg-black/15" />
                <RelativeBox title="Dam" animal={dam}/>
              </div>

              <div className="rounded-2xl border-2 border-emerald-900/20 bg-emerald-900/[.035] p-4 text-center">
                <div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-900/45">Focus animal</div>
                <div className="mt-1 text-xl font-black text-black/78">{animal.name}</div>
                <div className="mt-1 text-xs text-black/45">{locality} · {taxon}</div>
              </div>

              <div>
                <RelativeBox title="Sire" animal={sire}/>
                <div className="mx-auto h-4 w-px bg-black/15" />
                <div className="grid gap-2 sm:grid-cols-2"><RelativeBox title="Paternal granddam" animal={paternalGrandDam}/><RelativeBox title="Paternal grandsire" animal={paternalGrandSire}/></div>
                <div className="mt-2 text-[9px] font-black uppercase tracking-[.12em] text-black/28">Paternal line</div>
              </div>
            </div>

            <div className="mt-7 flex items-end justify-between gap-5 border-t border-black/10 pt-5">
              <div className="max-w-md text-[10px] leading-5 text-black/42">
                Locality is displayed as the keeper-reported line label. Arboreal Planet uses the broader subspecies grouping for biological context and does not present locality labels as independently verified geographic origin.
              </div>
              <div className="shrink-0 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR code to live Arboreal Planet pedigree" className="h-28 w-28 border border-black/10 bg-white p-1 sm:h-32 sm:w-32" />
                <div className="mt-1 text-[8px] font-bold uppercase tracking-[.12em] text-black/35">Live pedigree</div>
              </div>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
