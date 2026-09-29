import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SnakeSorterUnlockGate } from "@/components/SnakeSorterUnlockGate";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const metadata = {
  title: "Unlock Snake Sorter",
  robots: { index: false, follow: false },
};

async function hasValidUnlockSession(accessToken: string, unlockToken: string | undefined) {
  if (!unlockToken) return false;
  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/rpc/is_snake_sorter_unlock_session_valid`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_AUTH_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ p_token: unlockToken }),
        cache: "no-store",
      },
    );
    if (!response.ok) return false;
    return (await response.json().catch(() => false)) === true;
  } catch {
    return false;
  }
}

export default async function SnakeSorterUnlockPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/snake-sorter/login");

  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) notFound();

  // Already unlocked: bounce straight into the lab instead of showing the PIN form again.
  const unlockToken = (await cookies()).get("ss_unlock")?.value;
  if (await hasValidUnlockSession(identity.token, unlockToken)) redirect("/snake-sorter");

  return <SnakeSorterUnlockGate />;
}
