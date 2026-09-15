import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { NotificationsList } from "@/components/NotificationsList";
import { getServerIdentity } from "@/lib/supabase-auth";

export default async function NotificationsPage(){
  const identity=await getServerIdentity();
  if(!identity)redirect("/login?next=/notifications");
  return <main>
    <PageIntro eyebrow="Activity" title="Notifications" description="Messages, followers and Community activity that need your attention live here. Your feed follows and saved items remain separate from alerts, so you decide what deserves a notification."/>
    <section className="mx-auto grid max-w-4xl gap-5 px-5 pb-16 sm:px-6">
      <NotificationPreferences/>
      <NotificationsList/>
    </section>
  </main>;
}
