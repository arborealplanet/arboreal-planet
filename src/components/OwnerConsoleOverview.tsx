import Link from "next/link";
import { fetchOwnProfile,getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function restRows(token:string,path:string){
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`,Accept:"application/json"},cache:"no-store"});
  if(!response.ok)return [] as Array<Record<string,unknown>>;
  return response.json() as Promise<Array<Record<string,unknown>>>;
}

async function rpcRows(token:string,name:string){
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Accept:"application/json"},body:"{}",cache:"no-store"});
  if(!response.ok)return [] as Array<Record<string,unknown>>;
  return response.json() as Promise<Array<Record<string,unknown>>>;
}

function numberValue(value:unknown){const parsed=Number(value??0);return Number.isFinite(parsed)?parsed:0}

export async function OwnerConsoleOverview(){
  const identity=await getServerIdentity();
  if(!identity)return null;
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;
  if(profile?.role!=="owner")return null;

  const [sellerQueue,eventQueue,pedigreeQueue,accountQueue,communityQueue,drafts,statsRows]=await Promise.all([
    rpcRows(identity.token,"seller_verification_queue"),
    restRows(identity.token,"event_submissions?status=eq.PENDING&select=id"),
    rpcRows(identity.token,"gtp_pedigree_report_queue"),
    restRows(identity.token,"account_deletion_requests?status=in.(pending,reviewing,ready_for_processing)&select=id"),
    restRows(identity.token,"community_post_reports?status=eq.OPEN&select=id"),
    restRows(identity.token,"journal_articles?status=eq.DRAFT&select=id"),
    rpcRows(identity.token,"owner_platform_stats"),
  ]);

  const cards=[
    ["Seller requests",sellerQueue.length,"#sellers"],
    ["Event suggestions",eventQueue.length,"#events"],
    ["Pedigree reports",pedigreeQueue.length,"#pedigrees"],
    ["Account requests",accountQueue.length,"#accounts"],
    ["Community reports",communityQueue.length,"#moderation"],
    ["Journal drafts",drafts.length,"#journal"],
  ] as const;
  const attention=cards.reduce((sum,[label,count])=>label==="Journal drafts"?sum:sum+count,0);
  const stats=statsRows[0]??{};
  const totals=[
    ["Accounts",numberValue(stats.users)],
    ["Active listings",numberValue(stats.active_listings)],
    ["Public pedigrees",numberValue(stats.published_pedigrees)],
    ["Community posts",numberValue(stats.community_posts)],
    ["Published events",numberValue(stats.published_events)],
    ["Journal pieces",numberValue(stats.published_journal)],
  ] as const;

  return <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
    <div className="rounded-[28px] border border-amber-300/14 bg-amber-300/[.025] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="text-[10px] font-black uppercase tracking-[.15em] text-amber-100/55">★ Owner overview</div><h2 className="mt-2 text-2xl font-semibold text-white/82">What needs your attention</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/34">Private operational summary for the Arboreal Planet owner account. Counts come from the same protected review queues used by the admin tools below.</p></div>
        <div className="rounded-full border border-amber-300/15 bg-black/10 px-4 py-2 text-xs font-black text-amber-100/65">{attention} pending</div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label,count,href])=><Link href={href} key={label} className="rounded-2xl border border-white/[.06] bg-black/10 p-4 transition hover:border-amber-300/15 hover:bg-amber-300/[.025]"><div className="text-[9px] font-black uppercase tracking-[.1em] text-white/25">{label}</div><div className="mt-2 text-2xl font-semibold text-white/72">{count}</div><div className="mt-2 text-[10px] font-bold text-amber-100/40">Review →</div></Link>)}
      </div>
      <div className="mt-6 border-t border-amber-300/10 pt-5">
        <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Platform totals</div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{totals.map(([label,count])=><div key={label} className="rounded-2xl border border-white/[.05] bg-black/[.08] p-4"><div className="text-[9px] font-black uppercase tracking-[.08em] text-white/22">{label}</div><div className="mt-2 text-xl font-semibold text-white/62">{count.toLocaleString()}</div></div>)}</div>
      </div>
    </div>
  </section>;
}
