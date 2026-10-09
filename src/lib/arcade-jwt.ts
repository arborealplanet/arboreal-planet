import { createSign } from "node:crypto";

// Bridge to the standalone Arboreal Arcade (own Supabase project, own
// Vercel deployment). Planet is the source of truth for identity and roles:
// this module mints Arcade JWTs (ES256, signed with the Arcade Supabase
// project's current ECC P-256 JWT signing private key) so Planet's server can
// call the Arcade's API and hand off logins. The Arcade never syncs user rows;
// it trusts the user_role claim. PostgREST validates the token against the
// Supabase project's signing key, so auth.uid() and RLS work.
//
// Required server-only env: ARCADE_JWT_SECRET (the PEM-encoded ECC P-256
// PRIVATE key from the Arcade Supabase dashboard → JWT Signing Keys).
// Optional: ARCADE_BASE_URL (defaults to production), ARCADE_JWT_KID.

const ARCADE_JWT_PRIVATE_KEY = process.env.ARCADE_JWT_SECRET ?? "";
// Supabase's JWKS normalizes key IDs to lowercase; ensure the token's kid
// matches exactly or PostgREST won't find the signing key.
const ARCADE_JWT_KID = (process.env.ARCADE_JWT_KID ?? "").toLowerCase();
const ARCADE_BASE_URL = process.env.ARCADE_BASE_URL ?? "https://arboreal-arcade.vercel.app";

function base64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

/** DER-encoded ECDSA signature -> JOSE 64-byte R||S. */
function derToJose(der: Buffer): Buffer {
  let o = 0;
  if (der[o++] !== 0x30) throw new Error("bad DER sequence");
  let len = der[o++];
  if (len & 0x80) o += len & 0x7f;
  if (der[o++] !== 0x02) throw new Error("bad DER r");
  const rLen = der[o++];
  let r = der.subarray(o, o + rLen);
  o += rLen;
  if (der[o++] !== 0x02) throw new Error("bad DER s");
  const sLen = der[o++];
  let s = der.subarray(o, o + sLen);
  if (r[0] === 0x00) r = r.subarray(1);
  if (s[0] === 0x00) s = s.subarray(1);
  const out = Buffer.alloc(64);
  r.copy(out, 32 - r.length);
  s.copy(out, 64 - s.length);
  return out;
}

/** Mint an Arcade JWT (ES256). Returns null when the bridge isn't configured. */
export function mintArcadeJwt(
  planetUserId: string,
  userRole: string,
  expiresInSeconds = 300
): string | null {
  if (!ARCADE_JWT_PRIVATE_KEY) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlJson({
    alg: "ES256",
    typ: "JWT",
    ...(ARCADE_JWT_KID ? { kid: ARCADE_JWT_KID } : {}),
  });
  const payload = base64urlJson({
    sub: planetUserId,
    role: "authenticated",
    user_role: userRole,
    iat: now,
    exp: now + expiresInSeconds,
  });
  const signingInput = `${header}.${payload}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const der = signer.sign(ARCADE_JWT_PRIVATE_KEY);
  const jose = derToJose(der);
  return `${signingInput}.${jose.toString("base64url")}`;
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
