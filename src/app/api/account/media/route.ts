import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const allowedBuckets = new Set(["avatars", "profile-banners"]);

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const bucket = String(form.get("bucket") ?? "");
  if (!(file instanceof File) || !allowedBuckets.has(bucket)) return NextResponse.json({ error: "A valid image and bucket are required." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
  const max = bucket === "avatars" ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > max) return NextResponse.json({ error: "Image is too large." }, { status: 400 });
  const ext = (file.name.split(".").pop() || "webp").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const path = `${identity.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const upload = await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}`, "Content-Type": file.type, "x-upsert": "false" },
    body: Buffer.from(await file.arrayBuffer()),
    cache: "no-store",
  });
  const result = await upload.json().catch(() => null);
  if (!upload.ok) return NextResponse.json({ error: "Upload failed", detail: result }, { status: upload.status });
  const publicUrl = `${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/${path}`;
  return NextResponse.json({ ok: true, path, publicUrl });
}
