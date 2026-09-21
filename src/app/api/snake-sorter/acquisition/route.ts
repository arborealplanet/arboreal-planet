import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const headers = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function reviewerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  if (!access.isOwner && access.accessLevel !== "reviewer") return null;
  return { ...identity, access };
}

const allowedStatuses = new Set(["pending","approved","rejected","permission_required"]);

export async function GET() {
  const identity = await reviewerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const h = headers(identity.token);
  const [candidateResponse, profileResponse] = await Promise.all([
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?select=*&order=discovered_at.desc&limit=300`,
      { headers: h, cache: "no-store" },
    ),
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_profiles?select=*&order=target_locality.asc.nullslast,name.asc`,
      { headers: h, cache: "no-store" },
    ),
  ]);

  if (!candidateResponse.ok || !profileResponse.ok) {
    return NextResponse.json({ error: "Could not load acquisition queue." }, { status: 502 });
  }

  const candidates = await candidateResponse.json() as Array<Record<string, unknown>>;
  const profiles = await profileResponse.json() as Array<Record<string, unknown>>;

  const stats = {
    total: candidates.length,
    pending: candidates.filter((row) => row.review_status === "pending").length,
    approved: candidates.filter((row) => row.review_status === "approved").length,
    rejected: candidates.filter((row) => row.review_status === "rejected").length,
    permission_required: candidates.filter((row) => row.review_status === "permission_required").length,
    staged: candidates.filter((row) => Boolean(row.staged_storage_path)).length,
    open_license: candidates.filter((row) => row.rights_status === "open_license").length,
    metadata_only: candidates.filter((row) => row.rights_status === "metadata_only").length,
  };

  return NextResponse.json({ candidates, profiles, stats });
}

export async function PATCH(request: NextRequest) {
  const identity = await reviewerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  const reviewStatus = String(body.review_status ?? "").trim();

  if (!id || !allowedStatuses.has(reviewStatus)) {
    return NextResponse.json({ error: "Invalid acquisition review update." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    review_status: reviewStatus,
    reviewed_at: new Date().toISOString(),
    reviewed_by: identity.user.id,
  };

  for (const [key, limit] of [
    ["provisional_taxon", 120],
    ["provisional_locality", 120],
    ["life_stage_hint", 40],
    ["neonate_color_hint", 40],
    ["exclusion_reason", 1000],
  ] as const) {
    if (key in body) {
      const value = String(body[key] ?? "").trim().slice(0, limit);
      patch[key] = value || null;
    }
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        ...headers(identity.token),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Could not update acquisition candidate." }, { status: 400 });
  }

  const rows = await response.json();
  return NextResponse.json({ ok: true, candidate: rows[0] ?? null });
}
