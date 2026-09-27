import { NextResponse } from "next/server";
import { callRpc, requirePokerIdentity } from "@/lib/poker-server";

export const runtime = "nodejs";

// GET: whether the caller is exempt from Canopy Hunter expedition entry
// limits (weekly free cooldown + per-trip fee). Anonymous players and
// lookup failures fall back to the standard entry model.
export async function GET() {
  const identity = await requirePokerIdentity();
  if (!identity) return NextResponse.json({ unlimited: false, anonymous: true });
  try {
    const unlimited = await callRpc<boolean>(identity.token, "canopy_hunter_is_exempt", {});
    return NextResponse.json({ unlimited: unlimited === true });
  } catch {
    return NextResponse.json({ unlimited: false });
  }
}
