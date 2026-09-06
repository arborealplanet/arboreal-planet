import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export default async function AdminPage(){
  const identity=await getServerIdentity();
  if(!identity) redirect("/login?next=/admin");
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;
  if(!profile || !["admin","owner"].includes(profile.role??"")) notFound();
  return <main><PageIntro eyebrow="Administration" title="Arboreal Planet control room." description="This route is resolved on the server and is unavailable to ordinary users. Administrative tools can be added here without exposing them as client-side hidden controls." aside={<div className="rounded-full border border-amber-300/15 bg-amber-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">{profile.role}</div>}/><section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6"><div className="panel rounded-3xl p-6"><div className="section-kicker">Access verified</div><h2 className="mt-3 text-2xl font-semibold">Server-side role gate is active.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Marketplace moderation, catalog publishing, Snake Stocks ingestion controls and account moderation can be added here next. Non-admin users receive a 404 rather than an exposed admin interface.</p></div></section></main>;
}
