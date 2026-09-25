import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mirrors src/lib/supabase-auth.ts (which cannot be imported here — it pulls in
// next/headers, unavailable in middleware). Keep the two in sync.
const SUPABASE_AUTH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ykaqnxajszwgeqkmaora.supabase.co";
const SUPABASE_AUTH_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_tYr_JfyA_WTGk8qNkL93iw_8uknK50C";
const ACCESS_COOKIE = "ap_access";
const REFRESH_COOKIE = "ap_refresh";

// Refresh a touch early so a token expiring mid-request doesn't 401 downstream.
const EXPIRY_LEEWAY_SECONDS = 30;

function accessTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const data = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof data.exp !== "number") return true;
    return data.exp <= Math.floor(Date.now() / 1000) + EXPIRY_LEEWAY_SECONDS;
  } catch {
    return true;
  }
}

type RefreshSession = { access_token?: string; refresh_token?: string; expires_in?: number };

async function refreshAuthSession(refreshToken: string): Promise<RefreshSession | null> {
  try {
    const response = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_AUTH_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as RefreshSession;
  } catch {
    return null;
  }
}

// getServerIdentity() refreshes an expired access token from the ap_refresh
// cookie but never persists the new tokens, so the next request repeats the
// refresh and races into mystery 401s. This middleware persists refreshed
// tokens as cookies ahead of time. It is deliberately cheap: when a
// non-expired ap_access cookie is present (expiry decoded locally, no network
// call), the request passes through untouched.
export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken && !accessTokenExpired(accessToken)) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.next();

  const session = await refreshAuthSession(refreshToken);
  const response = NextResponse.next();
  if (session?.access_token && session?.refresh_token) {
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ACCESS_COOKIE, session.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: session.expires_in ?? 3600,
    });
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp4|webm|mp3|css|js|woff2?|ttf)$).*)"],
};
