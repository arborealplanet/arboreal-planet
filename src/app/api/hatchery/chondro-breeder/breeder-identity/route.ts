import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const apiHeaders = (token: string) => ({ apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ authenticated: false, initials: null }, { status: 401 });
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/chondro_breeder_identities?user_id=eq.${encodeURIComponent(identity.user.id)}&select=initials&limit=1`, { headers: apiHeaders(identity.token), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Unable to load breeder initials." }, { status: 502 });
  const rows = await response.json() as Array<{ initials?: string }>;
  return NextResponse.json({ authenticated: true, initials: rows[0]?.initials ?? null });
}

export async function POST(request: NextRequest) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in before producing your first clutch." }, { status: 401 });
  const body = await request.json() as { initials?: string };
  const initials = String(body.initials ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(initials)) return NextResponse.json({ error: "Choose 2–5 letters." }, { status: 400 });
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/chondro_breeder_identities`, { method: "POST", headers: { ...apiHeaders(identity.token), Prefer: "return=representation" }, body: JSON.stringify({ user_id: identity.user.id, initials }), cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 409 || text.includes("duplicate")) return NextResponse.json({ error: "Those initials already belong to another breeder." }, { status: 409 });
    return NextResponse.json({ error: "Breeder initials could not be claimed." }, { status: 502 });
  }
  return NextResponse.json({ initials });
}
