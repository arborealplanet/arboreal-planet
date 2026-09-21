import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

async function invokeHarvester(
  slug: string,
  token: string,
  limit: number,
  mode?: "discover" | "backfill_existing",
  candidateId?: string,
) {
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
      body: JSON.stringify({
        limit,
        ...(mode ? { mode } : {}),
        ...(candidateId ? { candidate_id: candidateId } : {}),
      }),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { limit?: unknown; mode?: unknown; source?: unknown; candidate_id?: unknown };
  const rawLimit = Number(body.limit ?? 40);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 40, 50));
  const mode = body.mode === "backfill_existing" ? "backfill_existing" : "discover";
  const source = body.source === "morphmarket" ? "morphmarket" : "open_sources";

  if (source === "morphmarket" || mode === "backfill_existing") {
    return NextResponse.json({
      error: "Server-side MorphMarket acquisition is disabled because the controlled probe receives HTTP 403. Use the Snake Sorter Browser Helper for live listing references.",
      browser_helper_required: true,
      server_side_morphmarket_disabled: true,
    }, { status: 409 });
  }

  const openSources = await invokeHarvester("snake-sorter-harvest-open-sources", identity.token, limit);

  if (!openSources.ok) {
    return NextResponse.json({
      error: "Open-source harvest failed.",
      open_sources: openSources.data,
    }, { status: Math.max(openSources.status, 502) });
  }

  return NextResponse.json({
    ok: true,
    source: "open_sources",
    open_sources: openSources.data,
    morphmarket: { skipped: true, reason: "browser_helper_only" },
    partial_failure: false,
  });
}
