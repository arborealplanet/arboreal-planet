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

const statuses = new Set(["pending","accepted","rejected"]);
const qualities = new Set(["unreviewed","accepted","rejected","low_quality"]);
const views = new Set(["unknown","full_body","head","dorsal","left_lateral","right_lateral","tail","other"]);
const subjects = new Set([
  "listed_animal", "sire", "dam", "parent_unknown", "clutchmate",
  "multiple_animals", "document", "pedigree", "logo", "advertisement",
  "enclosure", "other", "uncertain",
]);

export async function PATCH(request: NextRequest) {
  const identity = await reviewerIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Reviewer session expired or missing. Sign in again, then retry." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Media id is required." }, { status: 400 });

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    updated_at: now,
    // Audit trail: every review decision is attributed (contract §11).
    reviewed_by: identity.user.id,
    reviewed_at: now,
  };

  if ("review_status" in body) {
    const value = String(body.review_status ?? "");
    if (!statuses.has(value)) return NextResponse.json({ error: "Invalid media review status." }, { status: 400 });
    update.review_status = value;
  }
  if ("quality_status" in body) {
    const value = String(body.quality_status ?? "");
    if (!qualities.has(value)) return NextResponse.json({ error: "Invalid media quality status." }, { status: 400 });
    update.quality_status = value;
  }
  if ("view_type" in body) {
    const value = String(body.view_type ?? "");
    if (!views.has(value)) return NextResponse.json({ error: "Invalid media view type." }, { status: 400 });
    update.view_type = value;
  }
  if ("image_subject" in body) {
    const value = String(body.image_subject ?? "");
    if (!subjects.has(value)) return NextResponse.json({ error: "Invalid image subject." }, { status: 400 });
    update.image_subject = value;
  }

  if (Object.keys(update).length === 3) {
    return NextResponse.json({ error: "No media review changes supplied." }, { status: 400 });
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        ...headers(identity.token),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(update),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ([]));
  if (!response.ok) {
    return NextResponse.json({ error: "Could not update candidate media." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, media: Array.isArray(data) ? data[0] ?? null : data });
}
