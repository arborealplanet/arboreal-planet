import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UNLOCK_COOKIE = "ss_unlock";

async function rpc(token: string, name: string, body: Record<string, unknown> = {}) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function approvedIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  return identity;
}

export async function GET() {
  const identity = await approvedIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { response, data } = await rpc(identity.token, "snake_sorter_has_pin");
  if (!response.ok) return NextResponse.json({ error: "Could not read lock status." }, { status: 502 });

  return NextResponse.json({ hasPin: data === true });
}

export async function POST(request: NextRequest) {
  const identity = await approvedIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { action?: string; pin?: string };
  const action = String(body.action ?? "");

  if (action === "lock") {
    await rpc(identity.token, "revoke_snake_sorter_unlock_sessions");
    const response = NextResponse.json({ ok: true });
    response.cookies.set(UNLOCK_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }

  const pin = String(body.pin ?? "").trim();
  if (!/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 to 8 digits." }, { status: 400 });
  }

  if (action === "setup") {
    const setup = await rpc(identity.token, "set_snake_sorter_pin", { p_pin: pin });
    if (!setup.response.ok) {
      return NextResponse.json({ error: setup.data?.message ?? "Could not save PIN." }, { status: 400 });
    }
  } else if (action !== "unlock") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const unlocked = await rpc(identity.token, "unlock_snake_sorter", { p_pin: pin });
  if (!unlocked.response.ok || typeof unlocked.data !== "string") {
    const message = String(unlocked.data?.message ?? "");
    const status = message.includes("temporarily locked") ? 423 : 401;
    return NextResponse.json({
      error: status === 423
        ? "Too many failed attempts. Snake Sorter is locked for 15 minutes."
        : "Incorrect PIN."
    }, { status });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(UNLOCK_COOKIE, unlocked.data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
