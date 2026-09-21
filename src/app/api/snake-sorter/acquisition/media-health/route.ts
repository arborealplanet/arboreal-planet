import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function reviewerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  if (!access.isOwner && access.accessLevel !== "reviewer") return null;
  return identity;
}

const allowed = new Set(["available","unavailable","blocked","expired","unknown"]);

export async function PATCH(request: NextRequest) {
  const identity = await reviewerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  const status = String(body.status ?? "").trim();
  const rawHttp = Number(body.http_status ?? 0);
  const httpStatus = Number.isFinite(rawHttp) && rawHttp > 0 ? Math.trunc(rawHttp) : null;

  if (!id || !allowed.has(status)) {
    return NextResponse.json({ error: "Invalid media-health update." }, { status: 400 });
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        live_reference_status: status,
        last_verified_at: new Date().toISOString(),
        last_verified_http_status: httpStatus,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Could not update live-reference health." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
