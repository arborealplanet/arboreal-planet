import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type ProfileMini = { id: string; username: string; display_name: string | null; avatar_url: string | null };
type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  requester: ProfileMini | null;
  addressee: ProfileMini | null;
};

const PROFILE_SELECT = "id,username,display_name,avatar_url";

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const me = identity.user.id;
  const headers = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" };
  const select = encodeURIComponent(`id,requester_id,addressee_id,status,created_at,requester:profiles!friendships_requester_id_fkey(${PROFILE_SELECT}),addressee:profiles!friendships_addressee_id_fkey(${PROFILE_SELECT})`);

  const [asRequester, asAddressee] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/friendships?requester_id=eq.${me}&select=${select}&order=created_at.desc`, { headers, cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/friendships?addressee_id=eq.${me}&select=${select}&order=created_at.desc`, { headers, cache: "no-store" }),
  ]);
  if (!asRequester.ok || !asAddressee.ok) return NextResponse.json({ error: "Could not load friends" }, { status: 400 });

  const rows = [...((await asRequester.json().catch(() => [])) as FriendshipRow[]), ...((await asAddressee.json().catch(() => [])) as FriendshipRow[])];
  const other = (row: FriendshipRow): ProfileMini | null => (row.requester_id === me ? row.addressee : row.requester);

  const shape = (row: FriendshipRow) => ({ friendshipId: row.id, since: row.created_at, profile: other(row) });

  return NextResponse.json({
    friends: rows.filter((r) => r.status === "accepted").map(shape),
    pendingReceived: rows.filter((r) => r.status === "pending" && r.addressee_id === me).map(shape),
    pendingSent: rows.filter((r) => r.status === "pending" && r.requester_id === me).map(shape),
  });
}
