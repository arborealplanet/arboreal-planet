import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { AdminCommunityModeration } from "@/components/AdminCommunityModeration";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export default async function AdminPage(){
  const identity=await getServerIdentity();
  if(!identity) redirect("/login?next=/admin");
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;
  if(!profile || !["admin","owner"].includes(profile.role??"")) notFound();
  return <main><PageIntro eyebrow="Administration" title="Arboreal Planet control room." description="Private moderation and publishing tools for authorized Arboreal Planet staff. Ordinary users receive a 404 for this route." aside={<div className="rounded-full border border-amber-300/15 bg-amber-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">{profile.role}</div>}/><section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6"><div className="mb-5 panel rounded-3xl p-6"><div className="section-kicker">Community moderation</div><h2 className="mt-3 text-2xl font-semibold">Report review queue</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Review member reports, dismiss false alarms, or hide posts that need moderation. All controls remain behind the server-side admin/owner role gate.</p></div><AdminCommunityModeration/></section></main>;
}
