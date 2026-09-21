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
  const source = body.source === "open_sources" || body.source === "morphmarket" ? body.source : "both";
  const candidateId = typeof body.candidate_id === "string" && body.candidate_id.trim()
    ? body.candidate_id.trim()
    : undefined;

  if (source === "morphmarket" || mode === "backfill_existing") {
    return NextResponse.json({
      error: "Server-side MorphMarket acquisition is disabled because the controlled probe receives HTTP 403. Use the Snake Sorter Browser Helper for live listing references.",
      browser_helper_required: true,
      server_side_morphmarket_disabled: true,
    }, { status: 409 });
  }

  if (mode === "backfill_existing") {
    const morphmarket = await invokeHarvester(
      "snake-sorter-harvest-morphmarket",
      identity.token,
      candidateId ? 1 : limit,
      mode,
      candidateId,
    );
    if (!morphmarket.ok) {
      return NextResponse.json({
        error: "MorphMarket media backfill failed.",
        morphmarket: morphmarket.data,
      }, { status: Math.max(morphmarket.status, 502) });
    }
    return NextResponse.json({
      ok: true,
      mode,
      morphmarket: morphmarket.data,
      partial_failure: false,
    });
  }

  const openSources = source === "morphmarket"
    ? { ok: true, status: 200, data: { skipped: true } }
    : await invokeHarvester("snake-sorter-harvest-open-sources", identity.token, limit);
  const morphmarket = source === "open_sources"
    ? { ok: true, status: 200, data: { skipped: true } }
    : await invokeHarvester("snake-sorter-harvest-morphmarket", identity.token, limit, "discover");

  if (!openSources.ok && !morphmarket.ok) {
    return NextResponse.json({
      error: "Harvest failed.",
      open_sources: openSources.data,
      morphmarket: morphmarket.data,
    }, { status: Math.max(openSources.status, morphmarket.status, 502) });
  }

  return NextResponse.json({
    ok: true,
    source,
    open_sources: openSources.data,
    morphmarket: morphmarket.data,
    partial_failure: !openSources.ok || !morphmarket.ok,
  });
}
