import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const headersFor = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const h = headersFor(identity.token);

  const [profilesResponse, membersResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?select=id,username,display_name,avatar_url,role,created_at&order=created_at.desc&limit=1000`, { headers: h, cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_members?select=user_id,access_level,is_enabled,approved_at,notes&order=approved_at.desc`, { headers: h, cache: "no-store" }),
  ]);

  if (!profilesResponse.ok || !membersResponse.ok) {
    return NextResponse.json({ error: "Member directory unavailable" }, { status: 502 });
  }

  const profiles = await profilesResponse.json() as Array<Record<string, unknown>>;
  const memberships = await membersResponse.json() as Array<Record<string, unknown>>;
  const membershipByUser = new Map(memberships.map((row) => [String(row.user_id), row]));

  return NextResponse.json({
    members: profiles.map((profile) => ({
      ...profile,
      snake_sorter: membershipByUser.get(String(profile.id)) ?? null,
    })),
    summary: {
      arboreal_planet_members: profiles.length,
      snake_sorter_members: memberships.filter((row) => row.is_enabled === true).length,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const userId = String(body.user_id ?? "").trim();
  const enabled = body.enabled === true;
  const requestedLevel = String(body.access_level ?? "scanner").trim();
  const accessLevel = requestedLevel === "reviewer" ? "reviewer" : "scanner";
  const notes = String(body.notes ?? "").trim().slice(0, 1000);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const h = headersFor(identity.token);
  const profileResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const profileRows = profileResponse.ok ? await profileResponse.json() as Array<{ id: string; role?: string }> : [];
  if (!profileRows[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (profileRows[0].role === "owner") {
    return NextResponse.json({ ok: true, owner: true });
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_members?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        access_level: accessLevel,
        is_enabled: enabled,
        approved_by: enabled ? identity.user.id : null,
        approved_at: enabled ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        notes: notes || null,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Could not update Snake Sorter access", detail: detail.slice(0, 400) }, { status: 400 });
  }

  const rows = await response.json();
  return NextResponse.json({ ok: true, membership: rows[0] ?? null });
}
