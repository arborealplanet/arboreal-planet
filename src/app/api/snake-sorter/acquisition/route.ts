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

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/rpc/get_snake_sorter_acquisition_queue`,
    {
      method: "POST",
      headers: {
        ...headers(identity.token),
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({
      error: "Could not load acquisition queue.",
      detail: typeof data?.message === "string" ? data.message : null,
    }, { status: 502 });
  }

  return NextResponse.json(data);
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

  const rpcBody: Record<string, unknown> = {
    p_id: id,
    p_review_status: reviewStatus,
    p_provisional_taxon: null,
    p_provisional_locality: null,
    p_life_stage_hint: null,
    p_neonate_color_hint: null,
    p_exclusion_reason: null,
  };

  for (const [key, rpcKey, limit] of [
    ["provisional_taxon", "p_provisional_taxon", 120],
    ["provisional_locality", "p_provisional_locality", 120],
    ["life_stage_hint", "p_life_stage_hint", 40],
    ["neonate_color_hint", "p_neonate_color_hint", 40],
    ["exclusion_reason", "p_exclusion_reason", 1000],
  ] as const) {
    if (key in body) {
      const value = String(body[key] ?? "").trim().slice(0, limit);
      rpcBody[rpcKey] = value || null;
    }
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/rpc/review_snake_sorter_candidate`,
    {
      method: "POST",
      headers: {
        ...headers(identity.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rpcBody),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Could not update acquisition candidate." }, { status: 400 });
  }

  const candidate = await response.json();

  const biologicalStatus =
    reviewStatus === "approved" ? "approved" :
    reviewStatus === "rejected" ? "rejected" :
    reviewStatus === "permission_required" ? "uncertain" :
    "pending";
  const acquisitionStage =
    reviewStatus === "approved" ? "biologically_approved" :
    reviewStatus === "rejected" ? "awaiting_review" :
    "awaiting_review";

  await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        ...headers(identity.token),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        biological_review_status: biologicalStatus,
        acquisition_stage: acquisitionStage,
      }),
      cache: "no-store",
    },
  ).catch(() => undefined);

  return NextResponse.json({ ok: true, candidate });
}
