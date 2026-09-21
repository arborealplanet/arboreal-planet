import { notFound, redirect } from "next/navigation";
import { SnakeSorterUnlockGate } from "@/components/SnakeSorterUnlockGate";
import { getServerIdentity, getSnakeSorterAccess } from "@/lib/supabase-auth";

export const metadata = {
  title: "Unlock Snake Sorter",
  robots: { index: false, follow: false },
};

export default async function SnakeSorterUnlockPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/login?next=/snake-sorter/unlock");

  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) notFound();

  return <SnakeSorterUnlockGate />;
}
