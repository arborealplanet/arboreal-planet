import { NextResponse } from "next/server";
import { blockBetween } from "@/lib/blocks";
import { createMessageRequest, relationshipExists } from "@/lib/message-requests";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type Target = { id: string; username: string; display_name: string | null };

async function getTarget(username: string) {
  const clean = decodeURIComponent(username).trim().slice(0, 80);
  if (!clean) return null;
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(clean)}&profile_visibility=eq.public&select=id,username,display_name&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []) as Target[];
  return rows[0] ?? null;
}

export async function POST(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { username } = await params;
  const target = await getTarget(username);
  if (!target) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });
  if (target.id === identity.user.id) return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
  if (await blockBetween(identity.token, identity.user.id, target.id)) return NextResponse.json({ error: "You cannot message this keeper right now." }, { status: 403 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/create_direct_conversation`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ p_other_user: target.id }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as string | { message?: string } | null;
  if (!response.ok || typeof payload !== "string") return NextResponse.json({ error: "Could not start conversation" }, { status: response.status || 400 });
  let requestPending = false;
  if (!(await relationshipExists(identity.token, identity.user.id, target.id))) {
    await createMessageRequest(identity.token, payload, identity.user.id, target.id);
    requestPending = true;
  }
  return NextResponse.json({ conversationId: payload, requestPending });
}
