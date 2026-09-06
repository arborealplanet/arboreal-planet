import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { CreateListingForm } from "@/components/CreateListingForm";
import { getServerIdentity } from "@/lib/supabase-auth";
export default async function NewListingPage(){const identity=await getServerIdentity();if(!identity)redirect("/login?next=/marketplace/new");return <main><PageIntro eyebrow="Marketplace · New listing" title="List it on Arboreal Planet." description="Create a real marketplace listing attached to your account. Animal origin uses the same Captive Bred / Import language used throughout Arboreal Planet."/><section className="mx-auto max-w-3xl px-5 pb-16 sm:px-6"><CreateListingForm/></section></main>}
