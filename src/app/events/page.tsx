import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { EventSubmissionForm } from "@/components/EventSubmissionForm";
import { EventSubmissionStatus } from "@/components/EventSubmissionStatus";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic="force-dynamic";
type EventRow={id:string;slug:string;title:string;organizer:string|null;event_type:string;description:string|null;starts_at:string;ends_at:string|null;venue_name:string|null;city:string;state_region:string|null;country:string;website_url:string|null;source_url:string;image_url:string|null;featured:boolean};
const labels:Record<string,string>={REPTILE_EXPO:"Reptile expo",BREEDER_EVENT:"Breeder event",EDUCATION:"Education",PLANT_EVENT:"Plant event",COMMUNITY_MEETUP:"Community meetup",OTHER:"Other"};
function dateRange(start:string,end:string|null){const a=new Date(start);const b=end?new Date(end):null;const first=a.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});if(!b)return first;const second=b.toLocaleDateString(undefined,{month:a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear()?undefined:"short",day:"numeric",year:a.getFullYear()===b.getFullYear()?undefined:"numeric"});return `${first} – ${second}`}

export default async function EventsPage({searchParams}:{searchParams:Promise<{q?:string;region?:string;type?:string;suggest?:string}>}){
 const params=await searchParams;const q=(params.q??"").trim().slice(0,100).toLowerCase(),region=(params.region??"").trim().slice(0,100).toLowerCase(),type=(params.type??"").trim().slice(0,40);
 const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/events?status=eq.PUBLISHED&starts_at=gte.now&select=id,slug,title,organizer,event_type,description,starts_at,ends_at,venue_name,city,state_region,country,website_url,source_url,image_url,featured&order=featured.desc,starts_at.asc&limit=200`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`},cache:"no-store"});
 const rows:EventRow[]=response.ok?await response.json():[];
 const visible=rows.filter(event=>(!type||event.event_type===type)&&(!region||[event.city,event.state_region,event.country].some(v=>String(v??"").toLowerCase().includes(region)))&&(!q||[event.title,event.organizer,event.description,event.venue_name,event.city,event.state_region,event.country,labels[event.event_type]].some(v=>String(v??"").toLowerCase().includes(q))));
 const regions=[...new Set(rows.map(event=>event.state_region).filter((x):x is string=>Boolean(x)))].sort();
 return <main>
  <PageIntro eyebrow="Shows & Events" title="Find reptile shows, breeder events and arboreal gatherings." description="A source-linked event directory for the reptile and planted-vivarium community. Only reviewed, published events appear in the public calendar." aside={<Link href="/events?suggest=1#suggest" className="primary-action">Suggest an event</Link>}/>
  <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
   <form className="panel grid gap-3 rounded-[26px] p-4 md:grid-cols-[1.4fr_.8fr_.8fr_auto]" action="/events" method="get">
    <input name="q" defaultValue={params.q??""} placeholder="Search show, organizer, venue or city" className="rounded-xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white/70 outline-none"/>
    <select name="region" defaultValue={params.region??""} className="rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-3 text-sm text-white/65"><option value="">All regions</option>{regions.map(item=><option key={item} value={item}>{item}</option>)}</select>
    <select name="type" defaultValue={type} className="rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-3 text-sm text-white/65"><option value="">All event types</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    <button className="secondary-action !min-h-0 !py-3">Filter</button>
   </form>
  </section>

  <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6">
   <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="section-kicker">Upcoming</div><h2 className="mt-2 text-2xl font-semibold">Published events</h2></div><div className="text-xs text-white/32">{visible.length} upcoming event{visible.length===1?"":"s"}</div></div>
   {visible.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(event=><Link key={event.id} href={`/events/${event.slug}`} className="panel interactive-card overflow-hidden rounded-[24px]">{event.image_url?<img src={event.image_url} alt="" className="h-44 w-full border-b border-white/[.055] object-cover"/>:<img src="/events/default-event.jpg" alt="" className="h-44 w-full border-b border-white/[.055] object-cover"/>}<div className="p-5"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/55">{labels[event.event_type]??event.event_type}</span>{event.featured?<span className="rounded-full border border-amber-200/12 px-2 py-1 text-[8px] font-black uppercase text-amber-100/55">Featured</span>:null}</div><h3 className="mt-3 text-lg font-semibold text-white/74">{event.title}</h3><div className="mt-3 text-xs font-semibold text-white/48">{dateRange(event.starts_at,event.ends_at)}</div><div className="mt-1 text-xs text-white/34">{[event.venue_name,event.city,event.state_region,event.country].filter(Boolean).join(" · ")}</div>{event.organizer?<div className="mt-3 text-xs text-white/28">By {event.organizer}</div>:null}<div className="mt-4 text-xs font-bold text-emerald-200/50">Event details →</div></div></Link>)}</div>:<div className="panel rounded-[26px] py-14 text-center"><div className="font-semibold text-white/58">No published events match this view yet.</div><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-white/30">The calendar starts empty rather than inventing show data. Suggest a real event with its official source and it can be reviewed for publication.</p></div>}
  </section>

  <section className="border-y border-white/[.055] bg-black/[.1]"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 sm:px-6 md:grid-cols-3">{[["SOURCE-LINKED","Each published event retains the source used to verify its public details."],["UPCOMING FIRST","Past dates drop out of the default calendar so the page stays useful."],["COMMUNITY SUGGESTIONS","Signed-in keepers can suggest shows, but suggestions do not publish themselves."]].map(([a,b])=><div key={a} className="panel-soft rounded-[20px] p-5"><div className="text-[9px] font-black tracking-[.13em] text-emerald-200/50">{a}</div><p className="mt-3 text-xs leading-5 text-white/34">{b}</p></div>)}</div></section>

  <section id="suggest" className="mx-auto grid max-w-7xl scroll-mt-28 gap-5 px-5 py-12 sm:px-6 lg:grid-cols-[1.25fr_.75fr] lg:items-start"><EventSubmissionForm/><EventSubmissionStatus/></section>
 </main>
}
