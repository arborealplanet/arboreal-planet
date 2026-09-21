import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

async function invokeHarvester(slug: string, token: string, limit: number) {
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/functions/v1/${slug}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ limit }),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { limit?: unknown };
  const rawLimit = Number(body.limit ?? 40);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 40, 50));

  const [openSources, morphmarket] = await Promise.all([
    invokeHarvester("snake-sorter-harvest-open-sources", identity.token, limit),
    invokeHarvester("snake-sorter-harvest-morphmarket", identity.token, limit),
  ]);

  if (!openSources.ok && !morphmarket.ok) {
    return NextResponse.json({
      error: "Harvest failed.",
      open_sources: openSources.data,
      morphmarket: morphmarket.data,
    }, { status: Math.max(openSources.status, morphmarket.status, 502) });
  }

  return NextResponse.json({
    ok: true,
    open_sources: openSources.data,
    morphmarket: morphmarket.data,
    partial_failure: !openSources.ok || !morphmarket.ok,
  });
}
