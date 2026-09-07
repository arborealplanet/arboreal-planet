import { NextRequest,NextResponse } from "next/server";
import { verifyAccessToken,writeAuthCookies } from "@/lib/supabase-auth";

const safeNext=(value:string|undefined)=>value&&value.startsWith("/")&&!value.startsWith("//")?value:"/profile";

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>null) as {access_token?:string;refresh_token?:string;expires_in?:number}|null;
  if(!body?.access_token||!body.refresh_token)return NextResponse.json({error:"Missing OAuth session"},{status:400});
  const user=await verifyAccessToken(body.access_token);
  if(!user)return NextResponse.json({error:"Invalid OAuth session"},{status:401});
  const next=safeNext(request.cookies.get("ap_oauth_next")?.value);
  const response=NextResponse.json({ok:true,next,user:{id:user.id}});
  writeAuthCookies(response,{access_token:body.access_token,refresh_token:body.refresh_token,expires_in:Math.max(60,Math.min(Number(body.expires_in)||3600,86400))});
  response.cookies.set("ap_oauth_next","",{httpOnly:true,path:"/",maxAge:0});
  return response;
}
