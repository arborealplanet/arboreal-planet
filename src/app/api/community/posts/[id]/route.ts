import { NextResponse } from "next/server";
import { getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

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
