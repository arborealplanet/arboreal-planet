import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic="force-dynamic";

type Article={id:string;slug:string;title:string;excerpt:string|null;content_type:string;category:string;author_display:string|null;cover_image_url:string|null;tags:string[];published_at:string;related_species_id:string|null;related_plant_id:string|null};
const typeLabels:Record<string,string>={GUIDE:"Guide",ARTICLE:"Article",NEWS:"News",EXPLAINER:"Explainer",CONSERVATION:"Conservation"};
const categoryLabels:Record<string,string>={HUSBANDRY:"Husbandry",BREEDING:"Breeding",TAXONOMY:"Taxonomy",LOCALITY:"Locality",PLANTS:"Plants",MARKET:"Market",CONSERVATION:"Conservation",INDUSTRY:"Industry",GENERAL:"General"};

export default async function LearnPage({searchParams}:{searchParams:Promise<{q?:string;category?:string;type?:string}>}){
  const params=await searchParams;const q=(params.q??"").trim().slice(0,120).toLowerCase(),category=(params.category??"").trim().slice(0,40),type=(params.type??"").trim().slice(0,40);
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/journal_articles?status=eq.PUBLISHED&select=id,slug,title,excerpt,content_type,category,author_display,cover_image_url,tags,published_at,related_species_id,related_plant_id&order=published_at.desc&limit=200`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`},cache:"no-store"});
  const rows:Article[]=response.ok?await response.json():[];
  const visible=rows.filter(article=>(!category||article.category===category)&&(!type||article.content_type===type)&&(!q||[article.title,article.excerpt,article.author_display,categoryLabels[article.category],typeLabels[article.content_type],...(article.tags??[])].some(value=>String(value??"").toLowerCase().includes(q))));
  const featured=visible[0]??null,rest=featured?visible.slice(1):visible;
  return <main>
    <PageIntro eyebrow="Learn" title="Arboreal Planet Journal" description="Guides, explainers, conservation stories and source-linked hobby news for reptile keepers, breeders and plant people. Editorial content stays distinct from community posts, marketplace claims and database reference records." aside={<div className="rounded-full border border-emerald-300/12 bg-emerald-300/[.035] px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/58">Reviewed · Published content</div>}/>

    <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
      <form action="/learn" method="get" className="panel grid gap-3 rounded-[26px] p-4 md:grid-cols-[1.4fr_.7fr_.7fr_auto]">
        <input name="q" defaultValue={params.q??""} placeholder="Search husbandry, locality, Nepenthes, market explainers…" className="rounded-xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white/72 outline-none"/>
        <select name="category" defaultValue={category} className="rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-3 text-sm text-white/65"><option value="">All categories</option>{Object.entries(categoryLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        <select name="type" defaultValue={type} className="rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-3 text-sm text-white/65"><option value="">All formats</option>{Object.entries(typeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        <button className="secondary-action !min-h-0 !py-3">Filter</button>
      </form>
    </section>

    <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      {featured?<Link href={`/learn/${featured.slug}`} className="panel interactive-card grid overflow-hidden rounded-[28px] lg:grid-cols-[1.1fr_.9fr]">{featured.cover_image_url?<img src={featured.cover_image_url} alt="" className="h-full min-h-64 w-full object-cover lg:order-2"/>:<div className="grid-surface grid min-h-64 place-items-center text-4xl text-white/10 lg:order-2">⌁</div>}<div className="p-6 sm:p-8"><div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[.12em]"><span className="text-emerald-200/60">{typeLabels[featured.content_type]??featured.content_type}</span><span className="text-white/20">·</span><span className="text-white/35">{categoryLabels[featured.category]??featured.category}</span></div><h2 className="mt-4 text-3xl font-semibold tracking-[-.035em] text-white/82">{featured.title}</h2>{featured.excerpt?<p className="mt-4 max-w-2xl text-sm leading-7 text-white/48">{featured.excerpt}</p>:null}<div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] text-white/28">{featured.author_display?<span>By {featured.author_display}</span>:null}<span>{new Date(featured.published_at).toLocaleDateString()}</span></div><div className="mt-7 text-xs font-bold text-emerald-200/58">Read →</div></div></Link>:<div className="panel rounded-[28px] py-16 text-center"><div className="font-semibold text-white/58">No published Journal pieces match this view yet.</div><p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-white/30">Learn starts empty rather than pretending unfinished articles are published. Drafts stay private until reviewed and intentionally released.</p></div>}

      {rest.length?<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rest.map(article=><Link key={article.id} href={`/learn/${article.slug}`} className="panel interactive-card overflow-hidden rounded-[24px]">{article.cover_image_url?<img src={article.cover_image_url} alt="" className="h-40 w-full border-b border-white/[.055] object-cover"/>:null}<div className="p-5"><div className="flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-[.12em]"><span className="text-emerald-200/55">{typeLabels[article.content_type]??article.content_type}</span><span className="text-white/20">·</span><span className="text-white/30">{categoryLabels[article.category]??article.category}</span></div><h3 className="mt-3 text-lg font-semibold text-white/72">{article.title}</h3>{article.excerpt?<p className="mt-3 line-clamp-3 text-xs leading-5 text-white/34">{article.excerpt}</p>:null}<div className="mt-4 text-[10px] text-white/24">{new Date(article.published_at).toLocaleDateString()}</div></div></Link>)}</div>:null}
    </section>

    <section className="border-y border-white/[.055] bg-black/[.1]"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 sm:px-6 md:grid-cols-3">{[["REFERENCE ≠ EDITORIAL","Species and plant database records stay separate from Journal articles so commentary never silently becomes reference fact."],["NEWS NEEDS SOURCES","News and factual explainers can carry source links so readers can trace where information came from."],["COMMUNITY STAYS DISTINCT","Keeper discussion can inspire future coverage without automatically becoming published editorial content."]].map(([a,b])=><div key={a} className="panel-soft rounded-[20px] p-5"><div className="text-[9px] font-black tracking-[.13em] text-emerald-200/50">{a}</div><p className="mt-3 text-xs leading-5 text-white/34">{b}</p></div>)}</div></section>
  </main>;
}
