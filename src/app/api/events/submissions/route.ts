import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const TYPES=new Set(["REPTILE_EXPO","BREEDER_EVENT","EDUCATION","PLANT_EVENT","COMMUNITY_MEETUP","OTHER"]);
function text(value:unknown,max:number){return String(value??"").trim().slice(0,max)}
function optionalUrl(value:unknown){const v=text(value,1000);if(!v)return null;try{const u=new URL(v);return u.protocol==="https:"?u.toString():false}catch{return false}}
function localDate(value:unknown){const v=text(value,40);if(!v)return null;return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(v)?v:false}

export async function GET(){
 const identity=await getServerIdentity();if(!identity)return NextResponse.json({signedIn:false,rows:[]});
 const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/event_submissions?submitter_id=eq.${encodeURIComponent(identity.user.id)}&select=id,title,event_type,starts_at,time_zone,city,state_region,country,source_url,status,created_at,reviewed_at&order=created_at.desc&limit=50`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Accept:"application/json"},cache:"no-store"});
 return response.ok?NextResponse.json({signedIn:true,rows:await response.json()}):NextResponse.json({error:"Could not load event submissions"},{status:502});
}

export async function POST(request:NextRequest){
 const identity=await getServerIdentity();if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;if(!body)return NextResponse.json({error:"Invalid request"},{status:400});
 const title=text(body.title,180),organizer=text(body.organizer,180),eventType=text(body.event_type,40),city=text(body.city,120),stateRegion=text(body.state_region,120),country=text(body.country,120)||"United States",venue=text(body.venue_name,180),address=text(body.address,300),description=text(body.description,4000),note=text(body.note,1000),timeZone=text(body.time_zone,100);
 const starts=localDate(body.starts_at),ends=localDate(body.ends_at),source=optionalUrl(body.source_url),website=optionalUrl(body.website_url);
 if(title.length<3||!TYPES.has(eventType)||!city||starts===false||starts===null||ends===false||source===false||!source||website===false||!timeZone)return NextResponse.json({error:"Please provide a valid event name, type, local date/time, time zone, city, and HTTPS source URL."},{status:400});
 const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/rpc/submit_event_suggestion`,{method:"POST",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({p_title:title,p_organizer:organizer,p_event_type:eventType,p_description:description,p_starts_local:starts,p_ends_local:ends??"",p_time_zone:timeZone,p_venue_name:venue,p_address:address,p_city:city,p_state_region:stateRegion,p_country:country,p_website_url:website??"",p_source_url:source,p_note:note}),cache:"no-store"});
 if(!response.ok){const error=await response.json().catch(()=>null) as {message?:string}|null;return NextResponse.json({error:error?.message?.includes("timezone")?"Use a valid IANA time zone such as America/New_York.":"Could not submit event suggestion."},{status:400})}
 const id=await response.json().catch(()=>null) as string|null;return NextResponse.json({id},{status:201});
}

export async function DELETE(request:NextRequest){
 const identity=await getServerIdentity();if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
 const id=text(request.nextUrl.searchParams.get("id"),80);if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid submission"},{status:400});
 const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/event_submissions?id=eq.${encodeURIComponent(id)}&submitter_id=eq.${encodeURIComponent(identity.user.id)}&status=eq.PENDING`,{method:"DELETE",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Prefer:"return=representation"},cache:"no-store"});
 if(!response.ok)return NextResponse.json({error:"Could not withdraw event suggestion"},{status:400});const rows=await response.json().catch(()=>[]) as Array<{id:string}>;if(!rows.length)return NextResponse.json({error:"Pending submission not found"},{status:404});return NextResponse.json({ok:true});
}
