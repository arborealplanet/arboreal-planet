import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type PublicProfile = { id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null };
type ProducerRow = { animal_id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; confirmed_at?: string | null };

export async function GET() {
  const fields = "id,registry_code,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,owner_id,breeder_profile_id,photo_path,record_status,updated_at";
  const [response, producerResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&select=${fields}&order=updated_at.desc&limit=500`, {
      headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
      cache: "no-store",
    }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/public_gtp_pedigree_producer_index`, {
      method: "POST",
      headers: { apikey: SUPABASE_AUTH_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
      cache: "no-store",
    }),
  ]);

  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | null;
  if (!response.ok) return NextResponse.json({ error: "Unable to load public pedigree database", detail: rows }, { status: response.status });

  const animals = Array.isArray(rows) ? rows : [];
  const ownerIds = [...new Set(animals.map((row) => String(row.owner_id ?? "")).filter(Boolean))];
  const profiles = new Map<string, PublicProfile>();

  if (ownerIds.length) {
    const profileResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${ownerIds.join(",")})&select=id,username,display_name,avatar_url`, {
      headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
      cache: "no-store",
    });
    if (profileResponse.ok) {
      const profileRows = await profileResponse.json().catch(() => null) as PublicProfile[] | null;
      for (const profile of Array.isArray(profileRows) ? profileRows : []) if (profile.id) profiles.set(profile.id, profile);
    }
  }

  const producersByAnimal = new Map<string, ProducerRow[]>();
  if (producerResponse.ok) {
    const producerRows = await producerResponse.json().catch(() => null) as ProducerRow[] | null;
    for (const producer of Array.isArray(producerRows) ? producerRows : []) {
      const animalId = String(producer.animal_id ?? "");
      if (!animalId) continue;
      const list = producersByAnimal.get(animalId) ?? [];
      list.push(producer);
      producersByAnimal.set(animalId, list);
    }
  }

  return NextResponse.json({
    animals: animals.map((row) => {
      const profile = profiles.get(String(row.owner_id ?? ""));
      const producerRows = producersByAnimal.get(String(row.id ?? "")) ?? [];
      const confirmedProducers = producerRows.map((producer) => ({
        username: producer.username ?? null,
        displayName: producer.display_name ?? null,
        avatarUrl: producer.avatar_url ?? null,
        confirmedAt: producer.confirmed_at ?? null,
      }));
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
        confirmedBreeder: confirmedProducers[0] ?? null,
        confirmedProducers,
        updatedAt: row.updated_at,
      };
    }),
  });
}
