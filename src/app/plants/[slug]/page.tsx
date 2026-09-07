import Link from "next/link";
import { notFound } from "next/navigation";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic="force-dynamic";
type Plant={id:string;slug:string;name:string;scientific_name:string;plant_group:string;description:string|null;tags:string[]|null;status:string};
const h={apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`};

export default async function PlantRecordPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const clean=decodeURIComponent(slug).trim();if(!clean)notFound();
  const r=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/plant_collections?slug=eq.${encodeURIComponent(clean)}&status=neq.PLANNED&select=id,slug,name,scientific_name,plant_group,description,tags,status&limit=1`,{headers:h,cache:"no-store"});
  if(!r.ok)notFound();const rows:Plant[]=await r.json();const plant=rows[0];if(!plant)notFound();
  const fields=[
    ["Identity","Available","Collection name, scientific scope and plant group"],
    ["Light","Pending","No reviewed light range has been published yet"],
    ["Temperature","Pending","No reviewed temperature range has been published yet"],
    ["Humidity","Pending","No reviewed humidity range has been published yet"],
    ["Watering","Pending","No reviewed watering guidance has been published yet"],
    ["Substrate / media","Pending","No reviewed media guidance has been published yet"]
  ] as const;
  return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
    <Link href="/plants" className="text-xs font-bold text-emerald-200/70">← Plant Database</Link>
    <section className="panel mt-5 rounded-[32px] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-kicker">{plant.plant_group}</div><h1 className="mt-3 text-4xl font-semibold tracking-[-.035em] sm:text-5xl">{plant.name}</h1><div className="mt-2 text-base italic text-white/38">{plant.scientific_name}</div></div><span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-emerald-200/70">{plant.status}</span></div>{plant.description&&<p className="mt-7 max-w-3xl text-sm leading-7 text-white/55">{plant.description}</p>}{plant.tags?.length?<div className="mt-6 flex flex-wrap gap-2">{plant.tags.map(t=><span key={t} className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] text-white/35">{t}</span>)}</div>:null}</section>

    <section className="mt-6"><div className="mb-4"><div className="section-kicker">Cultivation record</div><h2 className="mt-2 text-2xl font-semibold">Structured fields, without invented care data.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/38">The record already has the slots needed for a useful cultivation reference. A field only becomes available when reviewed information is actually stored for it.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label,status,text])=><div key={label} className="panel-soft rounded-2xl p-5"><div className="flex items-center justify-between gap-3"><div className="text-[10px] font-black uppercase tracking-[.13em] text-white/30">{label}</div><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${status==="Available"?"bg-emerald-300/[.08] text-emerald-200/70":"bg-white/[.035] text-white/25"}`}>{status}</span></div><p className="mt-3 text-xs leading-5 text-white/34">{text}</p></div>)}</div></section>

    <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><div className="panel rounded-3xl p-6"><div className="section-kicker">Reference scope</div><h2 className="mt-3 text-2xl font-semibold">What this record currently represents</h2><div className="mt-5 space-y-3 text-sm leading-6 text-white/42"><p><span className="font-semibold text-white/60">Collection:</span> {plant.name}</p><p><span className="font-semibold text-white/60">Scientific scope:</span> {plant.scientific_name}</p><p><span className="font-semibold text-white/60">Plant group:</span> {plant.plant_group}</p><p><span className="font-semibold text-white/60">Status:</span> {plant.status}</p></div><div className="mt-6 rounded-2xl border border-amber-300/10 bg-amber-300/[.025] p-4 text-xs leading-5 text-amber-100/45">Species-level or hybrid-level cultivation values should be added as reviewed records later rather than copied into a broad collection page.</div></div><div className="space-y-4"><Link href="/marketplace?category=PLANT" className="panel block rounded-3xl p-6 transition hover:bg-emerald-300/[.025]"><div className="section-kicker">Marketplace</div><div className="mt-2 font-semibold">Browse plant listings →</div><p className="mt-2 text-xs leading-5 text-white/32">Seller inventory remains separate from the reference record because listings do not currently link to a specific plant collection.</p></Link><Link href="/community" className="panel block rounded-3xl p-6 transition hover:bg-white/[.025]"><div className="section-kicker">Community</div><div className="mt-2 font-semibold">Cultivation discussion →</div><p className="mt-2 text-xs leading-5 text-white/32">Keeper experience can inform future review without becoming a database fact automatically.</p></Link></div></section>
  </main>;
}
