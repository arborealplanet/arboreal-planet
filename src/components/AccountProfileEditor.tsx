"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  accent_color?: string | null;
  profile_visibility?: string | null;
  seller_enabled?: boolean;
  role?: string | null;
};

type MediaField = "avatar_url" | "banner_url";
type MediaBucket = "avatars" | "profile-banners";

export function AccountProfileEditor({ email, initial }: { email: string; initial: Profile }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<MediaField | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function persistProfile(nextProfile: Profile) {
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextProfile),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Could not save profile.");
    return data;
  }

  async function upload(event: ChangeEvent<HTMLInputElement>, bucket: MediaBucket, field: MediaField) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const maxBytes = bucket === "avatars" ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!allowedTypes.has(file.type)) {
      setMessage("Use a JPG, PNG, or WebP image.");
      input.value = "";
      return;
    }
    if (file.size > maxBytes) {
      setMessage(bucket === "avatars" ? "Avatar must be 5 MB or smaller." : "Banner must be 8 MB or smaller.");
      input.value = "";
      return;
    }

    setUploading(field);
    setMessage(field === "avatar_url" ? "Uploading avatar…" : "Uploading banner…");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", bucket);

      const response = await fetch("/api/account/media", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.publicUrl) throw new Error(data.error ?? "Upload failed.");

      const nextProfile = { ...profile, [field]: data.publicUrl };
      setProfile(nextProfile);
      await persistProfile(nextProfile);
      setMessage(field === "avatar_url" ? "Avatar updated." : "Banner updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Check your connection and try again.");
    } finally {
      setUploading(null);
      input.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await persistProfile(profile);
      setMessage("Profile saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const input = "w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white/75 outline-none focus:border-emerald-300/25";
  const mediaBusy = uploading !== null;

  return (
    <div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]">
      <div className="panel overflow-hidden rounded-3xl">
        <div
          className="relative h-40 bg-white/[.025] bg-cover bg-center"
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})` } : undefined}
        >
          <label className={`absolute right-4 top-4 rounded-xl border border-white/[.1] bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/70 ${mediaBusy ? "cursor-wait opacity-60" : "cursor-pointer hover:border-emerald-300/25 hover:text-white"}`}>
            {uploading === "banner_url" ? "Uploading…" : "Change banner"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={mediaBusy}
              onChange={(event) => upload(event, "profile-banners", "banner_url")}
            />
          </label>
        </div>

        <div className="relative p-6 pt-14">
          <div className="absolute -top-12 left-6 h-24 w-24 overflow-hidden rounded-3xl border-4 border-[#07110d] bg-white/[.05]">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="Profile avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-2xl text-white/15">AP</div>
            )}
          </div>

          <label className={`absolute left-32 top-3 text-[10px] font-bold uppercase tracking-[.1em] text-emerald-300 ${mediaBusy ? "cursor-wait opacity-55" : "cursor-pointer hover:text-emerald-200"}`}>
            {uploading === "avatar_url" ? "Uploading…" : "Upload avatar"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={mediaBusy}
              onChange={(event) => upload(event, "avatars", "avatar_url")}
            />
          </label>

          <div className="text-xs text-white/28">{email}</div>
          <div className="mt-2 text-2xl font-semibold">{profile.display_name || "Arboreal Planet member"}</div>
          <div className="mt-1 text-sm text-white/35">@{profile.username || "choose-a-username"}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] uppercase text-white/35">{profile.role || "user"}</span>
            <span className="rounded-full border border-white/[.07] px-3 py-1.5 text-[10px] uppercase text-white/35">{profile.profile_visibility || "public"}</span>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-white/32">Avatar and banner changes save as soon as the upload finishes. JPG, PNG, and WebP are supported.</p>
        </div>
      </div>

      <div className="panel rounded-3xl p-6">
        <div className="section-kicker">Profile settings</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs text-white/35">Display name</span>
            <input className={input} value={profile.display_name ?? ""} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-xs text-white/35">Username</span>
            <input className={input} value={profile.username ?? ""} onChange={(event) => setProfile({ ...profile, username: event.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-xs text-white/35">Bio</span>
            <textarea className={`${input} min-h-28`} value={profile.bio ?? ""} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-xs text-white/35">Location</span>
            <input className={input} value={profile.location ?? ""} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-xs text-white/35">Profile visibility</span>
            <select className={input} value={profile.profile_visibility ?? "public"} onChange={(event) => setProfile({ ...profile, profile_visibility: event.target.value })}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[.06] p-4 text-sm text-white/45">
          <input type="checkbox" checked={Boolean(profile.seller_enabled)} onChange={(event) => setProfile({ ...profile, seller_enabled: event.target.checked })} /> Enable seller profile
        </label>

        {message ? <div className="mt-4 text-xs text-emerald-200/65" aria-live="polite">{message}</div> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={save} disabled={saving || mediaBusy} className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c] disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving…" : "Save profile"}
          </button>
          <button onClick={logout} className="rounded-xl border border-white/[.08] px-5 py-3 text-xs font-bold text-white/45">Log out</button>
        </div>
      </div>
    </div>
  );
}
