import { redirect } from "next/navigation";
import { PageIntro } from "@/components/PageIntro";
import { EditListingForm } from "@/components/EditListingForm";
import { getServerIdentity, supabaseRest } from "@/lib/supabase-auth";

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
  const r=await supabaseRest(`/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(id)}&select=*`,{},identity.accessToken);
  const rows=(await r.json().catch(()=>[])) as Listing[];
  const listing=rows[0];
  if(!listing || listing.owner_id!==identity.user.id) redirect(`/marketplace/${id}`);
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><PageIntro eyebrow="Marketplace" title="Edit listing" description="Update the public details for this listing. Existing photos stay attached."/><div className="mt-8"><EditListingForm listing={listing}/></div></main>;
}
