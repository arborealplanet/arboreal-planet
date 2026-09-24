// Shared screenshot storage for every Snake Sorter acquisition upload path
// (media-upload, browser-capture, capture-result). One implementation means
// one dedup policy, one gallery-accounting rule, and one rollback guarantee.
//
// Duplicate policy (master prompt §10):
// - Byte-identical or perceptually near-identical (Hamming <= 8 on the
//   64-bit dHash) uploads to the SAME candidate are rejected — the photo is
//   already represented.
// - The same source photo appearing under a DIFFERENT candidate is relist
//   evidence: no new bytes are stored, but a linked media row is created
//   (duplicate_of -> canonical row, shared canonical_photo_id) and an
//   occurrence record is written. Duplicates are linked, not silently dropped.
import { createHash, randomUUID } from "crypto";

export const IMAGE_SUBJECTS = new Set([
  "listed_animal", "sire", "dam", "parent_unknown", "clutchmate",
  "multiple_animals", "document", "pedigree", "logo", "advertisement",
  "enclosure", "other", "uncertain",
]);

export const PERCEPTUAL_DUPLICATE_THRESHOLD = 8;

export function validPerceptualHash(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return /^[a-f0-9]{16}$/.test(normalized) ? normalized : null;
}

const POPCOUNT = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4];
export function hammingDistance(a: string, b: string) {
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    distance += POPCOUNT[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  }
  return distance;
}

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function safeFileName(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
  return cleaned || "screenshot";
}

export type StoreCaptureConfig = {
  /** Supabase project URL (REST + storage). */
  supabaseUrl: string;
  /** Publishable/auth key for the project. */
  supabaseKey: string;
};

export type StoreCaptureInput = {
  candidateId: string;
  bytes: Buffer;
  mimeType: string;
  fileName: string;
  galleryIndex?: number | null;
  galleryTotal?: number | null;
  /** Already validated to 16-char hex, or null. */
  perceptualHash?: string | null;
  /** Allowlisted image_subject, or "uncertain". */
  imageSubject?: string;
  /** Listing page URL — never a CDN/image URL. */
  sourcePageUrl?: string | null;
  sourceCaptureKind: string;
  captureMethod: "rendered_capture" | "manual_upload";
  extraMetadata?: Record<string, unknown>;
};

export type StoreCaptureOutcome =
  | { status: "stored"; mediaId: string; sha256: string; mediaOrder: number }
  | {
      status: "duplicate";
      duplicateKind: "sha256" | "perceptual_hash";
      /** New linked row id when cross-candidate, existing row id when same-candidate. */
      mediaId: string;
      existingCandidateId: string;
      canonicalPhotoId: string | null;
      /** True when a linked row was created (cross-candidate); false when rejected. */
      linked: boolean;
      message: string;
    }
  | { status: "error"; httpStatus: number; error: string };

type DbHeaders = Record<string, string>;

function dbHeaders(config: StoreCaptureConfig, token: string): DbHeaders {
  return {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

type CandidateRow = {
  id: string;
  source_url: string;
  source_type: string;
  master_animal_id: string | null;
  review_status: string | null;
  exclusion_reason: string | null;
};

async function fetchCandidate(config: StoreCaptureConfig, h: DbHeaders, candidateId: string): Promise<CandidateRow | null> {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}&select=id,source_url,source_type,master_animal_id,review_status,exclusion_reason&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const rows = response.ok ? await response.json() as CandidateRow[] : [];
  return rows[0] ?? null;
}

type MediaDupRow = {
  id: string;
  candidate_id: string;
  staged_storage_path: string | null;
  canonical_photo_id: string | null;
  perceptual_hash: string | null;
};

async function recordOccurrence(
  config: StoreCaptureConfig,
  h: DbHeaders,
  args: {
    canonicalMediaId: string;
    observedCandidateId: string;
    observedMediaId: string | null;
    detectionKind: "sha256" | "perceptual_hash";
    hammingDistance: number | null;
    detectedBy: string;
  },
) {
  // Best effort: occurrence evidence must never fail the upload itself.
  await fetch(
    `${config.supabaseUrl}/rest/v1/snake_sorter_media_occurrences?on_conflict=canonical_media_id,observed_candidate_id,detection_kind`,
    {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        canonical_media_id: args.canonicalMediaId,
        observed_candidate_id: args.observedCandidateId,
        observed_media_id: args.observedMediaId,
        detection_kind: args.detectionKind,
        hamming_distance: args.hammingDistance,
        detected_by: args.detectedBy,
      }),
      cache: "no-store",
    },
  ).catch(() => undefined);
}

async function insertMediaRow(
  config: StoreCaptureConfig,
  h: DbHeaders,
  row: Record<string, unknown>,
): Promise<{ id: string; canonical_photo_id: string | null } | null> {
  const insert = await fetch(
    `${config.supabaseUrl}/rest/v1/snake_sorter_acquisition_media`,
    {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(row),
      cache: "no-store",
    },
  );
  if (!insert.ok) return null;
  const rows = await insert.json() as Array<{ id: string; canonical_photo_id: string | null }>;
  return rows[0] ?? null;
}

async function selfLinkCanonical(config: StoreCaptureConfig, h: DbHeaders, mediaId: string) {
  await fetch(
    `${config.supabaseUrl}/rest/v1/snake_sorter_acquisition_media?id=eq.${encodeURIComponent(mediaId)}&canonical_photo_id=is.null&duplicate_of=is.null`,
    {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ canonical_photo_id: mediaId }),
      cache: "no-store",
    },
  ).catch(() => undefined);
}

async function bumpCandidateStage(config: StoreCaptureConfig, h: DbHeaders, candidateId: string) {
  await fetch(
    `${config.supabaseUrl}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}`,
    {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ acquisition_stage: "media_collected" }),
      cache: "no-store",
    },
  ).catch(() => undefined);
}

export async function storeScreenshotCapture(
  config: StoreCaptureConfig,
  token: string,
  userId: string,
  input: StoreCaptureInput,
): Promise<StoreCaptureOutcome> {
  const h = dbHeaders(config, token);
  const galleryIndex = input.galleryIndex ?? null;
  const galleryTotal = input.galleryTotal ?? null;

  if ((galleryIndex === null) !== (galleryTotal === null)) {
    return { status: "error", httpStatus: 400, error: "gallery_index and gallery_total must be sent together." };
  }
  if (galleryIndex !== null && galleryTotal !== null && galleryIndex > galleryTotal) {
    return { status: "error", httpStatus: 400, error: "gallery_index cannot be larger than gallery_total." };
  }
  const imageSubject = input.imageSubject && IMAGE_SUBJECTS.has(input.imageSubject)
    ? input.imageSubject
    : "uncertain";

  const candidate = await fetchCandidate(config, h, input.candidateId);
  if (!candidate) return { status: "error", httpStatus: 404, error: "Candidate not found." };
  if (candidate.review_status === "rejected" || candidate.exclusion_reason) {
    return {
      status: "error",
      httpStatus: 409,
      error: "This candidate was rejected or excluded, so it cannot accept screenshots.",
    };
  }

  const sha = createHash("sha256").update(input.bytes).digest("hex");

  const handleDuplicate = async (
    existing: MediaDupRow,
    kind: "sha256" | "perceptual_hash",
    distance: number | null,
  ): Promise<StoreCaptureOutcome> => {
    const canonicalPhotoId = existing.canonical_photo_id ?? existing.id;
    if (existing.candidate_id === input.candidateId) {
      await recordOccurrence(config, h, {
        canonicalMediaId: existing.id,
        observedCandidateId: input.candidateId,
        observedMediaId: existing.id,
        detectionKind: kind,
        hammingDistance: distance,
        detectedBy: userId,
      });
      return {
        status: "duplicate",
        duplicateKind: kind,
        mediaId: existing.id,
        existingCandidateId: existing.candidate_id,
        canonicalPhotoId,
        linked: false,
        message: kind === "sha256"
          ? "That exact screenshot is already attached to this candidate."
          : "That source photograph is already represented for this candidate.",
      };
    }
    // Cross-candidate: same photo under another listing is relist evidence.
    // Store no new bytes — link a row to the canonical photo instead.
    const linked = await insertMediaRow(config, h, {
      candidate_id: input.candidateId,
      source_media_url: input.sourcePageUrl ?? candidate.source_url,
      source_page_url: input.sourcePageUrl ?? candidate.source_url,
      gallery_index: galleryIndex,
      gallery_total: galleryTotal,
      image_subject: imageSubject,
      source_capture_kind: input.sourceCaptureKind,
      perceptual_hash: input.perceptualHash ?? existing.perceptual_hash,
      capture_method: input.captureMethod,
      rights_status: "metadata_only",
      review_status: "pending",
      quality_status: "unreviewed",
      staged_storage_path: existing.staged_storage_path,
      staged_content_sha256: sha,
      staged_mime_type: input.mimeType,
      staged_bytes: input.bytes.length,
      staged_at: new Date().toISOString(),
      duplicate_of: existing.id,
      canonical_photo_id: canonicalPhotoId,
      source_metadata: {
        source_type: candidate.source_type,
        master_animal_id: candidate.master_animal_id,
        original_name: input.fileName,
        duplicate_link: true,
        duplicate_kind: kind,
        ...(input.extraMetadata ?? {}),
      },
    });
    if (!linked) {
      return { status: "error", httpStatus: 502, error: "Could not link the duplicate screenshot." };
    }
    await recordOccurrence(config, h, {
      canonicalMediaId: existing.id,
      observedCandidateId: input.candidateId,
      observedMediaId: linked.id,
      detectionKind: kind,
      hammingDistance: distance,
      detectedBy: userId,
    });
    await bumpCandidateStage(config, h, input.candidateId);
    return {
      status: "duplicate",
      duplicateKind: kind,
      mediaId: linked.id,
      existingCandidateId: existing.candidate_id,
      canonicalPhotoId,
      linked: true,
      message: "That source photograph is already represented by another acquisition candidate; the listing was linked to the canonical photo instead of storing it twice.",
    };
  };

  // Exact byte match.
  const shaLookup = await fetch(
    `${config.supabaseUrl}/rest/v1/snake_sorter_acquisition_media?staged_content_sha256=eq.${sha}&select=id,candidate_id,staged_storage_path,canonical_photo_id,perceptual_hash&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const shaHits = shaLookup.ok ? await shaLookup.json() as MediaDupRow[] : [];
  if (shaHits.length) return handleDuplicate(shaHits[0], "sha256", 0);

  // Perceptual near-match: resizes, recompressions, and slight crops of the
  // same source photo must be caught, not just byte-identical files.
  if (input.perceptualHash) {
    const scan = await fetch(
      `${config.supabaseUrl}/rest/v1/snake_sorter_acquisition_media?perceptual_hash=not.is.null&select=id,candidate_id,staged_storage_path,canonical_photo_id,perceptual_hash&limit=5000`,
      { headers: h, cache: "no-store" },
    );
    const rows = scan.ok ? await scan.json() as MediaDupRow[] : [];
    const near = rows.find((row) =>
      typeof row.perceptual_hash === "string"
      && row.perceptual_hash.length === 16
      && hammingDistance(row.perceptual_hash, input.perceptualHash as string) <= PERCEPTUAL_DUPLICATE_THRESHOLD,
    );
    if (near) {
      return handleDuplicate(
        near,
        "perceptual_hash",
        hammingDistance(near.perceptual_hash as string, input.perceptualHash),
      );
    }
  }

  const orderLookup = await fetch(
    `${config.supabaseUrl}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(input.candidateId)}&select=media_order&order=media_order.desc&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const orderRows = orderLookup.ok ? await orderLookup.json() as Array<{ media_order: number }> : [];
  const mediaOrder = Number(orderRows[0]?.media_order ?? -1) + 1;

  const path = `${input.candidateId}/${String(mediaOrder).padStart(3, "0")}-${randomUUID()}-${safeFileName(input.fileName)}`;
  const upload = await fetch(
    `${config.supabaseUrl}/storage/v1/object/snake-sorter-acquisition/${storagePath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": input.mimeType,
        "x-upsert": "false",
      },
      body: input.bytes.buffer.slice(
        input.bytes.byteOffset,
        input.bytes.byteOffset + input.bytes.byteLength,
      ) as ArrayBuffer,
      cache: "no-store",
    },
  );
  if (!upload.ok) {
    return { status: "error", httpStatus: 502, error: "Could not store candidate screenshot." };
  }

  const row = await insertMediaRow(config, h, {
    candidate_id: input.candidateId,
    source_media_url: input.sourcePageUrl ?? candidate.source_url,
    source_page_url: input.sourcePageUrl ?? candidate.source_url,
    media_order: mediaOrder,
    gallery_index: galleryIndex,
    gallery_total: galleryTotal,
    image_subject: imageSubject,
    source_capture_kind: input.sourceCaptureKind,
    perceptual_hash: input.perceptualHash,
    capture_method: input.captureMethod,
    rights_status: "metadata_only",
    review_status: "pending",
    quality_status: "unreviewed",
    staged_storage_path: path,
    staged_content_sha256: sha,
    staged_mime_type: input.mimeType,
    staged_bytes: input.bytes.length,
    staged_at: new Date().toISOString(),
    source_metadata: {
      source_type: candidate.source_type,
      master_animal_id: candidate.master_animal_id,
      original_name: input.fileName,
      ...(input.extraMetadata ?? {}),
    },
  });

  if (!row) {
    // Roll back the storage object so no row ever points at deleted bytes and
    // no orphaned bytes linger without a row.
    await fetch(
      `${config.supabaseUrl}/storage/v1/object/snake-sorter-acquisition/${storagePath(path)}`,
      { method: "DELETE", headers: dbHeaders(config, token), cache: "no-store" },
    ).catch(() => undefined);
    return { status: "error", httpStatus: 502, error: "Could not attach candidate screenshot." };
  }

  await selfLinkCanonical(config, h, row.id);
  await bumpCandidateStage(config, h, input.candidateId);
  return { status: "stored", mediaId: row.id, sha256: sha, mediaOrder };
}

/** Gallery accounting: which expected slots have no media, per listing. */
export function missingGallerySlots(media: Array<{ gallery_index: number | null; gallery_total: number | null }>) {
  const total = media.map((m) => m.gallery_total).find((t) => t !== null && t !== undefined) ?? null;
  if (total === null) return { gallery_total: null as number | null, missing: [] as number[], inaccessible: [] as number[] };
  const captured = new Set(
    media.map((m) => m.gallery_index).filter((i): i is number => i !== null && i !== undefined),
  );
  const missing: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (!captured.has(i)) missing.push(i);
  }
  return { gallery_total: total, missing, inaccessible: [] as number[] };
}
