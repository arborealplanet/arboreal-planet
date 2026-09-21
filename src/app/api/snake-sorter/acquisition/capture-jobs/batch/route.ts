import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

const headers = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { limit?: unknown };
  const rawLimit = Number(body.limit ?? 5);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 5, 20));
  const h = headers(identity.token);

  const candidatesResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?source_type=eq.morphmarket&exclusion_reason=is.null&review_status=in.(pending,approved)&select=id,source_url,source_key,review_status,discovered_at&order=discovered_at.asc&limit=${limit * 4}`,
    { headers: h, cache: "no-store" },
  );
  if (!candidatesResponse.ok) {
    return NextResponse.json({ error: "Could not load capture candidates." }, { status: 502 });
  }

  const candidates = await candidatesResponse.json() as Array<{
    id: string;
    source_url: string;
    source_key: string;
    review_status: string;
    discovered_at: string;
  }>;

  if (!candidates.length) {
    return NextResponse.json({ ok: true, queued: 0, skipped: 0, job_ids: [] });
  }

  const ids = candidates.map((candidate) => candidate.id);
  const [mediaResponse, jobsResponse] = await Promise.all([
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=in.(${ids.map(encodeURIComponent).join(",")})&select=candidate_id`,
      { headers: h, cache: "no-store" },
    ),
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?candidate_id=in.(${ids.map(encodeURIComponent).join(",")})&status=in.(queued,processing)&select=candidate_id`,
      { headers: h, cache: "no-store" },
    ),
  ]);

  const withMedia = new Set<string>(
    mediaResponse.ok
      ? ((await mediaResponse.json()) as Array<{ candidate_id: string }>).map((row) => row.candidate_id)
      : [],
  );
  const active = new Set<string>(
    jobsResponse.ok
      ? ((await jobsResponse.json()) as Array<{ candidate_id: string }>).map((row) => row.candidate_id)
      : [],
  );

  const chosen = candidates
    .filter((candidate) => !withMedia.has(candidate.id) && !active.has(candidate.id))
    .slice(0, limit);

  if (!chosen.length) {
    return NextResponse.json({
      ok: true,
      queued: 0,
      skipped: candidates.length,
      job_ids: [],
    });
  }

  const insertResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs`,
    {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(chosen.map((candidate) => ({
        candidate_id: candidate.id,
        source_url: candidate.source_url,
        requested_by: identity.user.id,
        status: "queued",
        source_metadata: {
          source_type: "morphmarket",
          source_key: candidate.source_key,
          requested_from: "snake_sorter_batch_queue",
          review_status_at_queue: candidate.review_status,
        },
      }))),
      cache: "no-store",
    },
  );

  const inserted = await insertResponse.json().catch(() => ([])) as Array<{ id?: string }>;
  if (!insertResponse.ok) {
    return NextResponse.json({ error: "Could not queue capture batch." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    queued: inserted.length,
    skipped: Math.max(0, candidates.length - chosen.length),
    job_ids: inserted.map((row) => row.id).filter(Boolean),
    worker_disarmed_by_default: true,
  }, { status: 201 });
}
