import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const storageUrl = `${SUPABASE_AUTH_URL}/storage/v1`;
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

function text(value: FormDataEntryValue | null, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
  return cleaned || "reference-image";
}

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const headers = restHeaders(identity.token);

  const [animalsResponse, mediaResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals?select=*&order=created_at.desc`, { headers, cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?select=id,animal_id,original_name,mime_type,view_type,quality_status,is_primary,file_size_bytes,created_at&order=created_at.asc`, { headers, cache: "no-store" }),
  ]);

  if (!animalsResponse.ok || !mediaResponse.ok) {
    return NextResponse.json({ error: "Snake Sorter reference library unavailable" }, { status: 502 });
  }

  return NextResponse.json({
    animals: await animalsResponse.json(),
    media: await mediaResponse.json(),
  });
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const taxon = text(form.get("taxon"), 80);
  const locality = text(form.get("locality"), 100);
  const lifeStage = text(form.get("life_stage"), 30);
  const neonateColor = text(form.get("neonate_color"), 30);
  const labelConfidence = text(form.get("label_confidence"), 30);
  const purityStatus = text(form.get("purity_status"), 30);
  const sourceType = text(form.get("source_type"), 30);
  const sourceName = text(form.get("source_name"), 160);
  const sourceUrl = text(form.get("source_url"), 1000);
  const animalCode = text(form.get("animal_code"), 100);
  const splitGroup = text(form.get("split_group"), 160);
  const notes = text(form.get("notes"), 4000);
  const trainingEligible = text(form.get("training_eligible"), 10) !== "false";
  const challengeEligible = text(form.get("challenge_eligible"), 10) === "true";
  const rightsStatus = text(form.get("rights_status"), 40) || "unknown";
  const rightsNotes = text(form.get("rights_notes"), 2000);

  const allowedTaxa = new Set(["Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis", "Unknown / review"]);
  const allowedStages = new Set(["hatchling", "neonate", "juvenile", "subadult", "adult", "unknown"]);
  const allowedColors = new Set(["red", "yellow", "not_applicable", "unknown"]);
  const allowedConfidence = new Set(["confirmed", "strong", "provisional", "uncertain"]);
  const allowedPurity = new Set(["known_pure", "believed_pure", "possible_mixed", "hybrid", "unknown"]);
  const allowedSources = new Set(["personal", "breeder", "listing", "publication", "other"]);
  const allowedRights = new Set(["owned_by_owner","permission_granted","private_reference_only","unknown"]);

  if (!allowedTaxa.has(taxon) || !allowedStages.has(lifeStage) || !allowedColors.has(neonateColor) || !allowedConfidence.has(labelConfidence) || !allowedPurity.has(purityStatus) || !allowedSources.has(sourceType) || !allowedRights.has(rightsStatus)) {
    return NextResponse.json({ error: "Invalid reference metadata" }, { status: 400 });
  }

  const headers = {
    ...restHeaders(identity.token),
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const animalResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_animals`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      created_by: identity.user.id,
      animal_code: animalCode || null,
      split_group: splitGroup || null,
      taxon,
      locality: locality || null,
      life_stage: lifeStage,
      neonate_color: neonateColor,
      label_confidence: labelConfidence,
      purity_status: purityStatus,
      source_type: sourceType,
      source_name: sourceName || null,
      source_url: sourceUrl || null,
      notes: notes || null,
      training_eligible: trainingEligible,
      challenge_eligible: challengeEligible,
      rights_status: rightsStatus,
      rights_notes: rightsNotes || null,
    }),
    cache: "no-store",
  });

  if (!animalResponse.ok) {
    const detail = await animalResponse.text();
    return NextResponse.json({ error: "Could not create reference animal", detail: detail.slice(0, 500) }, { status: 400 });
  }

  const animalRows = await animalResponse.json() as Array<{ id: string }>;
  const animal = animalRows[0];
  if (!animal?.id) return NextResponse.json({ error: "Reference animal was not returned" }, { status: 500 });

  const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 12);
  const requestedViews = form.getAll("image_view").map((item) => String(item));
  const allowedViews = new Set(["unknown","full_body","head","dorsal","left_lateral","right_lateral","tail","other","auto"]);
  const uploaded: Array<{ id?: string; name: string }> = [];
  const failed: string[] = [];
  const duplicates: string[] = [];

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    const requestedView = requestedViews[fileIndex] ?? "unknown";
    const viewType = allowedViews.has(requestedView) && requestedView !== "auto" ? requestedView : "unknown";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) {
      failed.push(file.name);
      continue;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const duplicateResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?content_sha256=eq.${sha256}&select=id&limit=1`, {
      headers: restHeaders(identity.token),
      cache: "no-store",
    });
    const duplicateRows = duplicateResponse.ok ? await duplicateResponse.json() as Array<{ id: string }> : [];
    if (duplicateRows.length) {
      duplicates.push(file.name);
      continue;
    }

    const path = `${animal.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const upload = await fetch(`${storageUrl}/object/snake-sorter-reference/${path}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: bytes,
      cache: "no-store",
    });

    if (!upload.ok) {
      failed.push(file.name);
      continue;
    }

    const mediaResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        animal_id: animal.id,
        created_by: identity.user.id,
        storage_path: path,
        original_name: file.name.slice(0, 255),
        mime_type: file.type,
        content_sha256: sha256,
        file_size_bytes: file.size,
        view_type: viewType,
      }),
      cache: "no-store",
    });

    if (mediaResponse.ok) uploaded.push({ name: file.name });
    else {
      await fetch(`${storageUrl}/object/snake-sorter-reference/${path}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` },
        cache: "no-store",
      }).catch(() => undefined);
      failed.push(file.name);
    }
  }

  return NextResponse.json({ ok: true, animalId: animal.id, uploaded: uploaded.length, duplicates, failed }, { status: 201 });
}
