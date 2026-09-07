"use client";
import { useState } from "react";

export function CommunityPostOwnerMenu({postId}:{postId:string}){
  const [busy,setBusy]=useState(false);
  async function remove(){if(busy||!confirm("Remove this post from the community feed?"))return;setBusy(true);const r=await fetch(`/api/community/posts/${postId}`,{method:"DELETE"});setBusy(false);if(r.ok)window.dispatchEvent(new Event("community-posted"));else alert("Could not remove that post.");}
  return <button disabled={busy} onClick={remove} className="ml-auto rounded-lg border border-red-300/10 px-3 py-2 text-[10px] font-bold text-red-200/55 hover:bg-red-300/[.04] disabled:opacity-40">{busy?"Removing…":"Remove post"}</button>;
}
