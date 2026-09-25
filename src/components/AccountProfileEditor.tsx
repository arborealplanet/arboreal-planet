"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadFileToSignedStorage, type SignedStorageUpload } from "@/lib/direct-storage-upload";
import { ACCENT_PRESETS, isCustomAccent, normalizeCustomAccentHex, resolveAccentColor } from "@/lib/profile-accent";

type Profile = {
  username?: string | null; display_name?: string | null; bio?: string | null; location?: string | null;
  avatar_url?: string | null; banner_url?: string | null; accent_color?: string | null; profile_visibility?: string | null;
  seller_enabled?: boolean; role?: string | null; website_url?: string | null; instagram_url?: string | null; facebook_url?: string | null;
  seller_verification_status?: "unverified"|"pending"|"verified"|"rejected"|null;
};
type MediaField="avatar_url"|"banner_url"; type MediaBucket="avatars"|"profile-banners";

function diffProfile(base:Profile,current:Profile):Partial<Profile>{
  const dirty:Partial<Profile>={};
  (Object.keys(current) as Array<keyof Profile>).forEach((key)=>{
    if(current[key]!==base[key]) (dirty as Record<string,unknown>)[key]=current[key];
  });
  return dirty;
}

export function AccountProfileEditor({email,initial}:{email:string;initial:Profile}){
 const router=useRouter(); const [profile,setProfile]=useState<Profile>(initial); const savedRef=useRef<Profile>(initial); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState<MediaField|null>(null); const [verifying,setVerifying]=useState(false); const [savingAccent,setSavingAccent]=useState(false); const [message,setMessage]=useState<string|null>(null); const accentRequest=useRef(0);
 const accent=useMemo(()=>resolveAccentColor(profile.accent_color),[profile.accent_color]);
 const customSelected=isCustomAccent(profile.accent_color);
 const customHex=normalizeCustomAccentHex(profile.accent_color)??"#6ee7b7";
 async function persistPatch(patch:Partial<Profile>){const response=await fetch("/api/account/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error??"Could not save profile.");return data}
 async function upload(event:ChangeEvent<HTMLInputElement>,bucket:MediaBucket,field:MediaField){const input=event.currentTarget,file=input.files?.[0];if(!file)return;const allowedTypes=new Set(["image/jpeg","image/png","image/webp"]),maxBytes=bucket==="avatars"?5*1024*1024:8*1024*1024;if(!allowedTypes.has(file.type)){setMessage("Use a JPG, PNG, or WebP image.");input.value="";return}if(file.size>maxBytes){setMessage(bucket==="avatars"?"Avatar must be 5 MB or smaller.":"Banner must be 8 MB or smaller.");input.value="";return}setUploading(field);setMessage(field==="avatar_url"?"Uploading avatar…":"Uploading banner…");let signed:SignedStorageUpload|null=null;try{const authorize=await fetch("/api/account/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bucket,type:file.type,size:file.size,name:file.name})});const data=await authorize.json().catch(()=>({})) as Partial<SignedStorageUpload>&{error?:string};if(!authorize.ok||!data.signedUrl||!data.publicUrl||!data.path)throw new Error(data.error??"Upload could not be authorized.");signed={signedUrl:data.signedUrl,publicUrl:data.publicUrl,path:data.path};await uploadFileToSignedStorage(file,signed);const finalize=await fetch("/api/account/media",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({bucket,path:signed.path})});const saved=await finalize.json().catch(()=>({}));if(!finalize.ok||!saved.publicUrl)throw new Error(saved.error??"Image uploaded but could not be saved.");const mergedProfile={...(saved.profile??{}),[field]:saved.publicUrl};savedRef.current={...savedRef.current,...mergedProfile} as Profile;setProfile(current=>({...current,...mergedProfile}));setMessage(field==="avatar_url"?"Avatar updated and saved.":"Banner updated and saved.");router.refresh()}catch(error){if(signed)await fetch("/api/account/media",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({bucket,path:signed.path})}).catch(()=>null);setMessage(error instanceof Error?error.message:"Upload failed. Check your connection and try again.")}finally{setUploading(null);input.value=""}}
 async function save(){const dirty=diffProfile(savedRef.current,profile);if(Object.keys(dirty).length===0){setMessage("No changes to save — your profile is already up to date.");return}setSaving(true);setMessage(null);try{const data=await persistPatch(dirty);const serverProfile=data.profile as Profile|undefined;if(serverProfile){savedRef.current=serverProfile;setProfile(serverProfile)}else{savedRef.current={...profile}}setMessage(data.unchanged?"Everything is already saved.":"Profile and social links saved.");router.refresh()}catch(error){setMessage(error instanceof Error?error.message:"Could not save profile.")}finally{setSaving(false)}}
 async function chooseAccent(id:string){const request=++accentRequest.current;const previous=profile.accent_color??"emerald";setProfile(current=>({...current,accent_color:id}));setSavingAccent(true);setMessage("Saving profile accent…");try{const data=await persistPatch({accent_color:id});if(request!==accentRequest.current)return;if(data.profile){savedRef.current=data.profile as Profile;setProfile(current=>({...current,...data.profile,accent_color:id}))}else{savedRef.current={...savedRef.current,accent_color:id}};setMessage("Profile accent saved.");router.refresh()}catch(error){if(request!==accentRequest.current)return;setProfile(current=>({...current,accent_color:previous}));setMessage(error instanceof Error?error.message:"Could not save profile accent.")}finally{if(request===accentRequest.current)setSavingAccent(false)}}
 async function requestVerification(){setVerifying(true);setMessage(null);try{const response=await fetch("/api/account/seller-verification",{method:"POST"});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error??"Could not request verification.");setProfile(p=>({...p,seller_enabled:true,seller_verification_status:data.result?.status??"pending"}));setMessage("Seller verification request submitted.");router.refresh()}catch(error){setMessage(error instanceof Error?error.message:"Could not request seller verification.")}finally{setVerifying(false)}}
 async function logout(){try{await fetch("/api/auth/logout",{method:"POST"})}finally{router.push("/login");router.refresh()}}
 const input="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white/75 outline-none focus:border-emerald-300/25"; const mediaBusy=uploading!==null; const sellerStatus=profile.seller_verification_status??"unverified";
 return <><div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]">
  <div className="panel overflow-hidden rounded-3xl" style={{borderTopColor:accent,borderTopWidth:2}}><div className="relative h-40 bg-white/[.025] bg-cover bg-center" style={profile.banner_url?{backgroundImage:`linear-gradient(to bottom,transparent 55%,rgba(6,16,12,.58)),url(${profile.banner_url})`}:{backgroundImage:`linear-gradient(135deg,${accent}22,transparent 55%)`}}><label className={`absolute right-4 top-4 rounded-xl border border-white/[.1] bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/70 ${mediaBusy?"cursor-wait opacity-60":"cursor-pointer"}`}>{uploading==="banner_url"?"Uploading…":"Change banner"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={mediaBusy} onChange={e=>upload(e,"profile-banners","banner_url")}/></label></div><div className="relative p-6 pt-14"><div className="absolute -top-12 left-6 h-24 w-24 overflow-hidden rounded-3xl border-4 border-[#07110d] bg-white/[.05]">{profile.avatar_url?<img src={profile.avatar_url} alt="Profile avatar" className="h-full w-full object-cover"/>:<div className="grid h-full w-full place-items-center text-2xl text-white/15">AP</div>}</div><label className={`absolute left-32 top-3 text-[10px] font-bold uppercase tracking-[.1em] ${mediaBusy?"cursor-wait opacity-55":"cursor-pointer"}`} style={{color:accent}}>{uploading==="avatar_url"?"Uploading…":"Upload avatar"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={mediaBusy} onChange={e=>upload(e,"avatars","avatar_url")}/></label><div className="text-xs text-white/28">{email}</div><div className="mt-2 text-2xl font-semibold">{profile.display_name||"Arboreal Planet member"}</div><div className="mt-1 text-sm text-white/35">@{profile.username||"choose-a-username"}</div><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] uppercase text-white/35">{profile.role||"user"}</span><span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] uppercase text-white/35">Seller: {sellerStatus}</span></div><p className="mt-4 text-[11px] leading-5 text-white/32">Avatar, banner and accent changes save automatically. Social links save with the profile button.</p></div></div>
  <div className="panel rounded-3xl p-6"><div className="section-kicker">Profile settings</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-xs text-white/35">Display name</span><input className={input} maxLength={80} value={profile.display_name??""} onChange={e=>setProfile({...profile,display_name:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Username</span><input className={input} maxLength={30} value={profile.username??""} onChange={e=>setProfile({...profile,username:e.target.value})}/></label><label className="sm:col-span-2"><span className="mb-2 block text-xs text-white/35">Bio</span><textarea className={`${input} min-h-28`} maxLength={600} value={profile.bio??""} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Location</span><input className={input} maxLength={120} value={profile.location??""} onChange={e=>setProfile({...profile,location:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Profile visibility</span><select className={input} value={profile.profile_visibility??"public"} onChange={e=>setProfile({...profile,profile_visibility:e.target.value})}><option value="public">Public</option><option value="private">Private</option></select></label><label className="sm:col-span-2"><span className="mb-2 block text-xs text-white/35">Website</span><input className={input} inputMode="url" placeholder="yourwebsite.com" value={profile.website_url??""} onChange={e=>setProfile({...profile,website_url:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Instagram</span><input className={input} placeholder="@handle or instagram.com/handle" value={profile.instagram_url??""} onChange={e=>setProfile({...profile,instagram_url:e.target.value})}/></label><label><span className="mb-2 block text-xs text-white/35">Facebook</span><input className={input} placeholder="page handle or facebook.com/page" value={profile.facebook_url??""} onChange={e=>setProfile({...profile,facebook_url:e.target.value})}/></label></div><fieldset className="mt-5"><div className="flex items-center justify-between gap-3"><legend className="text-xs text-white/35">Profile accent</legend>{savingAccent?<div className="text-[10px] text-white/28" aria-live="polite">Saving…</div>:null}</div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{ACCENT_PRESETS.map(([id,label,color])=>{const selected=(profile.accent_color??"emerald")===id;return <button key={id} type="button" aria-pressed={selected} onClick={()=>void chooseAccent(id)} className={`flex min-h-11 touch-manipulation items-center gap-2 rounded-xl border px-3 py-2 text-left text-[10px] font-bold ${selected?"bg-white/[.06] text-white":"border-white/[.06] text-white/42"}`} style={{borderColor:selected?color:undefined}}><span className="h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:color}}/>{label}<span className="sr-only">{selected?" selected":""}</span></button>})}<label className={`flex min-h-11 touch-manipulation cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-[10px] font-bold ${customSelected?"bg-white/[.06] text-white":"border-white/[.06] text-white/42"}`} style={{borderColor:customSelected?customHex:undefined}} title="Pick any custom color"><input type="color" value={customHex} onChange={e=>void chooseAccent(e.target.value)} className="h-4 w-7 shrink-0 cursor-pointer appearance-none rounded-full border border-white/10 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0" aria-label="Pick a custom accent color"/><span className="leading-tight">Custom<span className="block font-mono text-[9px] font-normal normal-case text-white/40">{customHex}</span></span><span className="sr-only">{customSelected?" selected":""}</span></label></div></fieldset>
  <div className="mt-5 rounded-2xl border border-white/[.06] p-4"><div className="text-sm font-semibold text-white/70">Marketplace seller access</div><p className="mt-1 text-xs leading-5 text-white/38">Marketplace listings require seller verification. You can build your profile first, then submit it for review.</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-white/45">{sellerStatus}</span>{sellerStatus!=="verified"&&sellerStatus!=="pending"?<button type="button" disabled={verifying} onClick={requestVerification} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-emerald-100/75 disabled:opacity-50">{verifying?"Submitting…":"Request verification"}</button>:null}{sellerStatus==="pending"?<span className="text-xs text-amber-100/55">Waiting for review.</span>:null}{sellerStatus==="verified"?<span className="text-xs text-emerald-100/65">Approved to create listings.</span>:null}</div></div>
  {message?<div className="mt-4 text-xs text-emerald-200/65" aria-live="polite">{message}</div>:null}<div className="mt-6 flex flex-wrap gap-3"><button onClick={save} disabled={saving||mediaBusy||savingAccent} className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c] disabled:opacity-60">{saving?"Saving…":"Save profile"}</button><button onClick={logout} className="rounded-xl border border-white/[.08] px-5 py-3 text-xs font-bold text-white/45">Log out</button></div></div>
 </div>
 <SecuritySettings currentEmail={email}/>
 </>;
}

function SecuritySettings({ currentEmail }: { currentEmail: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailMessage, setEmailMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white/75 outline-none focus:border-emerald-300/25";

  async function changePassword() {
    if (pwBusy) return;
    if (newPassword.length < 8) { setPwMessage({ ok: false, text: "Use a password with at least 8 characters." }); return; }
    if (newPassword !== confirmPassword) { setPwMessage({ ok: false, text: "The two passwords do not match." }); return; }
    setPwBusy(true); setPwMessage(null);
    try {
      const response = await fetch("/api/auth/password/change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not change password.");
      setNewPassword(""); setConfirmPassword("");
      setPwMessage({ ok: true, text: "Password changed. You stay signed in on this device." });
    } catch (error) {
      setPwMessage({ ok: false, text: error instanceof Error ? error.message : "Could not change password." });
    } finally { setPwBusy(false); }
  }

  async function changeEmail() {
    if (emailBusy) return;
    const clean = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) { setEmailMessage({ ok: false, text: "Enter a valid email address." }); return; }
    if (clean === currentEmail.trim().toLowerCase()) { setEmailMessage({ ok: false, text: "That is already the email on this account." }); return; }
    setEmailBusy(true); setEmailMessage(null);
    try {
      const response = await fetch("/api/auth/email/change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newEmail: clean }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not change email.");
      setNewEmail("");
      setEmailMessage({ ok: true, text: "Email change requested. Confirm it from the link sent to the new address; the change takes effect after confirmation." });
    } catch (error) {
      setEmailMessage({ ok: false, text: error instanceof Error ? error.message : "Could not change email." });
    } finally { setEmailBusy(false); }
  }

  return <section className="panel mt-5 rounded-3xl p-6">
    <div className="section-kicker">Security</div>
    <div className="mt-5 grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold text-white/70">Change password</h3>
        <p className="mt-1 text-xs leading-5 text-white/34">You are signed in, so no reset email is needed.</p>
        <div className="mt-3 grid gap-3">
          <label><span className="mb-2 block text-xs text-white/35">New password</span><input type="password" autoComplete="new-password" className={input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
          <label><span className="mb-2 block text-xs text-white/35">Confirm new password</span><input type="password" autoComplete="new-password" className={input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
        </div>
        {pwMessage ? <div className={`mt-3 text-xs ${pwMessage.ok ? "text-emerald-200/65" : "text-red-200/70"}`} aria-live="polite">{pwMessage.text}</div> : null}
        <button type="button" onClick={() => void changePassword()} disabled={pwBusy} className="mt-4 rounded-xl border border-white/[.08] px-5 py-3 text-xs font-bold text-white/60 transition hover:text-white/85 disabled:opacity-50">{pwBusy ? "Updating…" : "Update password"}</button>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white/70">Change email</h3>
        <p className="mt-1 text-xs leading-5 text-white/34">Current: <span className="text-white/55">{currentEmail || "—"}</span></p>
        <div className="mt-3">
          <label><span className="mb-2 block text-xs text-white/35">New email</span><input type="email" autoComplete="email" className={input} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@example.com" /></label>
        </div>
        {emailMessage ? <div className={`mt-3 text-xs ${emailMessage.ok ? "text-emerald-200/65" : "text-red-200/70"}`} aria-live="polite">{emailMessage.text}</div> : null}
        <button type="button" onClick={() => void changeEmail()} disabled={emailBusy} className="mt-4 rounded-xl border border-white/[.08] px-5 py-3 text-xs font-bold text-white/60 transition hover:text-white/85 disabled:opacity-50">{emailBusy ? "Updating…" : "Update email"}</button>
      </div>
    </div>
    <div className="mt-6 rounded-2xl border border-red-300/[.12] bg-red-300/[.02] p-5">
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-red-200/50">Danger zone</div>
      <p className="mt-2 text-xs leading-5 text-white/38">Deleting your account is permanent and different from making your profile private. Review the process and what it keeps before starting.</p>
      <Link href="/account-deletion" className="mt-3 inline-block rounded-xl border border-red-300/15 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.1em] text-red-100/60 transition hover:text-red-100/90">Account deletion →</Link>
    </div>
  </section>;
}

