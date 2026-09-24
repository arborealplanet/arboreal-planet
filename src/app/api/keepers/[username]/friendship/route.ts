import { NextResponse } from "next/server";
import { blockBetween } from "@/lib/blocks";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type TargetProfile = { id: string; username: string; display_name: string | null };
type Friendship = { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted" };

const userHeaders = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function targetProfile(username: string): Promise<TargetProfile | null> {
  const clean = decodeURIComponent(username).trim().slice(0, 80);
  if (!clean) return null;
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(clean)}&profile_visibility=eq.public&select=id,username,display_name&limit=1`,
    { headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as TargetProfile[];
  return rows[0] ?? null;
}

async function findFriendship(token: string, me: string, them: string): Promise<Friendship | null> {
  const pair = `and=(requester_id.eq.${me},addressee_id.eq.${them}),and=(requester_id.eq.${them},addressee_id.eq.${me})`;
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/friendships?or=(${pair})&select=id,requester_id,addressee_id,status&limit=1`,
    { headers: userHeaders(token), cache: "no-store" },
  );
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as Friendship[];
  return rows[0] ?? null;
}

function statusFor(row: Friendship | null, me: string) {
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  return row.requester_id === me ? "pending_sent" : "pending_received";
}

/** Best-effort friend notification; never fails the friendship action itself. */
async function notifyFriendEvent(token: string, userId: string, type: string, title: string, body: string, href: string, actorId: string) {
  try {
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/notifications`, {
      method: "POST",
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, type, title, body, href, actor_id: actorId }),
      cache: "no-store",
    });
  } catch {
    /* notifications are advisory; the friendship write already succeeded */
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const target = await targetProfile(username);
  if (!target) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });

  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ signedIn: false });
  if (identity.user.id === target.id) return NextResponse.json({ signedIn: true, isSelf: true });

  const row = await findFriendship(identity.token, identity.user.id, target.id);
  return NextResponse.json({ signedIn: true, status: statusFor(row, identity.user.id), target: { username: target.username, displayName: target.display_name } });
}

const ACTIONS = new Set(["request", "accept", "decline", "cancel", "remove"]);

export async function POST(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { username } = await params;
  const target = await targetProfile(username);
  if (!target) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });
  if (identity.user.id === target.id) return NextResponse.json({ error: "You cannot friend yourself" }, { status: 400 });
  if (await blockBetween(identity.token, identity.user.id, target.id)) return NextResponse.json({ error: "You cannot interact with this keeper right now." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;
  if (!action || !ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const me = identity.user.id;
  const headers = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "return=minimal",
  };
  const row = await findFriendship(identity.token, me, target.id);
  const current = statusFor(row, me);

  if (action === "request") {
    if (current !== "none") return NextResponse.json({ error: "A friendship already exists between you" }, { status: 400 });
    const insert = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/friendships`, {
      method: "POST",
      headers,
      body: JSON.stringify({ requester_id: me, addressee_id: target.id, status: "pending" }),
      cache: "no-store",
    });
    if (!insert.ok) return NextResponse.json({ error: "Could not send friend request" }, { status: 400 });
    const meName = identity.user.user_metadata?.display_name ?? identity.user.email?.split("@")[0] ?? "A keeper";
    void notifyFriendEvent(identity.token, target.id, "friend_request", `${meName} sent you a friend request`, "Accept it from your Friends page to connect.", "/friends", me);
    return NextResponse.json({ status: "pending_sent" });
  }

  if (!row) return NextResponse.json({ error: "No friendship to update" }, { status: 404 });

  if (action === "accept") {
    if (current !== "pending_received") return NextResponse.json({ error: "No incoming request to accept" }, { status: 400 });
    const update = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/friendships?id=eq.${row.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "accepted", updated_at: new Date().toISOString() }),
      cache: "no-store",
    });
    if (!update.ok) return NextResponse.json({ error: "Could not accept friend request" }, { status: 400 });
    const meName = identity.user.user_metadata?.display_name ?? identity.user.email?.split("@")[0] ?? "A keeper";
    void notifyFriendEvent(identity.token, row.requester_id, "friend_accepted", `${meName} accepted your friend request`, "You are now friends on Arboreal Planet.", `/keepers/${encodeURIComponent(target.username)}`, me);
    return NextResponse.json({ status: "friends" });
  }

  if (action === "decline" || action === "cancel" || action === "remove") {
    const allowed =
      (action === "decline" && current === "pending_received") ||
      (action === "cancel" && current === "pending_sent") ||
      (action === "remove" && current === "friends");
    if (!allowed) return NextResponse.json({ error: "That action is not available right now" }, { status: 400 });
    const del = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/friendships?id=eq.${row.id}`, {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    if (!del.ok) return NextResponse.json({ error: "Could not update friendship" }, { status: 400 });
    return NextResponse.json({ status: "none" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
