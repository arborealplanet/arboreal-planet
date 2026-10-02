import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const runtime = "nodejs";

/**
 * Chunked large-file upload for Snake Sorter contributions.
 *
 * Vercel's serverless functions reject any request body over ~4.5 MB at the
 * edge (413) before our code runs — so a phone photo or any video dies with
 * a bare "Upload failed." This route works around it: the browser slices
 * the file into 4 MB pieces, and this route relays each piece into
 * Supabase Storage via the TUS resumable-upload protocol using the
 * contributor's own JWT (never exposed to the browser). Supabase buffers
 * sub-6MB PATCH bodies server-side, so 4 MB relay chunks are fine.
 *
 * Phases (?phase=):
 *   init     JSON {name, mime_type, size} -> {uploadId, uploadUrl, path}
 *   chunk    raw bytes + x-upload-url / x-upload-offset -> {offset}
 *   complete JSON {uploadUrl, path, name, mime_type, size, consent, ...guesses}
 *            verifies the TUS upload is whole, then records the contribution.
 *   frames   FormData {contribution_id, frames: File[]} — small auto-extracted
 *            JPEGs stored at <uid>/frames/<contributionId>/ for the Sorter to
 *            use directly; the original file stays untouched as the archive.
 */

const storageUrl = `${SUPABASE_AUTH_URL}/storage/v1`;
const BUCKET = "snake-sorter-contributions";
const CHUNK_SIZE = 4 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB — 30 s of 8K with headroom

const TAXA = new Set(["Morelia azurea azurea", "Morelia azurea pulcher", "Morelia azurea utaraensis", "Morelia viridis", "Unknown / review"]);
const STAGES = new Set(["hatchling", "neonate", "juvenile", "subadult", "adult", "unknown"]);
const CONTRIBUTION_VIEWS = new Set(["unknown", "full_body", "head", "dorsal", "left_lateral", "right_lateral", "tail", "other", "mixed"]);

function text(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
  return cleaned || "contribution";
}

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function b64(s: string) {
  return Buffer.from(s, "utf8").toString("base64");
}

type Identity = Awaited<ReturnType<typeof getServerIdentity>>;

async function contributorIdentity(): Promise<NonNullable<Identity> | null> {
  const identity = await getServerIdentity();
  if (!identity) return null;
  return identity;
}

function tusHeaders(token: string) {
  return {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${token}`,
    "Tus-Resumable": "1.0.0",
  };
}

function checkTypeAndSize(mime: string, size: number): string | null {
  const isImage = IMAGE_TYPES.has(mime);
  const isVideo = VIDEO_TYPES.has(mime);
  if (!isImage && !isVideo) return "Use JPEG, PNG, WebP images or MP4/WebM/MOV videos.";
  const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (!Number.isFinite(size) || size <= 0) return "Invalid file size.";
  if (size > limit) {
    return isImage
      ? "Image must be 15 MB or smaller."
      : "Video must be 1 GB or smaller.";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const identity = await contributorIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const phase = new URL(request.url).searchParams.get("phase");

  // ---- init: create the TUS upload server-side, hand the browser the URL ----
  if (phase === "init") {
    const body = await request.json().catch(() => null) as { name?: unknown; mime_type?: unknown; size?: unknown } | null;
    const name = text(body?.name, 255);
    const mime = text(body?.mime_type, 100);
    const size = Number(body?.size);
    const typeError = checkTypeAndSize(mime, size);
    if (!name || typeError) {
      return NextResponse.json({ error: typeError ?? "Invalid upload request." }, { status: 400 });
    }
    const path = `${identity.user.id}/${randomUUID()}-${safeFileName(name)}`;
    const create = await fetch(`${storageUrl}/upload/resumable`, {
      method: "POST",
      headers: {
        ...tusHeaders(identity.token),
        "Upload-Length": String(size),
        "Upload-Metadata":
          `bucketName ${b64(BUCKET)},` +
          `objectName ${b64(path)},` +
          `contentType ${b64(mime)},` +
          `cacheControl ${b64("3600")}`,
        "x-upsert": "false",
      },
      cache: "no-store",
    });
    if (!create.ok) {
      const detail = await create.text().catch(() => "");
      return NextResponse.json({ error: "Could not start chunked upload.", detail: detail.slice(0, 200) }, { status: 502 });
    }
    const uploadUrl = create.headers.get("location");
    if (!uploadUrl) return NextResponse.json({ error: "Upload session was not returned." }, { status: 502 });
    return NextResponse.json({ uploadId: randomUUID(), uploadUrl, path, chunkSize: CHUNK_SIZE });
  }

  // ---- chunk: relay one piece into the TUS upload ----
  if (phase === "chunk") {
    const uploadUrl = request.headers.get("x-upload-url") ?? "";
    const offset = Number(request.headers.get("x-upload-offset"));
    if (!uploadUrl.startsWith(`${storageUrl}/upload/resumable`)) {
      return NextResponse.json({ error: "Invalid upload session." }, { status: 400 });
    }
    if (!Number.isFinite(offset) || offset < 0) {
      return NextResponse.json({ error: "Invalid chunk offset." }, { status: 400 });
    }
    const bytes = Buffer.from(await request.arrayBuffer().catch(() => new ArrayBuffer(0)));
    if (!bytes.length || bytes.length > CHUNK_SIZE + 1024) {
      return NextResponse.json({ error: "Invalid chunk size." }, { status: 400 });
    }
    const patch = await fetch(uploadUrl, {
      method: "PATCH",
      headers: {
        ...tusHeaders(identity.token),
        "Upload-Offset": String(offset),
        "Content-Type": "application/offset+octet-stream",
      },
      body: bytes,
      cache: "no-store",
    });
    if (!patch.ok) {
      const detail = await patch.text().catch(() => "");
      return NextResponse.json({ error: "Chunk upload failed.", detail: detail.slice(0, 200) }, { status: 502 });
    }
    const newOffset = Number(patch.headers.get("upload-offset"));
    return NextResponse.json({ offset: Number.isFinite(newOffset) ? newOffset : offset + bytes.length });
  }

  // ---- complete: verify the upload is whole, then record the contribution ----
  if (phase === "complete") {
    const body = await request.json().catch(() => null) as {
      uploadUrl?: unknown; path?: unknown; name?: unknown; mime_type?: unknown; size?: unknown;
      consent?: unknown; taxon_guess?: unknown; life_stage_guess?: unknown; view_type_guess?: unknown;
      provenance_hint?: unknown; notes?: unknown;
    } | null;
    const uploadUrl = text(body?.uploadUrl, 2000);
    const path = text(body?.path, 500);
    const name = text(body?.name, 255);
    const mime = text(body?.mime_type, 100);
    const size = Number(body?.size);
    if (!uploadUrl.startsWith(`${storageUrl}/upload/resumable`)) {
      return NextResponse.json({ error: "Invalid upload session." }, { status: 400 });
    }
    const expectedPrefix = `${identity.user.id}/`;
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
    }
    const typeError = checkTypeAndSize(mime, size);
    if (!name || typeError) {
      return NextResponse.json({ error: typeError ?? "Invalid upload request." }, { status: 400 });
    }
    if (String(body?.consent ?? "") !== "true") {
      return NextResponse.json({ error: "You must grant permission for these media to be used in the Snake Sorter dataset." }, { status: 400 });
    }
    const taxonGuess = text(body?.taxon_guess, 80);
    const lifeStageGuess = text(body?.life_stage_guess, 30);
    const viewTypeGuess = text(body?.view_type_guess, 30);
    const provenanceHint = text(body?.provenance_hint, 200);
    const notes = text(body?.notes, 2000);
    if (taxonGuess && !TAXA.has(taxonGuess)) return NextResponse.json({ error: "Invalid taxon guess." }, { status: 400 });
    if (lifeStageGuess && !STAGES.has(lifeStageGuess)) return NextResponse.json({ error: "Invalid life stage." }, { status: 400 });
    if (viewTypeGuess && !CONTRIBUTION_VIEWS.has(viewTypeGuess)) return NextResponse.json({ error: "Invalid view type." }, { status: 400 });

    // Verify the TUS upload actually received every byte.
    const head = await fetch(uploadUrl, {
      method: "HEAD",
      headers: tusHeaders(identity.token),
      cache: "no-store",
    });
    const finalOffset = Number(head.headers.get("upload-offset"));
    if (!head.ok || finalOffset !== size) {
      return NextResponse.json({ error: "Upload is incomplete — please retry." }, { status: 400 });
    }

    // Confirm the finished object exists at the claimed path (inside the
    // contributor's own folder) before recording it.
    const exists = await fetch(`${storageUrl}/object/authenticated/${BUCKET}/${storagePath(path)}`, {
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        Range: "bytes=0-0",
      },
      cache: "no-store",
    }).catch(() => null);
    if (!exists || !exists.ok) {
      try { await exists?.body?.cancel(); } catch {}
      return NextResponse.json({ error: "Uploaded file not found — please retry." }, { status: 400 });
    }
    try { await exists.body?.cancel(); } catch {}

    const h = {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      Accept: "application/json",
    };
    const isImage = IMAGE_TYPES.has(mime);
    // Weak fingerprint for chunked uploads (full sha256 would need the bytes
    // server-side): catches re-uploading the exact same file.
    const fingerprint = `chunked:${createHash("sha256").update(`${name}:${size}`).digest("hex")}`;

    const dup = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?contributor_user_id=eq.${encodeURIComponent(identity.user.id)}&content_sha256=eq.${fingerprint}&status=in.(pending_review,approved)&select=id&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const dupRows = dup.ok ? await dup.json() as Array<{ id: string }> : [];
    if (dupRows.length) {
      return NextResponse.json({ rejected: [{ name, reason: "This exact file was already contributed." }] }, { status: 409 });
    }

    const insert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        contributor_user_id: identity.user.id,
        media_type: isImage ? "image" : "video",
        storage_path: path,
        original_name: name.slice(0, 255),
        mime_type: mime,
        content_sha256: fingerprint,
        file_size_bytes: size,
        status: "pending_review",
        taxon_guess: taxonGuess || null,
        life_stage_guess: lifeStageGuess || null,
        view_type_guess: viewTypeGuess || null,
        provenance_hint: provenanceHint || null,
        notes: notes || null,
      }),
      cache: "no-store",
    });
    if (!insert.ok) {
      const detail = await insert.text().catch(() => "");
      return NextResponse.json({ error: "Could not record contribution.", detail: detail.slice(0, 160) }, { status: 400 });
    }
    const rows = await insert.json() as Array<{ id: string }>;
    const id = rows[0]?.id ?? "";
    if (!id) return NextResponse.json({ error: "Contribution was not returned." }, { status: 500 });
    return NextResponse.json({ ok: true, accepted: [{ id, name, media_type: isImage ? "image" : "video" }] }, { status: 201 });
  }

  // ---- frames: small auto-extracted JPEGs the Sorter can use directly ----
  if (phase === "frames") {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid frames request." }, { status: 400 });
    const contributionId = text(form.get("contribution_id"), 100);
    if (!/^[0-9a-f-]{36}$/i.test(contributionId)) {
      return NextResponse.json({ error: "Invalid contribution." }, { status: 400 });
    }
    const h = {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      Accept: "application/json",
    };
    const lookup = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?id=eq.${encodeURIComponent(contributionId)}&select=contributor_user_id,media_type&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const row = (lookup.ok ? await lookup.json() as Array<{ contributor_user_id: string; media_type: string }> : [])[0];
    if (!row || row.contributor_user_id !== identity.user.id || row.media_type !== "video") {
      return NextResponse.json({ error: "Contribution not found." }, { status: 404 });
    }
    const frames = form.getAll("frames").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 16);
    let stored = 0;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame.type !== "image/jpeg" || frame.size > 2 * 1024 * 1024) continue;
      const bytes = Buffer.from(await frame.arrayBuffer());
      const framePath = `${identity.user.id}/frames/${contributionId}/frame-${String(i + 1).padStart(4, "0")}.jpg`;
      const upload = await fetch(`${storageUrl}/object/${BUCKET}/${storagePath(framePath)}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_AUTH_KEY,
          Authorization: `Bearer ${identity.token}`,
          "Content-Type": "image/jpeg",
          "x-upsert": "false",
        },
        body: bytes,
        cache: "no-store",
      });
      if (upload.ok) stored++;
    }
    return NextResponse.json({ ok: true, frames: stored });
  }

  return NextResponse.json({ error: "Unknown upload phase." }, { status: 400 });
}
