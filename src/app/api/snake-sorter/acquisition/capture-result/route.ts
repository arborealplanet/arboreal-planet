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
  return cleaned || "rendered-capture.png";
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const jobId = String(form.get("job_id") ?? "").trim();
  const files = form.getAll("file").filter((value): value is File => value instanceof File);

  if (!jobId || files.length === 0) {
    return NextResponse.json({ error: "Capture job and at least one image are required." }, { status: 400 });
  }
  if (files.length > 12) {
    return NextResponse.json({ error: "A capture result can attach at most 12 images." }, { status: 413 });
  }

  for (const file of files) {
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Capture images must be JPEG, PNG, or WebP." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Each capture image must be 15 MB or smaller." }, { status: 413 });
    }
  }

  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  const jobResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,candidate_id,source_url,status,captured_media_count,discovered_media_count&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const jobs = jobResponse.ok
    ? await jobResponse.json() as Array<{id:string;candidate_id:string;source_url:string;status:string;captured_media_count:number;discovered_media_count:number}>
    : [];
  const job = jobs[0];
  if (!job) return NextResponse.json({ error: "Capture job not found." }, { status: 404 });
  if (["completed","cancelled"].includes(job.status)) {
    return NextResponse.json({ error: `Capture job is already ${job.status}.` }, { status: 409 });
  }

  const orderResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=eq.${encodeURIComponent(job.candidate_id)}&select=media_order&order=media_order.desc&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const orderRows = orderResponse.ok ? await orderResponse.json() as Array<{media_order:number}> : [];
  let mediaOrder = Number(orderRows[0]?.media_order ?? -1) + 1;

  const createdIds: string[] = [];
  const createdPaths: string[] = [];

  try {
    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const sha = createHash("sha256").update(bytes).digest("hex");

      const duplicateResponse = await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?staged_content_sha256=eq.${sha}&select=id,candidate_id&limit=1`,
        { headers: h, cache: "no-store" },
      );
      const duplicates = duplicateResponse.ok ? await duplicateResponse.json() as Array<{id:string;candidate_id:string}> : [];
      if (duplicates.length) continue;

      const path = `${job.candidate_id}/capture-${String(mediaOrder).padStart(2,"0")}-${randomUUID()}-${safeFileName(file.name)}`;
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
      if (!upload.ok) throw new Error("Could not store a rendered capture.");
      createdPaths.push(path);

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
            candidate_id: job.candidate_id,
            source_page_url: job.source_url,
            media_order: mediaOrder,
            capture_method: "rendered_capture",
            rights_status: "metadata_only",
            review_status: "pending",
            quality_status: "unreviewed",
            staged_storage_path: path,
            staged_content_sha256: sha,
            staged_mime_type: file.type,
            staged_bytes: bytes.length,
            staged_at: new Date().toISOString(),
            source_metadata: {
              capture_job_id: job.id,
              rendered_capture: true,
              original_name: file.name,
            },
          }),
          cache: "no-store",
        },
      );
      if (!insert.ok) throw new Error("Could not attach a rendered capture to the candidate.");

      const rows = await insert.json() as Array<{id:string}>;
      if (rows[0]?.id) createdIds.push(rows[0].id);
      mediaOrder += 1;
    }

    const newCapturedCount = Number(job.captured_media_count ?? 0) + createdIds.length;
    await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?id=eq.${encodeURIComponent(job.id)}`,
      {
        method: "PATCH",
        headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "completed",
          captured_media_count: newCapturedCount,
          discovered_media_count: Math.max(Number(job.discovered_media_count ?? 0), newCapturedCount),
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      },
    );

    await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(job.candidate_id)}`,
      {
        method: "PATCH",
        headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ acquisition_stage: "media_collected" }),
        cache: "no-store",
      },
    );

    return NextResponse.json({
      ok: true,
      candidate_id: job.candidate_id,
      attached: createdIds.length,
      media_ids: createdIds,
    }, { status: 201 });
  } catch (error) {
    for (const path of createdPaths) {
      await fetch(
        `${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-acquisition/${storagePath(path)}`,
        { method: "DELETE", headers: h, cache: "no-store" },
      ).catch(() => undefined);
    }

    await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?id=eq.${encodeURIComponent(job.id)}`,
      {
        method: "PATCH",
        headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "failed",
          last_error: error instanceof Error ? error.message.slice(0, 1000) : "Capture ingestion failed.",
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      },
    ).catch(() => undefined);

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Capture ingestion failed.",
    }, { status: 500 });
  }
}
