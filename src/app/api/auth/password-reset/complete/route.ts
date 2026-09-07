import { NextResponse } from "next/server";
import { getServerIdentity, supabaseAuthRequest } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Your reset session is missing or expired." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";
  if (password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });

  const auth = await supabaseAuthRequest("user", {
    method: "PUT",
    body: JSON.stringify({ password }),
  }, identity.token);
  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) {
    return NextResponse.json({ error: data?.msg ?? data?.error_description ?? data?.message ?? "Unable to update password." }, { status: auth.status });
  }

  return NextResponse.json({ ok: true });
}
