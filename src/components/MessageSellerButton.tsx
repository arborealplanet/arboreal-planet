"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function MessageSellerButton({listingId}:{listingId:string}){const router=useRouter(),[busy,setBusy]=useState(false);async function start(){setBusy(true);const r=await fetch("/api/messages/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({listingId})});if(r.status===401){router.push(`/login?next=/marketplace/${listingId}`);return}const d=await r.json();if(r.ok)router.push(`/messages/${d.conversationId}`);else setBusy(false)}return <button onClick={start} disabled={busy} className="mt-5 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-[#06100c] disabled:opacity-50">{busy?"Opening…":"Message seller"}</button>}
