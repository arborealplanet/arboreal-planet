import { createSign } from "node:crypto";

/**
 * Shared Google Drive service-account auth for Snake Sorter.
 * Hand-rolled RS256 JWT exchange — no googleapis dependency.
 */

function b64u(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function getServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.SNAKE_SORTER_DRIVE_KEY_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { client_email?: unknown; private_key?: unknown };
    if (typeof parsed.client_email === "string" && typeof parsed.private_key === "string") {
      return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
    }
  } catch {
    // fall through
  }
  return null;
}

let cachedToken: { token: string; exp: number } | null = null;

/** OAuth2 access token for the Drive service account (drive.file scope). */
export async function driveAccessToken(): Promise<string | null> {
  const key = getServiceAccount();
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 120) return cachedToken.token;
  const header = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64u(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = b64u(signer.sign(key.private_key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) {
    cachedToken = null;
    return null;
  }
  const data = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return data.access_token;
}
