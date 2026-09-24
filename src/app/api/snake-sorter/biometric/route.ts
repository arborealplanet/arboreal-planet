import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const runtime = "nodejs";

const UNLOCK_COOKIE = "ss_unlock";
const CHALLENGE_COOKIE = "ss_wa_challenge";

type StoredCredential = {
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
  label: string | null;
  created_at: string;
};

const restHeaders = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function rpc(token: string, name: string, body: Record<string, unknown> = {}) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function approvedIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  return identity;
}

function rpId(request: NextRequest) {
  return process.env.SNAKE_SORTER_WEBAUTHN_RP_ID || new URL(request.url).hostname;
}

function origin(request: NextRequest) {
  return new URL(request.url).origin;
}

function challengeCookie(challenge: string) {
  return {
    name: CHALLENGE_COOKIE,
    value: challenge,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  };
}

async function loadCredentials(token: string): Promise<StoredCredential[]> {
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_webauthn_credentials?select=credential_id,public_key,counter,transports,label,created_at&order=created_at.asc`,
    { headers: restHeaders(token), cache: "no-store" },
  );
  if (!response.ok) return [];
  return (await response.json().catch(() => [])) as StoredCredential[];
}

// GET: list this user's registered biometric devices.
export async function GET() {
  const identity = await approvedIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const devices = await loadCredentials(identity.token);
  return NextResponse.json({
    registered: devices.length > 0,
    devices: devices.map((device) => ({
      id: device.credential_id,
      label: device.label,
      created_at: device.created_at,
    })),
  });
}

// DELETE: remove one of this user's biometric devices.
export async function DELETE(request: NextRequest) {
  const identity = await approvedIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { credentialId?: unknown };
  const credentialId = String(body.credentialId ?? "").trim();
  if (!credentialId) return NextResponse.json({ error: "Missing device." }, { status: 400 });
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_webauthn_credentials?credential_id=eq.${encodeURIComponent(credentialId)}&select=credential_id`,
    { method: "DELETE", headers: { ...restHeaders(identity.token), Prefer: "return=representation" }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not remove device." }, { status: 502 });
  const deleted = await response.json().catch(() => []) as Array<unknown>;
  if (!deleted.length) return NextResponse.json({ error: "Device not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const identity = await approvedIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const rpID = rpId(request);
  const expectedOrigin = origin(request);

  if (action === "register-options") {
    const devices = await loadCredentials(identity.token);
    const options = await generateRegistrationOptions({
      rpName: "Arboreal Planet Snake Sorter",
      rpID,
      userID: new TextEncoder().encode(identity.user.id),
      userName: identity.user.email ?? identity.user.id,
      attestationType: "none",
      excludeCredentials: devices.map((device) => ({
        id: device.credential_id,
        transports: (device.transports ?? []) as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });
    const response = NextResponse.json({ options });
    const c = challengeCookie(options.challenge);
    response.cookies.set(c.name, c.value, c);
    return response;
  }

  if (action === "register-verify") {
    const challenge = request.cookies.get(CHALLENGE_COOKIE)?.value;
    if (!challenge) return NextResponse.json({ error: "Registration expired. Try again." }, { status: 400 });
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response as never,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
    } catch {
      return NextResponse.json({ error: "Could not verify this device." }, { status: 400 });
    }
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Could not verify this device." }, { status: 400 });
    }
    const { id: credentialID, publicKey: credentialPublicKey, counter } = verification.registrationInfo.credential;
    const label = String(body.label ?? "").trim().slice(0, 80) || null;
    const insert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_webauthn_credentials`, {
      method: "POST",
      headers: { ...restHeaders(identity.token), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: identity.user.id,
        credential_id: credentialID,
        public_key: Buffer.from(credentialPublicKey).toString("base64url"),
        counter,
        transports: [],
        label,
      }),
      cache: "no-store",
    });
    if (!insert.ok) return NextResponse.json({ error: "Could not save this device." }, { status: 502 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CHALLENGE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }

  if (action === "auth-options") {
    const devices = await loadCredentials(identity.token);
    if (!devices.length) return NextResponse.json({ error: "No fingerprint devices registered." }, { status: 400 });
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: devices.map((device) => ({
        id: device.credential_id,
        transports: (device.transports ?? []) as AuthenticatorTransport[],
      })),
      userVerification: "preferred",
    });
    const response = NextResponse.json({ options });
    const c = challengeCookie(options.challenge);
    response.cookies.set(c.name, c.value, c);
    return response;
  }

  if (action === "auth-verify") {
    const challenge = request.cookies.get(CHALLENGE_COOKIE)?.value;
    if (!challenge) return NextResponse.json({ error: "Authentication expired. Try again." }, { status: 400 });
    const assertion = body.response as { id?: string } | undefined;
    const credentialId = String(assertion?.id ?? "");
    if (!credentialId) return NextResponse.json({ error: "Invalid response." }, { status: 400 });
    const devices = await loadCredentials(identity.token);
    const device = devices.find((entry) => entry.credential_id === credentialId);
    if (!device) return NextResponse.json({ error: "Unknown device." }, { status: 400 });

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response as never,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: device.credential_id,
          publicKey: new Uint8Array(Buffer.from(device.public_key, "base64url")),
          counter: Number(device.counter ?? 0),
          transports: (device.transports ?? []) as AuthenticatorTransport[],
        },
        requireUserVerification: false,
      });
    } catch {
      return NextResponse.json({ error: "Fingerprint did not match." }, { status: 401 });
    }
    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json({ error: "Fingerprint did not match." }, { status: 401 });
    }

    await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_webauthn_credentials?credential_id=eq.${encodeURIComponent(device.credential_id)}`,
      {
        method: "PATCH",
        headers: { ...restHeaders(identity.token), "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ counter: verification.authenticationInfo.newCounter }),
        cache: "no-store",
      },
    ).catch(() => undefined);

    const unlocked = await rpc(identity.token, "unlock_snake_sorter_webauthn");
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CHALLENGE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    if (!unlocked.response.ok || typeof unlocked.data !== "string") {
      return NextResponse.json({ error: "Could not unlock Snake Sorter." }, { status: 502 });
    }
    response.cookies.set(UNLOCK_COOKIE, unlocked.data, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
