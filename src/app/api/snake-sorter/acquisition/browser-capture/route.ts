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

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in to Snake Sorter as the owner first." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const candidateId = String(body.candidate_id ?? "").trim();
  const sourceUrl = String(body.source_url ?? "").trim().slice(0, 1000);
  const mimeType = String(body.mime_type ?? "image/jpeg").trim();
  const base64 = String(body.image_base64 ?? "").trim();
  const ordinalRaw = Number(body.ordinal ?? 0);
  const ordinal = Number.isFinite(ordinalRaw) ? Math.max(0, Math.trunc(ordinalRaw)) : 0;

  if (!candidateId || !base64) {
    return NextResponse.json({ error: "Candidate id and captured image are required." }, { status: 400 });
  }
  if (!["image/jpeg","image/png","image/webp"].includes(mimeType)) {
    return NextResponse.json({ error: "Captured image must be JPEG, PNG, or WebP." }, { status: 415 });
  }
  if (base64.length > 6_000_000) {
    return NextResponse.json({ error: "Captured image payload is too large." }, { status: 413 });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    return NextResponse.json({ error: "Captured image payload is invalid." }, { status: 400 });
  }
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Captured image must be 4 MB or smaller." }, { status: 413 });
  }

  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  const candidateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}&select=id,source_url,source_type&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const candidates = candidateResponse.ok
    ? await candidateResponse.json() as Array<{id:string;source_url:string;source_type:string}>
    : [];
  const candidate = candidates[0];
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  const sha = createHash("sha256").update(bytes).digest("hex");
  const duplicateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?staged_content_sha256=eq.${sha}&select=id,candidate_id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const duplicates = duplicateResponse.ok
    ? await duplicateResponse.json() as Array<{id:string;candidate_id:string}>
    : [];

  if (duplicates.length) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      media_id: duplicates[0].id,
      existing_candidate_id: duplicates[0].candidate_id,
    });
  }

  const orderResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(candidateId)}&select=media_order&order=media_order.desc&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const orderRows = orderResponse.ok ? await orderResponse.json() as Array<{media_order:number}> : [];
  const mediaOrder = Math.max(Number(orderRows[0]?.media_order ?? -1) + 1, ordinal);

  const extension =
    mimeType === "image/png" ? "png" :
    mimeType === "image/webp" ? "webp" :
    "jpg";
  const path = `${candidateId}/browser-capture-${String(mediaOrder).padStart(2,"0")}-${randomUUID()}.${extension}`;

  const upload = await fetch(
    `${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-acquisition/${storagePath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      cache: "no-store",
    },
  );
  if (!upload.ok) {
    return NextResponse.json({ error: "Could not store browser capture." }, { status: 502 });
  }

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
        source_page_url: sourceUrl || candidate.source_url,
        media_order: mediaOrder,
        capture_method: "rendered_capture",
        rights_status: "metadata_only",
        review_status: "pending",
        quality_status: "unreviewed",
        staged_storage_path: path,
        staged_content_sha256: sha,
        staged_mime_type: mimeType,
        staged_bytes: bytes.length,
        staged_at: new Date().toISOString(),
        source_metadata: {
          source_type: candidate.source_type,
          browser_helper_capture: true,
          browser_helper_capture_version: 1,
          source_page_url: sourceUrl || candidate.source_url,
        },
      }),
      cache: "no-store",
    },
  );

  if (!insert.ok) {
    await fetch(
      `${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-acquisition/${storagePath(path)}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_AUTH_KEY,
          Authorization: `Bearer ${identity.token}`,
        },
        cache: "no-store",
      },
    ).catch(() => undefined);

    return NextResponse.json({ error: "Could not attach browser capture." }, { status: 502 });
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
    duplicate: false,
    media_id: rows[0]?.id ?? null,
  }, { status: 201 });
}
