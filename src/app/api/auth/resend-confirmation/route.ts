import { NextResponse } from "next/server";
import { supabaseAuthRequest } from "@/lib/supabase-auth";

const PRODUCTION_ORIGIN = "https://arboreal-planet.vercel.app";

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
  const body = (await request.json().catch(() => null)) as { email?: string; next?: string } | null;
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const next = safeNext(body?.next);
  const redirectTo = new URL("/auth/email/bridge", confirmationOrigin(request));
  redirectTo.searchParams.set("next", next);

  const auth = await supabaseAuthRequest("resend", {
    method: "POST",
    body: JSON.stringify({
      type: "signup",
      email,
      options: { email_redirect_to: redirectTo.toString() },
    }),
  });

  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) {
    const raw = String(data?.msg ?? data?.error_description ?? data?.message ?? "Unable to resend confirmation email.");
    const lower = raw.toLowerCase();
    const status = lower.includes("rate") ? 429 : auth.status || 400;
    const error = lower.includes("rate")
      ? "Please wait a minute before requesting another confirmation email."
      : raw;
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ ok: true });
}
