import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

export async function POST() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/snake_sorter_assign_splits`, {
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
  if (!response.ok) return NextResponse.json({ error: "Could not assign dataset splits" }, { status: 400 });
  const changed = await response.json();
  return NextResponse.json({ ok: true, changed: Number(changed ?? 0) });
}
