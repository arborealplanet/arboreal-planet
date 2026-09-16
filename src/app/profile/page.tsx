import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { AccountProfileEditor } from "@/components/AccountProfileEditor";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export default async function ProfilePage(){
  const identity=await getServerIdentity();
  if(!identity) redirect("/login?next=/profile");
  const profile=await fetchOwnProfile(identity.token,identity.user.id);
  if(!profile) redirect("/login?next=/profile");
  const usernameValue=(profile as {username?:unknown}).username;
  const roleValue=(profile as {role?:unknown}).role;
  const username=typeof usernameValue==="string"?usernameValue:"";
  const role=typeof roleValue==="string"?roleValue:"user";
  const isOwner=role==="owner";
  return <main><PageIntro eyebrow="Profile" title="Your Arboreal Planet hub." description="Manage your public keeper identity, seller settings and account details from one place, then jump straight into the parts of the site tied to your account." aside={<div className="flex flex-wrap gap-2">{username&&<Link href={`/keepers/${encodeURIComponent(username)}`} className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">View public profile</Link>}{isOwner&&<span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-amber-100/75">★ Owner</span>}<span className="rounded-full border border-white/[.08] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Signed in</span></div>}/><section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6">{isOwner&&<Link href="/admin" className="mb-5 block rounded-3xl border border-amber-300/15 bg-amber-300/[.035] p-5 transition hover:bg-amber-300/[.055]"><div className="text-[10px] font-black uppercase tracking-[.14em] text-amber-100/55">Master account</div><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><div className="text-xl font-semibold text-white/82">★ Owner Console</div><p className="mt-2 max-w-2xl text-sm leading-6 text-white/38">Open the private Arboreal Planet control center for seller approvals, Journal publishing, event review, pedigree reports, reference editing, account requests and moderation.</p></div><span className="text-sm font-black text-amber-100/70">Open console →</span></div></Link>}<div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Link href="/messages" className="panel rounded-2xl p-4 text-sm font-semibold text-white/65 transition hover:border-emerald-300/15">Messages <span className="float-right text-emerald-200/50">→</span></Link><Link href="/notifications" className="panel rounded-2xl p-4 text-sm font-semibold text-white/65 transition hover:border-emerald-300/15">Alerts <span className="float-right text-emerald-200/50">→</span></Link><Link href="/marketplace/mine" className="panel rounded-2xl p-4 text-sm font-semibold text-white/65 transition hover:border-emerald-300/15">My listings <span className="float-right text-emerald-200/50">→</span></Link><Link href="/community" className="panel rounded-2xl p-4 text-sm font-semibold text-white/65 transition hover:border-emerald-300/15">Community <span className="float-right text-emerald-200/50">→</span></Link></div><AccountProfileEditor email={identity.user.email??""} initial={profile}/></section></main>;
}
