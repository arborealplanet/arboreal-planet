import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const TYPES=new Set(["REPTILE_EXPO","BREEDER_EVENT","EDUCATION","PLANT_EVENT","COMMUNITY_MEETUP","OTHER"]);
function text(value:unknown,max:number){return String(value??"").trim().slice(0,max)}
function optionalUrl(value:unknown){const v=text(value,1000);if(!v)return null;try{const u=new URL(v);return u.protocol==="https:"?u.toString():false}catch{return false}}
function dateValue(value:unknown){const v=text(value,80);if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?false:d.toISOString()}

export async function GET(){
 const identity=await getServerIdentity();if(!identity)return NextResponse.json({signedIn:false,rows:[]});
 const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/event_submissions?submitter_id=eq.${encodeURIComponent(identity.user.id)}&select=id,title,event_type,starts_at,city,state_region,country,source_url,status,created_at,reviewed_at&order=created_at.desc&limit=50`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Accept:"application/json"},cache:"no-store"});
 return response.ok?NextResponse.json({signedIn:true,rows:await response.json()}):NextResponse.json({error:"Could not load event submissions"},{status:502});
}

export async function POST(request:NextRequest){
 const identity=await getServerIdentity();if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;if(!body)return NextResponse.json({error:"Invalid request"},{status:400});
 const title=text(body.title,180),organizer=text(body.organizer,180),eventType=text(body.event_type,40),city=text(body.city,120),stateRegion=text(body.state_region,120),country=text(body.country,120)||"United States",venue=text(body.venue_name,180),address=text(body.address,300),description=text(body.description,4000),note=text(body.note,1000);
 const starts=dateValue(body.starts_at),ends=dateValue(body.ends_at),source=optionalUrl(body.source_url),website=optionalUrl(body.website_url);
 if(title.length<3||!TYPES.has(eventType)||!city||starts===false||starts===null||source===false||!source||website===false)return NextResponse.json({error:"Please provide a valid event name, type, date, city, and HTTPS source URL."},{status:400});
 if(ends&&new Date(ends).getTime()<new Date(starts).getTime())return NextResponse.json({error:"End time cannot be before the start time."},{status:400});
 const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/event_submissions`,{method:"POST",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({submitter_id:identity.user.id,title,organizer:organizer||null,event_type:eventType,description:description||null,starts_at:starts,ends_at:ends||null,venue_name:venue||null,address:address||null,city,state_region:stateRegion||null,country,website_url:website||null,source_url:source,note:note||null,status:"PENDING"}),cache:"no-store"});
 if(!response.ok)return NextResponse.json({error:"Could not submit event suggestion."},{status:400});
 const rows=await response.json().catch(()=>[]) as Array<{id:string}>;return NextResponse.json({id:rows[0]?.id??null},{status:201});
}

export async function DELETE(request:NextRequest){
 const identity=await getServerIdentity();if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
 const id=text(request.nextUrl.searchParams.get("id"),80);if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid submission"},{status:400});
 const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/event_submissions?id=eq.${encodeURIComponent(id)}&submitter_id=eq.${encodeURIComponent(identity.user.id)}&status=eq.PENDING`,{method:"DELETE",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Prefer:"return=representation"},cache:"no-store"});
 if(!response.ok)return NextResponse.json({error:"Could not withdraw event suggestion"},{status:400});const rows=await response.json().catch(()=>[]) as Array<{id:string}>;if(!rows.length)return NextResponse.json({error:"Pending submission not found"},{status:404});return NextResponse.json({ok:true});
}
