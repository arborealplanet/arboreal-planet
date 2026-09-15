import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

function headers(token:string){return{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json"}}

async function adminIdentity(){
  const identity=await getServerIdentity();
  if(!identity)return null;
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;
  if(!profile||!["admin","owner"].includes(profile.role??""))return null;
  return identity;
}

export async function GET(){
  const identity=await adminIdentity();
  if(!identity)return NextResponse.json({error:"Not found"},{status:404});
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/event_submissions?select=id,title,organizer,event_type,description,starts_at,ends_at,venue_name,address,city,state_region,country,website_url,source_url,note,status,created_at,reviewed_at,time_zone&order=created_at.desc&limit=200`,{headers:headers(identity.token),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Could not load event submissions."},{status:500});
  return NextResponse.json({rows:await response.json().catch(()=>[])});
}

export async function POST(request:Request){
  const identity=await adminIdentity();
  if(!identity)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json().catch(()=>null) as {id?:unknown;action?:unknown}|null;
  const id=String(body?.id??"").trim();
  const action=String(body?.action??"").trim().toUpperCase();
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["APPROVE","DECLINE"].includes(action))return NextResponse.json({error:"Invalid review request."},{status:400});
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/review_event_submission`,{method:"POST",headers:headers(identity.token),body:JSON.stringify({p_submission_id:id,p_action:action}),cache:"no-store"});
  const result=await response.json().catch(()=>null);
  if(!response.ok)return NextResponse.json({error:"Could not review event submission."},{status:response.status});
  return NextResponse.json({result});
}
