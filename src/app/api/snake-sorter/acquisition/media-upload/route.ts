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

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const candidateId = String(form.get("candidate_id") ?? "").trim();
  const file = form.get("file");

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
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}&select=id,source_url,source_type&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const candidates = candidateResponse.ok ? await candidateResponse.json() as Array<{id:string;source_url:string;source_type:string}> : [];
  const candidate = candidates[0];
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");

  const duplicateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(candidateId)}&staged_content_sha256=eq.${sha}&select=id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const duplicates = duplicateResponse.ok ? await duplicateResponse.json() as Array<{id:string}> : [];
  if (duplicates.length) {
    return NextResponse.json({ error: "That exact image is already attached to this candidate.", media_id: duplicates[0].id }, { status: 409 });
  }

  const orderResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(candidateId)}&select=media_order&order=media_order.desc&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const orderRows = orderResponse.ok ? await orderResponse.json() as Array<{media_order:number}> : [];
  const mediaOrder = Number(orderRows[0]?.media_order ?? -1) + 1;

  const path = `${candidateId}/${String(mediaOrder).padStart(2,"0")}-${randomUUID()}-${safeFileName(file.name)}`;
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
  if (!upload.ok) return NextResponse.json({ error: "Could not store candidate image." }, { status: 502 });

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
        source_page_url: candidate.source_url,
        media_order: mediaOrder,
        capture_method: "manual_upload",
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
          original_name: file.name,
          manually_attached_for_review: true,
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
    return NextResponse.json({ error: "Could not attach candidate image." }, { status: 502 });
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
  return NextResponse.json({ ok: true, media_id: rows[0]?.id ?? null }, { status: 201 });
}
