import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type TargetProfile = { id: string; username: string; display_name: string | null };

async function targetProfile(username: string) {
  const clean = decodeURIComponent(username).trim().slice(0, 80);
  if (!clean) return null;
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(clean)}&profile_visibility=eq.public&select=id,username,display_name&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []) as TargetProfile[];
  return rows[0] ?? null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const target = await targetProfile(username);
  if (!target) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });

  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ signedIn: false, following: false, canFollow: true, target: { username: target.username, displayName: target.display_name } });
  if (identity.user.id === target.id) return NextResponse.json({ signedIn: true, following: false, canFollow: false, target: { username: target.username, displayName: target.display_name } });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?follower_id=eq.${encodeURIComponent(identity.user.id)}&following_id=eq.${encodeURIComponent(target.id)}&select=following_id&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const rows = response.ok ? await response.json().catch(() => []) as Array<{ following_id: string }> : [];
  return NextResponse.json({ signedIn: true, following: rows.length > 0, canFollow: true, target: { username: target.username, displayName: target.display_name } });
}

export async function POST(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { username } = await params;
  const target = await targetProfile(username);
  if (!target) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });
  if (identity.user.id === target.id) return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });

  const existingResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?follower_id=eq.${encodeURIComponent(identity.user.id)}&following_id=eq.${encodeURIComponent(target.id)}&select=following_id&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const existing = existingResponse.ok ? await existingResponse.json().catch(() => []) as Array<{ following_id: string }> : [];

  if (existing.length) {
    const remove = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows?follower_id=eq.${encodeURIComponent(identity.user.id)}&following_id=eq.${encodeURIComponent(target.id)}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Prefer: "return=minimal" },
      cache: "no-store",
    });
    if (!remove.ok) return NextResponse.json({ error: "Could not unfollow keeper" }, { status: 400 });
    return NextResponse.json({ following: false });
  }

  const add = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_follows`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ follower_id: identity.user.id, following_id: target.id }),
    cache: "no-store",
  });
  if (!add.ok) return NextResponse.json({ error: "Could not follow keeper" }, { status: 400 });
  return NextResponse.json({ following: true });
}
