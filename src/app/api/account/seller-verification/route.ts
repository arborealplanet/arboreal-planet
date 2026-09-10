import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export async function POST() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/request_seller_verification`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: "Could not request seller verification", detail: data }, { status: response.status });
  return NextResponse.json({ ok: true, result: Array.isArray(data) ? data[0] : data });
}
