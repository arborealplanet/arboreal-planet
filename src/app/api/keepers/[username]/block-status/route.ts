import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import { blockBetween } from "@/lib/blocks";

// GET — block relationship between the signed-in keeper and :username.
export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ canInteract: true, blockedByMe: false, blockedMe: false });

  const { username } = await params;
  const clean = decodeURIComponent(username).trim().slice(0, 80);
  if (!clean) return NextResponse.json({ canInteract: true, blockedByMe: false, blockedMe: false });

  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(clean)}&select=id&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}` }, cache: "no-store",
  });
  const rows = r.ok ? await r.json().catch(() => []) : [];
  const targetId = rows[0]?.id as string | undefined;
  if (!targetId || targetId === identity.user.id) return NextResponse.json({ canInteract: true, blockedByMe: false, blockedMe: false });

  // Which direction? Two cheap existence checks (RLS lets each party read their own rows).
  const [byMe, byThem] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_blocks?blocker_id=eq.${identity.user.id}&blocked_id=eq.${targetId}&select=id&limit=1`, {
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` }, cache: "no-store",
    }).then(async (x) => x.ok && (await x.json().catch(() => [])).length > 0).catch(() => false),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_blocks?blocker_id=eq.${targetId}&blocked_id=eq.${identity.user.id}&select=id&limit=1`, {
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` }, cache: "no-store",
    }).then(async (x) => x.ok && (await x.json().catch(() => [])).length > 0).catch(() => false),
  ]);

  const blocked = byMe || byThem || (await blockBetween(identity.token, identity.user.id, targetId));
  return NextResponse.json({ canInteract: !blocked, blockedByMe: byMe, blockedMe: byThem && !byMe });
}
