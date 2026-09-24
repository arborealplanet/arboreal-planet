import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type ReqRow = { id: string; conversation_id: string; requester_id: string; recipient_id: string; status: string; created_at: string };
type Row = { conversation_id: string; listing_title?: string | null };

const anon = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" };

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const me = identity.user.id;

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/conversation_summary`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not load conversations" }, { status: 502 });
  const rows = (await response.json()) as Row[];

  // Pending + declined message requests involving me, with the other party's profile info.
  // (Declined rows let the inbox hide rejected threads for recipients and tag them for requesters.)
  let requests: Array<ReqRow & { direction: "incoming" | "outgoing"; other_username: string | null; other_display_name: string | null; other_avatar_url: string | null; listing_title: string | null }> = [];
  try {
    const rr = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/message_requests?or=(requester_id.eq.${me},recipient_id.eq.${me})&status=in.(pending,declined)&select=id,conversation_id,requester_id,recipient_id,status,created_at&order=created_at.desc&limit=50`,
      { headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" }, cache: "no-store" }
    );
    const reqRows = (rr.ok ? await rr.json() : []) as ReqRow[];
    if (reqRows.length) {
      const otherIds = [...new Set(reqRows.map((x) => (x.requester_id === me ? x.recipient_id : x.requester_id)))];
      const pr = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${otherIds.map(encodeURIComponent).join(",")})&select=id,username,display_name,avatar_url`, { headers: anon, cache: "no-store" });
      const people = (pr.ok ? await pr.json() : []) as Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>;
      const byId = new Map(people.map((p) => [p.id, p]));
      const titleByConv = new Map(rows.map((r) => [r.conversation_id, r.listing_title ?? null]));
      requests = reqRows.map((x) => {
        const incoming = x.recipient_id === me;
        const other = byId.get(incoming ? x.requester_id : x.recipient_id);
        return {
          ...x,
          direction: incoming ? "incoming" : "outgoing",
          other_username: other?.username ?? null,
          other_display_name: other?.display_name ?? null,
          other_avatar_url: other?.avatar_url ?? null,
          listing_title: titleByConv.get(x.conversation_id) ?? null,
        };
      });
    }
  } catch {
    requests = [];
  }

  return NextResponse.json({ rows, requests });
}
