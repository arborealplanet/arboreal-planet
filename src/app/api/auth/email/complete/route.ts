import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, writeAuthCookies } from "@/lib/supabase-auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  } | null;

  if (!body?.accessToken || !body.refreshToken) {
    return NextResponse.json({ error: "Missing confirmation session." }, { status: 400 });
  }

  const user = await verifyAccessToken(body.accessToken);
  if (!user) {
    return NextResponse.json({ error: "Invalid confirmation session." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  writeAuthCookies(response, {
    access_token: body.accessToken,
    refresh_token: body.refreshToken,
    expires_in: Number.isFinite(body.expiresIn) ? Math.max(60, Math.min(86400, Number(body.expiresIn))) : 3600,
    user,
  });
  return response;
}
