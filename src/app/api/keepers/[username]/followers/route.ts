import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type Person = { username: string; display_name: string | null; avatar_url: string | null };

const anon = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" };

async function resolveId(username: string): Promise<string | null> {
  const clean = decodeURIComponent(username).trim().slice(0, 80);
  if (!clean) return null;
  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(clean)}&select=id&limit=1`, { headers: anon, cache: "no-store" });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

async function people(ids: string[]): Promise<Person[]> {
  if (!ids.length) return [];
  const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${ids.map(encodeURIComponent).join(",")})&select=username,display_name,avatar_url`, { headers: anon, cache: "no-store" });
  if (!r.ok) return [];
  return (await r.json().catch(() => [])) as Person[];
}

// GET ?type=followers|following|friends — public lists for a keeper's profile.
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const id = await resolveId(username);
  if (!id) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });
  const type = new URL(request.url).searchParams.get("type") ?? "followers";

  try {
    if (type === "followers") {
      const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?following_id=eq.${id}&select=follower_id`, { headers: anon, cache: "no-store" });
      const rows = r.ok ? await r.json() : [];
      return NextResponse.json({ people: await people(rows.map((x: { follower_id: string }) => x.follower_id)) });
    }
    if (type === "following") {
      const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?follower_id=eq.${id}&select=following_id`, { headers: anon, cache: "no-store" });
      const rows = r.ok ? await r.json() : [];
      return NextResponse.json({ people: await people(rows.map((x: { following_id: string }) => x.following_id)) });
    }
    if (type === "friends") {
      const pair = `or=(requester_id.eq.${id},addressee_id.eq.${id})`;
      const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/friendships?${pair}&status=eq.accepted&select=requester_id,addressee_id`, { headers: anon, cache: "no-store" });
      const rows = r.ok ? await r.json() : [];
      const ids = rows.map((x: { requester_id: string; addressee_id: string }) => (x.requester_id === id ? x.addressee_id : x.requester_id));
      return NextResponse.json({ people: await people(ids) });
    }
    return NextResponse.json({ error: "Unknown list type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Could not load list" }, { status: 502 });
  }
}

// DELETE {username} — remove someone who follows you (only your own follower list).
export async function DELETE(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { username } = await params;
  const ownerId = await resolveId(username);
  if (!ownerId || ownerId !== identity.user.id) return NextResponse.json({ error: "You can only manage your own followers" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const targetName = String(b.username ?? "").trim();
  if (!targetName) return NextResponse.json({ error: "Keeper required" }, { status: 400 });
  const targetId = await resolveId(targetName);
  if (!targetId) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });

  const r = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/user_follows?follower_id=eq.${encodeURIComponent(targetId)}&following_id=eq.${encodeURIComponent(identity.user.id)}`,
    { method: "DELETE", headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Prefer: "return=minimal" }, cache: "no-store" }
  );
  if (!r.ok) return NextResponse.json({ error: "Could not remove follower" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
