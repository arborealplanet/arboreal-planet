import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TransferActionBody = {
  action?: unknown;
  animalId?: unknown;
  recipientUsername?: unknown;
  historyPublic?: unknown;
  transferId?: unknown;
};

async function rpc(identity: Awaited<ReturnType<typeof getServerIdentity>>, fn: string, body: Record<string, unknown>) {
  if (!identity) return { response: null, data: null };
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { response, data } = await rpc(identity, "list_gtp_pedigree_transfers", {});
  if (!response?.ok) return NextResponse.json({ error: "Unable to load transfers", detail: data }, { status: response?.status ?? 500 });

  return NextResponse.json({
    transfers: (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
      id: row.transfer_id,
      animalId: row.animal_id,
      animalName: row.animal_name,
      registryCode: row.registry_code,
      fromOwnerId: row.from_owner_id,
      fromUsername: row.from_username,
      fromDisplayName: row.from_display_name,
      toOwnerId: row.to_owner_id,
      toUsername: row.to_username,
      toDisplayName: row.to_display_name,
      status: row.status,
      historyPublic: row.history_public,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      direction: String(row.from_owner_id) === identity.user.id ? "outgoing" : "incoming",
    })),
  });
}

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as TransferActionBody | null;
  const action = String(body?.action ?? "");

  if (action === "create") {
    const animalId = String(body?.animalId ?? "").trim();
    const recipientUsername = String(body?.recipientUsername ?? "").trim().replace(/^@/, "");
    if (!UUID_RE.test(animalId) || !recipientUsername || recipientUsername.length > 80) return NextResponse.json({ error: "Invalid transfer request" }, { status: 400 });
    const { response, data } = await rpc(identity, "create_gtp_pedigree_transfer", {
      p_animal_id: animalId,
      p_recipient_username: recipientUsername,
      p_history_public: body?.historyPublic === true,
    });
    if (!response?.ok) return NextResponse.json({ error: "Unable to start transfer", detail: data }, { status: response?.status ?? 500 });
    const result = Array.isArray(data) ? data[0] : null;
    return NextResponse.json({ ok: true, transfer: result });
  }

  if (action === "accept" || action === "decline") {
    const transferId = String(body?.transferId ?? "").trim();
    if (!UUID_RE.test(transferId)) return NextResponse.json({ error: "Invalid transfer" }, { status: 400 });
    const { response, data } = await rpc(identity, "respond_gtp_pedigree_transfer", {
      p_transfer_id: transferId,
      p_accept: action === "accept",
    });
    if (!response?.ok) return NextResponse.json({ error: `Unable to ${action} transfer`, detail: data }, { status: response?.status ?? 500 });
    return NextResponse.json({ ok: true, result: Array.isArray(data) ? data[0] : data });
  }

  if (action === "cancel") {
    const transferId = String(body?.transferId ?? "").trim();
    if (!UUID_RE.test(transferId)) return NextResponse.json({ error: "Invalid transfer" }, { status: 400 });
    const { response, data } = await rpc(identity, "cancel_gtp_pedigree_transfer", { p_transfer_id: transferId });
    if (!response?.ok) return NextResponse.json({ error: "Unable to cancel transfer", detail: data }, { status: response?.status ?? 500 });
    return NextResponse.json({ ok: true, cancelled: data === true });
  }

  return NextResponse.json({ error: "Unknown transfer action" }, { status: 400 });
}
