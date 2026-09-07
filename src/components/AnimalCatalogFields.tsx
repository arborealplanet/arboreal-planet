"use client";
import { useEffect,useMemo,useState } from "react";

type Species={id:string;common_name:string;scientific_name:string};
type Locality={id:string;species_id:string;name:string};

export function AnimalCatalogFields({speciesId:initialSpeciesId="",localityId:initialLocalityId=""}:{speciesId?:string;localityId?:string}){
  const [species,setSpecies]=useState<Species[]>([]),[localities,setLocalities]=useState<Locality[]>([]),[speciesId,setSpeciesId]=useState(initialSpeciesId),[localityId,setLocalityId]=useState(initialLocalityId);
  useEffect(()=>{fetch("/api/catalog/animals").then(r=>r.json()).then(d=>{setSpecies(d.species??[]);setLocalities(d.localities??[])}).catch(()=>{})},[]);
  const available=useMemo(()=>localities.filter(x=>x.species_id===speciesId),[localities,speciesId]);
  useEffect(()=>{if(localityId&&!available.some(x=>x.id===localityId))setLocalityId("")},[available,localityId]);
  const field="mt-2 w-full rounded-xl border border-white/10 bg-[#08130e] p-3 text-white";
  return <>
    <label className="text-xs text-white/45">Species<select name="species_id" value={speciesId} onChange={e=>{setSpeciesId(e.target.value);setLocalityId("")}} className={field}><option value="">Select species</option>{species.map(s=><option key={s.id} value={s.id}>{s.common_name} · {s.scientific_name}</option>)}</select></label>
    <label className="text-xs text-white/45">Locality<select name="locality_id" value={localityId} onChange={e=>setLocalityId(e.target.value)} disabled={!speciesId} className={field}><option value="">Unspecified</option>{available.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
  </>;
}
