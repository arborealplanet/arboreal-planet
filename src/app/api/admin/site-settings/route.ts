import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import { mirrorSettingToArcade } from "@/lib/arcade-jwt";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = (await fetchOwnProfile(identity.token, identity.user.id)) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

// Allowlisted settings and their permitted values. Nothing else may be
// written through this route.
const ALLOWED: Record<string, string[]> = {
  shop_theme: ["default", "halloween"],
  hank_costume: ["off", "on"],
};

export async function PUT(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { key?: unknown; value?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key : "";
  const value = typeof body?.value === "string" ? body.value : "";
  const allowed = ALLOWED[key];
  if (!allowed || !allowed.includes(value)) return NextResponse.json({ error: "Invalid setting." }, { status: 400 });
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/site_settings?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    // value is stored directly: the outer JSON.stringify already produces a
    // valid jsonb scalar — encoding it again would double-wrap the string.
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  const rows = (await response.json().catch(() => null)) as Array<{ key: string; value: unknown }> | null;
  if (!response.ok || !rows || !Array.isArray(rows) || !rows[0]) {
    return NextResponse.json({ error: "Could not save setting." }, { status: 500 });
  }
  // Mirror to the standalone Arcade's own settings table (best-effort: the
  // Planet write above already succeeded; a failed mirror never breaks it).
  // No-op until ARCADE_JWT_SECRET is configured in Planet's env.
  const mirrored = await mirrorSettingToArcade(identity.user.id, key, value);
  if (!mirrored) console.warn(`[admin/site-settings] Arcade mirror skipped/failed for key=${key}`);
  return NextResponse.json({ key: rows[0].key, value: rows[0].value });
}
