import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const MIME_TO_EXT:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};

async function adminIdentity(){
  const identity=await getServerIdentity();
  if(!identity)return null;
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;
  if(!profile||!["admin","owner"].includes(profile.role??""))return null;
  return identity;
}

export async function POST(request:Request){
  const identity=await adminIdentity();
  if(!identity)return NextResponse.json({error:"Not found"},{status:404});
  const form=await request.formData().catch(()=>null);
  const file=form?.get("file");
  if(!(file instanceof File))return NextResponse.json({error:"Choose an image file."},{status:400});
  const ext=MIME_TO_EXT[file.type];
  if(!ext)return NextResponse.json({error:"Cover images must be JPG, PNG or WebP."},{status:400});
  if(file.size<=0||file.size>5*1024*1024)return NextResponse.json({error:"Cover image must be 5 MB or smaller."},{status:400});

  const path=`covers/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
  const upload=await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/journal-media/${path}`,{
    method:"POST",
    headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":file.type,"x-upsert":"false"},
    body:await file.arrayBuffer(),
    cache:"no-store",
  });
  if(!upload.ok)return NextResponse.json({error:"Could not upload cover image."},{status:upload.status});
  const url=`${SUPABASE_AUTH_URL}/storage/v1/object/public/journal-media/${path}`;
  return NextResponse.json({url,path});
}
