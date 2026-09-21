import { NextResponse } from "next/server";
import { getServerIdentity, getSnakeSorterAccess, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function reviewerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  if (!access.isOwner && access.accessLevel !== "reviewer") return null;
  return identity;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await reviewerIdentity();
  if (!identity) return new NextResponse("Not found", { status: 404 });

  const { id } = await context.params;
  const h = { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, Accept: "application/json" };

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?id=eq.${encodeURIComponent(id)}&select=staged_storage_path,staged_mime_type&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const rows = response.ok ? await response.json() as Array<{staged_storage_path:string|null;staged_mime_type:string|null}> : [];
  const row = rows[0];
  if (!row?.staged_storage_path) return new NextResponse("Not found", { status: 404 });

  const object = await fetch(
    `${SUPABASE_AUTH_URL}/storage/v1/object/authenticated/snake-sorter-acquisition/${storagePath(row.staged_storage_path)}`,
    { headers: h, cache: "no-store" },
  );
  if (!object.ok) return new NextResponse("Unavailable", { status: object.status });

  return new NextResponse(object.body, {
    status: 200,
    headers: {
      "Content-Type": row.staged_mime_type || object.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
