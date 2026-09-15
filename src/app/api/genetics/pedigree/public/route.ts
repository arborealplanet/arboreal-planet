import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export async function GET() {
  const fields = "id,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,owner_id,photo_path,updated_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&select=${fields}&order=updated_at.desc&limit=500`, {
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const rows = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Unable to load public pedigree database", detail: rows }, { status: response.status });

  return NextResponse.json({
    animals: (Array.isArray(rows) ? rows : []).map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      sex: row.sex,
      locality: row.locality_label,
      breederId: row.breeder_animal_id,
      hatchYear: row.hatch_year == null ? "" : String(row.hatch_year),
      damId: row.dam_id,
      sireId: row.sire_id,
      ownerId: row.owner_id,
      photoUrl: row.photo_path ? `/api/genetics/pedigree/photo?id=${encodeURIComponent(String(row.id))}` : "",
      updatedAt: row.updated_at,
    })),
  });
}
