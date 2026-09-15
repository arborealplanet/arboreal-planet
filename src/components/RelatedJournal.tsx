import Link from "next/link";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type Article={id:string;slug:string;title:string;excerpt:string|null;content_type:string;category:string;published_at:string};

export async function RelatedJournal({speciesId,plantId,title="Related Learn"}:{speciesId?:string|null;plantId?:string|null;title?:string}){
  const filter=speciesId?`related_species_id=eq.${encodeURIComponent(speciesId)}`:plantId?`related_plant_id=eq.${encodeURIComponent(plantId)}`:"";
  if(!filter)return null;
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/journal_articles?status=eq.PUBLISHED&${filter}&select=id,slug,title,excerpt,content_type,category,published_at&order=published_at.desc&limit=4`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`},cache:"no-store"});
  const rows:Article[]=response.ok?await response.json():[];
  if(!rows.length)return null;
  return <section className="mt-8"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="section-kicker">Learn</div><h2 className="mt-2 text-2xl font-semibold">{title}</h2></div><Link href="/learn" className="text-xs font-bold text-emerald-200/65">Open Journal →</Link></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{rows.map(article=><Link key={article.id} href={`/learn/${article.slug}`} className="panel interactive-card rounded-[22px] p-5"><div className="text-[8px] font-black uppercase tracking-[.12em] text-emerald-200/50">{article.content_type.replaceAll("_"," ")} · {article.category.replaceAll("_"," ")}</div><h3 className="mt-3 font-semibold text-white/70">{article.title}</h3>{article.excerpt?<p className="mt-3 line-clamp-3 text-xs leading-5 text-white/32">{article.excerpt}</p>:null}<div className="mt-4 text-[10px] text-white/24">{new Date(article.published_at).toLocaleDateString()}</div></Link>)}</div></section>;
}
