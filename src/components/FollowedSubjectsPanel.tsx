import Link from "next/link";
import { SubjectFollowButton } from "@/components/SubjectFollowButton";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type FollowRow={subject_type:"ANIMAL"|"PLANT"|"TOPIC";subject_id:string|null;subject_key:string;created_at:string};
type Animal={id:string;slug:string;common_name:string};
type Plant={id:string;slug:string;name:string};

function authHeaders(token:string){return{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`,Accept:"application/json"}}
async function rows<T>(path:string,token:string):Promise<T[]>{const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`,{headers:authHeaders(token),cache:"no-store"});return response.ok?response.json():[]}

export async function FollowedSubjectsPanel(){
  const identity=await getServerIdentity();
  if(!identity)return null;
  const follows=await rows<FollowRow>(`user_subject_follows?user_id=eq.${encodeURIComponent(identity.user.id)}&select=subject_type,subject_id,subject_key,created_at&order=created_at.desc`,identity.token);
  if(!follows.length)return <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6"><div className="panel-soft rounded-[24px] p-5"><div className="section-kicker">Following interests</div><div className="mt-2 font-semibold text-white/62">No animals, plants or topics followed yet.</div><p className="mt-2 text-xs leading-5 text-white/32">Choose interests to personalize your Community Following feed.</p><Link href="/interests" className="mt-4 inline-block text-xs font-bold text-emerald-200/60">Choose interests →</Link></div></section>;

  const animalIds=follows.filter(row=>row.subject_type==="ANIMAL"&&row.subject_id).map(row=>row.subject_id as string);
  const plantIds=follows.filter(row=>row.subject_type==="PLANT"&&row.subject_id).map(row=>row.subject_id as string);
  const [animals,plants]=await Promise.all([
    animalIds.length?rows<Animal>(`species?id=in.(${animalIds.join(",")})&published=eq.true&select=id,slug,common_name`,identity.token):[],
    plantIds.length?rows<Plant>(`plant_collections?id=in.(${plantIds.join(",")})&status=neq.PLANNED&select=id,slug,name`,identity.token):[],
  ]);
  const animalMap=new Map(animals.map(item=>[item.id,item]));
  const plantMap=new Map(plants.map(item=>[item.id,item]));

  return <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="section-kicker">Following interests</div><h2 className="mt-2 text-2xl font-semibold">Animals, plants and topics you follow</h2></div><div className="flex gap-3"><Link href="/interests" className="text-xs font-bold text-emerald-200/60">Manage interests →</Link><Link href="/community" className="text-xs font-bold text-emerald-200/60">Following feed →</Link></div></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{follows.map((follow,index)=>{const animal=follow.subject_id?animalMap.get(follow.subject_id):null;const plant=follow.subject_id?plantMap.get(follow.subject_id):null;const href=follow.subject_type==="ANIMAL"&&animal?`/animals/${animal.slug}`:follow.subject_type==="PLANT"&&plant?`/plants/${plant.slug}`:`/community?q=${encodeURIComponent(follow.subject_key)}`;return <article key={`${follow.subject_type}-${follow.subject_key}-${index}`} className="panel rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.13em] text-sky-200/45">{follow.subject_type}</div><div className="mt-2 text-lg font-semibold text-white/72">{follow.subject_key}</div><div className="mt-5 flex flex-wrap gap-2"><SubjectFollowButton type={follow.subject_type} id={follow.subject_id??""} subjectKey={follow.subject_key}/><Link href={href} className="rounded-xl border border-white/[.08] px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] text-white/38">Open</Link></div></article>})}</div>
  </section>;
}
