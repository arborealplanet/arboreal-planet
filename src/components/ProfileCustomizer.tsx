"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

const accents = [
  { name: "Emerald", value: "#6ee7a1" },
  { name: "Cyan", value: "#67e8f9" },
  { name: "Amber", value: "#fde68a" },
  { name: "Violet", value: "#c4b5fd" },
  { name: "Rose", value: "#fda4af" },
];

export function ProfileCustomizer() {
  const [accent, setAccent] = useState(accents[0].value);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Keeper Profile");
  const [username, setUsername] = useState("username");
  const [bio, setBio] = useState("Green Tree Python keeper · breeder · marketplace seller");

  useEffect(() => () => {
    if (avatar) URL.revokeObjectURL(avatar);
    if (banner) URL.revokeObjectURL(banner);
  }, [avatar, banner]);

  const initials = useMemo(() => displayName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "AP", [displayName]);

  function loadImage(event: ChangeEvent<HTMLInputElement>, setter: (value: string | null) => void) {
    const file = event.target.files?.[0];
    if (!file) return;
    setter(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-5">
      <div className="panel overflow-hidden rounded-[30px]" style={{ borderColor: `${accent}2c` }}>
        <div
          className="relative h-48 overflow-hidden sm:h-56"
          style={{
            backgroundImage: banner ? `linear-gradient(rgba(3,10,7,.18),rgba(3,10,7,.35)),url(${banner})` : `radial-gradient(circle at 25% 50%,${accent}2e,transparent 30%),linear-gradient(110deg,#0b2117,#07100c 58%,#102b1c)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 grid-surface opacity-20" />
          <div className="absolute right-5 top-5 rounded-full border border-white/[.08] bg-black/30 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Live profile preview</div>
        </div>
        <div className="relative p-6 sm:p-8">
          <div className="-mt-20 grid h-28 w-28 overflow-hidden rounded-full border-[6px] border-[#07110d] bg-[#10251a] text-2xl font-black shadow-xl" style={{ color: accent }}>
            {avatar ? <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center">{initials}</span>}
          </div>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">{displayName}</h2>
              <div className="mt-1 text-sm text-white/30">@{username || "username"} · Location optional</div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/42">{bio || "Add a short bio about what you keep, breed or sell."}</p>
            </div>
            <div className="flex flex-wrap gap-2">{["Keeper", "Breeder", "Seller"].map((item) => <span key={item} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white/35">{item}</span>)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="panel rounded-3xl p-6">
          <div className="section-kicker">Customization</div>
          <h2 className="mt-3 text-xl font-semibold">Make the profile yours.</h2>
          <div className="mt-5 space-y-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/24">Accent color</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {accents.map((item) => <button key={item.name} onClick={() => setAccent(item.value)} aria-label={`${item.name} accent`} title={item.name} className={`h-8 w-8 rounded-full border-2 border-[#07110d] ring-2 ${accent === item.value ? "ring-white/60" : "ring-white/10"}`} style={{ backgroundColor: item.value }} />)}
              </div>
            </div>
            <label className="block border-t border-white/[.055] pt-4"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/24">Banner</div><div className="mt-2 rounded-xl border border-dashed border-white/[.1] px-4 py-4 text-xs text-white/38 hover:border-white/20">Choose banner image<input type="file" accept="image/*" onChange={(e) => loadImage(e, setBanner)} className="mt-3 block w-full text-[11px] text-white/28 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[.06] file:px-3 file:py-2 file:text-white/50" /></div></label>
            <label className="block border-t border-white/[.055] pt-4"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/24">Avatar</div><div className="mt-2 rounded-xl border border-dashed border-white/[.1] px-4 py-4 text-xs text-white/38 hover:border-white/20">Choose profile picture<input type="file" accept="image/*" onChange={(e) => loadImage(e, setAvatar)} className="mt-3 block w-full text-[11px] text-white/28 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[.06] file:px-3 file:py-2 file:text-white/50" /></div></label>
          </div>
        </div>

        <div className="panel rounded-3xl p-6">
          <div className="section-kicker">Profile details</div>
          <h2 className="mt-3 text-xl font-semibold">Preview the public identity.</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-white/35"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.13em] text-white/24">Display name</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-white/[.08] bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/25" /></label>
            <label className="text-xs text-white/35"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.13em] text-white/24">Username</span><input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))} className="w-full rounded-xl border border-white/[.08] bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/25" /></label>
            <label className="sm:col-span-2 text-xs text-white/35"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.13em] text-white/24">Bio</span><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-white/[.08] bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/25" /></label>
          </div>
          <div className="mt-5 rounded-xl border border-amber-200/10 bg-amber-200/[.025] px-4 py-3 text-[11px] leading-5 text-amber-100/45">This preview works locally in the browser. Saving to an account will be enabled when the Supabase profile/storage backend is connected.</div>
        </div>
      </div>
    </div>
  );
}
