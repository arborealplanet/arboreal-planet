import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

function h(token: string) {
  return { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" };
}

// PATCH {action: "accept"|"decline"} — only the recipient decides.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const action = String(b.action ?? "");
  if (action !== "accept" && action !== "decline") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/message_requests?id=eq.${encodeURIComponent(id)}&recipient_id=eq.${identity.user.id}&status=eq.pending`, {
    method: "PATCH",
    headers: { ...h(identity.token), Prefer: "return=representation" },
    body: JSON.stringify({ status: action === "accept" ? "accepted" : "declined" }),
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "Could not update request" }, { status: 400 });
  const rows = await r.json().catch(() => []);
  if (!rows.length) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: rows[0].status, conversation_id: rows[0].conversation_id });
}
