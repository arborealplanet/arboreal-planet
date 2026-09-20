import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { SnakeSorterWorkspace } from "@/components/SnakeSorterWorkspace";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export const metadata = {
  title: "Snake Sorter",
  robots: { index: false, follow: false },
};

export default async function SnakeSorterPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/login?next=/snake-sorter");

  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") notFound();

  return (
    <main>
      <PageIntro
        eyebrow="Owner laboratory"
        title="Snake Sorter"
        description="Private Green Tree Python identification workspace. Build and audit the reference dataset now; the image classifier can be connected here once the training set is ready."
        aside={<span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-amber-100/75">★ Owner only</span>}
      />
      <SnakeSorterWorkspace />
    </main>
  );
}
