import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const allowedBuckets = new Set(["avatars", "profile-banners"]);
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const bucket = String(form.get("bucket") ?? "");
  if (!(file instanceof File) || !allowedBuckets.has(bucket)) {
    return NextResponse.json({ error: "A valid image and bucket are required." }, { status: 400 });
  }

  const ext = allowedTypes.get(file.type);
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });

  const max = bucket === "avatars" ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > max) {
    return NextResponse.json({ error: bucket === "avatars" ? "Avatar must be 5 MB or smaller." : "Banner must be 8 MB or smaller." }, { status: 400 });
  }

  const path = `${identity.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const upload = await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: await file.arrayBuffer(),
    cache: "no-store",
  });

  const result = await upload.json().catch(() => null);
  if (!upload.ok) {
    const storageMessage = result && typeof result === "object" && "message" in result ? String((result as { message?: unknown }).message ?? "") : "";
    return NextResponse.json({ error: storageMessage || "Image upload failed. Please try again.", detail: result }, { status: upload.status });
  }

  const publicUrl = `${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/${path}`;
  return NextResponse.json({ ok: true, path, publicUrl });
}
