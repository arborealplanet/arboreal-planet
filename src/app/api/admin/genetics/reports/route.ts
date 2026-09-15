import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function adminIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string | null } | null;
  if (!profile || !["admin", "owner"].includes(profile.role ?? "")) return null;
  return identity;
}

export async function GET() {
  const identity = await adminIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/gtp_pedigree_report_queue`, {
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
  if (!response.ok) return NextResponse.json({ error: "Could not load lineage reports", detail: rows }, { status: response.status });
  return NextResponse.json({ reports: Array.isArray(rows) ? rows : [] });
}

export async function PATCH(request: Request) {
  const identity = await adminIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => null) as { reportId?: unknown; action?: unknown } | null;
  const reportId = String(body?.reportId ?? "").trim();
  const action = String(body?.action ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(reportId) || !["dismiss", "resolve", "mark_reviewed"].includes(action)) {
    return NextResponse.json({ error: "Invalid review action" }, { status: 400 });
  }

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/review_gtp_pedigree_report`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_report_id: reportId, p_action: action }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not review lineage report", detail: await response.text() }, { status: response.status });
  return NextResponse.json({ ok: true });
}
