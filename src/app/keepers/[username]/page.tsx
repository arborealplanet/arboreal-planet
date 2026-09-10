import Link from "next/link";
import { notFound } from "next/navigation";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic="force-dynamic";
type Profile={id:string;username:string;display_name:string|null;bio:string|null;location:string|null;avatar_url:string|null;banner_url:string|null;accent_color:string|null;seller_enabled:boolean;role:string|null};
type Listing={id:string;title:string;category:string;price:number|null;currency:string;image_urls:string[]|null;public_origin:string|null;morph:string|null;species:{common_name:string}|null;locality:{name:string}|null};
type Post={id:string;type:string;body:string;tags:string[]|null;media_urls:string[]|null;created_at:string};

function countFromRange(value:string|null){if(!value)return null;const total=value.split("/")[1];return total&&total!=="*"?Number(total):null}

export default async function KeeperProfilePage({params}:{params:Promise<{username:string}>}){
 const {username}=await params;const clean=decodeURIComponent(username).trim();if(!clean)notFound();const headers={apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`};
 const p=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(clean)}&profile_visibility=eq.public&select=id,username,display_name,bio,location,avatar_url,banner_url,accent_color,seller_enabled,role`,{headers,cache:"no-store"});if(!p.ok)notFound();const profiles:Profile[]=await p.json();const profile=profiles[0];if(!profile)notFound();
 let listings:Listing[]=[];if(profile.seller_enabled){const select="id,title,category,price,currency,image_urls,public_origin,morph,species:species!marketplace_listings_species_id_fkey(common_name),locality:localities!marketplace_listings_locality_id_fkey(name)";const l=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings?owner_id=eq.${profile.id}&status=eq.ACTIVE&select=${encodeURIComponent(select)}&order=created_at.desc`,{headers,cache:"no-store"});if(l.ok)listings=await l.json()}
 let posts:Post[]=[];const postQuery=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_posts?author_id=eq.${profile.id}&deleted_at=is.null&select=id,type,body,tags,media_urls,created_at&order=created_at.desc&limit=6`,{headers,cache:"no-store"});if(postQuery.ok)posts=await postQuery.json();
 const countHeaders={...headers,Prefer:"count=exact",Range:"0-0"};
 const [followersResponse,followingResponse]=await Promise.all([
  fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?following_id=eq.${profile.id}&select=follower_id`,{headers:countHeaders,cache:"no-store"}),
  fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?follower_id=eq.${profile.id}&select=following_id`,{headers:countHeaders,cache:"no-store"})
 ]);
 const followers=followersResponse.ok?countFromRange(followersResponse.headers.get("content-range")):null;
 const following=followingResponse.ok?countFromRange(followingResponse.headers.get("content-range")):null;

 return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
  <div className="flex flex-wrap gap-4 text-xs font-bold"><Link href="/community" className="text-emerald-200/75">← Community</Link><Link href="/marketplace" className="text-white/45 hover:text-white/70">Marketplace</Link></div>

  <section className="panel mt-5 overflow-hidden rounded-[28px]">
   <div className="relative h-44 bg-[linear-gradient(135deg,rgba(57,230,125,.08),transparent_45%),#0a1711] bg-cover bg-center sm:h-60" style={profile.banner_url?{backgroundImage:`linear-gradient(to bottom,transparent 55%,rgba(6,16,12,.55)),url(${profile.banner_url})`}:undefined}/>
   <div className="relative p-6 pt-16 sm:p-8 sm:pt-20">
    <div className="absolute -top-12 left-6 h-24 w-24 overflow-hidden rounded-[24px] border-4 border-[#07110d] bg-[#0d1c15] shadow-xl sm:left-8 sm:h-28 sm:w-28">{profile.avatar_url?<img src={profile.avatar_url} alt={`${profile.display_name||profile.username} avatar`} className="h-full w-full object-cover"/>:<div className="grid h-full w-full place-items-center text-2xl font-black text-emerald-300/30">AP</div>}</div>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-3xl font-semibold tracking-[-.03em]">{profile.display_name||profile.username}</div><div className="mt-1 text-sm text-white/48">@{profile.username}</div></div><div className="flex gap-2">{profile.seller_enabled&&<span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-emerald-100/75">Seller</span>}<span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] uppercase text-white/45">{profile.role||"user"}</span></div></div>
    <div className="mt-5 flex flex-wrap gap-5 text-xs text-white/48">{followers!==null&&<span><strong className="text-white/82">{followers}</strong> followers</span>}{following!==null&&<span><strong className="text-white/82">{following}</strong> following</span>}<span><strong className="text-white/82">{listings.length}</strong> active listings</span></div>
    {profile.bio&&<p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-white/62">{profile.bio}</p>}{profile.location&&<div className="mt-4 text-xs text-white/42">{profile.location}</div>}
   </div>
  </section>

  <section className="mt-9"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Community activity</div><h2 className="mt-2 text-2xl font-semibold">Recent posts</h2></div><Link href={`/community?keeper=${encodeURIComponent(profile.username)}`} className="text-xs font-bold text-emerald-200/70">Open Community →</Link></div>{posts.length?<div className="grid gap-4 md:grid-cols-2">{posts.map(post=><Link key={post.id} href={`/community#${post.id}`} className="panel interactive-card rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-300/60">{post.type.replaceAll("_"," ")} · {new Date(post.created_at).toLocaleDateString()}</div><p className="mt-3 line-clamp-4 text-sm leading-6 text-white/58">{post.body||"Media post"}</p>{post.media_urls?.[0]&&<div className="mt-4 overflow-hidden rounded-2xl border border-white/[.055]"><img src={post.media_urls[0]} alt="" className="h-40 w-full object-cover"/></div>}{post.tags?.length?<div className="mt-3 flex flex-wrap gap-2">{post.tags.slice(0,3).map(tag=><span key={tag} className="rounded-full border border-white/[.06] px-2 py-1 text-[9px] text-white/38">{tag}</span>)}</div>:null}</Link>)}</div>:<div className="panel rounded-[22px] py-10 text-center text-sm text-white/45">No public community posts yet.</div>}</section>

  <section className="mt-9"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Marketplace inventory</div><h2 className="mt-2 text-2xl font-semibold">Active listings</h2></div><div className="text-xs text-white/42">{listings.length} active</div></div>{listings.length?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map(l=><Link key={l.id} href={`/marketplace/${l.id}`} className="panel interactive-card overflow-hidden rounded-[22px]"><div className="grid-surface grid h-48 place-items-center overflow-hidden border-b border-white/[.055]">{l.image_urls?.[0]?<img src={l.image_urls[0]} alt={l.title} className="h-full w-full object-cover"/>:<span className="text-white/18">◇</span>}</div><div className="p-5"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-300/60">{l.category}{l.public_origin?` · ${l.public_origin==="CAPTIVE_BRED"?"Captive Bred":"Import"}`:""}</div><h3 className="mt-2 text-lg font-semibold">{l.title}</h3>{l.species&&<div className="mt-1 text-xs text-white/48">{l.species.common_name}{l.locality?.name?` · ${l.locality.name}`:""}</div>}<div className="mt-4 text-xl font-semibold">{l.price==null?"Contact seller":`$${Number(l.price).toLocaleString()}`}</div>{l.morph&&<div className="mt-2 text-xs text-white/40">{l.morph}</div>}</div></Link>)}</div>:<div className="panel rounded-[22px] py-12 text-center text-sm text-white/45">No active marketplace listings right now.</div>}</section>
 </main>
}
