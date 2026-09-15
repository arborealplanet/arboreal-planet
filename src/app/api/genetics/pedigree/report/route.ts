import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS = new Set(["possible_duplicate", "parentage_issue", "animal_details", "ownership_issue", "other"]);

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await request.json().catch(() => null) as { animalId?: unknown; reason?: unknown; details?: unknown } | null;
  const animalId = String(body?.animalId ?? "").trim();
  const reason = String(body?.reason ?? "").trim();
  const details = String(body?.details ?? "").trim().slice(0, 2000);
  if (!UUID_RE.test(animalId) || !REASONS.has(reason)) return NextResponse.json({ error: "Invalid report" }, { status: 400 });

  const animalResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(animalId)}&visibility=eq.public&select=id&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  const animalRows = animalResponse.ok ? await animalResponse.json().catch(() => []) as Array<{ id?: string }> : [];
  if (!animalResponse.ok || !animalRows.length) return NextResponse.json({ error: "Public lineage record not found" }, { status: 404 });

  const existingResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_record_reports?animal_id=eq.${encodeURIComponent(animalId)}&reporter_id=eq.${encodeURIComponent(identity.user.id)}&status=eq.open&select=id&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const existing = existingResponse.ok ? await existingResponse.json().catch(() => []) as Array<{ id?: string }> : [];
  if (existing.length) return NextResponse.json({ error: "You already have an open report for this record." }, { status: 409 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_record_reports`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ animal_id: animalId, reporter_id: identity.user.id, reason, details }),
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null) as Array<{ id?: string }> | null;
  if (!response.ok) return NextResponse.json({ error: "Could not submit report", detail: rows }, { status: response.status });

  return NextResponse.json({ ok: true, reportId: Array.isArray(rows) ? rows[0]?.id : null }, { status: 201 });
}
