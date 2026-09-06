"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = { username?: string|null; display_name?: string|null; bio?: string|null; location?: string|null; avatar_url?: string|null; banner_url?: string|null; accent_color?: string|null; profile_visibility?: string|null; seller_enabled?: boolean; role?: string|null };

export function AccountProfileEditor({ email, initial }: { email: string; initial: Profile }) {
  const router = useRouter();
  const [profile,setProfile]=useState<Profile>(initial);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function upload(event:ChangeEvent<HTMLInputElement>,bucket:"avatars"|"profile-banners",field:"avatar_url"|"banner_url"){
    const file=event.target.files?.[0]; if(!file)return; setMessage("Uploading image…");
    const form=new FormData();form.append("file",file);form.append("bucket",bucket);
    const response=await fetch("/api/account/media",{method:"POST",body:form});const data=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(data.error??"Upload failed.");return;}setProfile(p=>({...p,[field]:data.publicUrl}));setMessage("Image uploaded. Save profile to keep the change.");
  }
  async function save(){setSaving(true);setMessage(null);const response=await fetch("/api/account/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});const data=await response.json().catch(()=>({}));setSaving(false);setMessage(response.ok?"Profile saved.":data.error??"Could not save profile.");}
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.push("/login");router.refresh();}

  const input="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white/75 outline-none focus:border-emerald-300/25";
  return <div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]">
    <div className="panel overflow-hidden rounded-3xl">
      <div className="relative h-40 bg-white/[.025] bg-cover bg-center" style={profile.banner_url?{backgroundImage:`url(${profile.banner_url})`}:undefined}><label className="absolute right-4 top-4 cursor-pointer rounded-xl border border-white/[.1] bg-black/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/60">Change banner<input type="file" accept="image/*" className="hidden" onChange={e=>upload(e,"profile-banners","banner_url")}/></label></div>
      <div className="relative p-6 pt-14"><div className="absolute -top-12 left-6 h-24 w-24 overflow-hidden rounded-3xl border-4 border-[#07110d] bg-white/[.05]">{profile.avatar_url?<img src={profile.avatar_url} alt="Profile avatar" className="h-full w-full object-cover"/>:<div className="grid h-full w-full place-items-center text-2xl text-white/15">AP</div>}</div><label className="absolute left-32 top-3 cursor-pointer text-[10px] font-bold uppercase tracking-[.1em] text-emerald-300">Upload avatar<input type="file" accept="image/*" className="hidden" onChange={e=>upload(e,"avatars","avatar_url")}/></label><div className="text-xs text-white/28">{email}</div><div className="mt-2 text-2xl font-semibold">{profile.display_name||"Arboreal Planet member"}</div><div className="mt-1 text-sm text-white/35">@{profile.username||"choose-a-username"}</div><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] uppercase text-white/35">{profile.role||"user"}</span><span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] uppercase text-white/35">{profile.profile_visibility||"public"}</span></div></div>
    </div>
    <div className="panel rounded-3xl p-6"><div className="section-kicker">Profile settings</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-xs text-white/35">Display name</span><input className={input} value={profile.display_name??""} onChange={e=>setProfile({...profile,display_name:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Username</span><input className={input} value={profile.username??""} onChange={e=>setProfile({...profile,username:e.target.value})}/></label><label className="sm:col-span-2"><span className="mb-2 block text-xs text-white/35">Bio</span><textarea className={`${input} min-h-28`} value={profile.bio??""} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Location</span><input className={input} value={profile.location??""} onChange={e=>setProfile({...profile,location:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Profile visibility</span><select className={input} value={profile.profile_visibility??"public"} onChange={e=>setProfile({...profile,profile_visibility:e.target.value})}><option value="public">Public</option><option value="private">Private</option></select></label></div><label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[.06] p-4 text-sm text-white/45"><input type="checkbox" checked={Boolean(profile.seller_enabled)} onChange={e=>setProfile({...profile,seller_enabled:e.target.checked})}/> Enable seller profile</label>{message?<div className="mt-4 text-xs text-emerald-200/65">{message}</div>:null}<div className="mt-6 flex flex-wrap gap-3"><button onClick={save} disabled={saving} className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c]">{saving?"Saving…":"Save profile"}</button><button onClick={logout} className="rounded-xl border border-white/[.08] px-5 py-3 text-xs font-bold text-white/45">Log out</button></div></div>
  </div>;
}
