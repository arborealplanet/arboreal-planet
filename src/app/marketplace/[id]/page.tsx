import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingOwnerControls } from "@/components/ListingOwnerControls";
import { MessageSellerButton } from "@/components/MessageSellerButton";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL,getServerIdentity } from "@/lib/supabase-auth";

type Listing={id:string;owner_id:string;category:string;title:string;description:string|null;public_origin:string|null;price:number|null;currency:string;image_urls:string[];seller_location:string|null;morph:string|null;sex:string|null;age_or_year:string|null;lineage:string|null;status:string;created_at:string;profiles:{username:string|null;display_name:string|null;avatar_url:string|null;seller_enabled:boolean}|null};

export default async function ListingPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const identity=await getServerIdentity();
  const token=identity?.token??SUPABASE_AUTH_KEY;
  const r=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(id)}&select=id,owner_id,category,title,description,public_origin,price,currency,image_urls,seller_location,morph,sex,age_or_year,lineage,status,created_at,profiles!marketplace_listings_owner_id_fkey(username,display_name,avatar_url,seller_enabled)`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!r.ok)notFound();
  const rows:Listing[]=await r.json();
  const listing=rows[0];
  if(!listing)notFound();

  const isOwner=identity?.user.id===listing.owner_id;
  if(!isOwner&&listing.status!=="ACTIVE")notFound();
  const seller=listing.profiles;

  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
    <Link href={isOwner?"/marketplace/mine":"/marketplace"} className="text-xs font-bold text-emerald-200/70">← {isOwner?"My Listings":"Marketplace"}</Link>
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="panel overflow-hidden rounded-3xl">
        <div className="grid-surface grid min-h-[360px] place-items-center border-b border-white/[.06]">{listing.image_urls?.[0]?<img src={listing.image_urls[0]} alt={listing.title} className="h-full max-h-[560px] w-full object-cover"/>:<div className="text-center text-white/15"><div className="text-5xl">◇</div><div className="mt-3 text-xs uppercase tracking-[.15em]">No photos</div></div>}</div>
        {listing.image_urls?.length>1&&<div className="grid grid-cols-3 gap-2 border-b border-white/[.06] p-3 sm:grid-cols-5">{listing.image_urls.slice(1,10).map((url,index)=><div key={url} className="grid-surface aspect-square overflow-hidden rounded-xl"><img src={url} alt={`${listing.title} photo ${index+2}`} className="h-full w-full object-cover"/></div>)}</div>}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><div className="text-[10px] font-black uppercase tracking-[.15em] text-emerald-300/55">{listing.category}{listing.public_origin?` · ${listing.public_origin==="CAPTIVE_BRED"?"Captive Bred":"Import"}`:""}</div>{listing.status!=="ACTIVE"&&<span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black uppercase text-white/45">{listing.status}</span>}</div>
          <h1 className="mt-3 text-3xl font-semibold">{listing.title}</h1>
          <div className="mt-4 text-3xl font-semibold">{listing.price==null?"Contact seller":`$${Number(listing.price).toLocaleString()}`}</div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{[["Morph / locality",listing.morph],["Sex",listing.sex],["Age / birth year",listing.age_or_year],["Seller location",listing.seller_location]].filter(([,v])=>v).map(([k,v])=><div key={k} className="panel-soft rounded-2xl p-4"><div className="text-[9px] uppercase tracking-[.13em] text-white/25">{k}</div><div className="mt-1 text-sm text-white/65">{v}</div></div>)}</div>
          {listing.lineage&&<div className="mt-6"><div className="section-kicker">Lineage / parents</div><p className="mt-2 text-sm leading-6 text-white/50">{listing.lineage}</p></div>}
          {listing.description&&<div className="mt-6"><div className="section-kicker">Seller description</div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/50">{listing.description}</p></div>}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="panel rounded-3xl p-6">
          <div className="section-kicker">Seller</div>
          <div className="mt-4 flex items-center gap-3">{seller?.avatar_url?<img src={seller.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover"/>:<div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 text-white/20">AP</div>}<div><div className="font-semibold">{seller?.display_name||seller?.username||"Arboreal Planet seller"}</div>{seller?.username&&<div className="text-xs text-white/30">@{seller.username}</div>}</div></div>
          <p className="mt-5 text-xs leading-5 text-white/32">Seller identity comes from the authenticated Arboreal Planet account that published this listing.</p>
          {!isOwner&&listing.status==="ACTIVE"&&<MessageSellerButton listingId={listing.id}/>} 
        </div>
        {isOwner&&<div className="panel rounded-3xl p-6"><div className="section-kicker">Your listing</div><p className="my-4 text-xs leading-5 text-white/32">Manage the public status of this listing. Removed listings stay in your account and can be reactivated.</p><ListingOwnerControls id={listing.id} status={listing.status}/></div>}
      </aside>
    </div>
  </main>;
}
