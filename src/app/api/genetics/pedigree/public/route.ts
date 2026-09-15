import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type PublicProfile = { id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null };

export async function GET() {
  const fields = "id,registry_code,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,owner_id,photo_path,record_status,updated_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&select=${fields}&order=updated_at.desc&limit=500`, {
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | null;
  if (!response.ok) return NextResponse.json({ error: "Unable to load public pedigree database", detail: rows }, { status: response.status });

  const animals = Array.isArray(rows) ? rows : [];
  const ownerIds = [...new Set(animals.map((row) => String(row.owner_id ?? "")).filter(Boolean))];
  const profiles = new Map<string, PublicProfile>();

  if (ownerIds.length) {
    const profileResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${ownerIds.join(",")})&select=id,username,display_name,avatar_url`, {
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (profileResponse.ok) {
      const profileRows = await profileResponse.json().catch(() => null) as PublicProfile[] | null;
      for (const profile of Array.isArray(profileRows) ? profileRows : []) {
        if (profile.id) profiles.set(profile.id, profile);
      }
    }
  }

  return NextResponse.json({
    animals: animals.map((row) => {
      const profile = profiles.get(String(row.owner_id ?? ""));
      return {
        id: row.id,
        registryCode: row.registry_code,
        name: row.name,
        sex: row.sex,
        locality: row.locality_label,
        breederId: row.breeder_animal_id,
        hatchYear: row.hatch_year == null ? "" : String(row.hatch_year),
        damId: row.dam_id,
        sireId: row.sire_id,
        recordStatus: row.record_status ?? "keeper_reported",
        photoUrl: row.photo_path ? `/api/genetics/pedigree/photo?id=${encodeURIComponent(String(row.id))}` : "",
        contributor: profile ? {
          username: profile.username ?? null,
          displayName: profile.display_name ?? null,
          avatarUrl: profile.avatar_url ?? null,
        } : null,
        updatedAt: row.updated_at,
      };
    }),
  });
}
