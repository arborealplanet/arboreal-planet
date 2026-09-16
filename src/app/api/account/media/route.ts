import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const allowedBuckets = new Set(["avatars", "profile-banners"]);
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function removeOwnedMedia(bucket:string,userId:string,url:string|null|undefined,token:string){
  if(!url)return;
  const prefix=`${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/${userId}/`;
  if(!url.startsWith(prefix))return;
  const base=`${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/`;
  const path=url.slice(base.length);
  if(!path.startsWith(`${userId}/`)||path.includes(".."))return;
  await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/${bucket}/${path}`,{
    method:"DELETE",
    headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`},
    cache:"no-store",
  }).catch(()=>null);
}

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

  const field = bucket === "avatars" ? "avatar_url" : "banner_url";
  const previousResponse=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(identity.user.id)}&select=${field}&limit=1`,{
    headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Accept:"application/json"},
    cache:"no-store",
  });
  const previousRows=previousResponse.ok?await previousResponse.json().catch(()=>[]):[];
  const previousUrl=Array.isArray(previousRows)&&previousRows[0]?String(previousRows[0][field]??""):"";

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
  const persist = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(identity.user.id)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ [field]: publicUrl, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });

  const saved = await persist.json().catch(() => null);
  if (!persist.ok || !Array.isArray(saved) || saved.length === 0) {
    await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${identity.token}` },
      cache: "no-store",
    }).catch(() => null);
    return NextResponse.json({ error: "Image uploaded but could not be attached to your profile. Please try again.", detail: saved }, { status: persist.ok ? 409 : persist.status });
  }

  if(previousUrl&&previousUrl!==publicUrl)await removeOwnedMedia(bucket,identity.user.id,previousUrl,identity.token);
  return NextResponse.json({ ok: true, path, publicUrl, profile: saved[0] });
}
