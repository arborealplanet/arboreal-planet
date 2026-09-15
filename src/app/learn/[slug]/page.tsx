import Link from "next/link";
import { notFound } from "next/navigation";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic="force-dynamic";

type Article={id:string;slug:string;title:string;excerpt:string|null;body:string;content_type:string;category:string;author_display:string|null;cover_image_url:string|null;tags:string[];source_urls:string[];editorial_note:string|null;published_at:string;updated_at:string;related_species_id:string|null;related_plant_id:string|null};
type Species={slug:string;common_name:string;scientific_name:string};
type Plant={slug:string;name:string;scientific_name:string};
const typeLabels:Record<string,string>={GUIDE:"Guide",ARTICLE:"Article",NEWS:"News",EXPLAINER:"Explainer",CONSERVATION:"Conservation"};
const categoryLabels:Record<string,string>={HUSBANDRY:"Husbandry",BREEDING:"Breeding",TAXONOMY:"Taxonomy",LOCALITY:"Locality",PLANTS:"Plants",MARKET:"Market",CONSERVATION:"Conservation",INDUSTRY:"Industry",GENERAL:"General"};
const headers={apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`};

export default async function JournalArticlePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const clean=decodeURIComponent(slug).trim();if(!clean)notFound();
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/journal_articles?slug=eq.${encodeURIComponent(clean)}&status=eq.PUBLISHED&select=id,slug,title,excerpt,body,content_type,category,author_display,cover_image_url,tags,source_urls,editorial_note,published_at,updated_at,related_species_id,related_plant_id&limit=1`,{headers,cache:"no-store"});
  if(!response.ok)notFound();const rows:Article[]=await response.json();const article=rows[0];if(!article)notFound();

  let species:Species|null=null,plant:Plant|null=null;
  if(article.related_species_id){const r=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/species?id=eq.${article.related_species_id}&published=eq.true&select=slug,common_name,scientific_name&limit=1`,{headers,cache:"no-store"});if(r.ok){const x:Species[]=await r.json();species=x[0]??null}}
  if(article.related_plant_id){const r=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/plant_collections?id=eq.${article.related_plant_id}&status=neq.PLANNED&select=slug,name,scientific_name&limit=1`,{headers,cache:"no-store"});if(r.ok){const x:Plant[]=await r.json();plant=x[0]??null}}

  return <main className="mx-auto max-w-5xl px-5 py-10 pb-20 sm:px-6">
    <Link href="/learn" className="text-xs font-bold text-emerald-200/70">← Learn</Link>
    <article className="panel mt-5 overflow-hidden rounded-[30px]">{article.cover_image_url?<img src={article.cover_image_url} alt="" className="max-h-[480px] w-full border-b border-white/[.055] object-cover"/>:null}<div className="p-6 sm:p-8 lg:p-10"><div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[.13em]"><span className="text-emerald-200/60">{typeLabels[article.content_type]??article.content_type}</span><span className="text-white/18">·</span><span className="text-white/35">{categoryLabels[article.category]??article.category}</span></div><h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-white/86 sm:text-5xl">{article.title}</h1>{article.excerpt?<p className="mt-5 max-w-3xl text-base leading-8 text-white/50">{article.excerpt}</p>:null}<div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[.055] pt-5 text-[11px] text-white/28">{article.author_display?<span>By {article.author_display}</span>:null}<span>Published {new Date(article.published_at).toLocaleDateString()}</span>{article.updated_at!==article.published_at?<span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>:null}</div><div className="mt-8 whitespace-pre-wrap text-[15px] leading-8 text-white/62">{article.body}</div>{article.tags?.length?<div className="mt-8 flex flex-wrap gap-2 border-t border-white/[.055] pt-5">{article.tags.map(tag=><Link key={tag} href={`/learn?q=${encodeURIComponent(tag)}`} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-[10px] text-white/38 hover:text-emerald-100/65">#{tag}</Link>)}</div>:null}</div></article>

    <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_.8fr]">
      <div className="panel rounded-[26px] p-6"><div className="section-kicker">Sources & editorial context</div>{article.source_urls?.length?<div className="mt-4 space-y-2">{article.source_urls.map((url,index)=><Link key={url} href={url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/[.06] bg-black/10 px-4 py-3 text-xs font-bold text-emerald-200/58">Source {index+1} ↗</Link>)}</div>:<p className="mt-4 text-xs leading-6 text-white/32">No external source links are attached to this first-party educational/editorial piece.</p>}{article.editorial_note?<div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[.025] p-4 text-xs leading-6 text-amber-100/45"><span className="font-semibold">Editorial note:</span> {article.editorial_note}</div>:null}</div>
      <aside className="space-y-4">{species?<Link href={`/animals/${species.slug}`} className="panel block rounded-[26px] p-6 transition hover:bg-emerald-300/[.025]"><div className="section-kicker">Related animal record</div><div className="mt-2 font-semibold text-white/70">{species.common_name} →</div><div className="mt-1 text-xs italic text-white/30">{species.scientific_name}</div></Link>:null}{plant?<Link href={`/plants/${plant.slug}`} className="panel block rounded-[26px] p-6 transition hover:bg-emerald-300/[.025]"><div className="section-kicker">Related plant record</div><div className="mt-2 font-semibold text-white/70">{plant.name} →</div><div className="mt-1 text-xs italic text-white/30">{plant.scientific_name}</div></Link>:null}<Link href={`/community?q=${encodeURIComponent(article.title)}`} className="panel block rounded-[26px] p-6 transition hover:bg-white/[.025]"><div className="section-kicker">Community</div><div className="mt-2 font-semibold text-white/68">Discuss this piece →</div><p className="mt-2 text-xs leading-5 text-white/30">Community conversation stays separate from the published article itself.</p></Link></aside>
    </section>
  </main>;
}
