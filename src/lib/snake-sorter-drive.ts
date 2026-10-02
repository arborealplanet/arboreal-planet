/**
 * Google Drive auth for the Snake Sorter pipeline.
 *
 * Uses a user OAuth refresh token for the Snake Sorter Google account.
 * Service accounts were tried first and are a dead end: Google does not
 * grant them storage quota on consumer Gmail Drives
 * ("Service Accounts do not have storage quota"), so every byte upload
 * fails. A user refresh token uploads against the user's own 15 GB quota.
 *
 * Env: SNAKE_SORTER_DRIVE_CLIENT_ID,
 *      SNAKE_SORTER_DRIVE_CLIENT_SECRET,
 *      SNAKE_SORTER_DRIVE_REFRESH_TOKEN
 */

let cachedToken: { token: string; exp: number } | null = null;

/** OAuth2 access token for the Drive account (full drive scope). */
export async function driveAccessToken(): Promise<string | null> {
  try {
    const clientId = process.env.SNAKE_SORTER_DRIVE_CLIENT_ID ?? "";
    const clientSecret = process.env.SNAKE_SORTER_DRIVE_CLIENT_SECRET ?? "";
    const refreshToken = process.env.SNAKE_SORTER_DRIVE_REFRESH_TOKEN ?? "";
    if (!clientId || !clientSecret || !refreshToken) return null;
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && cachedToken.exp > now + 120) return cachedToken.token;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    }).catch(() => null);
    if (!res || !res.ok) {
      cachedToken = null;
      return null;
    }
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
    return data.access_token;
  } catch {
    cachedToken = null;
    return null;
  }
}
