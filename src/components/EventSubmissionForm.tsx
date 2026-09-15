"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  ["REPTILE_EXPO","Reptile expo"],
  ["BREEDER_EVENT","Breeder event"],
  ["EDUCATION","Education / talk"],
  ["PLANT_EVENT","Plant event"],
  ["COMMUNITY_MEETUP","Community meetup"],
  ["OTHER","Other"],
] as const;

export function EventSubmissionForm() {
  const router = useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    const form=new FormData(event.currentTarget);
    setBusy(true);setMessage("Submitting…");
    try{
      const payload=Object.fromEntries(form.entries());
      const response=await fetch("/api/events/submissions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(response.status===401){router.push("/login?next=%2Fevents%3Fsuggest%3D1");return}
      const data=await response.json().catch(()=>null) as {error?:string}|null;
      if(!response.ok){setMessage(data?.error||"Could not submit event suggestion.");return}
      event.currentTarget.reset();
      setMessage("Submitted for review. It will not appear publicly until it is approved and its source is checked.");
    }finally{setBusy(false)}
  }

  return <form onSubmit={submit} className="panel rounded-[28px] p-5 sm:p-6">
    <div className="section-kicker">Suggest an event</div>
    <h2 className="mt-2 text-2xl font-semibold">Know about a reptile show?</h2>
    <p className="mt-2 max-w-3xl text-xs leading-6 text-white/38">Send the official event details and a source link. Suggestions stay private until reviewed; submitting something does not publish it automatically.</p>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <label className="text-xs font-semibold text-white/48">Event name<input required name="title" maxLength={180} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">Organizer<input name="organizer" maxLength={180} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">Type<select name="event_type" defaultValue="REPTILE_EXPO" className="mt-2 w-full rounded-xl border border-white/[.08] bg-[#08130e] px-3 py-3 text-sm text-white/75">{TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold text-white/48">Venue<input name="venue_name" maxLength={180} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">Starts<input required name="starts_at" type="datetime-local" className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">Ends<input name="ends_at" type="datetime-local" className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">City<input required name="city" maxLength={120} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">State / region<input name="state_region" maxLength={120} placeholder="FL, NY, Ontario…" className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">Country<input required name="country" defaultValue="United States" maxLength={120} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48">Street address<input name="address" maxLength={300} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48 md:col-span-2">Official/source URL<input required name="source_url" type="url" maxLength={1000} placeholder="https://official-event-site.example/..." className="mt-2 w-full rounded-xl border border-emerald-300/15 bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48 md:col-span-2">Event website, if different<input name="website_url" type="url" maxLength={1000} className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48 md:col-span-2">Description<textarea name="description" maxLength={4000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-white/[.08] bg-black/20 p-3 text-sm text-white/75 outline-none"/></label>
      <label className="text-xs font-semibold text-white/48 md:col-span-2">Note for reviewer<textarea name="note" maxLength={1000} rows={2} placeholder="Anything helpful for verifying the event…" className="mt-2 w-full resize-y rounded-xl border border-white/[.08] bg-black/20 p-3 text-sm text-white/75 outline-none"/></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={busy} className="primary-action disabled:opacity-45">{busy?"Submitting…":"Submit for review"}</button>{message?<div role="status" className="text-xs leading-5 text-white/42">{message}</div>:null}</div>
  </form>;
}
