import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const MAX_SAVE_BYTES = 250_000;

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ authenticated: false }, { status: 401 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/chondro_game_saves?user_id=eq.${encodeURIComponent(identity.user.id)}&select=state,version,updated_at&limit=1`,
    {
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Unable to load game save." }, { status: 502 });
  }

  const rows = (await response.json()) as Array<{ state?: unknown; version?: number; updated_at?: string }>;
  const save = rows[0] ?? null;
  return NextResponse.json({
    authenticated: true,
    save: save
      ? { state: save.state ?? {}, version: save.version ?? 1, updatedAt: save.updated_at ?? null }
      : null,
  });
}

export async function PUT(request: NextRequest) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ authenticated: false }, { status: 401 });

  const raw = await request.text();
  if (!raw || raw.length > MAX_SAVE_BYTES) {
    return NextResponse.json({ error: "Game save is empty or too large." }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid game save." }, { status: 400 });
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return NextResponse.json({ error: "Invalid game save." }, { status: 400 });
  }

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/chondro_game_saves?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: identity.user.id,
        state: parsed,
        version: 1,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Unable to save game." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
