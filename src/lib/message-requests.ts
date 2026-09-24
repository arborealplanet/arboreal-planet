import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "./supabase-auth";

function auth(token: string) {
  return { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function rowExists(url: string, token: string): Promise<boolean> {
  const r = await fetch(url, { headers: auth(token), cache: "no-store" });
  if (!r.ok) return false;
  const rows = await r.json().catch(() => []);
  return rows.length > 0;
}

// A request is NOT needed when the recipient already follows the requester
// or they are accepted friends — those are existing relationships.
export async function relationshipExists(token: string, requesterId: string, recipientId: string): Promise<boolean> {
  const follows = rowExists(
    `${SUPABASE_AUTH_URL}/rest/v1/user_follows?follower_id=eq.${encodeURIComponent(recipientId)}&following_id=eq.${encodeURIComponent(requesterId)}&select=follower_id&limit=1`,
    token
  );
  const friends = rowExists(
    `${SUPABASE_AUTH_URL}/rest/v1/friendships?or=(and(requester_id.eq.${encodeURIComponent(requesterId)},addressee_id.eq.${encodeURIComponent(recipientId)}),and(requester_id.eq.${encodeURIComponent(recipientId)},addressee_id.eq.${encodeURIComponent(requesterId)}))&status=eq.accepted&select=id&limit=1`,
    token
  );
  const [f, fr] = await Promise.all([follows, friends]);
  return f || fr;
}

export async function createMessageRequest(token: string, conversationId: string, requesterId: string, recipientId: string): Promise<void> {
  await fetch(`${SUPABASE_AUTH_URL}/rest/v1/message_requests`, {
    method: "POST",
    headers: { ...auth(token), "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ conversation_id: conversationId, requester_id: requesterId, recipient_id: recipientId }),
    cache: "no-store",
  }).catch(() => null);
}
