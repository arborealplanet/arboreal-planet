import { NextResponse } from "next/server";
import { getServerIdentity, supabaseAuthRequest } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { newPassword?: string } | null;
  const newPassword = String(body?.newPassword ?? "");
  if (newPassword.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });

  const auth = await supabaseAuthRequest("user", {
    method: "PUT",
    body: JSON.stringify({ password: newPassword }),
  }, identity.token);
  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) {
    return NextResponse.json({ error: data?.msg ?? data?.error_description ?? data?.message ?? "Unable to update password." }, { status: auth.status });
  }

  return NextResponse.json({ ok: true });
}
