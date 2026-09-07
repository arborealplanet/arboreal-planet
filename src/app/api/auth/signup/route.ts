import { NextResponse } from "next/server";
import { supabaseAuthRequest, writeAuthCookies } from "@/lib/supabase-auth";

const PRODUCTION_ORIGIN = "https://arboreal-planet.vercel.app";

function publicSignupError(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("email address not authorized")) {
    return { error: "Confirmation email delivery is not enabled for public addresses yet.", code: "EMAIL_DELIVERY_NOT_CONFIGURED", status: 503 };
  }
  if (lower.includes("rate") && lower.includes("email")) {
    return { error: "Too many confirmation emails were requested. Please wait a minute and try again.", code: "EMAIL_RATE_LIMIT", status: 429 };
  }
  return { error: raw || "Unable to create account.", code: "SIGNUP_FAILED", status: 400 };
}

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/profile";
  return value;
}

function confirmationOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  if (requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1")) return requestOrigin;
  return PRODUCTION_ORIGIN;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string; displayName?: string; next?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  if (body.password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });

  const next = safeNext(body.next);
  const redirectTo = new URL("/auth/email/bridge", confirmationOrigin(request));
  redirectTo.searchParams.set("next", next);

  const auth = await supabaseAuthRequest(`signup?redirect_to=${encodeURIComponent(redirectTo.toString())}`, {
    method: "POST",
    body: JSON.stringify({ email: body.email.trim(), password: body.password, data: { display_name: body.displayName?.trim() || undefined } }),
  });
  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) {
    const mapped = publicSignupError(String(data?.msg ?? data?.error_description ?? data?.message ?? ""));
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }

  const identities = Array.isArray(data?.user?.identities) ? data.user.identities : null;
  const possibleExistingAccount = !data.access_token && identities !== null && identities.length === 0;
  const response = NextResponse.json({ ok: true, needsConfirmation: !data.access_token && !possibleExistingAccount, possibleExistingAccount, user: data.user });
  writeAuthCookies(response, data);
  return response;
}
