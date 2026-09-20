import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const restHeaders = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

async function fetchPaged<T>(
  path: string,
  token: string,
  pageSize = 1000,
  maxRows = 100_000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/${path}${separator}limit=${pageSize}&offset=${offset}`,
      {
        headers: restHeaders(token),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new Error(`Preflight lookup failed with HTTP ${response.status}`);
    }
    const batch = await response.json() as T[];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  throw new Error("Preflight lookup exceeded the safety row limit.");
}

function cleanCode(value: unknown) {
  return String(value ?? "").trim().slice(0, 100);
}

function cleanHash(value: unknown) {
  const hash = String(value ?? "").trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(hash) ? hash : "";
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as {
    animal_codes?: unknown[];
    files?: Array<{ name?: unknown; sha256?: unknown }>;
  };

  const animalCodes = [...new Set(
    (Array.isArray(body.animal_codes) ? body.animal_codes : [])
      .map(cleanCode)
      .filter(Boolean),
  )];

  const files = (Array.isArray(body.files) ? body.files : [])
    .map((item) => ({
      name: String(item?.name ?? "").trim().slice(0, 255),
      sha256: cleanHash(item?.sha256),
    }))
    .filter((item) => item.name && item.sha256);

  if (animalCodes.length > 500 || files.length > 5000) {
    return NextResponse.json({ error: "Preflight batch is too large." }, { status: 413 });
  }

  if (!animalCodes.length || !files.length) {
    return NextResponse.json({ error: "Animal codes and file hashes are required." }, { status: 400 });
  }

  try {
    const [existingAnimals, existingMedia] = await Promise.all([
      fetchPaged<{ animal_code: string | null }>(
        "snake_sorter_reference_animals?select=animal_code&animal_code=not.is.null",
        identity.token,
      ),
      fetchPaged<{ id: string; animal_id: string; original_name: string | null; content_sha256: string | null }>(
        "snake_sorter_reference_media?select=id,animal_id,original_name,content_sha256&content_sha256=not.is.null",
        identity.token,
      ),
    ]);

    const requestedCodes = new Set(animalCodes);
    const existingAnimalCodes = existingAnimals
      .map((row) => row.animal_code?.trim() || "")
      .filter((code) => requestedCodes.has(code));

    const requestedHashes = new Map<string, string[]>();
    for (const file of files) {
      const names = requestedHashes.get(file.sha256) ?? [];
      names.push(file.name);
      requestedHashes.set(file.sha256, names);
    }

    const duplicateWithinBatch = [...requestedHashes.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([sha256, names]) => ({ sha256, names }));

    const duplicateExisting = existingMedia
      .filter((row) => row.content_sha256 && requestedHashes.has(row.content_sha256))
      .map((row) => ({
        sha256: row.content_sha256 as string,
        selected_names: requestedHashes.get(row.content_sha256 as string) ?? [],
        existing_media_id: row.id,
        existing_animal_id: row.animal_id,
        existing_name: row.original_name,
      }));

    return NextResponse.json({
      ok: true,
      existing_animal_codes: [...new Set(existingAnimalCodes)].sort(),
      duplicate_existing_files: duplicateExisting,
      duplicate_within_batch: duplicateWithinBatch,
      checked: {
        animals: animalCodes.length,
        files: files.length,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Could not complete bulk-import preflight.",
      detail: error instanceof Error ? error.message : "Unknown preflight error.",
    }, { status: 502 });
  }
}
