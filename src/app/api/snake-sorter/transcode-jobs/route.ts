import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const runtime = "nodejs";

/**
 * Transcode job queue for the background worker.
 *
 * The worker (a scheduled job on the owner's machine) polls this endpoint,
 * claims the oldest queued job, transcodes the Drive original into a
 * reviewable converted copy, and reports back. Auth is a shared secret —
 * there is no user session in this flow.
 *
 *   GET  ?action=claim            -> {job} | {empty: true}
 *   POST {action:"complete", job_id, converted_drive_file_id?, error?}
 *
 * Env: SNAKE_SORTER_CRON_SECRET
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.SNAKE_SORTER_CRON_SECRET ?? "";
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const rpcHeaders = {
  apikey: SUPABASE_AUTH_KEY,
  "Content-Type": "application/json",
  Accept: "application/json",
};

export async function GET(request: NextRequest) {
  const action = new URL(request.url).searchParams.get("action");

  // Public job count for the lightweight watcher. Returns only a number —
  // no secrets, no job data. Lets a tiny polling script wake the worker
  // only when there is real work, instead of spinning up on a schedule.
  if (action === "count") {
    const res = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/transcode_queued_count`, {
      method: "POST",
      headers: rpcHeaders,
      body: "{}",
      cache: "no-store",
    }).catch(() => null);
    const n = res && res.ok ? await res.json().catch(() => 0) : 0;
    return NextResponse.json({ queued: typeof n === "number" ? n : 0 });
  }

  if (!authorized(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (action !== "claim") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  const res = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/transcode_claim_job`, {
    method: "POST",
    headers: rpcHeaders,
    body: "{}",
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) {
    return NextResponse.json({ error: "Claim failed." }, { status: 502 });
  }
  const rows = await res.json().catch(() => []) as Array<{
    job_id: string; contribution_id: string; drive_file_id: string; attempts: number;
  }>;
  const job = rows[0];
  if (!job) return NextResponse.json({ empty: true });
  return NextResponse.json({ job });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => null) as {
    action?: unknown; job_id?: unknown; converted_drive_file_id?: unknown; error?: unknown;
  } | null;
  if (body?.action !== "complete" || typeof body.job_id !== "string" || !body.job_id) {
    return NextResponse.json({ error: "Invalid completion." }, { status: 400 });
  }
  const converted = typeof body.converted_drive_file_id === "string" && body.converted_drive_file_id
    ? body.converted_drive_file_id.slice(0, 120)
    : null;
  const err = typeof body.error === "string" && body.error.trim()
    ? body.error.trim().slice(0, 500)
    : null;
  if (!converted && !err) {
    return NextResponse.json({ error: "Nothing to record." }, { status: 400 });
  }
  const res = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/transcode_complete_job`, {
    method: "POST",
    headers: rpcHeaders,
    body: JSON.stringify({ p_job_id: body.job_id, p_converted_drive_file_id: converted, p_error: err }),
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) {
    return NextResponse.json({ error: "Complete failed." }, { status: 502 });
  }
  const ok = await res.json().catch(() => false);
  return NextResponse.json({ ok: Boolean(ok) });
}
