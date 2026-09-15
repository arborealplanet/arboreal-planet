import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type RawAnimal = {
  id: string;
  registry_code: string | null;
  name: string;
  sex: string | null;
  locality_label: string | null;
  breeder_animal_id: string | null;
  hatch_year: number | null;
  dam_id: string | null;
  sire_id: string | null;
  owner_id: string | null;
  photo_path: string | null;
  record_status: string | null;
  updated_at: string | null;
};
type PublicProfile = { id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null };
type ProducerRow = { animal_id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; confirmed_at?: string | null };
type Relation = { status: "unknown" | "private_or_unpublished" | "public"; id?: string; name?: string | null };

const headers = { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" };
const fields = "id,registry_code,name,sex,locality_label,breeder_animal_id,hatch_year,dam_id,sire_id,owner_id,photo_path,record_status,updated_at";

async function fetchPublicByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [] as RawAnimal[];
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&id=in.(${unique.join(",")})&select=${fields}`, { headers, cache: "no-store" });
  if (!response.ok) return [] as RawAnimal[];
  const rows = await response.json().catch(() => []) as RawAnimal[];
  return Array.isArray(rows) ? rows : [];
}

async function fetchPublicChildren(parentIds: string[]) {
  const unique = [...new Set(parentIds.filter(Boolean))];
  if (!unique.length) return [] as RawAnimal[];
  const value = unique.join(",");
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?visibility=eq.public&or=(dam_id.in.(${value}),sire_id.in.(${value}))&select=${fields}&order=updated_at.desc&limit=250`, { headers, cache: "no-store" });
  if (!response.ok) return [] as RawAnimal[];
  const rows = await response.json().catch(() => []) as RawAnimal[];
  return Array.isArray(rows) ? rows : [];
}

function relation(parentId: string | null, publicById: Map<string, RawAnimal>): Relation {
  if (!parentId) return { status: "unknown" };
  const row = publicById.get(parentId);
  return row ? { status: "public", id: row.id, name: row.name } : { status: "private_or_unpublished" };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid pedigree id" }, { status: 400 });

  const focusResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&visibility=eq.public&select=${fields}&limit=1`, { headers, cache: "no-store" });
  if (!focusResponse.ok) return NextResponse.json({ error: "Unable to load pedigree record" }, { status: focusResponse.status });
  const focusRows = await focusResponse.json().catch(() => []) as RawAnimal[];
  const focus = Array.isArray(focusRows) ? focusRows[0] : null;
  if (!focus) return NextResponse.json({ error: "Public pedigree record not found" }, { status: 404 });

  const parentIds = [focus.dam_id, focus.sire_id].filter((value): value is string => Boolean(value));
  const parents = await fetchPublicByIds(parentIds);
  const grandparentIds = parents.flatMap((row) => [row.dam_id, row.sire_id]).filter((value): value is string => Boolean(value));
  const grandparents = await fetchPublicByIds(grandparentIds);
  const children = await fetchPublicChildren([focus.id]);
  const grandchildren = await fetchPublicChildren(children.map((row) => row.id));

  const graphRows = [...new Map([focus, ...parents, ...grandparents, ...children, ...grandchildren].map((row) => [row.id, row])).values()];
  const publicById = new Map(graphRows.map((row) => [row.id, row]));
  const ownerIds = [...new Set(graphRows.map((row) => row.owner_id).filter((value): value is string => Boolean(value)))];
  const profiles = new Map<string, PublicProfile>();

  if (ownerIds.length) {
    const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${ownerIds.join(",")})&select=id,username,display_name,avatar_url`, { headers, cache: "no-store" });
    if (response.ok) {
      const rows = await response.json().catch(() => []) as PublicProfile[];
      for (const profile of Array.isArray(rows) ? rows : []) if (profile.id) profiles.set(profile.id, profile);
    }
  }

  const producersByAnimal = new Map<string, ProducerRow[]>();
  const producerResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/public_gtp_pedigree_producer_index`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (producerResponse.ok) {
    const rows = await producerResponse.json().catch(() => []) as ProducerRow[];
    const allowed = new Set(graphRows.map((row) => row.id));
    for (const producer of Array.isArray(rows) ? rows : []) {
      const animalId = String(producer.animal_id ?? "");
      if (!allowed.has(animalId)) continue;
      const list = producersByAnimal.get(animalId) ?? [];
      list.push(producer);
      producersByAnimal.set(animalId, list);
    }
  }

  const animals = graphRows.map((row) => {
    const profile = row.owner_id ? profiles.get(row.owner_id) : null;
    const producers = producersByAnimal.get(row.id) ?? [];
    return {
      id: row.id,
      registryCode: row.registry_code,
      name: row.name,
      sex: row.sex,
      locality: row.locality_label,
      breederId: row.breeder_animal_id,
      hatchYear: row.hatch_year == null ? "" : String(row.hatch_year),
      dam: relation(row.dam_id, publicById),
      sire: relation(row.sire_id, publicById),
      recordStatus: row.record_status ?? "keeper_reported",
      photoUrl: row.photo_path ? `/api/genetics/pedigree/photo?id=${encodeURIComponent(row.id)}` : "",
      contributor: profile ? { username: profile.username ?? null, displayName: profile.display_name ?? null, avatarUrl: profile.avatar_url ?? null } : null,
      confirmedProducers: producers.map((producer) => ({ username: producer.username ?? null, displayName: producer.display_name ?? null, avatarUrl: producer.avatar_url ?? null, confirmedAt: producer.confirmed_at ?? null })),
      updatedAt: row.updated_at,
    };
  });

  return NextResponse.json({ focusId: focus.id, animals });
}
