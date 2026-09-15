import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const TYPES = new Set(["ANIMAL", "PLANT", "MARKET_LISTING"]);

type ItemType = "ANIMAL" | "PLANT" | "MARKET_LISTING";

function parse(request: NextRequest) {
  const type = String(request.nextUrl.searchParams.get("type") ?? "").toUpperCase() as ItemType;
  const id = String(request.nextUrl.searchParams.get("id") ?? "").trim();
  if (!TYPES.has(type) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { type, id };
}

async function publicItemExists(type: ItemType, id: string) {
  const headers = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json", Prefer: "count=exact" };
  const path = type === "ANIMAL"
    ? `species?id=eq.${id}&published=eq.true&select=id`
    : type === "PLANT"
      ? `plant_collections?id=eq.${id}&status=neq.PLANNED&select=id`
      : `marketplace_listings?id=eq.${id}&status=eq.ACTIVE&select=id`;
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!response.ok) return false;
  const rows = await response.json().catch(() => []) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function GET(request: NextRequest) {
  const item = parse(request);
  if (!item) return NextResponse.json({ error: "Invalid watchlist item" }, { status: 400 });
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ signedIn: false, saved: false });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_watchlist_items?user_id=eq.${encodeURIComponent(identity.user.id)}&item_type=eq.${item.type}&item_id=eq.${item.id}&select=id&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const rows = response.ok ? await response.json().catch(() => []) as Array<{ id: string }> : [];
  return NextResponse.json({ signedIn: true, saved: rows.length > 0 });
}

export async function POST(request: NextRequest) {
  const item = parse(request);
  if (!item) return NextResponse.json({ error: "Invalid watchlist item" }, { status: 400 });
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!await publicItemExists(item.type, item.id)) return NextResponse.json({ error: "Item not available" }, { status: 404 });

  const query = `${SUPABASE_AUTH_URL}/rest/v1/user_watchlist_items?user_id=eq.${encodeURIComponent(identity.user.id)}&item_type=eq.${item.type}&item_id=eq.${item.id}`;
  const check = await fetch(`${query}&select=id&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const existing = check.ok ? await check.json().catch(() => []) as Array<{ id: string }> : [];

  if (existing.length) {
    const remove = await fetch(query, {
      method: "DELETE",
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Prefer: "return=minimal" },
      cache: "no-store",
    });
    if (!remove.ok) return NextResponse.json({ error: "Could not remove saved item" }, { status: 400 });
    return NextResponse.json({ saved: false });
  }

  const add = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/user_watchlist_items`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: identity.user.id, item_type: item.type, item_id: item.id }),
    cache: "no-store",
  });
  if (!add.ok) return NextResponse.json({ error: "Could not save item" }, { status: 400 });
  return NextResponse.json({ saved: true });
}
