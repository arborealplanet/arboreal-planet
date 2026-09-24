import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = new Set(["interested", "going"]);
const publicHeaders = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" };

function countFromRange(value: string | null) {
  if (!value) return null;
  const total = value.split("/")[1];
  return total && total !== "*" ? Number(total) : null;
}

async function counts(eventId: string) {
  const headers = { ...publicHeaders, Prefer: "count=exact", Range: "0-0" };
  const base = `${SUPABASE_AUTH_URL}/rest/v1/event_rsvps?event_id=eq.${encodeURIComponent(eventId)}`;
  const [goingResponse, interestedResponse] = await Promise.all([
    fetch(`${base}&status=eq.going&select=id`, { headers, cache: "no-store" }),
    fetch(`${base}&status=eq.interested&select=id`, { headers, cache: "no-store" }),
  ]);
  return {
    going: goingResponse.ok ? countFromRange(goingResponse.headers.get("content-range")) ?? 0 : 0,
    interested: interestedResponse.ok ? countFromRange(interestedResponse.headers.get("content-range")) ?? 0 : 0,
  };
}

async function mine(eventId: string, userId: string, token: string) {
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/event_rsvps?event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${encodeURIComponent(userId)}&select=status&limit=1`,
    { headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as Array<{ status: string }>;
  const status = rows[0]?.status;
  return status === "going" || status === "interested" ? status : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const identity = await getServerIdentity();
  const [totals, myStatus] = await Promise.all([
    counts(id),
    identity ? mine(id, identity.user.id, identity.token) : Promise.resolve(null),
  ]);
  return NextResponse.json({ going: totals.going, interested: totals.interested, mine: myStatus, signedIn: Boolean(identity) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = typeof body?.status === "string" ? body.status.toLowerCase() : "";
  if (!statuses.has(status)) return NextResponse.json({ error: "Status must be interested or going." }, { status: 400 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/event_rsvps?on_conflict=event_id,user_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ event_id: id, user_id: identity.user.id, status }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save RSVP" }, { status: 400 });
  const totals = await counts(id);
  return NextResponse.json({ going: totals.going, interested: totals.interested, mine: status });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/event_rsvps?event_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(identity.user.id)}`,
    {
      method: "DELETE",
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not remove RSVP" }, { status: 400 });
  const totals = await counts(id);
  return NextResponse.json({ going: totals.going, interested: totals.interested, mine: null });
}
