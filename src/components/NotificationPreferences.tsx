"use client";

import { useEffect,useState } from "react";

type Preferences={messages:boolean;new_followers:boolean;community_activity:boolean;followed_subject_updates:boolean};
const defaults:Preferences={messages:true,new_followers:true,community_activity:true,followed_subject_updates:false};
const options:[keyof Preferences,string,string][]=[
  ["messages","Messages","Alerts when another keeper sends you a direct message or marketplace inquiry."],
  ["new_followers","New followers","Alerts when another keeper follows your public profile."],
  ["community_activity","Reactions & comments","Alerts when someone reacts to or comments on one of your Community posts."],
  ["followed_subject_updates","Followed-subject updates","Reserved for future alerts tied to animals, plants and topics you follow. Off by default."],
];

export function NotificationPreferences(){
  const [preferences,setPreferences]=useState<Preferences>(defaults);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let active=true;
    void fetch("/api/notifications/preferences",{cache:"no-store"})
      .then(async response=>({response,data:await response.json().catch(()=>null) as {preferences?:Preferences;error?:string}|null}))
      .then(({response,data})=>{if(active&&response.ok&&data?.preferences)setPreferences(data.preferences)})
      .finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  async function toggle(key:keyof Preferences){
    if(busy||loading)return;
    const next={...preferences,[key]:!preferences[key]};
    setPreferences(next);setBusy(true);setMessage("Saving…");
    try{
      const response=await fetch("/api/notifications/preferences",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(next)});
      const data=await response.json().catch(()=>null) as {preferences?:Preferences;error?:string}|null;
      if(!response.ok){setPreferences(preferences);setMessage(data?.error||"Could not save preferences.");return}
      if(data?.preferences)setPreferences(data.preferences);
      setMessage("Saved.");
    }finally{setBusy(false)}
  }

  return <section className="panel rounded-[26px] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-kicker">Notification preferences</div><h2 className="mt-2 text-xl font-semibold text-white/75">Choose what interrupts you.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/34">Your Following feed and Saved items are separate from alerts. You can keep following something without asking Arboreal Planet to notify you about it.</p></div>{message?<div role="status" className="text-[10px] font-bold text-white/30">{message}</div>:null}</div>
    <div className="mt-5 grid gap-2">{options.map(([key,title,description])=><button key={key} type="button" disabled={loading||busy} onClick={()=>void toggle(key)} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[.06] bg-black/10 p-4 text-left transition hover:bg-white/[.018] disabled:opacity-50"><div><div className="text-sm font-semibold text-white/62">{title}</div><p className="mt-1 text-xs leading-5 text-white/30">{description}</p></div><span className={`relative h-6 w-11 shrink-0 rounded-full border transition ${preferences[key]?"border-emerald-300/25 bg-emerald-300/20":"border-white/10 bg-white/[.035]"}`}><span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white/75 transition ${preferences[key]?"left-[21px]":"left-0.5"}`} /></span></button>)}</div>
  </section>;
}
