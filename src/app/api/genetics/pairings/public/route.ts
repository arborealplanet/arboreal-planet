import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PublicProfile = { id?: string; username?: string | null; display_name?: string | null };
type OffspringLink = { pairing_id?: string; animal_id?: string };
type PublicOffspring = { id?: string; registry_code?: string | null; name?: string; sex?: string | null; locality_label?: string | null; hatch_year?: number | null };
type PublicParticipant = { id?: string; name?: string | null };

const headers = { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const animalId = String(url.searchParams.get("animalId") ?? "").trim();
  if (!UUID_RE.test(animalId)) return NextResponse.json({ error: "Invalid animal ID" }, { status: 400 });

  const fields = "id,created_by,dam_id,sire_id,pairing_year,pairing_code,notes,created_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pairings?visibility=eq.public&or=(dam_id.eq.${encodeURIComponent(animalId)},sire_id.eq.${encodeURIComponent(animalId)})&select=${fields}&order=pairing_year.desc.nullslast,created_at.desc&limit=50`, { headers, cache: "no-store" });
  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | null;
  if (!response.ok) return NextResponse.json({ error: "Could not load public pairing history" }, { status: response.status });
  const pairings = Array.isArray(rows) ? rows : [];

  const participantIds = [...new Set(pairings.flatMap((row) => [String(row.dam_id ?? ""), String(row.sire_id ?? "")]).filter(Boolean))];
  const publicParticipants = new Map<string, PublicParticipant>();
  if (participantIds.length) {
    const participantResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=in.(${participantIds.join(",")})&visibility=eq.public&select=id,name`, { headers, cache: "no-store" });
    if (participantResponse.ok) {
      const participantRows = await participantResponse.json().catch(() => []) as PublicParticipant[];
      for (const participant of Array.isArray(participantRows) ? participantRows : []) if (participant.id) publicParticipants.set(participant.id, participant);
    }
  }

  const reporterIds = [...new Set(pairings.map((row) => String(row.created_by ?? "")).filter(Boolean))];
  const profiles = new Map<string, PublicProfile>();
  if (reporterIds.length) {
    const profileResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${reporterIds.join(",")})&select=id,username,display_name`, { headers, cache: "no-store" });
    if (profileResponse.ok) {
      const profileRows = await profileResponse.json().catch(() => null) as PublicProfile[] | null;
      for (const profile of Array.isArray(profileRows) ? profileRows : []) if (profile.id) profiles.set(profile.id, profile);
    }
  }

  const pairingIds = pairings.map((row) => String(row.id ?? "")).filter(Boolean);
  let links: OffspringLink[] = [];
  const offspringById = new Map<string, PublicOffspring>();
  if (pairingIds.length) {
    const linkResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pairing_offspring?pairing_id=in.(${pairingIds.join(",")})&select=pairing_id,animal_id`, { headers, cache: "no-store" });
    if (linkResponse.ok) links = await linkResponse.json().catch(() => []) as OffspringLink[];

    const offspringIds = [...new Set(links.map((link) => String(link.animal_id ?? "")).filter(Boolean))];
    if (offspringIds.length) {
      const offspringResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=in.(${offspringIds.join(",")})&visibility=eq.public&select=id,registry_code,name,sex,locality_label,hatch_year`, { headers, cache: "no-store" });
      if (offspringResponse.ok) {
        const offspringRows = await offspringResponse.json().catch(() => []) as PublicOffspring[];
        for (const offspring of Array.isArray(offspringRows) ? offspringRows : []) if (offspring.id) offspringById.set(offspring.id, offspring);
      }
    }
  }

  return NextResponse.json({
    pairings: pairings.map((row) => {
      const pairingId = String(row.id ?? "");
      const profile = profiles.get(String(row.created_by ?? ""));
      const rawDamId = String(row.dam_id ?? "");
      const rawSireId = String(row.sire_id ?? "");
      const dam = rawDamId ? publicParticipants.get(rawDamId) : null;
      const sire = rawSireId ? publicParticipants.get(rawSireId) : null;
      const offspring = links
        .filter((link) => link.pairing_id === pairingId)
        .map((link) => offspringById.get(String(link.animal_id ?? "")))
        .filter((animal): animal is PublicOffspring => Boolean(animal));
      return {
        id: row.id,
        damId: dam?.id ?? null,
        sireId: sire?.id ?? null,
        damStatus: !rawDamId ? "unknown" : dam ? "public" : "private_or_unpublished",
        sireStatus: !rawSireId ? "unknown" : sire ? "public" : "private_or_unpublished",
        pairingYear: row.pairing_year,
        pairingCode: row.pairing_code,
        notes: row.notes,
        createdAt: row.created_at,
        reporter: profile ? { username: profile.username ?? null, displayName: profile.display_name ?? null } : null,
        offspring: offspring.map((animal) => ({
          id: animal.id,
          registryCode: animal.registry_code ?? null,
          name: animal.name,
          sex: animal.sex ?? null,
          locality: animal.locality_label ?? null,
          hatchYear: animal.hatch_year ?? null,
        })),
      };
    }),
  });
}
