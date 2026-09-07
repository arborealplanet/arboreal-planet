import { NextRequest,NextResponse } from "next/server";
import { SUPABASE_AUTH_KEY,SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const safeNext=(value:string|null)=>value&&value.startsWith("/")&&!value.startsWith("//")?value:"/profile";

export async function GET(request:NextRequest){
  const next=safeNext(request.nextUrl.searchParams.get("next"));
  const settings=await fetch(`${SUPABASE_AUTH_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_AUTH_KEY},cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null) as {external?:Record<string,boolean>}|null;
  if(!settings?.external?.github)return NextResponse.redirect(new URL(`/login?authError=github_not_configured&next=${encodeURIComponent(next)}`,request.url));
  const redirectTo=new URL("/",request.nextUrl.origin).toString();
  const authorize=new URL(`${SUPABASE_AUTH_URL}/auth/v1/authorize`);
  authorize.searchParams.set("provider","github");
  authorize.searchParams.set("redirect_to",redirectTo);
  const response=NextResponse.redirect(authorize);
  response.cookies.set("ap_oauth_next",next,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
  return response;
}
