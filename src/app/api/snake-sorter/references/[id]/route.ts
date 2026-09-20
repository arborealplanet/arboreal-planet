import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const storageUrl = `${SUPABASE_AUTH_URL}/storage/v1`;
const authHeaders = (token: string) => ({ apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" });

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

function clean(value: unknown, max = 1000) { return String(value ?? "").trim().slice(0, max); }
function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
  return cleaned || "reference-image";
}

const taxa = new Set(["Morelia azurea azurea","Morelia azurea pulcher","Morelia azurea utaraensis","Morelia viridis","Unknown / review"]);
const stages = new Set(["hatchling","neonate","juvenile","subadult","adult","unknown"]);
const colors = new Set(["red","yellow","not_applicable","unknown"]);
const confidences = new Set(["confirmed","strong","provisional","uncertain"]);
const purities = new Set(["known_pure","believed_pure","possible_mixed","hybrid","unknown"]);
const sources = new Set(["personal","breeder","listing","publication","other"]);
const reviews = new Set(["pending","approved","hold","rejected"]);
const splits = new Set(["unassigned","train","validation","test"]);
const rights = new Set(["owned_by_owner","permission_granted","private_reference_only","unknown"]);

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await context.params;
  const h = authHeaders(identity.token);
  const [animalResponse, mediaResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?id=eq.${encodeURIComponent(id)}&select=*`, { headers: h, cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?animal_id=eq.${encodeURIComponent(id)}&select=id,animal_id,original_name,mime_type,notes,view_type,quality_status,is_primary,life_stage_override,neonate_color_override,capture_date,approximate_age_days,created_at&order=created_at.asc`, { headers: h, cache: "no-store" }),
  ]);
  if (!animalResponse.ok || !mediaResponse.ok) return NextResponse.json({ error: "Reference record unavailable" }, { status: 502 });
  const animals = await animalResponse.json() as Array<Record<string, unknown>>;
  if (!animals[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const media = await mediaResponse.json() as Array<Record<string, unknown>>;
  return NextResponse.json({ animal: animals[0], media: media.map((item) => ({ ...item, url: `/api/snake-sorter/media/${item.id}` })) });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  const taxon = clean(body.taxon, 80);
  const lifeStage = clean(body.life_stage, 30);
  const neonateColor = clean(body.neonate_color, 30);
  const labelConfidence = clean(body.label_confidence, 30);
  const purityStatus = clean(body.purity_status, 30);
  const sourceType = clean(body.source_type, 30);
  const reviewStatus = clean(body.review_status, 30);
  const datasetSplit = clean(body.dataset_split, 30);
  const rightsStatus = clean(body.rights_status, 40) || "unknown";

  if (!taxa.has(taxon) || !stages.has(lifeStage) || !colors.has(neonateColor) || !confidences.has(labelConfidence) || !purities.has(purityStatus) || !sources.has(sourceType) || !reviews.has(reviewStatus) || !splits.has(datasetSplit) || !rights.has(rightsStatus)) {
    return NextResponse.json({ error: "Invalid reference metadata" }, { status: 400 });
  }

  const payload = {
    taxon,
    locality: clean(body.locality, 100) || null,
    life_stage: lifeStage,
    neonate_color: neonateColor,
    label_confidence: labelConfidence,
    purity_status: purityStatus,
    source_type: sourceType,
    source_name: clean(body.source_name, 160) || null,
    source_url: clean(body.source_url, 1000) || null,
    animal_code: clean(body.animal_code, 100) || null,
    split_group: clean(body.split_group, 160) || null,
    notes: clean(body.notes, 4000) || null,
    review_status: reviewStatus,
    review_notes: clean(body.review_notes, 4000) || null,
    dataset_split: datasetSplit,
    training_eligible: Boolean(body.training_eligible),
    rights_status: rightsStatus,
    rights_notes: clean(body.rights_notes, 2000) || null,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...authHeaders(identity.token), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not update reference animal" }, { status: 400 });
  const rows = await response.json();
  return NextResponse.json({ ok: true, animal: rows[0] ?? null });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await context.params;

  const verify = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?id=eq.${encodeURIComponent(id)}&select=id`, { headers: authHeaders(identity.token), cache: "no-store" });
  const rows = verify.ok ? await verify.json() as Array<{ id: string }> : [];
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 20);
  if (!files.length) return NextResponse.json({ error: "Choose at least one image" }, { status: 400 });

  const h = { ...authHeaders(identity.token), "Content-Type": "application/json", Prefer: "return=representation" };
  let uploaded = 0;
  const failed: string[] = [];
  const duplicates: string[] = [];

  for (const file of files) {
    if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) { failed.push(file.name); continue; }
    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const duplicateResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?content_sha256=eq.${sha256}&select=id&limit=1`, {
      headers: authHeaders(identity.token),
      cache: "no-store",
    });
    const duplicateRows = duplicateResponse.ok ? await duplicateResponse.json() as Array<{ id: string }> : [];
    if (duplicateRows.length) { duplicates.push(file.name); continue; }

    const path = `${id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const upload = await fetch(`${storageUrl}/object/snake-sorter-reference/${path}`, {
      method: "POST",
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": file.type, "x-upsert": "false" },
      body: bytes,
      cache: "no-store",
    });
    if (!upload.ok) { failed.push(file.name); continue; }
    const mediaResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ animal_id: id, created_by: identity.user.id, storage_path: path, original_name: file.name.slice(0,255), mime_type: file.type, content_sha256: sha256, file_size_bytes: file.size }),
      cache: "no-store",
    });
    if (mediaResponse.ok) uploaded += 1;
    else {
      await fetch(`${storageUrl}/object/snake-sorter-reference/${path}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` },
        cache: "no-store",
      }).catch(() => undefined);
      failed.push(file.name);
    }
  }

  return NextResponse.json({ ok: true, uploaded, duplicates, failed });
}
