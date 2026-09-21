import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const headers = (token: string) => ({
  apikey: SUPABASE_AUTH_KEY,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
});

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await ownerIdentity();
  if (!identity) return new NextResponse("Not found", { status: 404 });

  const { id } = await context.params;
  const meta = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(id)}&select=staged_storage_path,staged_mime_type,title`,
    { headers: headers(identity.token), cache: "no-store" },
  );

  if (!meta.ok) return new NextResponse("Unavailable", { status: 502 });
  const rows = await meta.json() as Array<{
    staged_storage_path: string | null;
    staged_mime_type: string | null;
    title: string | null;
  }>;

  const row = rows[0];
  if (!row?.staged_storage_path) return new NextResponse("Not found", { status: 404 });

  const object = await fetch(
    `${SUPABASE_AUTH_URL}/storage/v1/object/authenticated/snake-sorter-acquisition/${storagePath(row.staged_storage_path)}`,
    {
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
      },
      cache: "no-store",
    },
  );

  if (!object.ok) return new NextResponse("Unavailable", { status: object.status });

  return new NextResponse(object.body, {
    status: 200,
    headers: {
      "Content-Type": row.staged_mime_type || object.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${(row.title || "candidate-image").replace(/"/g, "")}"`,
    },
  });
}
