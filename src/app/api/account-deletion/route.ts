import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type DeletionRequest = {
  id: string;
  status: "pending" | "cancelled" | "completed";
  reason: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

function headers(token: string, prefer?: string) {
  return {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function latestRequest(token: string, userId: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/account_deletion_requests?user_id=eq.${encodeURIComponent(userId)}&select=id,status,reason,created_at,updated_at,resolved_at&order=created_at.desc&limit=1`, {
    headers: headers(token),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null) as DeletionRequest[] | { message?: string } | null;
  if (!response.ok) return { error: "Could not load deletion request.", status: response.status } as const;
  return { request: Array.isArray(data) ? data[0] ?? null : null } as const;
}

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await latestRequest(identity.token, identity.user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ request: result.request });
}

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await latestRequest(identity.token, identity.user.id);
  if ("error" in existing) return NextResponse.json({ error: existing.error }, { status: existing.status });
  if (existing.request?.status === "pending") return NextResponse.json({ error: "You already have a pending deletion request.", request: existing.request }, { status: 409 });

  const body = await request.json().catch(() => null) as { reason?: unknown } | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/account_deletion_requests`, {
    method: "POST",
    headers: headers(identity.token, "return=representation"),
    body: JSON.stringify({ user_id: identity.user.id, status: "pending", reason: reason || null }),
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null) as DeletionRequest[] | { message?: string } | null;
  if (!response.ok) return NextResponse.json({ error: "Could not submit deletion request." }, { status: response.status });
  return NextResponse.json({ request: Array.isArray(rows) ? rows[0] ?? null : null }, { status: 201 });
}

export async function DELETE() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const current = await latestRequest(identity.token, identity.user.id);
  if ("error" in current) return NextResponse.json({ error: current.error }, { status: current.status });
  if (!current.request || current.request.status !== "pending") return NextResponse.json({ error: "No pending deletion request to cancel." }, { status: 409 });

  const now = new Date().toISOString();
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/account_deletion_requests?id=eq.${encodeURIComponent(current.request.id)}&user_id=eq.${encodeURIComponent(identity.user.id)}&status=eq.pending`, {
    method: "PATCH",
    headers: headers(identity.token, "return=representation"),
    body: JSON.stringify({ status: "cancelled", updated_at: now, resolved_at: now }),
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null) as DeletionRequest[] | { message?: string } | null;
  if (!response.ok) return NextResponse.json({ error: "Could not cancel deletion request." }, { status: response.status });
  return NextResponse.json({ request: Array.isArray(rows) ? rows[0] ?? null : null });
}
