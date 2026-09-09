import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const MAX_SAVE_BYTES = 250_000;
const EXTENSION_KEYS = [
  "favoriteIds",
  "selectedBreederTitle",
  "careerReputation",
  "facilityId",
  "facilityRooms",
  "facilityConstruction",
  "claimedProjectIds",
  "claimedContractIds",
  "ownedWardrobe",
  "selectedWardrobe",
  "scoutsUsedSeason",
  "scoutsUsedThisSeason",
  "plannedPairings",
  "projectTags",
  "showHistory",
  "breedingCycle",
  "geneticTestsPending",
  "femaleRecovery",
  "lastRecoveryClutchId",
  "seasonCarePaid",
  "breedingMessage",
  "retiredBreeders",
] as const;

async function claimTargetedBonus(token: string) {
  try {
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/claim_arborealsbybunn_chondro_bonus`, {
      method: "POST",
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
  } catch {}
}

async function readExistingState(userId: string, token: string) {
  try {
    const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/chondro_game_saves?user_id=eq.${encodeURIComponent(userId)}&select=state&limit=1`, {
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return {} as Record<string, unknown>;
    const rows = (await response.json()) as Array<{ state?: Record<string, unknown> }>;
    return rows[0]?.state && typeof rows[0].state === "object" ? rows[0].state : {};
  } catch { return {} as Record<string, unknown>; }
}

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ authenticated: false }, { status: 401 });
  await claimTargetedBonus(identity.token);
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/chondro_game_saves?user_id=eq.${encodeURIComponent(identity.user.id)}&select=state,version,updated_at&limit=1`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load game save." }, { status: 502 });
  const rows = (await response.json()) as Array<{ state?: unknown; version?: number; updated_at?: string }>;
  const save = rows[0] ?? null;
  return NextResponse.json({ authenticated: true, save: save ? { state: save.state ?? {}, version: save.version ?? 1, updatedAt: save.updated_at ?? null } : null });
}

export async function PUT(request: NextRequest) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ authenticated: false }, { status: 401 });
  const raw = await request.text();
  if (!raw || raw.length > MAX_SAVE_BYTES) return NextResponse.json({ error: "Game save is empty or too large." }, { status: 400 });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid game save." }, { status: 400 }); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NextResponse.json({ error: "Invalid game save." }, { status: 400 });

  const incoming = parsed as Record<string, unknown>;
  const existing = await readExistingState(identity.user.id, identity.token);
  const state: Record<string, unknown> = { ...incoming };
  for (const key of EXTENSION_KEYS) if (!(key in incoming) && key in existing) state[key] = existing[key];

  if (Array.isArray(state.favoriteIds)) state.favoriteIds = state.favoriteIds.map((id) => String(id).slice(0, 160)).slice(0, 500);
  else state.favoriteIds = [];
  if (Array.isArray(state.plannedPairings)) state.plannedPairings = state.plannedPairings.slice(0, 30);
  if (Array.isArray(state.showHistory)) state.showHistory = state.showHistory.slice(0, 100);
  if (Array.isArray(state.geneticTestsPending)) state.geneticTestsPending = state.geneticTestsPending.slice(0, 50);
  if (Array.isArray(state.retiredBreeders)) state.retiredBreeders = state.retiredBreeders.slice(0, 250);
  if (state.projectTags && typeof state.projectTags === "object" && !Array.isArray(state.projectTags)) {
    const cleaned: Record<string, string[]> = {};
    for (const [snakeId, tags] of Object.entries(state.projectTags as Record<string, unknown>)) {
      if (!Array.isArray(tags)) continue;
      cleaned[String(snakeId).slice(0, 160)] = tags.map((tag) => String(tag).slice(0, 40)).slice(0, 12);
    }
    state.projectTags = cleaned;
  }

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/chondro_game_saves?on_conflict=user_id`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: identity.user.id, state, version: 1, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to save game." }, { status: 502 });
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
