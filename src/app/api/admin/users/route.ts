import { NextRequest,NextResponse } from "next/server";
import { fetchOwnProfile,getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity(){
  const identity=await getServerIdentity();
  if(!identity)return null;
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;
  if(profile?.role!=="owner")return null;
  return identity;
}

export async function GET(request:NextRequest){
  const identity=await ownerIdentity();
  if(!identity)return NextResponse.json({error:"Not found"},{status:404});
  const q=(request.nextUrl.searchParams.get("q")??"").trim().slice(0,120);
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/owner_user_directory`,{method:"POST",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({p_query:q||null}),cache:"no-store"});
  const data=await response.json().catch(()=>null);
  if(!response.ok)return NextResponse.json({error:"Could not load users"},{status:response.status});
  return NextResponse.json({rows:Array.isArray(data)?data:[]});
}

export async function PATCH(request:NextRequest){
  const identity=await ownerIdentity();
  if(!identity)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json().catch(()=>null) as {userId?:unknown;role?:unknown}|null;
  const userId=typeof body?.userId==="string"?body.userId:"";
  const role=typeof body?.role==="string"?body.role.toLowerCase():"";
  if(!userId||!["user","moderator","admin"].includes(role))return NextResponse.json({error:"Invalid role update"},{status:400});
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/owner_set_user_role`,{method:"POST",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({p_target_user_id:userId,p_role:role}),cache:"no-store"});
  const data=await response.json().catch(()=>null);
  if(!response.ok)return NextResponse.json({error:typeof data?.message==="string"?data.message:"Could not update role"},{status:response.status});
  return NextResponse.json({role:typeof data==="string"?data:role});
}
