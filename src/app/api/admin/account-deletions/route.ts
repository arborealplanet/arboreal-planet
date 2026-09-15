import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

function headers(token:string,prefer?:string){return{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})}}

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
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/account_deletion_requests?select=id,user_id,status,reason,staff_note,created_at,updated_at,resolved_at,reviewed_by&status=in.(pending,reviewing,ready_for_processing)&order=created_at.asc&limit=200`,{headers:headers(identity.token),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Could not load account deletion requests."},{status:500});
  const rows=await response.json().catch(()=>[]) as Array<{user_id:string}> & Array<Record<string,unknown>>;
  const userIds=[...new Set(rows.map(row=>String(row.user_id??"")).filter(Boolean))];
  let profiles:Array<{id:string;username:string|null;display_name:string|null}>=[];
  if(userIds.length){
    const profileResponse=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=in.(${userIds.join(",")})&select=id,username,display_name`,{headers:headers(identity.token),cache:"no-store"});
    if(profileResponse.ok)profiles=await profileResponse.json().catch(()=>[]);
  }
  const profileMap=new Map(profiles.map(profile=>[profile.id,profile]));
  return NextResponse.json({rows:rows.map(row=>({...row,profile:profileMap.get(String(row.user_id))??null}))});
}

export async function PATCH(request:Request){
  const identity=await adminIdentity();
  if(!identity)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json().catch(()=>null) as {id?:unknown;action?:unknown;note?:unknown}|null;
  const id=String(body?.id??"").trim();
  const action=String(body?.action??"").trim().toLowerCase();
  const note=typeof body?.note==="string"?body.note.trim().slice(0,2000):"";
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["reviewing","ready_for_processing","pending"].includes(action))return NextResponse.json({error:"Invalid review action."},{status:400});

  const payload:{status:string;staff_note:string|null;reviewed_by:string|null;updated_at:string;resolved_at:null}={
    status:action,
    staff_note:note||null,
    reviewed_by:action==="pending"?null:identity.user.id,
    updated_at:new Date().toISOString(),
    resolved_at:null,
  };
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/account_deletion_requests?id=eq.${encodeURIComponent(id)}&status=in.(pending,reviewing,ready_for_processing)`,{
    method:"PATCH",
    headers:headers(identity.token,"return=representation"),
    body:JSON.stringify(payload),
    cache:"no-store",
  });
  const rows=await response.json().catch(()=>null) as Array<Record<string,unknown>>|null;
  if(!response.ok)return NextResponse.json({error:"Could not update deletion request."},{status:response.status});
  if(!rows?.length)return NextResponse.json({error:"Request is no longer available for review."},{status:409});
  return NextResponse.json({request:rows[0]});
}
