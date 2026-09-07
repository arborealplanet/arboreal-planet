import { NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export async function GET(){
  const headers={apikey:SUPABASE_AUTH_KEY,Authorization:`Bearer ${SUPABASE_AUTH_KEY}`};
  const [s,l]=await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/species?select=id,slug,common_name,scientific_name,animal_group,description,tags,published&order=common_name.asc`,{headers,cache:"no-store"}),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/localities?active=eq.true&select=id,species_id,name,display_order&order=display_order.asc`,{headers,cache:"no-store"}),
  ]);
  if(!s.ok||!l.ok)return NextResponse.json({error:"Animal catalog unavailable"},{status:502});
  const rows=await s.json();
  const localities=await l.json();
  return NextResponse.json({rows,species:rows.filter((x:{published:boolean})=>x.published).map((x:{id:string;common_name:string;scientific_name:string})=>({id:x.id,common_name:x.common_name,scientific_name:x.scientific_name})),localities});
}
