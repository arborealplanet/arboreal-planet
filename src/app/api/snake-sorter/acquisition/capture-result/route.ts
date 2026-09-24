import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import { storeScreenshotCapture } from "@/lib/snake-sorter/capture-store";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

/**
 * Capture-job result ingestion. Each image goes through the shared capture
 * pipeline (same dedup, same rollback guarantees as media-upload); the job
 * row tracks completion. Partial success is reported honestly — successfully
 * stored images are kept, and the job is marked failed only for the images
 * that did not make it.
 */
export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Owner session expired or missing. Sign in again, then retry." },
      { status: 401 },
    );
  }

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

  const createdIds: string[] = [];
  const failures: string[] = [];

  for (const file of files) {
    const outcome = await storeScreenshotCapture(
    { supabaseUrl: SUPABASE_AUTH_URL, supabaseKey: SUPABASE_AUTH_KEY },
    identity.token,
    identity.user.id,
    {
      candidateId: job.candidate_id,
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      fileName: file.name,
      imageSubject: "uncertain",
      sourcePageUrl: job.source_url,
      sourceCaptureKind: "capture_job",
      captureMethod: "rendered_capture",
      extraMetadata: { capture_job_id: job.id, rendered_capture: true },
    });
    if (outcome.status === "stored" || (outcome.status === "duplicate" && outcome.linked)) {
      createdIds.push(outcome.mediaId);
    } else if (outcome.status === "duplicate") {
      failures.push(`${file.name}: ${outcome.message}`);
    } else {
      failures.push(`${file.name}: ${outcome.error}`);
    }
  }

  const newCapturedCount = Number(job.captured_media_count ?? 0) + createdIds.length;
  const jobFailed = failures.length > 0;
  await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?id=eq.${encodeURIComponent(job.id)}`,
    {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        status: jobFailed ? "failed" : "completed",
        captured_media_count: newCapturedCount,
        discovered_media_count: Math.max(Number(job.discovered_media_count ?? 0), newCapturedCount),
        last_error: jobFailed ? failures.join(" | ").slice(0, 1000) : null,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  ).catch(() => undefined);

  return NextResponse.json({
    ok: !jobFailed,
    candidate_id: job.candidate_id,
    attached: createdIds.length,
    failed: failures.length,
    failures: failures.length ? failures : undefined,
    media_ids: createdIds,
  }, { status: jobFailed ? 207 : 201 });
}
