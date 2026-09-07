import { NextResponse } from "next/server";
import { supabaseAuthRequest, writeAuthCookies } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const auth = await supabaseAuthRequest("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: body.email.trim(), password: body.password }),
  });
  const data = await auth.json().catch(() => ({}));

  if (!auth.ok) {
    const raw = String(data?.msg ?? data?.error_description ?? data?.message ?? "Unable to sign in.");
    const lower = raw.toLowerCase();
    if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
      return NextResponse.json(
        { error: "Your email still needs to be confirmed.", code: "EMAIL_NOT_CONFIRMED" },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: raw }, { status: auth.status });
  }

  const response = NextResponse.json({ ok: true, user: data.user });
  writeAuthCookies(response, data);
  return response;
}
