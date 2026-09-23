"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToSignedStorage, type SignedStorageUpload } from "@/lib/direct-storage-upload";

const postTypes = [["Post","POST"],["Question","QUESTION"],["Breeding update","BREEDING_UPDATE"]] as const;
const tags = ["Green Tree Python","Boiga","Tree Monitors","Nepenthes","Breeding","Husbandry","Enclosures"];
const MAX_IMAGES = 10;

type AnimalOption = { id:string; common_name:string; scientific_name:string };
type PlantOption = { id:string; name:string; scientific_name:string; status:string };

export function CommunityComposer(){
  const router=useRouter();
  const [type,setType]=useState("POST");
  const [text,setText]=useState("");
  const [selectedTags,setSelectedTags]=useState<string[]>(["Green Tree Python"]);
  const [speciesId,setSpeciesId]=useState("");
  const [plantId,setPlantId]=useState("");
  const [animals,setAnimals]=useState<AnimalOption[]>([]);
  const [plants,setPlants]=useState<PlantOption[]>([]);
  const [files,setFiles]=useState<File[]>([]);
  const [video,setVideo]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const ready=text.trim().length>0||files.length>0||video.trim().length>0;
  const count=useMemo(()=>text.length,[text]);

  useEffect(()=>{
    let active=true;
    void Promise.all([
      fetch("/api/catalog/animals",{cache:"no-store"}).then(r=>r.ok?r.json():null),
      fetch("/api/catalog/plants",{cache:"no-store"}).then(r=>r.ok?r.json():null),
    ]).then(([animalData,plantData])=>{
      if(!active)return;
      setAnimals((animalData?.species??[]) as AnimalOption[]);
      setPlants(((plantData?.rows??[]) as PlantOption[]).filter(row=>row.status!=="PLANNED"));
    });
    return()=>{active=false};
  },[]);

  function toggleTag(tag:string){setSelectedTags(current=>current.includes(tag)?current.filter(item=>item!==tag):[...current,tag].slice(0,4))}

  async function cleanup(urls:string[]){
    if(!urls.length)return;
    await fetch("/api/community/upload",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({urls})}).catch(()=>null);
  }

  async function publish(){
    if(!ready||busy)return;
    setBusy(true);setError("");
    let media_urls:string[]=[];
    try{
      if(files.length){
        const authorize=await fetch("/api/community/upload",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({files:files.map(file=>({name:file.name,type:file.type,size:file.size}))}),
        });
        const uploadData=await authorize.json().catch(()=>({})) as {uploads?:SignedStorageUpload[];error?:string};
        if(authorize.status===401){router.push("/login?next=/community");return}
        if(!authorize.ok||!uploadData.uploads||uploadData.uploads.length!==files.length)throw new Error(uploadData.error||"Could not authorize photos.");
        for(let index=0;index<files.length;index++){
          const signed=uploadData.uploads[index];
          media_urls.push(await uploadFileToSignedStorage(files[index],signed));
        }
      }
      const response=await fetch("/api/community/posts",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({type,body:text,tags:selectedTags,media_urls,video_url:video,species_id:speciesId||null,plant_id:plantId||null}),
      });
      if(response.status===401){await cleanup(media_urls);router.push("/login?next=/community");return}
      const data=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok){await cleanup(media_urls);throw new Error(data.error||"Could not publish that post.")}
      setText("");setFiles([]);setVideo("");setSpeciesId("");setPlantId("");setBusy(false);router.refresh();window.dispatchEvent(new Event("community-posted"));
    }catch(err){
      await cleanup(media_urls);
      setError(err instanceof Error?err.message:"Could not publish that post.");
      setBusy(false);
    }
  }

  const label=postTypes.find(item=>item[1]===type)?.[0]??"Post";
  return <div className="panel overflow-hidden rounded-3xl">
    <div className="flex flex-wrap gap-1 border-b border-white/[.06] p-3">{postTypes.map(([name,value])=><button key={value} onClick={()=>setType(value)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${type===value?"bg-emerald-300 text-[#06100c]":"text-white/36 hover:bg-white/[.035] hover:text-white/60"}`}>{name}</button>)}</div>
    <div className="p-5">
      <textarea value={text} onChange={event=>setText(event.target.value.slice(0,1200))} rows={4} placeholder={type==="QUESTION"?"Ask the keeper community something useful...":type==="BREEDING_UPDATE"?"Share a pairing, clutch, hatch or breeding observation...":"Share an update with the keeper community..."} className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/22"/>
      <div className="mt-3 flex flex-wrap gap-2">{tags.map(tag=><button type="button" key={tag} onClick={()=>toggleTag(tag)} className={`rounded-full border px-3 py-1.5 text-[10px] ${selectedTags.includes(tag)?"border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200":"border-white/[.07] text-white/30"}`}>{tag}</button>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/40">Link an animal reference<select value={speciesId} onChange={event=>setSpeciesId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-2.5 text-sm text-white/65"><option value="">None</option>{animals.map(animal=><option key={animal.id} value={animal.id}>{animal.common_name}</option>)}</select></label>
        <label className="text-xs text-white/40">Link a plant collection<select value={plantId} onChange={event=>setPlantId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[.07] bg-[#08130e] px-3 py-2.5 text-sm text-white/65"><option value="">None</option>{plants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="cursor-pointer rounded-2xl border border-dashed border-white/10 p-4 text-xs text-white/40">Add photos · up to {MAX_IMAGES}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event=>setFiles(Array.from(event.target.files??[]).slice(0,MAX_IMAGES))}/><span className="mt-1 block text-[10px] text-white/22">JPG, PNG or WebP · 10 MB each</span></label>
        <label className="text-xs text-white/40">Video link<input value={video} onChange={event=>setVideo(event.target.value.slice(0,500))} placeholder="https://..." className="mt-2 w-full rounded-xl border border-white/[.07] bg-black/15 px-3 py-2.5 text-sm text-white outline-none"/></label>
      </div>
      {files.length>0&&<div className="mt-3 flex flex-wrap gap-2">{files.map((file,index)=><div key={`${file.name}-${index}`} className="rounded-lg border border-white/[.07] px-3 py-2 text-[10px] text-white/35">{file.name}<button type="button" onClick={()=>setFiles(current=>current.filter((_,itemIndex)=>itemIndex!==index))} className="ml-2 text-red-200/70">×</button></div>)}</div>}
      {error&&<div className="mt-3 text-xs text-red-200/70">{error}</div>}
    </div>
    <div className="flex items-center justify-between border-t border-white/[.06] bg-black/10 px-5 py-4"><span className="text-[9px] text-white/20">{count}/1200 · {label}{files.length?` · ${files.length} photo${files.length===1?"":"s"}`:""}{speciesId?" · animal linked":""}{plantId?" · plant linked":""}</span><button onClick={()=>void publish()} disabled={!ready||busy} className={`rounded-lg px-4 py-2 text-[11px] font-bold ${ready&&!busy?"bg-emerald-300 text-[#06100c]":"bg-white/[.04] text-white/18"}`}>{busy?"Publishing…":"Publish"}</button></div>
  </div>;
}
