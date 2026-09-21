import { notFound, redirect } from "next/navigation";
import { SnakeSorterLabShell } from "@/components/SnakeSorterLabShell";
import { getServerIdentity, getSnakeSorterAccess } from "@/lib/supabase-auth";

export const metadata = {
  title: "Snake Sorter",
  robots: { index: false, follow: false },
};

export default async function SnakeSorterPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/login?next=/snake-sorter");

  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) notFound();

  return (
    <SnakeSorterLabShell
      isOwner={access.isOwner}
      accessLevel={access.accessLevel}
    />
  );
}
