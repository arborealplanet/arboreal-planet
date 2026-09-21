import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

const h = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?select=*&order=requested_at.desc&limit=100`,
    { headers: h(identity.token), cache: "no-store" },
  );
  const data = await response.json().catch(() => ([]));
  if (!response.ok) return NextResponse.json({ error: "Could not load capture jobs." }, { status: 502 });

  return NextResponse.json({ jobs: data });
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const candidateId = String(body.candidate_id ?? "").trim();
  if (!candidateId) return NextResponse.json({ error: "Candidate id is required." }, { status: 400 });

  const candidateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}&select=id,source_type,source_url,source_key&limit=1`,
    { headers: h(identity.token), cache: "no-store" },
  );
  const candidates = candidateResponse.ok
    ? await candidateResponse.json() as Array<{id:string;source_type:string;source_url:string;source_key:string}>
    : [];
  const candidate = candidates[0];
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  if (candidate.source_type !== "morphmarket") {
    return NextResponse.json({ error: "Rendered capture jobs are currently limited to MorphMarket candidates." }, { status: 409 });
  }

  const activeResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?candidate_id=eq.${encodeURIComponent(candidateId)}&status=in.(queued,processing)&select=id,status&limit=1`,
    { headers: h(identity.token), cache: "no-store" },
  );
  const active = activeResponse.ok ? await activeResponse.json() as Array<{id:string;status:string}> : [];
  if (active[0]) {
    return NextResponse.json({ ok: true, job_id: active[0].id, status: active[0].status, already_queued: true });
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs`,
    {
      method: "POST",
      headers: {
        ...h(identity.token),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        candidate_id: candidate.id,
        source_url: candidate.source_url,
        requested_by: identity.user.id,
        status: "queued",
        source_metadata: {
          source_type: candidate.source_type,
          source_key: candidate.source_key,
          requested_from: "snake_sorter_app",
        },
      }),
      cache: "no-store",
    },
  );
  const data = await response.json().catch(() => ([]));
  if (!response.ok) return NextResponse.json({ error: "Could not queue rendered capture." }, { status: 502 });

  return NextResponse.json({ ok: true, job: Array.isArray(data) ? data[0] ?? null : data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  const action = String(body.action ?? "").trim();
  if (!id || action !== "cancel") return NextResponse.json({ error: "Invalid capture-job update." }, { status: 400 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?id=eq.${encodeURIComponent(id)}&status=eq.queued`,
    {
      method: "PATCH",
      headers: {
        ...h(identity.token),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "cancelled",
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not cancel capture job." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
