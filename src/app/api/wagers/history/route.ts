import { NextResponse } from "next/server";
import { callRpc, requirePokerIdentity, rpcErrorMessage, unauthorized } from "@/lib/poker-server";

export const runtime = "nodejs";

// GET: the caller's wager receipts.
export async function GET() {
  const identity = await requirePokerIdentity();
  if (!identity) return unauthorized();
  try {
    const history = await callRpc<unknown>(identity.token, "hatchling_stakes_history", { p_limit: 20 });
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: rpcErrorMessage(err) }, { status: 500 });
  }
}
