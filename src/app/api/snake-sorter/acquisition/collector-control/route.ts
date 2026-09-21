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

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_collector_control?id=eq.true&select=*&limit=1`,
    { headers: headers(identity.token), cache: "no-store" },
  );
  const rows = response.ok ? await response.json() as Array<Record<string, unknown>> : [];
  if (!response.ok || !rows[0]) {
    return NextResponse.json({ error: "Could not load collector control." }, { status: 502 });
  }

  const row = rows[0];
  const armedUntil = row.armed_until ? new Date(String(row.armed_until)).getTime() : 0;
  const armed = row.is_armed === true && armedUntil > Date.now();

  return NextResponse.json({
    ...row,
    effective_armed: armed,
  });
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "").trim();
  const phrase = String(body.confirmation ?? "").trim();
  const note = String(body.note ?? "").trim().slice(0, 500);
  const h = headers(identity.token);

  if (action === "disarm") {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_collector_control?id=eq.true`,
      {
        method: "PATCH",
        headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          is_armed: false,
          armed_until: null,
          disarmed_at: new Date().toISOString(),
          note: note || "Manually disarmed from Snake Sorter.",
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      },
    );
    const rows = await response.json().catch(() => ([]));
    if (!response.ok) return NextResponse.json({ error: "Could not disarm collector." }, { status: 502 });
    return NextResponse.json({ ok: true, control: Array.isArray(rows) ? rows[0] ?? null : rows });
  }

  if (action !== "arm" || phrase !== "ARM SNAKE SORTER") {
    return NextResponse.json({ error: 'Type "ARM SNAKE SORTER" exactly to arm live capture.' }, { status: 400 });
  }

  const requestedMinutes = Number(body.minutes ?? 15);
  const minutes = Math.max(5, Math.min(Number.isFinite(requestedMinutes) ? Math.trunc(requestedMinutes) : 15, 30));
  const now = new Date();
  const armedUntil = new Date(now.getTime() + minutes * 60_000);

  const activeJobsResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_capture_jobs?status=in.(processing)&select=id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const activeJobs = activeJobsResponse.ok ? await activeJobsResponse.json() as Array<{id:string}> : [];
  if (activeJobs.length) {
    return NextResponse.json({ error: "A capture job is already processing. Disarm or wait for it to finish before re-arming." }, { status: 409 });
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_collector_control?id=eq.true`,
    {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        is_armed: true,
        armed_until: armedUntil.toISOString(),
        armed_by: identity.user.id,
        armed_at: now.toISOString(),
        note: note || `Armed for ${minutes} minutes from Snake Sorter.`,
        updated_at: now.toISOString(),
      }),
      cache: "no-store",
    },
  );

  const rows = await response.json().catch(() => ([]));
  if (!response.ok) return NextResponse.json({ error: "Could not arm collector." }, { status: 502 });

  return NextResponse.json({
    ok: true,
    armed_until: armedUntil.toISOString(),
    minutes,
    control: Array.isArray(rows) ? rows[0] ?? null : rows,
  });
}
