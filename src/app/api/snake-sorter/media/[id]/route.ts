import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const authHeaders = (token: string) => ({ apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" });
async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}
function storagePath(path: string) { return path.split("/").map(encodeURIComponent).join("/"); }

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await ownerIdentity();
  if (!identity) return new NextResponse("Not found", { status: 404 });
  const { id } = await context.params;
  const meta = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?id=eq.${encodeURIComponent(id)}&select=storage_path,mime_type,original_name`, { headers: authHeaders(identity.token), cache: "no-store" });
  if (!meta.ok) return new NextResponse("Unavailable", { status: 502 });
  const rows = await meta.json() as Array<{ storage_path: string; mime_type: string | null; original_name: string | null }>;
  const row = rows[0];
  if (!row) return new NextResponse("Not found", { status: 404 });

  const object = await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/authenticated/snake-sorter-reference/${storagePath(row.storage_path)}`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` },
    cache: "no-store",
  });
  if (!object.ok) return new NextResponse("Unavailable", { status: object.status });
  return new NextResponse(object.body, {
    status: 200,
    headers: {
      "Content-Type": row.mime_type || object.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${(row.original_name || "reference-image").replace(/"/g, "")}"`,
    },
  });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await context.params;
  const h = authHeaders(identity.token);
  const meta = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?id=eq.${encodeURIComponent(id)}&select=storage_path`, { headers: h, cache: "no-store" });
  const rows = meta.ok ? await meta.json() as Array<{ storage_path: string }> : [];
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const objectDelete = await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/snake-sorter-reference/${storagePath(row.storage_path)}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` },
    cache: "no-store",
  });
  if (!objectDelete.ok && objectDelete.status !== 404) return NextResponse.json({ error: "Could not remove stored image" }, { status: 400 });

  const dbDelete = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...h, Prefer: "return=minimal" },
    cache: "no-store",
  });
  if (!dbDelete.ok) return NextResponse.json({ error: "Could not remove media record" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
