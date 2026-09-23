import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const allowedBuckets = new Set(["avatars", "profile-banners"]);
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function storagePath(path:string){return path.split("/").map(encodeURIComponent).join("/")}

async function removeOwnedMedia(bucket:string,userId:string,url:string|null|undefined,token:string){
  if(!url)return;
  const prefix=`${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/${userId}/`;
  if(!url.startsWith(prefix))return;
  const base=`${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/`;
  const path=url.slice(base.length);
  if(!path.startsWith(`${userId}/`)||path.includes(".."))return;
  await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/${bucket}/${storagePath(path)}`,{
    method:"DELETE",
    headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`},
    cache:"no-store",
  }).catch(()=>null);
}

async function removeOwnedPath(bucket:string,userId:string,path:string,token:string){
  if(!allowedBuckets.has(bucket)||!path.startsWith(`${userId}/`)||path.includes(".."))return;
  await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/${bucket}/${storagePath(path)}`,{
    method:"DELETE",
    headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`},
    cache:"no-store",
  }).catch(()=>null);
}

export async function POST(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body=await request.json().catch(()=>null) as {bucket?:unknown;type?:unknown;size?:unknown}|null;
  const bucket=String(body?.bucket??"");
  const type=String(body?.type??"");
  const size=Number(body?.size??0);
  if(!allowedBuckets.has(bucket))return NextResponse.json({error:"A valid image bucket is required."},{status:400});

  const ext=allowedTypes.get(type);
  if(!ext)return NextResponse.json({error:"Use a JPG, PNG, or WebP image."},{status:400});

  const max=bucket==="avatars"?5*1024*1024:8*1024*1024;
  if(!Number.isFinite(size)||size<=0||size>max){
    return NextResponse.json({error:bucket==="avatars"?"Avatar must be 5 MB or smaller.":"Banner must be 8 MB or smaller."},{status:400});
  }

  const path=`${identity.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const sign=await fetch(
    `${SUPABASE_AUTH_URL}/storage/v1/object/upload/sign/${bucket}/${storagePath(path)}`,
    {
      method:"POST",
      headers:{
        apikey:SUPABASE_AUTH_KEY,
        Authorization:`Bearer ${identity.token}`,
        "Content-Type":"application/json",
      },
      body:"{}",
      cache:"no-store",
    },
  );
  const data=await sign.json().catch(()=>null) as {url?:string;error?:string;message?:string}|null;
  if(!sign.ok||!data?.url){
    return NextResponse.json({error:data?.message||data?.error||"Could not authorize image upload."},{status:sign.status||400});
  }

  const signedUrl=data.url.startsWith("http")
    ?data.url
    :`${SUPABASE_AUTH_URL}/storage/v1${data.url.startsWith("/")?"":"/"}${data.url}`;
  const publicUrl=`${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/${path}`;
  return NextResponse.json({path,signedUrl,publicUrl});
}

export async function PATCH(request:Request){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json().catch(()=>null) as {bucket?:unknown;path?:unknown}|null;
  const bucket=String(body?.bucket??"");
  const path=String(body?.path??"");
  if(!allowedBuckets.has(bucket)||!path.startsWith(`${identity.user.id}/`)||path.includes("..")){
    return NextResponse.json({error:"Invalid uploaded image."},{status:400});
  }

  const field=bucket==="avatars"?"avatar_url":"banner_url";
  const publicUrl=`${SUPABASE_AUTH_URL}/storage/v1/object/public/${bucket}/${path}`;
  const previousResponse=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(identity.user.id)}&select=${field}&limit=1`,{
    headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Accept:"application/json"},
    cache:"no-store",
  });
  const previousRows=previousResponse.ok?await previousResponse.json().catch(()=>[]):[];
  const previousUrl=Array.isArray(previousRows)&&previousRows[0]?String(previousRows[0][field]??""):"";

  const persist=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(identity.user.id)}`,{
    method:"PATCH",
    headers:{
      apikey:SUPABASE_AUTH_KEY,
      Authorization:`Bearer ${identity.token}`,
      "Content-Type":"application/json",
      Prefer:"return=representation",
    },
    body:JSON.stringify({[field]:publicUrl,updated_at:new Date().toISOString()}),
    cache:"no-store",
  });
  const saved=await persist.json().catch(()=>null);
  if(!persist.ok||!Array.isArray(saved)||saved.length===0){
    await removeOwnedPath(bucket,identity.user.id,path,identity.token);
    return NextResponse.json({error:"Image uploaded but could not be attached to your profile. Please try again.",detail:saved},{status:persist.ok?409:persist.status});
  }

  if(previousUrl&&previousUrl!==publicUrl)await removeOwnedMedia(bucket,identity.user.id,previousUrl,identity.token);
  return NextResponse.json({ok:true,path,publicUrl,profile:saved[0]});
}

export async function DELETE(request:Request){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {bucket?:unknown;path?:unknown}|null;
  const bucket=String(body?.bucket??"");
  const path=String(body?.path??"");
  await removeOwnedPath(bucket,identity.user.id,path,identity.token);
  return NextResponse.json({ok:true});
}
