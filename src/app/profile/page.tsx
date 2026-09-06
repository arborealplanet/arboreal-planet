import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { AccountProfileEditor } from "@/components/AccountProfileEditor";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export default async function ProfilePage(){
  const identity=await getServerIdentity();
  if(!identity) redirect("/login?next=/profile");
  const profile=await fetchOwnProfile(identity.token,identity.user.id);
  if(!profile) redirect("/login?next=/profile");
  return <main><PageIntro eyebrow="Profile" title="Your corner of Arboreal Planet." description="This is now your real account profile. Avatar, banner, bio, seller status and privacy settings persist through Supabase under your signed-in identity." aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Authenticated account</div>}/><section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6"><AccountProfileEditor email={identity.user.email??""} initial={profile}/></section></main>;
}
