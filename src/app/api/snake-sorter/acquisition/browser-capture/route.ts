import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import {
  IMAGE_SUBJECTS,
  storeScreenshotCapture,
  validPerceptualHash,
} from "@/lib/snake-sorter/capture-store";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

/**
 * Browser-helper capture adapter. Accepts the extension's base64 JSON
 * payload (the extension cannot build multipart form data easily) and stores
 * it through the shared capture pipeline: same dedup, same gallery
 * accounting, same rollback guarantees as media-upload.
 */
export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Owner session expired or missing. Sign in again, then retry." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const candidateId = String(body.candidate_id ?? "").trim();
  const sourceUrl = String(body.source_url ?? "").trim().slice(0, 1000) || null;
  const mimeType = String(body.mime_type ?? "image/jpeg").trim();
  const base64 = String(body.image_base64 ?? "").trim();
  const perceptualHashRaw = String(body.perceptual_hash ?? "").trim();
  const perceptualHash = validPerceptualHash(perceptualHashRaw);
  const subjectRaw = String(body.image_subject ?? "uncertain").trim();
  const imageSubject = IMAGE_SUBJECTS.has(subjectRaw) ? subjectRaw : "uncertain";
  const galleryIndexRaw = Number(body.gallery_index ?? NaN);
  const galleryTotalRaw = Number(body.gallery_total ?? NaN);
  const galleryIndex = Number.isInteger(galleryIndexRaw) && galleryIndexRaw > 0 ? galleryIndexRaw : null;
  const galleryTotal = Number.isInteger(galleryTotalRaw) && galleryTotalRaw > 0 ? galleryTotalRaw : null;

  if (!candidateId || !base64) {
    return NextResponse.json({ error: "Candidate id and captured image are required." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return NextResponse.json({ error: "Captured image must be JPEG, PNG, or WebP." }, { status: 415 });
  }
  if (perceptualHashRaw && !perceptualHash) {
    return NextResponse.json(
      { error: "perceptual_hash must be a 64-bit dHash: exactly 16 lowercase hex characters." },
      { status: 400 },
    );
  }
  if ((galleryIndex === null) !== (galleryTotal === null)) {
    return NextResponse.json({ error: "gallery_index and gallery_total must be sent together." }, { status: 400 });
  }
  if (galleryIndex !== null && galleryTotal !== null && galleryIndex > galleryTotal) {
    return NextResponse.json({ error: "gallery_index cannot be larger than gallery_total." }, { status: 400 });
  }
  if (base64.length > 3_500_000) {
    return NextResponse.json({ error: "Captured image payload is too large." }, { status: 413 });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    return NextResponse.json({ error: "Captured image payload is invalid." }, { status: 400 });
  }
  if (!bytes.length || bytes.length > 2_500_000) {
    return NextResponse.json({ error: "Captured image must be 2.5 MB or smaller." }, { status: 413 });
  }

  const outcome = await storeScreenshotCapture(
    { supabaseUrl: SUPABASE_AUTH_URL, supabaseKey: SUPABASE_AUTH_KEY },
    identity.token,
    identity.user.id,
    {
    candidateId,
    bytes,
    mimeType,
    fileName: `browser-capture.${mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"}`,
    galleryIndex,
    galleryTotal,
    perceptualHash,
    imageSubject,
    sourcePageUrl: sourceUrl,
    sourceCaptureKind: "browser_helper_capture",
    captureMethod: "rendered_capture",
    extraMetadata: { browser_helper_capture: true, browser_helper_capture_version: 1 },
  });

  if (outcome.status === "error") {
    return NextResponse.json({ error: outcome.error }, { status: outcome.httpStatus });
  }
  if (outcome.status === "duplicate") {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      duplicate_kind: outcome.duplicateKind,
      media_id: outcome.mediaId,
      existing_candidate_id: outcome.existingCandidateId,
      canonical_photo_id: outcome.canonicalPhotoId,
      linked: outcome.linked,
    });
  }
  return NextResponse.json({ ok: true, duplicate: false, media_id: outcome.mediaId }, { status: 201 });
}
