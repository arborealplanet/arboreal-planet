import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SUPABASE_AUTH_KEY,
  SUPABASE_AUTH_URL,
  clearAuthCookies,
  refreshAuthSession,
  writeAuthCookies,
} from "@/lib/supabase-auth";

const SNAKE_SORTER_UNLOCK_COOKIE = "ss_unlock";

function expiresSoon(token?: string) {
  if (!token) return true;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    return !payload.exp || payload.exp * 1000 < Date.now() + 5 * 60 * 1000;
  } catch {
    return true;
  }
}

function isSnakeSorterPath(pathname: string) {
  return pathname === "/snake-sorter"
    || pathname.startsWith("/snake-sorter/")
    || pathname.startsWith("/api/snake-sorter/");
}

function isSnakeSorterUnlockExempt(pathname: string) {
  return pathname === "/snake-sorter/unlock"
    || pathname === "/snake-sorter/login"
    || pathname === "/snake-sorter/install"
    || pathname === "/snake-sorter/manifest.webmanifest"
    || pathname === "/api/snake-sorter/security"
    || pathname === "/api/snake-sorter/app-icon-192"
    || pathname === "/api/snake-sorter/app-icon-512";
}

async function snakeSorterUnlocked(accessToken: string, unlockToken: string | undefined) {
  if (!unlockToken) return false;

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/rpc/is_snake_sorter_unlock_session_valid`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ p_token: unlockToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) return false;
  return (await response.json().catch(() => false)) === true;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let refreshedSession: Awaited<ReturnType<typeof refreshAuthSession>> = null;

  if (refresh && expiresSoon(access)) {
    refreshedSession = await refreshAuthSession(refresh);
    if (refreshedSession?.access_token) access = refreshedSession.access_token;
  }

  if (isSnakeSorterPath(pathname) && !isSnakeSorterUnlockExempt(pathname) && access) {
    const unlocked = await snakeSorterUnlocked(
      access,
      request.cookies.get(SNAKE_SORTER_UNLOCK_COOKIE)?.value,
    );

    if (!unlocked) {
      if (pathname.startsWith("/api/snake-sorter/")) {
        const locked = NextResponse.json(
          { error: "Snake Sorter is locked.", locked: true },
          { status: 423 },
        );
        if (refreshedSession) writeAuthCookies(locked, refreshedSession);
        return locked;
      }

      const url = request.nextUrl.clone();
      url.pathname = "/snake-sorter/unlock";
      url.search = "";
      const redirect = NextResponse.redirect(url);
      if (refreshedSession) writeAuthCookies(redirect, refreshedSession);
      return redirect;
    }
  }

  const response = NextResponse.next({ request });
  if (refreshedSession) writeAuthCookies(response, refreshedSession);
  else if (refresh && expiresSoon(request.cookies.get(ACCESS_COOKIE)?.value) && !access) clearAuthCookies(response);
  return response;
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/admin/:path*",
    "/marketplace/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/api/account/:path*",
    "/api/marketplace/:path*",
    "/api/messages/:path*",
    "/api/notifications/:path*",
    "/snake-sorter/:path*",
    "/api/snake-sorter/:path*",
  ],
};
