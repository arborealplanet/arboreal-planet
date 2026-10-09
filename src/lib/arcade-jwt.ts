import { createHmac } from "node:crypto";

// Bridge to the standalone Arboreal Arcade (own Supabase project, own
// Vercel deployment). Planet is the source of truth for identity and roles:
// this module mints short-lived Arcade JWTs (HS256, signed with the Arcade
// project's JWT secret) so Planet's server can call the Arcade's API as the
// owner. The Arcade never syncs user rows; it trusts the user_role claim.
//
// Required server-only env: ARCADE_JWT_SECRET (Arcade Supabase dashboard →
// API keys → JWT secret). Optional: ARCADE_BASE_URL (defaults to production).

const ARCADE_JWT_SECRET = process.env.ARCADE_JWT_SECRET ?? "";
const ARCADE_BASE_URL = process.env.ARCADE_BASE_URL ?? "https://arboreal-arcade.vercel.app";

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

/** Mint an Arcade JWT. Returns null when the bridge isn't configured. */
export function mintArcadeJwt(
  planetUserId: string,
  userRole: string,
  expiresInSeconds = 300
): string | null {
  if (!ARCADE_JWT_SECRET) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: planetUserId,
      role: "authenticated",
      user_role: userRole,
      iat: now,
      exp: now + expiresInSeconds,
    })
  );
  const signature = createHmac("sha256", ARCADE_JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Mirror an owner settings write to the standalone Arcade's arcade_settings
 * table via its owner-gated API. Best-effort: never throws, so Planet's own
 * write is unaffected if the Arcade is unreachable or unconfigured.
 */
export async function mirrorSettingToArcade(
  ownerPlanetUserId: string,
  key: string,
  value: string
): Promise<boolean> {
  const token = mintArcadeJwt(ownerPlanetUserId, "owner");
  if (!token) return false;
  try {
    const response = await fetch(`${ARCADE_BASE_URL}/api/admin/arcade-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
