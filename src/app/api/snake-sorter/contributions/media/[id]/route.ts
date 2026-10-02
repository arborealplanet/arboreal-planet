import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import { driveAccessToken } from "@/lib/snake-sorter-drive";

export const runtime = "nodejs";

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) return new NextResponse("Not found", { status: 404 });
  // Supply-only door: any signed-in contributor may preview their own
  // media; the owner may preview everything. No membership required.
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  const isOwner = profile?.role === "owner";

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
  if (!isOwner && row.contributor_user_id !== identity.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Drive-backed videos (storage_path = "gdrive:<fileId>"). ?converted=1
  // serves the transcoded review copy when the worker has produced it,
  // falling back to the original until then.
  if (row.storage_path.startsWith("gdrive:")) {
    let driveFileId = row.storage_path.slice("gdrive:".length);
    if (new URL(request.url).searchParams.get("converted") === "1") {
      const q = await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_transcode_queue?contribution_id=eq.${encodeURIComponent(id)}&status=eq.done&select=converted_drive_file_id&order=completed_at.desc&limit=1`,
        { headers: h, cache: "no-store" },
      );
      const qRows = q.ok ? await q.json() as Array<{ converted_drive_file_id: string | null }> : [];
      if (qRows[0]?.converted_drive_file_id) driveFileId = qRows[0].converted_drive_file_id as string;
    }
    const token = await driveAccessToken();
    if (!token) return new NextResponse("Storage unavailable", { status: 502 });
    const range = request.headers.get("range");
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(range ? { Range: range } : {}),
        },
        cache: "no-store",
      },
    ).catch(() => null);
    if (!driveRes || !driveRes.ok) {
      try { await driveRes?.body?.cancel(); } catch {}
      return new NextResponse("Unavailable", { status: driveRes?.status ?? 502 });
    }
    const outHeaders: Record<string, string> = {
      "Content-Type": row.mime_type || driveRes.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "Accept-Ranges": "bytes",
    };
    const contentRange = driveRes.headers.get("content-range");
    const contentLength = driveRes.headers.get("content-length");
    if (contentRange) outHeaders["Content-Range"] = contentRange;
    if (contentLength) outHeaders["Content-Length"] = contentLength;
    return new NextResponse(driveRes.body, { status: driveRes.status, headers: outHeaders });
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
