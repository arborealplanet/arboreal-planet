import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, refreshAuthSession, writeAuthCookies } from "@/lib/supabase-auth";

function expiresSoon(token?: string) {
  if (!token) return true;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    return !payload.exp || payload.exp * 1000 < Date.now() + 5 * 60 * 1000;
  } catch { return true; }
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refresh && expiresSoon(access)) {
    const session = await refreshAuthSession(refresh);
    if (session) writeAuthCookies(response, session);
    else clearAuthCookies(response);
  }
  return response;
}

export const config = { matcher: ["/profile/:path*", "/admin/:path*", "/marketplace/:path*", "/messages/:path*", "/notifications/:path*", "/api/account/:path*", "/api/marketplace/:path*", "/api/messages/:path*", "/api/notifications/:path*"] };
