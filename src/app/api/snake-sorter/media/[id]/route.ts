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


export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const viewType = String(body.view_type ?? "");
  const qualityStatus = String(body.quality_status ?? "");
  const isPrimary = Boolean(body.is_primary);
  const lifeStageOverride = String(body.life_stage_override ?? "");
  const neonateColorOverride = String(body.neonate_color_override ?? "");
  const captureDate = String(body.capture_date ?? "").trim();
  const approximateAgeDaysRaw = body.approximate_age_days;
  const approximateAgeDays = approximateAgeDaysRaw === "" || approximateAgeDaysRaw == null ? null : Number(approximateAgeDaysRaw);
  const allowedViews = new Set(["unknown","full_body","head","dorsal","left_lateral","right_lateral","tail","other"]);
  const allowedQuality = new Set(["accepted","hold","rejected"]);
  const allowedStages = new Set(["","hatchling","neonate","juvenile","subadult","adult","unknown"]);
  const allowedColors = new Set(["","red","yellow","not_applicable","unknown"]);
  if (!allowedViews.has(viewType) || !allowedQuality.has(qualityStatus) || !allowedStages.has(lifeStageOverride) || !allowedColors.has(neonateColorOverride) || (approximateAgeDays != null && (!Number.isInteger(approximateAgeDays) || approximateAgeDays < 0))) {
    return NextResponse.json({ error: "Invalid media review metadata" }, { status: 400 });
  }

  if (isPrimary) {
    const currentResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?id=eq.${encodeURIComponent(id)}&select=animal_id`, {
      headers: authHeaders(identity.token),
      cache: "no-store",
    });
    const currentRows = currentResponse.ok ? await currentResponse.json() as Array<{ animal_id: string }> : [];
    const animalId = currentRows[0]?.animal_id;
    if (animalId) {
      await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?animal_id=eq.${encodeURIComponent(animalId)}&id=neq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...authHeaders(identity.token), "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ is_primary: false }),
        cache: "no-store",
      });
    }
  }

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_reference_media?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...authHeaders(identity.token), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ view_type: viewType, quality_status: qualityStatus, is_primary: isPrimary, life_stage_override: lifeStageOverride || null, neonate_color_override: neonateColorOverride || null, capture_date: captureDate || null, approximate_age_days: approximateAgeDays }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not update image review metadata" }, { status: 400 });
  const rows = await response.json();
  return NextResponse.json({ ok: true, media: rows[0] ?? null });
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
