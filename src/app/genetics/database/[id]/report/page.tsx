import Link from "next/link";
import { notFound } from "next/navigation";
import { GtpRecordReportForm } from "@/components/GtpRecordReportForm";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type PublicRecord = { id: string; name: string; registry_code: string };

export const dynamic = "force-dynamic";

export default async function ReportLineageRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&visibility=eq.public&select=id,name,registry_code&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  const rows = response.ok ? await response.json().catch(() => []) as PublicRecord[] : [];
  const animal = rows[0];
  if (!animal) notFound();

  return <main className="mx-auto max-w-3xl px-5 py-10 pb-20 sm:px-6">
    <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="text-xs font-bold text-emerald-200/70">← {animal.registry_code}</Link>
    <div className="mt-5"><GtpRecordReportForm animalId={animal.id} animalName={animal.name} /></div>
  </main>;
}
