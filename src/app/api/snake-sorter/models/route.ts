import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const headers = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_model_versions?select=*&order=created_at.desc`,
    { headers: headers(identity.token), cache: "no-store" }
  );
  if (!response.ok) return NextResponse.json({ error: "Model registry unavailable" }, { status: 502 });
  return NextResponse.json({ models: await response.json() });
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "");
  if (action !== "activate") return NextResponse.json({ error: "Unsupported model action" }, { status: 400 });
  const modelId = String(body.model_id ?? "");
  if (!modelId) return NextResponse.json({ error: "Missing model id" }, { status: 400 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/snake_sorter_activate_model`, {
    method: "POST",
    headers: { ...headers(identity.token), "Content-Type": "application/json" },
    body: JSON.stringify({ p_model_id: modelId }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Could not activate model", detail: detail.slice(0,500) }, { status: 400 });
  }
  return NextResponse.json({ ok: true, model: await response.json() });
}
