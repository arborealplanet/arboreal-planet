import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

function storageObjectUrl(path: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_AUTH_URL}/storage/v1/object/gtp-pedigrees/${encoded}`;
}

async function removeStorageObject(path: string, token: string) {
  return fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/gtp-pedigrees`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
    cache: "no-store",
  });
}

async function patchPhotoPath(id: string, ownerId: string, token: string, photoPath: string | null) {
  return fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ photo_path: photoPath, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
}

async function fetchAnimal(id: string, token?: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(id)}&select=id,owner_id,visibility,photo_path&limit=1`, {
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null) as Array<{ id?: string; owner_id?: string; visibility?: string; photo_path?: string | null }> | null;
  if (!response.ok) return { error: rows, status: response.status } as const;
  return { row: Array.isArray(rows) ? rows[0] ?? null : null } as const;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid animal id" }, { status: 400 });

  const identity = await getServerIdentity();
  const animal = await fetchAnimal(id, identity?.token);
  if ("error" in animal) return NextResponse.json({ error: "Unable to load photo record" }, { status: animal.status });
  if (!animal.row?.photo_path) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const object = await fetch(storageObjectUrl(animal.row.photo_path), {
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      ...(identity ? { Authorization: `Bearer ${identity.token}` } : {}),
    },
    cache: "no-store",
  });
  if (!object.ok) return NextResponse.json({ error: object.status === 404 ? "Photo not found" : "Unable to load photo" }, { status: object.status });

  const headers = new Headers();
  headers.set("Content-Type", object.headers.get("content-type") || "image/webp");
  headers.set("Cache-Control", animal.row.visibility === "public" ? "public, max-age=300, stale-while-revalidate=3600" : "private, no-store");
  return new Response(object.body, { status: 200, headers });
}

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const id = String(form?.get("id") ?? "").trim();
  const file = form?.get("file");
  if (!UUID_RE.test(id) || !(file instanceof File)) return NextResponse.json({ error: "Invalid photo upload" }, { status: 400 });
  if (!MIME_EXT[file.type]) return NextResponse.json({ error: "Photo must be JPEG, PNG, or WebP." }, { status: 400 });
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Photo must be 5 MB or smaller." }, { status: 400 });

  const animal = await fetchAnimal(id, identity.token);
  if ("error" in animal) return NextResponse.json({ error: "Unable to verify animal" }, { status: animal.status });
  if (!animal.row || animal.row.owner_id !== identity.user.id) return NextResponse.json({ error: "Animal not found" }, { status: 404 });

  const oldPath = animal.row.photo_path ?? null;
  const path = `${identity.user.id}/${id}.${MIME_EXT[file.type]}`;
  const upload = await fetch(storageObjectUrl(path), {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
    cache: "no-store",
  });
  if (!upload.ok) {
    const detail = await upload.text().catch(() => "");
    return NextResponse.json({ error: "Unable to upload photo", detail }, { status: upload.status });
  }

  const patch = await patchPhotoPath(id, identity.user.id, identity.token, path);
  if (!patch.ok) {
    if (path !== oldPath) await removeStorageObject(path, identity.token).catch(() => null);
    return NextResponse.json({ error: "Photo upload was rolled back because the pedigree record could not be updated." }, { status: patch.status });
  }

  let cleanupPending = false;
  if (oldPath && oldPath !== path) {
    const cleanup = await removeStorageObject(oldPath, identity.token).catch(() => null);
    cleanupPending = !cleanup || (!cleanup.ok && cleanup.status !== 404);
  }

  return NextResponse.json({ ok: true, cleanupPending, photoUrl: `/api/genetics/pedigree/photo?id=${encodeURIComponent(id)}&v=${Date.now()}` });
}

export async function DELETE(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid animal id" }, { status: 400 });

  const animal = await fetchAnimal(id, identity.token);
  if ("error" in animal) return NextResponse.json({ error: "Unable to verify animal" }, { status: animal.status });
  if (!animal.row || animal.row.owner_id !== identity.user.id) return NextResponse.json({ error: "Animal not found" }, { status: 404 });

  const oldPath = animal.row.photo_path ?? null;
  if (!oldPath) return NextResponse.json({ ok: true });

  const clear = await patchPhotoPath(id, identity.user.id, identity.token, null);
  if (!clear.ok) return NextResponse.json({ error: "Unable to clear photo record" }, { status: clear.status });

  const remove = await removeStorageObject(oldPath, identity.token).catch(() => null);
  if (!remove || (!remove.ok && remove.status !== 404)) {
    const restore = await patchPhotoPath(id, identity.user.id, identity.token, oldPath).catch(() => null);
    if (!restore?.ok) return NextResponse.json({ error: "Photo cleanup failed and the pedigree photo reference could not be restored." }, { status: 500 });
    return NextResponse.json({ error: "Unable to remove photo. The original photo reference was restored." }, { status: remove?.status || 500 });
  }

  return NextResponse.json({ ok: true });
}
