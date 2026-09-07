import { NextResponse } from "next/server";
import { getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

function cleanVideo(raw:unknown){const value=String(raw??"").trim();if(!value)return null;if(value.length>500)return false;try{const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password)return false;return u.toString()}catch{return false}}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const {id}=await params;
  const body=await request.json().catch(()=>({}));
  const text=String(body.body??"").trim();
  const tags=Array.isArray(body.tags)?body.tags.map(String).map((x:string)=>x.trim()).filter(Boolean).slice(0,4):[];
  const video=cleanVideo(body.video_url);
  if(video===false)return NextResponse.json({error:"Video link must be a valid HTTPS URL"},{status:400});
  if(text.length>1200)return NextResponse.json({error:"Post text must be 1,200 characters or less"},{status:400});
  const current=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_posts?id=eq.${encodeURIComponent(id)}&author_id=eq.${identity.user.id}&deleted_at=is.null&select=id,media_urls`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`},cache:"no-store"});
  const rows=current.ok?await current.json():[];
  if(!rows.length)return NextResponse.json({error:"Post not found"},{status:404});
  const media=Array.isArray(rows[0].media_urls)?rows[0].media_urls:[];
  if(!text&&media.length===0&&!video)return NextResponse.json({error:"A post needs text, an image, or a video link"},{status:400});
  const update=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_posts?id=eq.${encodeURIComponent(id)}&author_id=eq.${identity.user.id}`,{method:"PATCH",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({body:text,tags,video_url:video,updated_at:new Date().toISOString()}),cache:"no-store"});
  if(!update.ok)return NextResponse.json({error:"Could not update post"},{status:400});
  const updated=await update.json();
  if(!updated.length)return NextResponse.json({error:"Post not found"},{status:404});
  return NextResponse.json({ok:true,post:updated[0]});
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const {id}=await params;
  const r=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_posts?id=eq.${encodeURIComponent(id)}&author_id=eq.${identity.user.id}`,{method:"PATCH",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}),cache:"no-store"});
  if(!r.ok)return NextResponse.json({error:"Could not remove post"},{status:400});
  const rows=await r.json();
  if(!rows.length)return NextResponse.json({error:"Post not found"},{status:404});
  return NextResponse.json({ok:true});
}
