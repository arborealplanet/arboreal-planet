import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { EditListingForm } from "@/components/EditListingForm";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

type Listing = {
  id:string; owner_id:string; category:string; title:string; description:string|null; price:number;
  public_origin:string|null; morph:string|null; sex:string|null; age_or_year:string|null;
  lineage:string|null; seller_location:string|null; status:string; image_urls:string[]|null;
};

export default async function EditListingPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const identity=await getServerIdentity();
  if(!identity) redirect(`/login?next=/marketplace/${id}/edit`);
  const r=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(identity.user.id)}&select=*`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Accept:"application/json"},cache:"no-store"});
  const rows=(r.ok?await r.json().catch(()=>[]):[]) as Listing[];
  const listing=rows[0];
  if(!listing) redirect(`/marketplace/${id}`);
  return <main><PageIntro eyebrow="Marketplace · Seller tools" title="Edit listing" description="Update the public details for this listing. Existing photos stay attached."/><section className="mx-auto max-w-3xl px-5 pb-16 sm:px-6"><EditListingForm listing={listing}/></section></main>;
}
