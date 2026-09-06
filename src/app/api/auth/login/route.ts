import { NextResponse } from "next/server";
import { supabaseAuthRequest, writeAuthCookies } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  const auth = await supabaseAuthRequest("token?grant_type=password", { method: "POST", body: JSON.stringify({ email: body.email.trim(), password: body.password }) });
  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) return NextResponse.json({ error: data?.msg ?? data?.error_description ?? "Unable to sign in." }, { status: auth.status });
  const response = NextResponse.json({ ok: true, user: data.user });
  writeAuthCookies(response, data);
  return response;
}
