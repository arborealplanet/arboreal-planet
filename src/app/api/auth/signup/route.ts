import { NextResponse } from "next/server";
import { supabaseAuthRequest, writeAuthCookies } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string; displayName?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  if (body.password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  const auth = await supabaseAuthRequest("signup", { method: "POST", body: JSON.stringify({ email: body.email.trim(), password: body.password, data: { display_name: body.displayName?.trim() || undefined } }) });
  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) return NextResponse.json({ error: data?.msg ?? data?.error_description ?? "Unable to create account." }, { status: auth.status });
  const response = NextResponse.json({ ok: true, needsConfirmation: !data.access_token, user: data.user });
  writeAuthCookies(response, data);
  return response;
}
