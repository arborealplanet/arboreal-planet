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

function positiveInt(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// source_media_url is ALWAYS the listing page URL — never a CDN/image URL
// (contract §7/§10). Screenshots only; no fetching remote image bytes.
function validListingPageUrl(raw: string | null) {
  if (!raw) return true;
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (!url.hostname.toLowerCase().includes("morphmarket")) return false;
    if (/\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(url.pathname + url.search)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Owner session expired or missing. Sign in again, then retry the upload." },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const candidateId = String(form.get("candidate_id") ?? "").trim();
  const file = form.get("file");
  const perceptualHashRaw = String(form.get("perceptual_hash") ?? "").trim();
  const perceptualHash = validPerceptualHash(perceptualHashRaw);
  const galleryIndex = positiveInt(form.get("gallery_index"));
  const galleryTotal = positiveInt(form.get("gallery_total"));
  const sourceMediaUrl = String(form.get("source_media_url") ?? "").trim() || null;
  const subjectRaw = String(form.get("image_subject") ?? "uncertain").trim();
  const imageSubject = IMAGE_SUBJECTS.has(subjectRaw) ? subjectRaw : "uncertain";
  const sourceCaptureKind = String(form.get("source_capture_kind") ?? "screenshot").trim().slice(0, 40) || "screenshot";

  if (!candidateId || !(file instanceof File)) {
    return NextResponse.json({ error: "Candidate and image file are required." }, { status: 400 });
  }
  if (perceptualHashRaw && !perceptualHash) {
    return NextResponse.json(
      { error: "perceptual_hash must be a 64-bit dHash: exactly 16 lowercase hex characters." },
      { status: 400 },
    );
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 415 });
  }
  if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be 15 MB or smaller." }, { status: 413 });
  }
  if ((galleryIndex === null) !== (galleryTotal === null)) {
    return NextResponse.json({ error: "gallery_index and gallery_total must be sent together." }, { status: 400 });
  }
  if (galleryIndex !== null && galleryTotal !== null && galleryIndex > galleryTotal) {
    return NextResponse.json({ error: "gallery_index cannot be larger than gallery_total." }, { status: 400 });
  }
  if (!validListingPageUrl(sourceMediaUrl)) {
    return NextResponse.json(
      { error: "source_media_url must be the MorphMarket listing page URL — never a CDN or image URL." },
      { status: 400 },
    );
  }

  const outcome = await storeScreenshotCapture(
    { supabaseUrl: SUPABASE_AUTH_URL, supabaseKey: SUPABASE_AUTH_KEY },
    identity.token,
    identity.user.id,
    {
    candidateId,
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name,
    galleryIndex,
    galleryTotal,
    perceptualHash,
    imageSubject,
    sourcePageUrl: sourceMediaUrl,
    sourceCaptureKind,
    captureMethod: sourceCaptureKind === "screenshot" ? "rendered_capture" : "manual_upload",
  });

  if (outcome.status === "error") {
    return NextResponse.json({ error: outcome.error }, { status: outcome.httpStatus });
  }
  if (outcome.status === "duplicate") {
    return NextResponse.json({
      error: outcome.message,
      duplicate_kind: outcome.duplicateKind,
      duplicate_of_media_id: outcome.linked ? outcome.mediaId : undefined,
      canonical_photo_id: outcome.canonicalPhotoId,
      media_id: outcome.mediaId,
      existing_candidate_id: outcome.existingCandidateId,
      linked: outcome.linked,
    }, { status: outcome.linked ? 200 : 409 });
  }
  return NextResponse.json({
    ok: true,
    media_id: outcome.mediaId,
    sha256: outcome.sha256,
    perceptual_hash: perceptualHash,
    gallery_index: galleryIndex,
    gallery_total: galleryTotal,
  }, { status: 201 });
}
