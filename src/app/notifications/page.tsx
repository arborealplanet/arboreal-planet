import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { NotificationsList } from "@/components/NotificationsList";
import { getServerIdentity } from "@/lib/supabase-auth";
export default async function NotificationsPage(){const identity=await getServerIdentity();if(!identity)redirect("/login?next=/notifications");return <main><PageIntro eyebrow="Activity" title="Notifications" description="Messages and account activity that need your attention live here. This same system will expand to Community, Marketplace, followed species and video invitations."/><section className="mx-auto max-w-4xl px-5 pb-16 sm:px-6"><NotificationsList/></section></main>}
