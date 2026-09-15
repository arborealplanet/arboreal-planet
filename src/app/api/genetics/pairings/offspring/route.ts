import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function headers(token: string) {
  return {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/list_my_gtp_pairing_offspring`, {
    method: "POST",
    headers: headers(identity.token),
    body: "{}",
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Could not load pairing offspring links", detail: rows }, { status: response.status });
  return NextResponse.json({ links: Array.isArray(rows) ? rows : [] });
}

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { pairingId?: unknown; animalId?: unknown; link?: unknown } | null;
  const pairingId = String(body?.pairingId ?? "").trim();
  const animalId = String(body?.animalId ?? "").trim();
  const link = body?.link !== false;
  if (!UUID_RE.test(pairingId) || !UUID_RE.test(animalId)) return NextResponse.json({ error: "Invalid pairing or animal ID" }, { status: 400 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/set_gtp_pairing_offspring`, {
    method: "POST",
    headers: headers(identity.token),
    body: JSON.stringify({ p_pairing_id: pairingId, p_animal_id: animalId, p_link: link }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String((result as { message?: unknown } | null)?.message ?? "Could not update clutch grouping.");
    return NextResponse.json({ error: message }, { status: response.status });
  }
  return NextResponse.json({ ok: true });
}
