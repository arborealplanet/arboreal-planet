"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Article = {
  id:string;slug:string;title:string;excerpt:string|null;body:string;content_type:string;category:string;author_display:string|null;cover_image_url:string|null;tags:string[];source_urls:string[];related_species_id:string|null;related_plant_id:string|null;editorial_note:string|null;status:string;published_at:string|null;updated_at:string;
};
type RefItem={id:string;common_name?:string;scientific_name?:string;name?:string};
type Form={id?:string;slug:string;title:string;excerpt:string;body:string;content_type:string;category:string;author_display:string;cover_image_url:string;tags:string;source_urls:string;related_species_id:string;related_plant_id:string;editorial_note:string;status:string};
const blank:Form={slug:"",title:"",excerpt:"",body:"",content_type:"ARTICLE",category:"GENERAL",author_display:"",cover_image_url:"",tags:"",source_urls:"",related_species_id:"",related_plant_id:"",editorial_note:"",status:"DRAFT"};
const types=["GUIDE","ARTICLE","NEWS","EXPLAINER","CONSERVATION"];
const categories=["HUSBANDRY","BREEDING","TAXONOMY","LOCALITY","PLANTS","MARKET","CONSERVATION","INDUSTRY","GENERAL"];

function toForm(article:Article):Form{return{id:article.id,slug:article.slug,title:article.title,excerpt:article.excerpt??"",body:article.body,content_type:article.content_type,category:article.category,author_display:article.author_display??"",cover_image_url:article.cover_image_url??"",tags:(article.tags??[]).join(", "),source_urls:(article.source_urls??[]).join("\n"),related_species_id:article.related_species_id??"",related_plant_id:article.related_plant_id??"",editorial_note:article.editorial_note??"",status:article.status}}

export function AdminJournalEditor(){
  const [articles,setArticles]=useState<Article[]>([]),[species,setSpecies]=useState<RefItem[]>([]),[plants,setPlants]=useState<RefItem[]>([]),[form,setForm]=useState<Form>(blank),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[preview,setPreview]=useState(false),[filter,setFilter]=useState("ALL");

  async function refresh(){
    const response=await fetch("/api/admin/journal",{cache:"no-store"});
    const data=await response.json().catch(()=>null) as {articles?:Article[];species?:RefItem[];plants?:RefItem[];error?:string}|null;
    if(!response.ok)throw new Error(data?.error||"Could not load Journal workspace.");
    setArticles(data?.articles??[]);setSpecies(data?.species??[]);setPlants(data?.plants??[]);
  }

  useEffect(()=>{let active=true;void(async()=>{try{const response=await fetch("/api/admin/journal",{cache:"no-store"});const data=await response.json().catch(()=>null) as {articles?:Article[];species?:RefItem[];plants?:RefItem[];error?:string}|null;if(!active)return;if(!response.ok)throw new Error(data?.error||"Could not load Journal workspace.");setArticles(data?.articles??[]);setSpecies(data?.species??[]);setPlants(data?.plants??[])}catch(error){if(active)setMessage(error instanceof Error?error.message:"Could not load Journal workspace.")}finally{if(active)setLoading(false)}})();return()=>{active=false}},[]);

  const visible=useMemo(()=>filter==="ALL"?articles:articles.filter(article=>article.status===filter),[articles,filter]);
  function update<K extends keyof Form>(key:K,value:Form[K]){setForm(current=>({...current,[key]:value}))}
  function choose(article:Article){setForm(toForm(article));setPreview(false);setMessage("")}
  function createNew(){setForm(blank);setPreview(false);setMessage("")}

  async function save(action:"save"|"publish"|"archive"){
    if(busy)return;
    if(action==="publish"&&!window.confirm("Publish this Journal piece to the public Learn section?"))return;
    if(action==="archive"&&!window.confirm("Archive this Journal piece? It will stop appearing publicly."))return;
    setBusy(true);setMessage(action==="publish"?"Publishing…":action==="archive"?"Archiving…":"Saving draft…");
    try{
      const article={...form,tags:form.tags.split(",").map(x=>x.trim()).filter(Boolean),source_urls:form.source_urls.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)};
      const response=await fetch("/api/admin/journal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,article})});
      const data=await response.json().catch(()=>null) as {article?:Article|null;error?:string}|null;
      if(!response.ok)throw new Error(data?.error||"Could not save Journal piece.");
      if(data?.article)setForm(toForm(data.article));
      await refresh();
      setMessage(action==="publish"?"Published.":action==="archive"?"Archived.":"Draft saved.");
    }catch(error){setMessage(error instanceof Error?error.message:"Could not save Journal piece.")}finally{setBusy(false)}
  }

  if(loading)return <div className="panel rounded-3xl p-8 text-sm text-white/38">Loading Journal workspace…</div>;

  return <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
    <aside className="panel rounded-[26px] p-4 xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-center justify-between gap-3"><div><div className="section-kicker">Journal library</div><div className="mt-1 text-xs text-white/30">{articles.length} piece{articles.length===1?"":"s"}</div></div><button type="button" onClick={createNew} className="rounded-xl border border-emerald-300/15 px-3 py-2 text-[10px] font-black text-emerald-100/65">New piece</button></div>
      <div className="mt-4 flex flex-wrap gap-1.5">{["ALL","DRAFT","PUBLISHED","ARCHIVED"].map(value=><button key={value} type="button" onClick={()=>setFilter(value)} className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black ${filter===value?"border-emerald-300/20 bg-emerald-300/[.05] text-emerald-100/70":"border-white/[.06] text-white/30"}`}>{value}</button>)}</div>
      <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">{visible.map(article=><button type="button" key={article.id} onClick={()=>choose(article)} className={`w-full rounded-2xl border p-3 text-left transition ${form.id===article.id?"border-emerald-300/18 bg-emerald-300/[.035]":"border-white/[.055] bg-black/10 hover:bg-white/[.02]"}`}><div className="flex items-start justify-between gap-2"><div className="line-clamp-2 text-xs font-semibold text-white/62">{article.title}</div><span className="shrink-0 text-[8px] font-black text-white/25">{article.status}</span></div><div className="mt-2 text-[9px] text-white/24">{article.content_type} · {article.category}</div></button>)}</div>
    </aside>

    <section className="panel rounded-[26px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-kicker">Editorial workspace</div><h3 className="mt-2 text-2xl font-semibold">{form.id?"Edit Journal piece":"New Journal piece"}</h3></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setPreview(v=>!v)} className="secondary-action !min-h-0 !px-3 !py-2 !text-[10px]">{preview?"Edit":"Preview"}</button>{form.id&&form.status==="PUBLISHED"?<Link href={`/learn/${form.slug}`} target="_blank" className="secondary-action !min-h-0 !px-3 !py-2 !text-[10px]">Open public ↗</Link>:null}</div></div>
      {message?<div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/42">{message}</div>:null}

      {preview?<div className="mt-6 rounded-[24px] border border-white/[.06] bg-black/10 p-6 sm:p-8"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/55">{form.content_type} · {form.category}</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-white/82">{form.title||"Untitled Journal piece"}</h2>{form.excerpt?<p className="mt-4 text-sm leading-7 text-white/45">{form.excerpt}</p>:null}<div className="mt-6 whitespace-pre-wrap border-t border-white/[.055] pt-6 text-sm leading-8 text-white/58">{form.body||"No article body yet."}</div></div>:<div className="mt-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-semibold text-white/45">Title<input value={form.title} onChange={e=>update("title",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-sm text-white/70 outline-none" /></label><label className="text-xs font-semibold text-white/45">Slug<input value={form.slug} onChange={e=>update("slug",e.target.value)} placeholder="auto-generated from title if blank" className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-sm text-white/70 outline-none" /></label></div>
        <label className="text-xs font-semibold text-white/45">Excerpt<textarea value={form.excerpt} onChange={e=>update("excerpt",e.target.value)} maxLength={600} className="mt-2 min-h-20 w-full rounded-xl border border-white/[.08] bg-black/15 p-3 text-sm text-white/70 outline-none" /></label>
        <label className="text-xs font-semibold text-white/45">Article body<textarea value={form.body} onChange={e=>update("body",e.target.value)} className="mt-2 min-h-[340px] w-full rounded-xl border border-white/[.08] bg-black/15 p-3 text-sm leading-7 text-white/70 outline-none" /></label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-white/45">Type<select value={form.content_type} onChange={e=>update("content_type",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-2.5 text-sm">{types.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-xs font-semibold text-white/45">Category<select value={form.category} onChange={e=>update("category",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-2.5 text-sm">{categories.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-xs font-semibold text-white/45">Related animal<select value={form.related_species_id} onChange={e=>update("related_species_id",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-2.5 text-sm"><option value="">None</option>{species.map(x=><option value={x.id} key={x.id}>{x.common_name}</option>)}</select></label><label className="text-xs font-semibold text-white/45">Related plant<select value={form.related_plant_id} onChange={e=>update("related_plant_id",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-2.5 text-sm"><option value="">None</option>{plants.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-semibold text-white/45">Author display<input value={form.author_display} onChange={e=>update("author_display",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-sm text-white/70 outline-none" /></label><label className="text-xs font-semibold text-white/45">Cover image URL<input value={form.cover_image_url} onChange={e=>update("cover_image_url",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-sm text-white/70 outline-none" /></label></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-semibold text-white/45">Tags <span className="font-normal text-white/22">comma separated</span><input value={form.tags} onChange={e=>update("tags",e.target.value)} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-sm text-white/70 outline-none" /></label><label className="text-xs font-semibold text-white/45">Source URLs <span className="font-normal text-white/22">one per line</span><textarea value={form.source_urls} onChange={e=>update("source_urls",e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/[.08] bg-black/15 p-3 text-sm text-white/70 outline-none" /></label></div>
        <label className="text-xs font-semibold text-white/45">Editorial note<textarea value={form.editorial_note} onChange={e=>update("editorial_note",e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/[.08] bg-black/15 p-3 text-sm text-white/70 outline-none" /></label>
      </div>}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[.055] pt-5"><button type="button" disabled={busy} onClick={()=>void save("save")} className="primary-action !min-h-0 !px-4 !py-2.5 !text-xs">Save draft</button><button type="button" disabled={busy} onClick={()=>void save("publish")} className="rounded-xl border border-emerald-300/18 bg-emerald-300/[.04] px-4 py-2.5 text-xs font-black text-emerald-100/70 disabled:opacity-40">Publish</button>{form.id&&form.status!=="ARCHIVED"?<button type="button" disabled={busy} onClick={()=>void save("archive")} className="rounded-xl border border-amber-300/15 px-4 py-2.5 text-xs font-black text-amber-100/55 disabled:opacity-40">Archive</button>:null}<span className="ml-auto self-center text-[10px] font-black uppercase tracking-[.12em] text-white/24">{form.status}</span></div>
    </section>
  </div>;
}
