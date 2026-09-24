import { NextResponse } from "next/server";
import { getServerIdentity, supabaseAuthRequest } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { newEmail?: string } | null;
  const newEmail = String(body?.newEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const auth = await supabaseAuthRequest("user", {
    method: "PUT",
    body: JSON.stringify({ email: newEmail }),
  }, identity.token);
  const data = await auth.json().catch(() => ({}));
  if (!auth.ok) {
    return NextResponse.json({ error: data?.msg ?? data?.error_description ?? data?.message ?? "Unable to update email." }, { status: auth.status });
  }

  return NextResponse.json({ ok: true });
}
