import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, fetchOwnProfile } from "@/lib/supabase-auth";
import { mintArcadeJwt } from "@/lib/arcade-jwt";

// Planet → Arcade login handoff. Planet's /arcade/* redirect lands here first;
// we mint a 7-day Arcade JWT for the signed-in player and bounce them to the
// Arcade's /api/auth/handoff, which sets the cookie and clears the token from
// the URL. Anonymous visitors pass straight through (no token).
const ARCADE_BASE_URL =
  process.env.NEXT_PUBLIC_ARCADE_URL ?? "https://arboreal-arcade.vercel.app";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/arcade";
  return raw;
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const url = new URL("/api/auth/handoff", ARCADE_BASE_URL);
  url.searchParams.set("next", next);
  try {
    const identity = await getServerIdentity();
    if (identity) {
      const profile = (await fetchOwnProfile(identity.token, identity.user.id)) as {
        role?: string;
      } | null;
      const token = mintArcadeJwt(
        identity.user.id,
        profile?.role ?? "authenticated",
        7 * 24 * 3600
      );
      if (token) url.searchParams.set("token", token);
    }
  } catch {
    /* anonymous passthrough */
  }
  return NextResponse.redirect(url);
}
