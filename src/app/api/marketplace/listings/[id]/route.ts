import { NextRequest,NextResponse } from "next/server";
import { getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const statuses=new Set(["DRAFT","ACTIVE","SOLD","REMOVED"]);
const origins=new Set(["CAPTIVE_BRED","IMPORT"]);
const editable=new Set(["title","description","price","seller_location","public_origin","morph","sex","age_or_year","lineage","status","species_id","locality_id","image_urls","pedigree_animal_id"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicHeaders={apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`};

type CurrentListing={id:string;category:string;image_urls:string[]|null};

async function ownedListing(id:string,userId:string,token:string){
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(userId)}&select=id,category,image_urls&limit=1`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!response.ok)return null;
  const rows=await response.json().catch(()=>[]) as CurrentListing[];
  return rows[0]??null;
}

async function removeOwnedImages(userId:string,token:string,urls:string[]){
  const prefix=`${SUPABASE_AUTH_URL}/storage/v1/object/public/marketplace/${userId}/`;
  const base=`${SUPABASE_AUTH_URL}/storage/v1/object/public/marketplace/`;
  let failed=0;
  for(const url of urls){
    if(!url.startsWith(prefix))continue;
    const path=url.slice(base.length);
    if(!path.startsWith(`${userId}/`)||path.includes(".."))continue;
    const result=await fetch(`${SUPABASE_AUTH_URL}/storage/v1/object/marketplace/${path}`,{method:"DELETE",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${token}`},cache:"no-store"}).catch(()=>null);
    if(!result?.ok)failed++;
  }
  return failed;
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const {id}=await params;
  const current=await ownedListing(id,identity.user.id,identity.token);
  if(!current)return NextResponse.json({error:"Listing not found"},{status:404});

  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return NextResponse.json({error:"Invalid request"},{status:400});
  const entries=Object.entries(body).filter(([key])=>editable.has(key));
  if(!entries.length)return NextResponse.json({error:"No valid changes supplied"},{status:400});
  const payload:Record<string,unknown>=Object.fromEntries(entries);

  if(current.category!=="ANIMAL"){
    const animalOnly=["public_origin","species_id","locality_id","pedigree_animal_id","morph","sex","age_or_year","lineage"];
    if(animalOnly.some((key)=>key in payload&&payload[key]!==null&&payload[key]!==""))return NextResponse.json({error:"Animal-specific fields are only valid for animal listings"},{status:400});
    for(const key of animalOnly)delete payload[key];
  }

  if("title" in payload){const title=String(payload.title??"").trim();if(!title||title.length>160)return NextResponse.json({error:"Invalid title"},{status:400});payload.title=title}
  if("price" in payload){const price=Number(payload.price);if(!Number.isFinite(price)||price<0)return NextResponse.json({error:"Invalid price"},{status:400});payload.price=price}
  if("status" in payload){const status=String(payload.status??"");if(!statuses.has(status))return NextResponse.json({error:"Invalid listing status"},{status:400});payload.status=status}
  if("public_origin" in payload){const origin=payload.public_origin==null||payload.public_origin===""?null:String(payload.public_origin);if(origin!==null&&!origins.has(origin))return NextResponse.json({error:"Invalid animal origin"},{status:400});payload.public_origin=origin}

  let nextImages:string[]|null=null;
  if("image_urls" in payload){
    if(!Array.isArray(payload.image_urls)||payload.image_urls.length>10)return NextResponse.json({error:"A listing can have up to 10 photos"},{status:400});
    const prefix=`${SUPABASE_AUTH_URL}/storage/v1/object/public/marketplace/${identity.user.id}/`;
    const images=payload.image_urls.filter((url:unknown):url is string=>typeof url==="string"&&url.startsWith(prefix));
    if(images.length!==payload.image_urls.length)return NextResponse.json({error:"Invalid marketplace photo"},{status:400});
    nextImages=[...new Set(images)];
    payload.image_urls=nextImages;
  }

  if("species_id" in payload||"locality_id" in payload){
    const speciesId=String(payload.species_id??"")||null,localityId=String(payload.locality_id??"")||null;
    if(speciesId&&!uuid.test(speciesId))return NextResponse.json({error:"Invalid species"},{status:400});
    if(localityId&&(!speciesId||!uuid.test(localityId)))return NextResponse.json({error:"Invalid locality"},{status:400});
    if(speciesId){const s=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/species?id=eq.${speciesId}&published=eq.true&select=id`,{headers:publicHeaders,cache:"no-store"});if(!(s.ok&&(await s.json()).length))return NextResponse.json({error:"Species is not available"},{status:400})}
    if(localityId){const l=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/localities?id=eq.${localityId}&species_id=eq.${speciesId}&active=eq.true&select=id`,{headers:publicHeaders,cache:"no-store"});if(!(l.ok&&(await l.json()).length))return NextResponse.json({error:"Locality does not match selected species"},{status:400})}
    payload.species_id=speciesId;payload.locality_id=localityId;
  }

  if("pedigree_animal_id" in payload){
    const pedigreeId=String(payload.pedigree_animal_id??"").trim()||null;
    if(pedigreeId&&!uuid.test(pedigreeId))return NextResponse.json({error:"Invalid pedigree animal"},{status:400});
    if(pedigreeId){const pedigree=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/gtp_pedigree_animals?id=eq.${encodeURIComponent(pedigreeId)}&owner_id=eq.${encodeURIComponent(identity.user.id)}&visibility=eq.public&select=id&limit=1`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`},cache:"no-store"});if(!(pedigree.ok&&(await pedigree.json()).length))return NextResponse.json({error:"The linked pedigree animal must belong to you and be published first."},{status:400})}
    payload.pedigree_animal_id=pedigreeId;
  }

  if("description" in payload)payload.description=String(payload.description??"").trim().slice(0,5000)||null;
  if("seller_location" in payload)payload.seller_location=String(payload.seller_location??"").trim().slice(0,160)||null;
  if("morph" in payload)payload.morph=String(payload.morph??"").trim().slice(0,160)||null;
  if("sex" in payload)payload.sex=String(payload.sex??"").trim().slice(0,40)||null;
  if("age_or_year" in payload)payload.age_or_year=String(payload.age_or_year??"").trim().slice(0,80)||null;
  if("lineage" in payload)payload.lineage=String(payload.lineage??"").trim().slice(0,2000)||null;

  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(id)}&owner_id=eq.${identity.user.id}`,{method:"PATCH",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(payload),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:await response.text()},{status:400});
  const rows=await response.json();
  if(!rows.length)return NextResponse.json({error:"Listing not found"},{status:404});

  let cleanupWarning=false;
  if(nextImages){
    const keep=new Set(nextImages);
    const removed=(current.image_urls??[]).filter((url)=>!keep.has(url));
    cleanupWarning=(await removeOwnedImages(identity.user.id,identity.token,removed))>0;
  }
  return NextResponse.json({listing:rows[0],cleanupWarning});
}

export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});
  const {id}=await params;
  const current=await ownedListing(id,identity.user.id,identity.token);
  if(!current)return NextResponse.json({error:"Listing not found"},{status:404});
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(id)}&owner_id=eq.${identity.user.id}`,{method:"DELETE",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,Prefer:"return=representation"},cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:await response.text()},{status:400});
  const rows=await response.json();
  if(!rows.length)return NextResponse.json({error:"Listing not found"},{status:404});
  const cleanupWarning=(await removeOwnedImages(identity.user.id,identity.token,current.image_urls??[]))>0;
  return NextResponse.json({ok:true,cleanupWarning});
}
