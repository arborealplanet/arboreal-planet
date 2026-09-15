import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    childId?: unknown;
    role?: unknown;
    parentRegistryCode?: unknown;
  } | null;

  const childId = String(body?.childId ?? "").trim();
  const role = String(body?.role ?? "").trim();
  const parentRegistryCode = String(body?.parentRegistryCode ?? "").trim();

  if (!UUID_RE.test(childId) || !["dam", "sire"].includes(role)) {
    return NextResponse.json({ error: "Invalid parent-link request" }, { status: 400 });
  }

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/set_gtp_pedigree_parent`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      p_child_id: childId,
      p_role: role,
      p_parent_registry_code: parentRegistryCode || null,
    }),
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(result)
      ? "Could not update the registered parent link."
      : String((result as { message?: unknown } | null)?.message ?? "Could not update the registered parent link.");
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json({ ok: true, link: Array.isArray(result) ? result[0] ?? null : result });
}
