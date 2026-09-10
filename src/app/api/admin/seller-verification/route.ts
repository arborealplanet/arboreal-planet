import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function requireStaff() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string | null } | null;
  if (!profile || !["admin", "owner"].includes(profile.role ?? "")) return null;
  return identity;
}

export async function GET() {
  const identity = await requireStaff();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/seller_verification_queue`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Verification queue unavailable" }, { status: 502 });
  return NextResponse.json({ rows: await response.json() });
}

export async function POST(request: NextRequest) {
  const identity = await requireStaff();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => null) as { userId?: string; decision?: string } | null;
  const decision = body?.decision === "verified" || body?.decision === "rejected" ? body.decision : null;
  if (!body?.userId || !decision) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/review_seller_verification`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ target_user_id: body.userId, decision }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not review seller" }, { status: 400 });
  return NextResponse.json({ ok: true, status: await response.json() });
}
