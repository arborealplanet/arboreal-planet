import { NextResponse } from "next/server";
import { supabaseAuthRequest } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const origin = new URL(request.url).origin;
  const redirectTo = new URL("/auth/email/bridge", origin);
  redirectTo.searchParams.set("next", "/reset-password");

  const auth = await supabaseAuthRequest(`recover?redirect_to=${encodeURIComponent(redirectTo.toString())}`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) {
    const raw = String(data?.msg ?? data?.error_description ?? data?.message ?? "Unable to send password reset email.");
    const lower = raw.toLowerCase();
    const error = lower.includes("rate") ? "Please wait a minute before requesting another reset email." : raw;
    return NextResponse.json({ error }, { status: lower.includes("rate") ? 429 : auth.status || 400 });
  }

  return NextResponse.json({ ok: true });
}
