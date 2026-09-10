import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SUPABASE_AUTH_URL = "https://ykaqnxajszwgeqkmaora.supabase.co";
export const SUPABASE_AUTH_KEY = "sb_publishable_tYr_JfyA_WTGk8qNkL93iw_8uknK50C";
export const ACCESS_COOKIE = "ap_access";
export const REFRESH_COOKIE = "ap_refresh";

type AuthSession = { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } };

export async function supabaseAuthRequest(path: string, init: RequestInit = {}, bearer?: string) {
  return fetch(`${SUPABASE_AUTH_URL}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function verifyAccessToken(token: string) {
  const response = await supabaseAuthRequest("user", { method: "GET" }, token);
  if (!response.ok) return null;
  return response.json() as Promise<{ id: string; email?: string | null; user_metadata?: Record<string, unknown> }>;
}

export async function refreshAuthSession(refreshToken: string): Promise<AuthSession | null> {
  const response = await supabaseAuthRequest("token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  return response.json() as Promise<AuthSession>;
}

export function writeAuthCookies(response: NextResponse, session: AuthSession) {
  if (!session.access_token || !session.refresh_token) return;
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: session.expires_in ?? 3600 });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getServerIdentity() {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (token) {
    const user = await verifyAccessToken(token);
    if (user) return { token, user };
  }

  if (refreshToken) {
    const session = await refreshAuthSession(refreshToken);
    if (session?.access_token) {
      const user = session.user ?? await verifyAccessToken(session.access_token);
      if (user) return { token: session.access_token, user };
    }
  }

  return null;
}

export async function fetchOwnProfile(token: string, userId: string) {
  const fields = "id,username,display_name,bio,location,avatar_url,banner_url,accent_color,profile_visibility,seller_enabled,role,website_url,instagram_url,facebook_url,seller_verification_status,seller_verification_requested_at,seller_verified_at";
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=${fields}`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}
