import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEXES = new Set(["Unknown", "Male", "Female"]);
const VISIBILITIES = new Set(["private", "public"]);

type IncomingAnimal = {
  id?: unknown;
  name?: unknown;
  sex?: unknown;
  locality?: unknown;
  breederId?: unknown;
  hatchYear?: unknown;
  notes?: unknown;
  damId?: unknown;
  sireId?: unknown;
  visibility?: unknown;
};

type ExistingAnimal = {
  id?: string;
  visibility?: string;
  dam_id?: string | null;
  sire_id?: string | null;
};

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanParent(value: unknown) {
  const text = String(value ?? "").trim();
  return UUID_RE.test(text) ? text : null;
}

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fields = "id,registry_code,name,sex,locality_label,breeder_animal_id,hatch_year,notes,dam_id,sire_id,visibility,photo_path,created_at,updated_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?owner_id=eq.${encodeURIComponent(identity.user.id)}&select=${fields}&order=created_at.asc`, {
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const rows = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Unable to load pedigree", detail: rows }, { status: response.status });

  return NextResponse.json({
    animals: (Array.isArray(rows) ? rows : []).map((row: Record<string, unknown>) => ({
      id: row.id,
      registryCode: row.registry_code,
      name: row.name,
      sex: row.sex,
      locality: row.locality_label,
      breederId: row.breeder_animal_id,
      hatchYear: row.hatch_year == null ? "" : String(row.hatch_year),
      notes: row.notes,
      damId: row.dam_id,
      sireId: row.sire_id,
      visibility: row.visibility,
      photoDataUrl: row.photo_path ? `/api/genetics/pedigree/photo?id=${encodeURIComponent(String(row.id))}` : "",
    })),
  });
}

export async function PATCH(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: unknown; visibility?: unknown } | null;
  const id = String(body?.id ?? "").trim();
  const visibility = String(body?.visibility ?? "").trim();
  if (!UUID_RE.test(id) || !VISIBILITIES.has(visibility)) return NextResponse.json({ error: "Invalid publishing request" }, { status: 400 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(identity.user.id)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ visibility, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });

  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | null;
  if (!response.ok) return NextResponse.json({ error: "Unable to update pedigree visibility", detail: rows }, { status: response.status });
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "Animal not found" }, { status: 404 });

  return NextResponse.json({ ok: true, id, visibility });
}

export async function PUT(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { animals?: IncomingAnimal[] } | null;
  if (!body || !Array.isArray(body.animals)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (body.animals.length > 2000) return NextResponse.json({ error: "Pedigree is too large for one sync." }, { status: 400 });

  const existingResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?owner_id=eq.${encodeURIComponent(identity.user.id)}&select=id,visibility,dam_id,sire_id`, {
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const existingRows = await existingResponse.json().catch(() => null) as ExistingAnimal[] | null;
  if (!existingResponse.ok) return NextResponse.json({ error: "Unable to inspect existing pedigree before sync", detail: existingRows }, { status: existingResponse.status });

  const existingById = new Map((Array.isArray(existingRows) ? existingRows : []).map((row) => [String(row.id), row]));
  const ids = new Set<string>();
  const cleaned = [] as Array<Record<string, unknown>>;

  for (const raw of body.animals) {
    const id = String(raw.id ?? "").trim();
    const name = cleanText(raw.name, 120);
    if (!UUID_RE.test(id) || !name || ids.has(id)) return NextResponse.json({ error: "Invalid or duplicate animal record." }, { status: 400 });
    ids.add(id);

    const current = existingById.get(id);
    const sex = SEXES.has(String(raw.sex)) ? String(raw.sex) : "Unknown";
    const visibility = VISIBILITIES.has(String(raw.visibility)) ? String(raw.visibility) : (current?.visibility && VISIBILITIES.has(current.visibility) ? current.visibility : "private");
    const hatchText = String(raw.hatchYear ?? "").replace(/[^0-9]/g, "").slice(0, 4);
    const hatchYear = hatchText ? Number(hatchText) : null;

    cleaned.push({
      id,
      owner_id: identity.user.id,
      name,
      sex,
      locality_label: cleanText(raw.locality, 120) || "Mixed / Unknown",
      breeder_animal_id: cleanText(raw.breederId, 160),
      hatch_year: hatchYear && hatchYear >= 1900 && hatchYear <= 2200 ? hatchYear : null,
      notes: cleanText(raw.notes, 4000),
      dam_id: cleanParent(raw.damId),
      sire_id: cleanParent(raw.sireId),
      visibility,
      updated_at: new Date().toISOString(),
    });
  }

  // Cross-keeper parent links are managed through the registered-parent linker.
  // If the browser pedigree does not contain that external parent, normal sync must
  // preserve the cloud link instead of silently clearing a breeding agreement.
  for (const row of cleaned) {
    const existing = existingById.get(String(row.id));
    if (!row.dam_id && existing?.dam_id && !ids.has(existing.dam_id)) row.dam_id = existing.dam_id;
    if (!row.sire_id && existing?.sire_id && !ids.has(existing.sire_id)) row.sire_id = existing.sire_id;
  }

  for (const row of cleaned) {
    const dam = row.dam_id as string | null;
    const sire = row.sire_id as string | null;
    const existing = existingById.get(String(row.id));
    const damAllowed = !dam || ids.has(dam) || dam === existing?.dam_id;
    const sireAllowed = !sire || ids.has(sire) || sire === existing?.sire_id;
    if (!damAllowed || !sireAllowed) {
      return NextResponse.json({ error: "Use the registered-parent linker for a parent owned by another keeper." }, { status: 400 });
    }
    if (dam === row.id || sire === row.id) return NextResponse.json({ error: "An animal cannot be its own parent." }, { status: 400 });
  }

  if (cleaned.length) {
    const upsert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(cleaned),
      cache: "no-store",
    });
    if (!upsert.ok) {
      const detail = await upsert.json().catch(() => null);
      return NextResponse.json({ error: "Unable to save pedigree", detail }, { status: upsert.status });
    }
  }

  const deleteFilter = cleaned.length
    ? `&id=not.in.(${cleaned.map((row) => row.id).join(",")})`
    : "";
  const remove = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?owner_id=eq.${encodeURIComponent(identity.user.id)}${deleteFilter}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      Prefer: "return=minimal",
    },
    cache: "no-store",
  });
  if (!remove.ok) {
    const detail = await remove.json().catch(() => null);
    return NextResponse.json({ error: "Pedigree saved, but cleanup failed", detail }, { status: remove.status });
  }

  return NextResponse.json({ ok: true, count: cleaned.length });
}
