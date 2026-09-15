import { NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type Preferences = {
  messages:boolean;
  new_followers:boolean;
  community_activity:boolean;
  followed_subject_updates:boolean;
};

const defaults:Preferences={messages:true,new_followers:true,community_activity:true,followed_subject_updates:false};
function headers(token:string,prefer?:string){return{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})}}

export async function GET(){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/notification_preferences?user_id=eq.${encodeURIComponent(identity.user.id)}&select=messages,new_followers,community_activity,followed_subject_updates&limit=1`,{headers:headers(identity.token),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Could not load notification preferences"},{status:502});
  const rows=await response.json().catch(()=>[]) as Preferences[];
  return NextResponse.json({preferences:rows[0]??defaults});
}

export async function PUT(request:Request){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const body=await request.json().catch(()=>null) as Partial<Preferences>|null;
  if(!body)return NextResponse.json({error:"Invalid preferences"},{status:400});
  const preferences:Preferences={
    messages:body.messages!==false,
    new_followers:body.new_followers!==false,
    community_activity:body.community_activity!==false,
    followed_subject_updates:body.followed_subject_updates===true,
  };
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/notification_preferences?on_conflict=user_id`,{
    method:"POST",
    headers:headers(identity.token,"resolution=merge-duplicates,return=representation"),
    body:JSON.stringify({user_id:identity.user.id,...preferences,updated_at:new Date().toISOString()}),
    cache:"no-store",
  });
  const rows=await response.json().catch(()=>null) as Preferences[]|null;
  if(!response.ok)return NextResponse.json({error:"Could not save notification preferences"},{status:400});
  return NextResponse.json({preferences:rows?.[0]??preferences});
}
