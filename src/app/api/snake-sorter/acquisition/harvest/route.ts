import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { limit?: unknown };
  const rawLimit = Number(body.limit ?? 30);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 30, 50));

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/functions/v1/snake-sorter-harvest-open-sources`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ limit }),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({
      error: data.error ?? "Open-source harvest failed.",
      detail: data.detail ?? null,
      sources: data.harvest ?? null,
    }, { status: response.status });
  }

  return NextResponse.json(data);
}
