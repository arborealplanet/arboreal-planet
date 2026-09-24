import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const anon = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" };

function authed(token: string, extra: Record<string, string> = {}) {
  return { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

async function resolveId(username: string): Promise<{ id: string; username: string; display_name: string | null } | null> {
  const clean = decodeURIComponent(username).trim().slice(0, 80);
  if (!clean) return null;
  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(clean)}&select=id,username,display_name&limit=1`, { headers: anon, cache: "no-store" });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0] ?? null;
}

// GET — list keepers I have blocked.
export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_blocks?blocker_id=eq.${identity.user.id}&select=blocked_id,created_at`, {
    headers: authed(identity.token), cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "Could not load blocked keepers" }, { status: 502 });
  const rows = (await r.json()) as Array<{ blocked_id: string; created_at: string }>;
  const ids = rows.map((x) => x.blocked_id);
  let people: Array<{ id: string; username: string; display_name: string | null }> = [];
  if (ids.length) {
    const pr = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${ids.map(encodeURIComponent).join(",")})&select=id,username,display_name`, { headers: anon, cache: "no-store" });
    if (pr.ok) people = await pr.json();
  }
  const byId = new Map(people.map((p) => [p.id, p]));
  return NextResponse.json({
    blocked: rows.map((x) => ({ ...(byId.get(x.blocked_id) ?? { username: null, display_name: null }), id: x.blocked_id, since: x.created_at })),
  });
}

// POST {username} — block a keeper. Also removes any follows/friendships both ways.
export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const target = await resolveId(String(b.username ?? ""));
  if (!target) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });
  if (target.id === identity.user.id) return NextResponse.json({ error: "You cannot block yourself" }, { status: 400 });

  const me = identity.user.id;
  const them = target.id;
  const insert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_blocks`, {
    method: "POST", headers: authed(identity.token, { Prefer: "return=minimal" }),
    body: JSON.stringify({ blocker_id: me, blocked_id: them }), cache: "no-store",
  });
  if (!insert.ok && insert.status !== 409) return NextResponse.json({ error: "Could not block keeper" }, { status: 400 });

  // Best-effort cleanup: remove follows and friendships in both directions.
  const h = authed(identity.token, { Prefer: "return=minimal" });
  await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?or=(and(follower_id.eq.${me},following_id.eq.${them}),and(follower_id.eq.${them},following_id.eq.${me}))`, { method: "DELETE", headers: h, cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/friendships?or=(and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me}))`, { method: "DELETE", headers: h, cache: "no-store" }),
  ]).catch(() => null);

  return NextResponse.json({ ok: true, blocked: target.username });
}

// DELETE {username} — unblock.
export async function DELETE(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const target = await resolveId(String(b.username ?? ""));
  if (!target) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });

  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_blocks?blocker_id=eq.${identity.user.id}&blocked_id=eq.${encodeURIComponent(target.id)}`, {
    method: "DELETE", headers: authed(identity.token, { Prefer: "return=minimal" }), cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "Could not unblock keeper" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
