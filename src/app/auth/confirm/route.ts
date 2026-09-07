import { NextRequest, NextResponse } from "next/server";
import { supabaseAuthRequest, writeAuthCookies } from "@/lib/supabase-auth";

const allowedTypes=new Set(["email","signup","invite","magiclink","recovery","email_change"]);

export async function GET(request:NextRequest){
  const tokenHash=request.nextUrl.searchParams.get("token_hash");
  const type=request.nextUrl.searchParams.get("type")??"email";
  const requestedNext=request.nextUrl.searchParams.get("next")??"/profile";
  const next=requestedNext.startsWith("/")&&!requestedNext.startsWith("//")?requestedNext:"/profile";
  if(!tokenHash||!allowedTypes.has(type))return NextResponse.redirect(new URL("/login?authError=invalid_confirmation",request.url));
  const verify=await supabaseAuthRequest("verify",{method:"POST",body:JSON.stringify({token_hash:tokenHash,type})});
  const data=await verify.json().catch(()=>({}));
  if(!verify.ok)return NextResponse.redirect(new URL("/login?authError=invalid_confirmation",request.url));
  const response=NextResponse.redirect(new URL(next,request.url));
  writeAuthCookies(response,data);
  return response;
}
