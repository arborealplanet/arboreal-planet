"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthHashBridge(){
  const router=useRouter();
  useEffect(()=>{
    if(typeof window==="undefined"||!window.location.hash.includes("access_token="))return;
    const hash=new URLSearchParams(window.location.hash.slice(1));
    const accessToken=hash.get("access_token");
    const refreshToken=hash.get("refresh_token");
    const expiresIn=Number(hash.get("expires_in")||3600);
    if(!accessToken||!refreshToken)return;
    window.history.replaceState(null,"",window.location.pathname+window.location.search);
    void fetch("/api/auth/oauth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({access_token:accessToken,refresh_token:refreshToken,expires_in:Number.isFinite(expiresIn)?expiresIn:3600})})
      .then(async r=>({ok:r.ok,data:await r.json().catch(()=>({}))}))
      .then(({ok,data})=>{if(ok){router.replace(typeof data.next==="string"?data.next:"/profile");router.refresh();}else{router.replace("/login?authError=github_failed");}})
      .catch(()=>router.replace("/login?authError=github_failed"));
  },[router]);
  return null;
}
