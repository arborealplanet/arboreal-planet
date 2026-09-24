import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { FriendsManager } from "@/components/FriendsManager";
import { getServerIdentity } from "@/lib/supabase-auth";

export default async function FriendsPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/login?next=/friends");
  return (
    <main>
      <PageIntro eyebrow="Circle" title="Friends" description="Friend requests, your circle, and everyone you've connected with on Arboreal Planet." />
      <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-6">
        <FriendsManager />
      </section>
    </main>
  );
}
