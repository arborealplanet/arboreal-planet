"use client";

import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { CommunityPostActions } from "@/components/CommunityPostActions";
import { CommunityPostOwnerMenu } from "@/components/CommunityPostOwnerMenu";

type Post={
  id:string;author_id:string;display_name:string|null;username:string|null;avatar_url:string|null;
  type:string;body:string;tags:string[];media_urls:string[];video_url:string|null;
  species_id:string|null;species_name:string|null;species_slug:string|null;
  plant_id:string|null;plant_name:string|null;plant_slug:string|null;
  created_at:string;reaction_count:number;comment_count:number;
};
type FeedMode="explore"|"following";
type TypeFilter="ALL"|"QUESTION"|"BREEDING_UPDATE"|"MEDIA";

export function CommunityFeed({initialQuery=""}:{initialQuery?:string}){
  const [rows,setRows]=useState<Post[]>([]);
  const [viewerId,setViewerId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState<FeedMode>("explore");
  const [type,setType]=useState<TypeFilter>("ALL");
  const [query,setQuery]=useState(initialQuery.slice(0,120));
  const [authRequired,setAuthRequired]=useState(false);

  useEffect(()=>{
    let active=true;
    const run=()=>{
      setLoading(true);
      return fetch(`/api/community/posts?mode=${mode}`,{cache:"no-store"})
        .then(response=>response.ok?response.json():null)
        .then(data=>{if(active&&data){setRows(data.rows??[]);setViewerId(data.viewerId??null);setAuthRequired(Boolean(data.authRequired))}})
        .finally(()=>{if(active)setLoading(false)});
    };
    void run();
    const posted=()=>void run();
    const followed=()=>{if(mode==="following")void run()};
    window.addEventListener("community-posted",posted);
    window.addEventListener("subject-follow-changed",followed);
    return()=>{active=false;window.removeEventListener("community-posted",posted);window.removeEventListener("subject-follow-changed",followed)};
  },[mode]);

  useEffect(()=>{
    const topic=(event:Event)=>{
      const detail=(event as CustomEvent<{topic?:string}>).detail;
      if(detail?.topic){setMode("explore");setType("ALL");setQuery(detail.topic)}
    };
    window.addEventListener("community-topic-filter",topic);
    return()=>window.removeEventListener("community-topic-filter",topic);
  },[]);

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return rows.filter(post=>{
      if(type==="QUESTION"&&post.type!=="QUESTION")return false;
      if(type==="BREEDING_UPDATE"&&post.type!=="BREEDING_UPDATE")return false;
      if(type==="MEDIA"&&!(post.media_urls?.length||post.video_url))return false;
      if(!q)return true;
      return [post.body,post.display_name,post.username,post.species_name,post.plant_name,...(post.tags??[])].some(value=>String(value??"").toLowerCase().includes(q));
    });
  },[rows,type,query]);

  return <div data-community-feed className="space-y-4 scroll-mt-28">
    <div className="panel rounded-[26px] p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/[.07] bg-black/10 p-1">
            <button onClick={()=>setMode("explore")} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${mode==="explore"?"bg-emerald-300 text-[#06100c]":"text-white/50 hover:text-white/75"}`}>Explore</button>
            <button onClick={()=>setMode("following")} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${mode==="following"?"bg-emerald-300 text-[#06100c]":"text-white/50 hover:text-white/75"}`}>Following</button>
          </div>
          <div className="ml-0 flex flex-wrap gap-1.5 sm:ml-auto">{[["ALL","All"],["QUESTION","Questions"],["BREEDING_UPDATE","Breeding"],["MEDIA","Media"]].map(([value,label])=><button key={value} onClick={()=>setType(value as TypeFilter)} className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition ${type===value?"border-emerald-300/25 bg-emerald-300/[.055] text-emerald-200":"border-white/[.06] text-white/40 hover:border-white/[.12] hover:text-white/60"}`}>{label}</button>)}</div>
        </div>
        <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/25">⌕</span><input value={query} onChange={event=>setQuery(event.target.value.slice(0,120))} placeholder="Search keepers, references, tags or posts" className="w-full rounded-xl border border-white/[.07] bg-black/15 py-3 pl-10 pr-4 text-sm text-white/70 outline-none placeholder:text-white/25 focus:border-emerald-300/20"/></div>
        {query?<div className="flex items-center justify-between gap-3 text-[10px] text-white/30"><span>Filtering for “{query}”</span><button type="button" onClick={()=>setQuery("")} className="font-bold text-emerald-200/55 hover:text-emerald-200/80">Clear filter</button></div>:null}
      </div>
    </div>

    {authRequired?<div className="panel rounded-[26px] p-10 text-center"><div className="font-semibold text-white/72">Sign in to use your Following feed.</div><p className="mt-2 text-xs text-white/45">Explore stays public. Following can include keepers, animals, plants and topics you choose.</p><Link href="/login?next=/community" className="btn-primary mt-4 inline-block">Sign in</Link></div>
    :loading?<div className="panel rounded-[26px] p-10 text-center text-sm text-white/42">Loading community…</div>
    :!visible.length?<div className="panel rounded-[26px] p-12 text-center"><div className="font-semibold text-white/65">{mode==="following"?"Your Following feed is quiet.":"No posts match this view."}</div><p className="mt-2 text-xs text-white/42">{mode==="following"?"Follow keepers, animals, plants or topics to personalize this feed.":"Try another filter or search."}</p>{mode==="following"?<Link href="/interests" className="primary-action mt-4 inline-block">Choose interests</Link>:null}</div>
    :visible.map(post=>{
      const author=post.username?`/keepers/${encodeURIComponent(post.username)}`:null;
      return <article id={post.id} key={post.id} className="panel overflow-hidden rounded-[28px] transition hover:border-white/[.11]">
        <div className="flex items-start gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
          {author?<Link href={author} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/[.08] bg-white/[.025]">{post.avatar_url?<img src={post.avatar_url} alt="" className="h-full w-full object-cover"/>:<span className="text-xs font-bold text-emerald-300/55">AP</span>}</Link>:<div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/[.08] bg-white/[.025]">{post.avatar_url?<img src={post.avatar_url} alt="" className="h-full w-full object-cover"/>:<span className="text-xs font-bold text-emerald-300/55">AP</span>}</div>}
          <div className="min-w-0 flex-1">{author?<Link href={author} className="text-sm font-semibold text-white/82 hover:text-emerald-200">{post.display_name||post.username||"Keeper"}</Link>:<div className="text-sm font-semibold text-white/82">{post.display_name||post.username||"Keeper"}</div>}<div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-white/36"><span className="font-bold uppercase tracking-[.11em] text-emerald-300/55">{post.type.replaceAll("_"," ")}</span><span>·</span><span>{new Date(post.created_at).toLocaleString()}</span></div></div>
          {viewerId===post.author_id&&<CommunityPostOwnerMenu postId={post.id} body={post.body} tags={post.tags??[]} videoUrl={post.video_url}/>} 
        </div>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          {post.body&&<p className="whitespace-pre-wrap text-[15px] leading-7 text-white/68">{post.body}</p>}
          {(post.species_name&&post.species_slug)||(post.plant_name&&post.plant_slug)?<div className="mt-4 flex flex-wrap gap-2">{post.species_name&&post.species_slug?<Link href={`/animals/${post.species_slug}`} className="rounded-xl border border-emerald-300/12 bg-emerald-300/[.03] px-3 py-2 text-[10px] font-bold text-emerald-100/60">Animal reference · {post.species_name} →</Link>:null}{post.plant_name&&post.plant_slug?<Link href={`/plants/${post.plant_slug}`} className="rounded-xl border border-emerald-300/12 bg-emerald-300/[.03] px-3 py-2 text-[10px] font-bold text-emerald-100/60">Plant reference · {post.plant_name} →</Link>:null}</div>:null}
          {post.media_urls?.length>0&&<div className={`mt-4 grid gap-2 overflow-hidden rounded-2xl ${post.media_urls.length===1?"grid-cols-1":"grid-cols-2"}`}>{post.media_urls.slice(0,10).map((url,index)=><div key={url} className={`overflow-hidden bg-black/20 ${post.media_urls.length===3&&index===0?"col-span-2":""}`}><img src={url} alt={`Post photo ${index+1}`} className="max-h-[560px] w-full object-cover"/></div>)}</div>}
          {post.video_url&&<Link href={post.video_url} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.018] p-4 text-sm font-medium text-emerald-200/75 hover:bg-white/[.035]"><span>Attached video</span><span>Open ↗</span></Link>}
          {post.tags?.length>0&&<div className="mt-4 flex flex-wrap gap-2">{post.tags.map(tag=><button type="button" key={tag} onClick={()=>setQuery(tag)} className="rounded-full bg-white/[.035] px-2.5 py-1 text-[10px] text-white/42 transition hover:bg-emerald-300/[.05] hover:text-emerald-100/65">#{tag}</button>)}</div>}
          <div className="mt-5 border-t border-white/[.055] pt-1"><CommunityPostActions postId={post.id} reactions={post.reaction_count||0} comments={post.comment_count||0}/></div>
        </div>
      </article>;
    })}
  </div>;
}
