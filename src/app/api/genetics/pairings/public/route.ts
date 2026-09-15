import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PublicProfile = { id?: string; username?: string | null; display_name?: string | null };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const animalId = String(url.searchParams.get("animalId") ?? "").trim();
  if (!UUID_RE.test(animalId)) return NextResponse.json({ error: "Invalid animal ID" }, { status: 400 });

  const fields = "id,created_by,dam_id,sire_id,pairing_year,pairing_code,notes,created_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pairings?visibility=eq.public&or=(dam_id.eq.${encodeURIComponent(animalId)},sire_id.eq.${encodeURIComponent(animalId)})&select=${fields}&order=pairing_year.desc.nullslast,created_at.desc&limit=50`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | null;
  if (!response.ok) return NextResponse.json({ error: "Could not load public pairing history" }, { status: response.status });
  const pairings = Array.isArray(rows) ? rows : [];

  const reporterIds = [...new Set(pairings.map((row) => String(row.created_by ?? "")).filter(Boolean))];
  const profiles = new Map<string, PublicProfile>();
  if (reporterIds.length) {
    const profileResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${reporterIds.join(",")})&select=id,username,display_name`, {
      headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
      cache: "no-store",
    });
    if (profileResponse.ok) {
      const profileRows = await profileResponse.json().catch(() => null) as PublicProfile[] | null;
      for (const profile of Array.isArray(profileRows) ? profileRows : []) if (profile.id) profiles.set(profile.id, profile);
    }
  }

  return NextResponse.json({
    pairings: pairings.map((row) => {
      const profile = profiles.get(String(row.created_by ?? ""));
      return {
        id: row.id,
        damId: row.dam_id,
        sireId: row.sire_id,
        pairingYear: row.pairing_year,
        pairingCode: row.pairing_code,
        notes: row.notes,
        createdAt: row.created_at,
        reporter: profile ? { username: profile.username ?? null, displayName: profile.display_name ?? null } : null,
      };
    }),
  });
}
