import { NextResponse } from "next/server";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return new NextResponse("Not found", { status: 404 });
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return new NextResponse("Not found", { status: 404 });

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const h = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" };
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_contributions?id=eq.${encodeURIComponent(id)}&select=contributor_user_id,storage_path,mime_type&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const rows = response.ok ? await response.json() as Array<{ contributor_user_id: string; storage_path: string; mime_type: string }> : [];
  const row = rows[0];
  if (!row?.storage_path) return new NextResponse("Not found", { status: 404 });
  if (!access.isOwner && row.contributor_user_id !== identity.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const object = await fetch(
    `${SUPABASE_AUTH_URL}/storage/v1/object/authenticated/snake-sorter-contributions/${storagePath(row.storage_path)}`,
    { headers: h, cache: "no-store" },
  );
  if (!object.ok) return new NextResponse("Unavailable", { status: object.status });

  return new NextResponse(object.body, {
    status: 200,
    headers: {
      "Content-Type": row.mime_type || object.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
