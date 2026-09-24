import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// No auth required: anyone viewing a listing records a view.
// The SECURITY DEFINER RPC increments view_count without exposing the table to writes.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  try {
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/increment_listing_views`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${SUPABASE_AUTH_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ p_listing_id: id }),
      cache: "no-store",
    });
  } catch {
    // View tracking is best-effort; never break the page on a miss.
  }
  return NextResponse.json({ ok: true });
}
