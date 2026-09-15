import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, max: number) {
  const text = String(value ?? "").trim().slice(0, max);
  return text || null;
}

function authHeaders(token: string) {
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

  const fields = "id,dam_id,sire_id,pairing_year,pairing_code,notes,visibility,created_at,updated_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pairings?created_by=eq.${encodeURIComponent(identity.user.id)}&select=${fields}&order=created_at.desc`, {
    headers: authHeaders(identity.token),
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Could not load pairing records", detail: rows }, { status: response.status });
  return NextResponse.json({ pairings: Array.isArray(rows) ? rows : [] });
}

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    damId?: unknown;
    sireId?: unknown;
    pairingYear?: unknown;
    pairingCode?: unknown;
    notes?: unknown;
    visibility?: unknown;
  } | null;

  const damId = String(body?.damId ?? "").trim();
  const sireId = String(body?.sireId ?? "").trim();
  if (!UUID_RE.test(damId) || !UUID_RE.test(sireId) || damId === sireId) {
    return NextResponse.json({ error: "Choose two different registered parents." }, { status: 400 });
  }

  const parentResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=in.(${damId},${sireId})&select=id`, {
    headers: authHeaders(identity.token),
    cache: "no-store",
  });
  const parentRows = await parentResponse.json().catch(() => null) as Array<{ id?: string }> | null;
  if (!parentResponse.ok || !Array.isArray(parentRows) || new Set(parentRows.map((row) => row.id)).size !== 2) {
    return NextResponse.json({ error: "Both parents must be animals you can access in the registry. Another keeper's animal must be published first." }, { status: 400 });
  }

  const yearText = String(body?.pairingYear ?? "").replace(/[^0-9]/g, "").slice(0, 4);
  const pairingYear = yearText ? Number(yearText) : null;
  if (pairingYear && (pairingYear < 1900 || pairingYear > 2200)) return NextResponse.json({ error: "Invalid pairing year." }, { status: 400 });
  const visibility = String(body?.visibility ?? "private") === "public" ? "public" : "private";

  const insert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pairings`, {
    method: "POST",
    headers: { ...authHeaders(identity.token), Prefer: "return=representation" },
    body: JSON.stringify({
      created_by: identity.user.id,
      dam_id: damId,
      sire_id: sireId,
      pairing_year: pairingYear,
      pairing_code: cleanText(body?.pairingCode, 160),
      notes: cleanText(body?.notes, 4000),
      visibility,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  const rows = await insert.json().catch(() => null);
  if (!insert.ok) return NextResponse.json({ error: "Could not save pairing record", detail: rows }, { status: insert.status });
  return NextResponse.json({ ok: true, pairing: Array.isArray(rows) ? rows[0] ?? null : rows });
}

export async function PATCH(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown; visibility?: unknown } | null;
  const id = String(body?.id ?? "").trim();
  const visibility = String(body?.visibility ?? "").trim();
  if (!UUID_RE.test(id) || !["private", "public"].includes(visibility)) return NextResponse.json({ error: "Invalid pairing update." }, { status: 400 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pairings?id=eq.${encodeURIComponent(id)}&created_by=eq.${encodeURIComponent(identity.user.id)}`, {
    method: "PATCH",
    headers: { ...authHeaders(identity.token), Prefer: "return=representation" },
    body: JSON.stringify({ visibility, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Could not update pairing visibility", detail: rows }, { status: response.status });
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "Pairing record not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = String(body?.id ?? "").trim();
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid pairing record." }, { status: 400 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pairings?id=eq.${encodeURIComponent(id)}&created_by=eq.${encodeURIComponent(identity.user.id)}`, {
    method: "DELETE",
    headers: { ...authHeaders(identity.token), Prefer: "return=representation" },
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Could not delete pairing record", detail: rows }, { status: response.status });
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "Pairing record not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
