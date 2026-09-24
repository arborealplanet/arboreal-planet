import { NextRequest, NextResponse } from "next/server";
import { capturePriorityScore } from "@/lib/snake-sorter/capture-priority";
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
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?source_type=eq.morphmarket&exclusion_reason=is.null&review_status=in.(pending,approved)&select=id,source_url,source_key,review_status,discovered_at,provisional_locality,locality_raw,neonate_color_hint,life_stage_hint&order=discovered_at.asc&limit=1000`,
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
    provisional_locality: string | null;
    locality_raw: string | null;
    neonate_color_hint: string | null;
    life_stage_hint: string | null;
  }>;

  if (!candidates.length) {
    return NextResponse.json({ ok: true, queued: 0, skipped: 0, job_ids: [] });
  }

  const ids = candidates.map((candidate) => candidate.id);
  const [mediaResponse, jobsResponse] = await Promise.all([
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=in.(${ids.map(encodeURIComponent).join(",")})&select=candidate_id,source_media_url,staged_storage_path,live_reference_status`,
      { headers: h, cache: "no-store" },
    ),
    fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?candidate_id=in.(${ids.map(encodeURIComponent).join(",")})&status=in.(queued,processing)&select=candidate_id`,
      { headers: h, cache: "no-store" },
    ),
  ]);

  const mediaRows = mediaResponse.ok
    ? await mediaResponse.json() as Array<{
        candidate_id: string;
        source_media_url: string | null;
        staged_storage_path: string | null;
        live_reference_status: string | null;
      }>
    : [];

  const usableMedia = new Set<string>();
  for (const row of mediaRows) {
    const staged = Boolean(row.staged_storage_path);
    const liveUsable =
      Boolean(row.source_media_url) &&
      !["unavailable","blocked","expired"].includes(String(row.live_reference_status ?? "unknown"));
    if (staged || liveUsable) usableMedia.add(row.candidate_id);
  }
  const active = new Set<string>(
    jobsResponse.ok
      ? ((await jobsResponse.json()) as Array<{ candidate_id: string }>).map((row) => row.candidate_id)
      : [],
  );

  const available = candidates.filter((candidate) => !usableMedia.has(candidate.id) && !active.has(candidate.id));

  const localityFrequency = new Map<string, number>();
  for (const candidate of available) {
    const locality = candidate.provisional_locality || candidate.locality_raw || "Unknown";
    localityFrequency.set(locality, (localityFrequency.get(locality) ?? 0) + 1);
  }

  const priorityScore = (candidate: (typeof available)[number]) => {
    const locality = candidate.provisional_locality || candidate.locality_raw || "Unknown";
    return capturePriorityScore(candidate, localityFrequency.get(locality) ?? available.length);
  };

  const chosen = [...available]
    .sort((a, b) => priorityScore(b) - priorityScore(a) || a.discovered_at.localeCompare(b.discovered_at))
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
          provisional_locality: candidate.provisional_locality || candidate.locality_raw || null,
          neonate_color_hint: candidate.neonate_color_hint,
          life_stage_hint: candidate.life_stage_hint,
          queue_priority_score: priorityScore(candidate),
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
