import { NextResponse } from "next/server";
import { supabasePublicFetch } from "@/lib/supabase-public";
export async function GET(){try{const rows=await supabasePublicFetch("species?select=slug,common_name,scientific_name,animal_group,description,tags,published&order=common_name.asc");return NextResponse.json({source:"supabase",rows});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Catalog unavailable"},{status:502});}}
