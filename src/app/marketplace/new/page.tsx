import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { CreateListingForm } from "@/components/CreateListingForm";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export default async function NewListingPage(){
  const identity=await getServerIdentity();
  if(!identity)redirect("/login?next=/marketplace/new");
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {seller_verification_status?:string|null;role?:string|null}|null;
  const staff=Boolean(profile&&["admin","owner"].includes(profile.role??""));
  const approved=profile?.seller_verification_status==="verified"||staff;
  if(!approved){
    return <main><PageIntro eyebrow="Marketplace · Seller verification" title="Seller approval is required before listing." description="Arboreal Planet reviews seller profiles before marketplace inventory can be published. This keeps listing access tied to a real keeper profile instead of being open to every new account."/><section className="mx-auto max-w-3xl px-5 pb-16 sm:px-6"><div className="panel rounded-3xl p-6"><div className="text-sm font-semibold text-white/75">Current status: {profile?.seller_verification_status??"unverified"}</div><p className="mt-2 text-sm leading-6 text-white/42">Complete your profile and request seller verification from Profile settings. Once approved, this page will open the listing form.</p><Link href="/profile" className="primary-action mt-5 inline-block">Open profile settings</Link></div></section></main>;
  }
  return <main><PageIntro eyebrow="Marketplace · New listing" title="List it on Arboreal Planet." description="Create a real marketplace listing attached to your verified seller account. Animal origin uses the same Captive Bred / Import language used throughout Arboreal Planet."/><section className="mx-auto max-w-3xl px-5 pb-16 sm:px-6"><CreateListingForm/></section></main>;
}
