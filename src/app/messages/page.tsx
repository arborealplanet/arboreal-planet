import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { InboxList } from "@/components/InboxList";
import { getServerIdentity } from "@/lib/supabase-auth";
export default async function MessagesPage(){const identity=await getServerIdentity();if(!identity)redirect("/login?next=/messages");return <main><PageIntro eyebrow="Private messages" title="Inbox" description="Private one-to-one conversations between Arboreal Planet accounts. Marketplace conversations stay connected to the listing that started them."/><section className="mx-auto max-w-4xl px-5 pb-16 sm:px-6"><InboxList/></section></main>}
