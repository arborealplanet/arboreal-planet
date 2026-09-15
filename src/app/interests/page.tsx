import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { SubjectFollowButton } from "@/components/SubjectFollowButton";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

type Animal = { id:string; slug:string; common_name:string; scientific_name:string; animal_group:string };
type Plant = { id:string; slug:string; name:string; scientific_name:string; plant_group:string };

const topics = ["Green Tree Python","Boiga","Tree Monitors","Nepenthes","Breeding","Husbandry","Enclosures"] as const;
const headers = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" };

async function publicRows<T>(path:string):Promise<T[]>{
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`,{headers,cache:"no-store"});
  return response.ok?response.json():[];
}

export default async function InterestsPage(){
  const [animals,plants]=await Promise.all([
    publicRows<Animal>("species?published=eq.true&select=id,slug,common_name,scientific_name,animal_group&order=common_name.asc"),
    publicRows<Plant>("plant_collections?status=neq.PLANNED&select=id,slug,name,scientific_name,plant_group&order=display_order.asc"),
  ]);

  return <main>
    <PageIntro
      eyebrow="Personalize Arboreal Planet"
      title="Choose what you want to follow."
      description="Following changes your Community Following feed. Saving is different: saved items are bookmarks, while followed keepers, animals, plants and topics decide what activity you want surfaced."
      aside={<Link href="/community" className="secondary-action">Open Following feed →</Link>}
    />

    <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
      <div className="mb-4"><div className="section-kicker">Topics</div><h2 className="mt-2 text-2xl font-semibold">Follow conversations</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/32">Posts carrying these topic tags can appear in your Following feed even when you do not follow the author.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{topics.map(topic=><div key={topic} className="panel-soft flex items-center justify-between gap-3 rounded-2xl p-4"><div className="min-w-0 text-sm font-semibold text-white/62">{topic}</div><SubjectFollowButton type="TOPIC" subjectKey={topic}/></div>)}</div>
    </section>

    <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="section-kicker">Animals</div><h2 className="mt-2 text-2xl font-semibold">Follow animal references</h2></div><Link href="/animals" className="text-xs font-bold text-emerald-200/60">Animal Database →</Link></div>
      {animals.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{animals.map(animal=><article key={animal.id} className="panel rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/45">{animal.animal_group}</div><div className="mt-2 text-lg font-semibold text-white/72">{animal.common_name}</div><div className="mt-1 text-xs italic text-white/34">{animal.scientific_name}</div><div className="mt-5 flex flex-wrap gap-2"><SubjectFollowButton type="ANIMAL" id={animal.id} subjectKey={animal.common_name} label="Follow animal"/><Link href={`/animals/${animal.slug}`} className="rounded-xl border border-white/[.08] px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] text-white/38">Open record</Link></div></article>)}</div>:<div className="panel rounded-2xl p-6 text-sm text-white/32">No published animal references are available yet.</div>}
    </section>

    <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="section-kicker">Plants</div><h2 className="mt-2 text-2xl font-semibold">Follow plant collections</h2></div><Link href="/plants" className="text-xs font-bold text-emerald-200/60">Plant Database →</Link></div>
      {plants.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{plants.map(plant=><article key={plant.id} className="panel rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/45">{plant.plant_group}</div><div className="mt-2 text-lg font-semibold text-white/72">{plant.name}</div><div className="mt-1 text-xs italic text-white/34">{plant.scientific_name}</div><div className="mt-5 flex flex-wrap gap-2"><SubjectFollowButton type="PLANT" id={plant.id} subjectKey={plant.name} label="Follow plant"/><Link href={`/plants/${plant.slug}`} className="rounded-xl border border-white/[.08] px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] text-white/38">Open record</Link></div></article>)}</div>:<div className="panel rounded-2xl p-6 text-sm text-white/32">No published plant collections are available yet.</div>}
    </section>
  </main>;
}
