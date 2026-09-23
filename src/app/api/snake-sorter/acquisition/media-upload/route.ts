import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function safeFileName(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
  return cleaned || "candidate-image";
}

function positiveInt(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const candidateId = String(form.get("candidate_id") ?? "").trim();
  const file = form.get("file");
  const perceptualHashRaw = String(form.get("perceptual_hash") ?? "").trim().toLowerCase();
  const perceptualHash = /^[a-f0-9]{8,128}$/.test(perceptualHashRaw) ? perceptualHashRaw : null;
  const galleryIndex = positiveInt(form.get("gallery_index"));
  const galleryTotal = positiveInt(form.get("gallery_total"));
  const sourceMediaUrl = String(form.get("source_media_url") ?? "").trim() || null;
  const subjectRaw = String(form.get("image_subject") ?? "listed_animal").trim();
  const allowedSubjects = new Set([
    "listed_animal", "sire", "dam", "parent_unknown", "clutchmate",
    "multiple_animals", "document", "pedigree", "logo", "advertisement",
    "enclosure", "other", "uncertain",
  ]);
  const imageSubject = allowedSubjects.has(subjectRaw) ? subjectRaw : "uncertain";
  const sourceCaptureKind = String(form.get("source_capture_kind") ?? "screenshot").trim().slice(0, 40) || "screenshot";

  if (!candidateId || !(file instanceof File)) {
    return NextResponse.json({ error: "Candidate and image file are required." }, { status: 400 });
  }
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 415 });
  }
  if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be 15 MB or smaller." }, { status: 413 });
  }

  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  const candidateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}&select=id,source_url,source_type,master_animal_id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const candidates = candidateResponse.ok
    ? await candidateResponse.json() as Array<{id:string;source_url:string;source_type:string;master_animal_id:string|null}>
    : [];
  const candidate = candidates[0];
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");

  const duplicateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?staged_content_sha256=eq.${sha}&select=id,candidate_id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const duplicates = duplicateResponse.ok ? await duplicateResponse.json() as Array<{id:string;candidate_id:string}> : [];
  if (duplicates.length) {
    return NextResponse.json({
      error: duplicates[0].candidate_id === candidateId
        ? "That exact screenshot is already attached to this candidate."
        : "That exact screenshot already belongs to another acquisition candidate and was not duplicated.",
      duplicate_kind: "sha256",
      media_id: duplicates[0].id,
      existing_candidate_id: duplicates[0].candidate_id,
    }, { status: 409 });
  }

  if (perceptualHash) {
    const visualDuplicateResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?perceptual_hash=eq.${encodeURIComponent(perceptualHash)}&select=id,candidate_id&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const visualDuplicates = visualDuplicateResponse.ok
      ? await visualDuplicateResponse.json() as Array<{id:string;candidate_id:string}>
      : [];
    if (visualDuplicates.length) {
      return NextResponse.json({
        error: visualDuplicates[0].candidate_id === candidateId
          ? "That source photograph is already represented for this candidate."
          : "That source photograph is already represented by another acquisition candidate.",
        duplicate_kind: "perceptual_hash",
        media_id: visualDuplicates[0].id,
        existing_candidate_id: visualDuplicates[0].candidate_id,
      }, { status: 409 });
    }
  }

  const orderResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(candidateId)}&select=media_order&order=media_order.desc&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const orderRows = orderResponse.ok ? await orderResponse.json() as Array<{media_order:number}> : [];
  const mediaOrder = Number(orderRows[0]?.media_order ?? -1) + 1;

  const path = `${candidateId}/${String(mediaOrder).padStart(3,"0")}-${randomUUID()}-${safeFileName(file.name)}`;
  const upload = await fetch(
    `${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-acquisition/${storagePath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: bytes,
      cache: "no-store",
    },
  );
  if (!upload.ok) return NextResponse.json({ error: "Could not store candidate screenshot." }, { status: 502 });

  const insert = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media`,
    {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        candidate_id: candidateId,
        source_media_url: sourceMediaUrl,
        source_page_url: candidate.source_url,
        media_order: mediaOrder,
        gallery_index: galleryIndex,
        gallery_total: galleryTotal,
        image_subject: imageSubject,
        source_capture_kind: sourceCaptureKind,
        perceptual_hash: perceptualHash,
        capture_method: sourceCaptureKind === "screenshot" ? "rendered_capture" : "manual_upload",
        rights_status: "metadata_only",
        review_status: "pending",
        quality_status: "unreviewed",
        staged_storage_path: path,
        staged_content_sha256: sha,
        staged_mime_type: file.type,
        staged_bytes: bytes.length,
        staged_at: new Date().toISOString(),
        source_metadata: {
          source_type: candidate.source_type,
          master_animal_id: candidate.master_animal_id,
          original_name: file.name,
          screenshot_import: sourceCaptureKind === "screenshot",
        },
      }),
      cache: "no-store",
    },
  );

  if (!insert.ok) {
    await fetch(
      `${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-acquisition/${storagePath(path)}`,
      { method: "DELETE", headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` }, cache: "no-store" },
    ).catch(() => undefined);
    return NextResponse.json({ error: "Could not attach candidate screenshot." }, { status: 502 });
  }

  await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}`,
    {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ acquisition_stage: "media_collected" }),
      cache: "no-store",
    },
  ).catch(() => undefined);

  const rows = await insert.json() as Array<{id:string}>;
  return NextResponse.json({
    ok: true,
    media_id: rows[0]?.id ?? null,
    sha256: sha,
    perceptual_hash: perceptualHash,
    gallery_index: galleryIndex,
    gallery_total: galleryTotal,
  }, { status: 201 });
}
