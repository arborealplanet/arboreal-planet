import { NextRequest,NextResponse } from "next/server";
import { getServerIdentity,SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const categories=new Set(["ANIMAL","PLANT","ENCLOSURE","SUPPLY","FEEDER"]);
const origins=new Set(["CAPTIVE_BRED","IMPORT"]);

export async function GET(){
  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings?status=eq.ACTIVE&select=id,owner_id,category,title,description,species_id,locality_id,public_origin,price,currency,image_urls,seller_location,morph,sex,age_or_year,lineage,created_at&order=created_at.desc`,{headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`},cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Listings unavailable"},{status:502});
  return NextResponse.json({rows:await response.json()});
}

export async function POST(request:NextRequest){
  const identity=await getServerIdentity();
  if(!identity)return NextResponse.json({error:"Sign in required"},{status:401});

  const body=await request.json();
  const category=String(body.category??"");
  if(!categories.has(category))return NextResponse.json({error:"Invalid category"},{status:400});

  const title=String(body.title??"").trim();
  const price=Number(body.price);
  if(!title||title.length>160||!Number.isFinite(price)||price<0)return NextResponse.json({error:"Title and valid price required"},{status:400});

  let publicOrigin:string|null=null;
  if(category==="ANIMAL"&&body.public_origin!=null&&body.public_origin!==""){
    publicOrigin=String(body.public_origin);
    if(!origins.has(publicOrigin))return NextResponse.json({error:"Invalid animal origin"},{status:400});
  }

  const imagePrefix=`${SUPABASE_AUTH_URL}/storage/v1/object/public/marketplace/${identity.user.id}/`;
  const submittedImages=Array.isArray(body.image_urls)?body.image_urls.filter((x:unknown):x is string=>typeof x==="string").slice(0,10):[];
  if(submittedImages.some((url:string)=>!url.startsWith(imagePrefix)))return NextResponse.json({error:"Invalid listing image"},{status:400});

  const payload={
    owner_id:identity.user.id,
    category,
    title,
    description:String(body.description??"").trim().slice(0,5000)||null,
    public_origin:publicOrigin,
    price,
    currency:"USD",
    seller_location:String(body.seller_location??"").trim().slice(0,160)||null,
    morph:String(body.morph??"").trim().slice(0,160)||null,
    sex:body.sex?String(body.sex).slice(0,40):null,
    age_or_year:String(body.age_or_year??"").trim().slice(0,80)||null,
    lineage:String(body.lineage??"").trim().slice(0,2000)||null,
    status:"ACTIVE",
    image_urls:submittedImages,
  };

  const response=await fetch(`${SUPABASE_AUTH_URL}/rest/v1/marketplace_listings`,{method:"POST",headers:{apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${identity.token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(payload),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:await response.text()},{status:400});
  const rows=await response.json();
  return NextResponse.json({listing:rows[0]},{status:201});
}
