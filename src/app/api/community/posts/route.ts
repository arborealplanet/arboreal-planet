import { NextRequest,NextResponse } from "next/server";
import { getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const base={apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`};
const MAX_IMAGES=10;

function cleanVideo(raw:unknown){
  const value=String(raw??"").trim();
  if(!value)return null;
  if(value.length>500)return false;
  try{const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password)return false;return url.toString()}catch{return false}
}

async function validReference(type:"ANIMAL"|"PLANT",raw:unknown){
  const id=String(raw??"").trim();
  if(!id)return null;
  if(!/^[0-9a-f-]{36}$/i.test(id))return false;
  const path=type==="ANIMAL"
    ?`species?id=eq.${encodeURIComponent(id)}&published=eq.true&select=id&limit=1`
    :`plant_collections?id=eq.${encodeURIComponent(id)}&status=neq.PLANNED&select=id&limit=1`;
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`,{headers:{...base,Accept:"application/json"},cache:"no-store"});
  if(!response.ok)return false;
  const rows=await response.json().catch(()=>[]) as Array<{id:string}>;
  return rows.length?id:false;
}

export async function GET(request:NextRequest){
  const identity=await getServerIdentity();
  const mode=request.nextUrl.searchParams.get("mode")==="following"?"following":"explore";
  if(mode==="following"&&!identity)return NextResponse.json({rows:[],viewerId:null,authRequired:true});
  const rpc=mode==="following"?"community_following_feed":"community_feed";
  const headers=mode==="following"&&identity?{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json"}:{...base,"Content-Type":"application/json"};
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/${rpc}`,{method:"POST",headers,body:"{}",cache:"no-store"});
  return response.ok?NextResponse.json({rows:await response.json(),viewerId:identity?.user.id??null,authRequired:false}):NextResponse.json({error:"Community unavailable"},{status:502});
}

export async function POST(request:NextRequest){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const bodyData=await request.json();
  const body=String(bodyData.body??"").trim();
  const types=new Set(["POST","QUESTION","BREEDING_UPDATE"]);
  const type=String(bodyData.type??"POST");
  const tags=Array.isArray(bodyData.tags)?bodyData.tags.map(String).map((value:string)=>value.trim()).filter(Boolean).slice(0,4):[];
  const media=Array.isArray(bodyData.media_urls)?bodyData.media_urls.filter((value:unknown):value is string=>typeof value==="string").slice(0,MAX_IMAGES):[];
  const prefix=`${SUPABASE_AUTH_URL}/storage/v1/object/public/community/${identity.user.id}/`;
  if(media.some((url:string)=>!url.startsWith(prefix)))return NextResponse.json({error:"Invalid community image"},{status:400});
  const video=cleanVideo(bodyData.video_url);
  if(video===false)return NextResponse.json({error:"Video link must be a valid HTTPS URL"},{status:400});
  if(!types.has(type)||(!body&&media.length===0&&!video)||body.length>1200)return NextResponse.json({error:"Invalid post"},{status:400});

  const [speciesId,plantId]=await Promise.all([
    validReference("ANIMAL",bodyData.species_id),
    validReference("PLANT",bodyData.plant_id),
  ]);
  if(speciesId===false)return NextResponse.json({error:"Linked animal reference is not available"},{status:400});
  if(plantId===false)return NextResponse.json({error:"Linked plant reference is not available"},{status:400});

  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_posts`,{
    method:"POST",
    headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Prefer:"return=representation"},
    body:JSON.stringify({author_id:identity.user.id,type,body,tags,media_urls:media,video_url:video,species_id:speciesId,plant_id:plantId}),
    cache:"no-store",
  });
  return response.ok?NextResponse.json({post:(await response.json())[0]},{status:201}):NextResponse.json({error:"Could not publish post"},{status:400});
}
