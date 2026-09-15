import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type PublicProfile = { id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null };
type ProducerRow = { animal_id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; confirmed_at?: string | null };
type PublicParent = { id: string; name: string };
type Relation = { status: "unknown" | "private_or_unpublished" | "public"; id?: string; name?: string | null };

const publicHeaders = { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" };

async function fetchPublicParents(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const parents = new Map<string, PublicParent>();
  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&id=in.(${chunk.join(",")})&select=id,name`, { headers: publicHeaders, cache: "no-store" });
    if (!response.ok) continue;
    const rows = await response.json().catch(() => []) as PublicParent[];
    for (const row of Array.isArray(rows) ? rows : []) parents.set(row.id, row);
  }
  return parents;
}

function relation(rawId: unknown, publicParents: Map<string, PublicParent>): Relation {
  const id = String(rawId ?? "");
  if (!id) return { status: "unknown" };
  const parent = publicParents.get(id);
  return parent ? { status: "public", id: parent.id, name: parent.name } : { status: "private_or_unpublished" };
}

export async function GET() {
  const fields = "id,registry_code,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,owner_id,breeder_profile_id,photo_path,record_status,updated_at";
  const [response, producerResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&select=${fields}&order=updated_at.desc&limit=500`, { headers: publicHeaders, cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/public_gtp_pedigree_producer_index`, {
      method: "POST",
      headers: { ...publicHeaders, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    }),
  ]);

  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | null;
  if (!response.ok) return NextResponse.json({ error: "Unable to load public pedigree database", detail: rows }, { status: response.status });

  const animals = Array.isArray(rows) ? rows : [];
  const publicParents = await fetchPublicParents(animals.flatMap((row) => [String(row.dam_id ?? ""), String(row.sire_id ?? "")]).filter(Boolean));
  const ownerIds = [...new Set(animals.map((row) => String(row.owner_id ?? "")).filter(Boolean))];
  const profiles = new Map<string, PublicProfile>();

  if (ownerIds.length) {
    const profileResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${ownerIds.join(",")})&select=id,username,display_name,avatar_url`, { headers: publicHeaders, cache: "no-store" });
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
      const dam = relation(row.dam_id, publicParents);
      const sire = relation(row.sire_id, publicParents);
      return {
        id: row.id,
        registryCode: row.registry_code,
        name: row.name,
        sex: row.sex,
        locality: row.locality_label,
        breederId: row.breeder_animal_id,
        hatchYear: row.hatch_year == null ? "" : String(row.hatch_year),
        dam,
        sire,
        damId: dam.status === "public" ? dam.id ?? null : null,
        sireId: sire.status === "public" ? sire.id ?? null : null,
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
