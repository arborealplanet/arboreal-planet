import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "./supabase-auth";

function auth(token: string) {
  return { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function exists(token: string, blocker: string, blocked: string): Promise<boolean> {
  const r = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/user_blocks?blocker_id=eq.${encodeURIComponent(blocker)}&blocked_id=eq.${encodeURIComponent(blocked)}&select=id&limit=1`,
    { headers: auth(token), cache: "no-store" }
  );
  if (!r.ok) return false;
  const rows = await r.json().catch(() => []);
  return rows.length > 0;
}

// True when either user has blocked the other. Reads run as the token holder,
// who is always one of the two parties, so the "Block parties can read" policy applies.
export async function blockBetween(token: string, a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const [ab, ba] = await Promise.all([exists(token, a, b), exists(token, b, a)]);
  return ab || ba;
}
