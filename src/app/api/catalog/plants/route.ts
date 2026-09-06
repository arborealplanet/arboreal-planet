import { NextResponse } from "next/server";
import { supabasePublicFetch } from "@/lib/supabase-public";
export async function GET(){try{const rows=await supabasePublicFetch("plant_collections?select=slug,name,scientific_name,plant_group,description,tags,status,display_order&order=display_order.asc");return NextResponse.json({source:"supabase",rows});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Catalog unavailable"},{status:502});}}
