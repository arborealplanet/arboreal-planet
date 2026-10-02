import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import { driveAccessToken } from "@/lib/snake-sorter-drive";

export const runtime = "nodejs";

/**
 * Google Drive upload for Snake Sorter videos.
 *
 * Supabase's Free plan hard-caps every storage upload at 50 MB, so videos
 * ride to Google Drive instead: the browser slices the file into 4 MB
 * pieces (Vercel's edge still rejects bodies over ~4.5 MB), and this route
 * relays each piece into a Drive resumable-upload session owned by a
 * service account. The service account writes into a "Snake Sorter /
 * originals" folder on the owner's Drive that only the owner can open —
 * contributors supply data, they can never browse the archive.
 *
 * Phases (?phase=):
 *   init     JSON {name, mime_type, size} -> {sessionUri}
 *   chunk    raw bytes + x-drive-session / x-drive-offset / x-drive-size
 *            -> {offset, driveFileId?} (driveFileId appears on the final chunk)
 *   complete JSON {driveFileId, name, mime_type, size, ...guesses}
 *            verifies the Drive file, records the contribution as
 *            pending_review, and drops a transcode job ticket so the
 *            background worker can produce the reviewable converted copy.
 *
 * Env: SNAKE_SORTER_DRIVE_KEY_JSON (service account JSON),
 *      SNAKE_SORTER_DRIVE_ORIGINALS_FOLDER_ID.
 */

const CHUNK_SIZE = 4 * 1024 * 1024;
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);
const MAX_VIDEO_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB — minutes of 8K

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

function checkVideo(mime: string, size: number): string | null {
  if (!VIDEO_TYPES.has(mime)) return "Use MP4, WebM, or MOV videos.";
  if (!Number.isFinite(size) || size <= 0) return "Invalid file size.";
  if (size > MAX_VIDEO_BYTES) return "Video must be 10 GB or smaller.";
  return null;
}

export async function POST(request: NextRequest) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const driveToken = await driveAccessToken();
  const originalsFolder = process.env.SNAKE_SORTER_DRIVE_ORIGINALS_FOLDER_ID ?? "";
  if (!driveToken || !originalsFolder) {
    return NextResponse.json(
      { error: "Video uploads are moving to a new home — please try again in a bit." },
      { status: 503 },
    );
  }

  const phase = new URL(request.url).searchParams.get("phase");

  // ---- init: start the Drive resumable session, hand the browser the URI ----
  if (phase === "init") {
    const body = await request.json().catch(() => null) as { name?: unknown; mime_type?: unknown; size?: unknown } | null;
    const name = text(body?.name, 255);
    const mime = text(body?.mime_type, 100);
    const size = Number(body?.size);
    const typeError = checkVideo(mime, size);
    if (!name || typeError) {
      return NextResponse.json({ error: typeError ?? "Invalid upload request." }, { status: 400 });
    }
    const fileName = `${randomUUID()}-${safeFileName(name)}`;
    const create = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${driveToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ name: fileName, mimeType: mime, parents: [originalsFolder] }),
      cache: "no-store",
    }).catch(() => null);
    if (!create || !create.ok) {
      const detail = create ? await create.text().catch(() => "") : "network error";
      return NextResponse.json({ error: "Could not start Drive upload.", detail: detail.slice(0, 200) }, { status: 502 });
    }
    const sessionUri = create.headers.get("location");
    if (!sessionUri || !sessionUri.startsWith("https://www.googleapis.com/upload/drive/v3/files")) {
      return NextResponse.json({ error: "Drive did not return an upload session." }, { status: 502 });
    }
    return NextResponse.json({ sessionUri, fileName });
  }

  // ---- chunk: relay one piece into the Drive session ----
  if (phase === "chunk") {
    const sessionUri = request.headers.get("x-drive-session") ?? "";
    const offset = Number(request.headers.get("x-drive-offset"));
    const size = Number(request.headers.get("x-drive-size"));
    if (!sessionUri.startsWith("https://www.googleapis.com/upload/drive/v3/files") || !Number.isFinite(offset) || offset < 0 || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Invalid chunk session." }, { status: 400 });
    }
    const bytes = Buffer.from(await request.arrayBuffer().catch(() => new ArrayBuffer(0)));
    if (!bytes.length || bytes.length > CHUNK_SIZE + 1024 || offset + bytes.length > size) {
      return NextResponse.json({ error: "Invalid chunk size." }, { status: 400 });
    }
    const lastByte = offset + bytes.length - 1;
    const put = await fetch(sessionUri, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${driveToken}`,
        "Content-Length": String(bytes.length),
        "Content-Range": `bytes ${offset}-${lastByte}/${size}`,
      },
      body: bytes,
      cache: "no-store",
    }).catch(() => null);
    if (!put) return NextResponse.json({ error: "Chunk upload failed.", detail: "network error" }, { status: 502 });
    if (put.status === 308) {
      // 308 Resume Incomplete — more chunks to come. 308 carries no Location
      // header here, so fetch does not follow it; fall through as success.
      try { await put.body?.cancel(); } catch {}
      return NextResponse.json({ ok: true, offset: offset + bytes.length });
    }
    if (!put.ok) {
      const detail = await put.text().catch(() => "");
      return NextResponse.json({ error: "Chunk upload failed.", detail: detail.slice(0, 200) }, { status: 502 });
    }
    const fileRes = await put.json().catch(() => ({})) as { id?: string };
    return NextResponse.json({ ok: true, offset: offset + bytes.length, driveFileId: fileRes.id ?? null });
  }

  // ---- complete: verify the Drive file, record the contribution, queue transcode ----
  if (phase === "complete") {
    const body = await request.json().catch(() => null) as {
      driveFileId?: unknown; name?: unknown; mime_type?: unknown; size?: unknown;
      taxon_guess?: unknown; life_stage_guess?: unknown; view_type_guess?: unknown;
      provenance_hint?: unknown; notes?: unknown;
    } | null;
    const driveFileId = text(body?.driveFileId, 120);
    const name = text(body?.name, 255);
    const mime = text(body?.mime_type, 100);
    const size = Number(body?.size);
    const typeError = checkVideo(mime, size);
    if (!driveFileId || !name || typeError) {
      return NextResponse.json({ error: typeError ?? "Invalid completion request." }, { status: 400 });
    }

    // Confirm the finished file exists in Drive with the claimed size.
    const meta = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?fields=id,name,size,mimeType`,
      { headers: { Authorization: `Bearer ${driveToken}` }, cache: "no-store" },
    ).catch(() => null);
    const fileMeta = meta && meta.ok ? await meta.json().catch(() => ({})) as { size?: string } : null;
    if (!fileMeta || Number(fileMeta.size) !== size) {
      return NextResponse.json({ error: "Upload is incomplete — please retry." }, { status: 400 });
    }

    const h = {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      Accept: "application/json",
    };
    // Weak fingerprint (name + size): catches re-uploading the exact file.
    const fingerprint = `drive:${createHash("sha256").update(`${name}:${size}`).digest("hex")}`;
    const dup = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?contributor_user_id=eq.${encodeURIComponent(identity.user.id)}&content_sha256=eq.${fingerprint}&status=in.(pending_review,approved)&select=id&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const dupRows = dup.ok ? await dup.json() as Array<{ id: string }> : [];
    if (dupRows.length) {
      return NextResponse.json({ rejected: [{ name, reason: "This exact file was already contributed." }] }, { status: 409 });
    }

    const clean = (value: unknown, allowed: Set<string>) => {
      const v = text(value, 120);
      return allowed.has(v) ? v : null;
    };
    const insert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        contributor_user_id: identity.user.id,
        media_type: "video",
        storage_path: `gdrive:${driveFileId}`,
        original_name: name.slice(0, 255),
        mime_type: mime,
        content_sha256: fingerprint,
        file_size_bytes: size,
        status: "pending_review",
        taxon_guess: clean(body?.taxon_guess, TAXA),
        life_stage_guess: clean(body?.life_stage_guess, STAGES),
        view_type_guess: clean(body?.view_type_guess, CONTRIBUTION_VIEWS),
        provenance_hint: text(body?.provenance_hint, 500) || null,
        notes: text(body?.notes, 2000) || null,
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

    // Drop the transcode job ticket so the background worker picks this up.
    // Best-effort: the contribution is already recorded; a missing ticket
    // just means the worker finds it on its next sweep.
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_transcode_queue`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ contribution_id: id, drive_file_id: driveFileId, status: "queued" }),
      cache: "no-store",
    }).catch(() => null);

    return NextResponse.json({ ok: true, accepted: [{ id, name, media_type: "video" }] }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown upload phase." }, { status: 400 });
}
