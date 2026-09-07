import { NextRequest,NextResponse } from "next/server";
import { getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const {id}=await params;
  const body=await request.json().catch(()=>({}));
  const reason=String(body.reason??"").trim();
  if(reason.length<3||reason.length>500)return NextResponse.json({error:"Give a short reason for the report"},{status:400});
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/community_post_reports`,{method:"POST",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({post_id:id,reporter_id:identity.user.id,reason}),cache:"no-store"});
  if(response.status===409)return NextResponse.json({ok:true,duplicate:true});
  if(!response.ok)return NextResponse.json({error:"Could not submit report"},{status:400});
  return NextResponse.json({ok:true});
}
