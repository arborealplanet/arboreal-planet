import { NextResponse } from "next/server";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function reviewerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  if (!access.isOwner && access.accessLevel !== "reviewer") return null;
  return identity;
}

export async function GET() {
  const identity = await reviewerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/rpc/get_snake_sorter_acquisition_balance`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: "Could not load acquisition balance." }, { status: 502 });
  }

  return NextResponse.json(data);
}
