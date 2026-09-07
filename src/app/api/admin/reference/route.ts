import { NextRequest,NextResponse } from "next/server";
import { fetchOwnProfile,getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const headers=(token:string)=>({apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`});
async function adminIdentity(){const identity=await getServerIdentity();if(!identity)return null;const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;if(!profile||!["admin","owner"].includes(profile.role??""))return null;return identity;}
const cleanText=(value:unknown,max=5000)=>String(value??"").trim().slice(0,max);
const cleanTags=(value:unknown)=>Array.isArray(value)?value.map(v=>cleanText(v,40)).filter(Boolean).slice(0,12):[];

export async function GET(){
 const identity=await adminIdentity();if(!identity)return NextResponse.json({error:"Not found"},{status:404});
 const h=headers(identity.token);
 const [animals,plants]=await Promise.all([
  fetch(`${SUPABASE_AUTH_URL}/rest/v1/species?select=id,slug,common_name,scientific_name,animal_group,description,tags,published,reference_data&order=common_name.asc`,{headers:h,cache:"no-store"}),
  fetch(`${SUPABASE_AUTH_URL}/rest/v1/plant_collections?select=id,slug,name,scientific_name,plant_group,description,tags,status,cultivation_data&order=display_order.asc`,{headers:h,cache:"no-store"})
 ]);
 if(!animals.ok||!plants.ok)return NextResponse.json({error:"Reference catalog unavailable"},{status:502});
 return NextResponse.json({animals:await animals.json(),plants:await plants.json()});
}

export async function PATCH(request:NextRequest){
 const identity=await adminIdentity();if(!identity)return NextResponse.json({error:"Not found"},{status:404});
 const body=await request.json().catch(()=>({}));const kind=String(body.kind??"");const id=String(body.id??"");if(!id||!["animal","plant"].includes(kind))return NextResponse.json({error:"Invalid reference update"},{status:400});
 const h={...headers(identity.token),"Content-Type":"application/json","Prefer":"return=representation"};
 let table="";const payload:Record<string,unknown>={description:cleanText(body.description,4000),tags:cleanTags(body.tags)};
 if(kind==="animal"){
  table="species";const source=body.reference_data&&typeof body.reference_data==="object"?body.reference_data as Record<string,unknown>:{};
  payload.reference_data={taxonomy_notes:cleanText(source.taxonomy_notes),natural_history:cleanText(source.natural_history),husbandry:cleanText(source.husbandry),breeding:cleanText(source.breeding),source_notes:cleanText(source.source_notes)};
 }else{
  table="plant_collections";const source=body.cultivation_data&&typeof body.cultivation_data==="object"?body.cultivation_data as Record<string,unknown>:{};
  payload.cultivation_data={light:cleanText(source.light),temperature:cleanText(source.temperature),humidity:cleanText(source.humidity),watering:cleanText(source.watering),substrate:cleanText(source.substrate),feeding:cleanText(source.feeding),notes:cleanText(source.notes),source_notes:cleanText(source.source_notes)};
 }
 const r=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:h,body:JSON.stringify(payload),cache:"no-store"});
 if(!r.ok)return NextResponse.json({error:"Could not save reference record"},{status:400});
 const rows=await r.json().catch(()=>[]);return NextResponse.json({ok:true,row:rows[0]??null});
}
