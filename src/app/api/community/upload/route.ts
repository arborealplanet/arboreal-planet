import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_IMAGES = 10;
const MAX_BYTES = 10 * 1024 * 1024;

type UploadRequestFile = { name?: unknown; type?: unknown; size?: unknown };

function storagePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function createSignedUpload(identity: { token: string; user: { id: string } }, path: string) {
  const response = await fetch(
    `${SUPABASE_AUTH_URL}/storage/v1/object/upload/sign/community/${storagePath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
  );
  const data = await response.json().catch(() => null) as { url?: string; error?: string; message?: string } | null;
  if (!response.ok || !data?.url) {
    throw new Error(data?.message || data?.error || "Could not authorize community upload.");
  }
  const signedUrl = data.url.startsWith("http")
    ? data.url
    : `${SUPABASE_AUTH_URL}/storage/v1${data.url.startsWith("/") ? "" : "/"}${data.url}`;
  return {
    path,
    signedUrl,
    publicUrl: `${SUPABASE_AUTH_URL}/storage/v1/object/public/community/${path}`,
  };
}

async function removeUploaded(identity:{token:string;user:{id:string}},paths:string[]){
  for(const path of paths){
    await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/community/${storagePath(path)}`,{
      method:"DELETE",
      headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`},
    }).catch(()=>null);
  }
}

export async function POST(request: NextRequest) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await request.json().catch(() => null) as { files?: UploadRequestFile[] } | null;
  const files = Array.isArray(body?.files) ? body.files.slice(0, MAX_IMAGES + 1) : [];
  if (!files.length || files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Choose 1 to ${MAX_IMAGES} images` }, { status: 400 });
  }

  const normalized = files.map((file) => ({
    type: String(file.type ?? ""),
    size: Number(file.size ?? 0),
  }));
  if (normalized.some((file) => !allowed.has(file.type) || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BYTES)) {
    return NextResponse.json({ error: "Images must be JPG, PNG, or WebP and no larger than 10 MB each" }, { status: 400 });
  }

  try {
    const uploads = [];
    for (const file of normalized) {
      const ext = allowed.get(file.type)!;
      const path = `${identity.user.id}/${crypto.randomUUID()}.${ext}`;
      uploads.push(await createSignedUpload(identity, path));
    }
    return NextResponse.json({ uploads });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not authorize community upload." },
      { status: 400 },
    );
  }
}

export async function DELETE(request:NextRequest){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const body=await request.json().catch(()=>null) as {urls?:unknown}|null;
  const urls=Array.isArray(body?.urls)?body.urls.filter((value):value is string=>typeof value==="string").slice(0,MAX_IMAGES):[];
  if(!urls.length)return NextResponse.json({ok:true,removed:0});
  const publicPrefix=`${SUPABASE_AUTH_URL}/storage/v1/object/public/community/${identity.user.id}/`;
  const base=`${SUPABASE_AUTH_URL}/storage/v1/object/public/community/`;
  const paths=urls.filter((url)=>url.startsWith(publicPrefix)).map((url)=>url.slice(base.length));
  await removeUploaded(identity,paths);
  return NextResponse.json({ok:true,removed:paths.length});
}
