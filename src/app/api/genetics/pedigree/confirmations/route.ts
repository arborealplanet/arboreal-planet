import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/list_gtp_breeder_confirmations`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Could not load breeder confirmation requests", detail: rows }, { status: response.status });
  return NextResponse.json({ requests: Array.isArray(rows) ? rows : [] });
}

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { animalId?: unknown; breederUsername?: unknown } | null;
  const animalId = String(body?.animalId ?? "").trim();
  const breederUsername = String(body?.breederUsername ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(animalId) || !/^[A-Za-z0-9_.-]{2,40}$/.test(breederUsername)) {
    return NextResponse.json({ error: "Choose an animal and enter a valid Arboreal Planet username." }, { status: 400 });
  }

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/create_gtp_breeder_confirmation`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_animal_id: animalId, p_breeder_username: breederUsername }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Could not create confirmation request", detail: result }, { status: response.status });
  return NextResponse.json({ ok: true, requestId: result }, { status: 201 });
}

export async function PATCH(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => null) as { requestId?: unknown; action?: unknown } | null;
  const requestId = String(body?.requestId ?? "").trim();
  const action = String(body?.action ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["confirm", "decline", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid confirmation action" }, { status: 400 });
  }

  const rpc = action === "cancel" ? "cancel_gtp_breeder_confirmation" : "respond_gtp_breeder_confirmation";
  const rpcBody = action === "cancel"
    ? { p_request_id: requestId }
    : { p_request_id: requestId, p_confirm: action === "confirm" };
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/${rpc}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rpcBody),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not update confirmation request", detail: await response.text() }, { status: response.status });
  return NextResponse.json({ ok: true });
}
