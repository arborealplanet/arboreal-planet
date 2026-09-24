import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

function h(token: string) {
  return { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// Soft delete via a body stub so threaded replies stay in place; assumes nothing about the schema beyond the body column.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { commentId } = await params;
  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_comments?id=eq.${encodeURIComponent(commentId)}&author_id=eq.${identity.user.id}`, {
    method: "PATCH",
    headers: { ...h(identity.token), Prefer: "return=representation" },
    body: JSON.stringify({ body: "[removed]" }),
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "Could not delete comment" }, { status: 400 });
  const rows = await r.json();
  if (!rows.length) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { commentId } = await params;
  const b = await request.json().catch(() => ({}));
  const body = String(b.body ?? "").trim();
  if (!body || body.length > 1000) return NextResponse.json({ error: "Comment must be 1 to 1000 characters" }, { status: 400 });
  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_comments?id=eq.${encodeURIComponent(commentId)}&author_id=eq.${identity.user.id}`, {
    method: "PATCH",
    headers: { ...h(identity.token), Prefer: "return=representation" },
    body: JSON.stringify({ body }),
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "Could not update comment" }, { status: 400 });
  const rows = await r.json();
  if (!rows.length) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  return NextResponse.json({ ok: true, comment: rows[0] });
}
