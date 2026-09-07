"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const initialError = params.get("authError");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError === "invalid_confirmation" ? "That confirmation link is invalid or expired." : initialError === "github_not_configured" ? "GitHub sign-in is ready on the site, but the separate GitHub OAuth app still needs to be connected to this Supabase project." : initialError === "github_failed" ? "GitHub sign-in did not finish. Please try again." : null);
  const next = params.get("next") || "/profile";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const payload = { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), displayName: String(form.get("displayName") ?? "") };
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { setError(data.error ?? "Something went wrong."); return; }
    if (mode === "signup" && data.needsConfirmation) { setMessage("Account created. Check your email for the Arboreal Planet confirmation link, then return here to sign in."); setMode("login"); return; }
    router.push(next);
    router.refresh();
  }

  const githubHref = `/api/auth/oauth/github/start?next=${encodeURIComponent(next)}`;

  return <div className="panel mx-auto max-w-xl overflow-hidden rounded-[30px]">
    <div className="p-6 sm:p-8 pb-0">
      <a href={githubHref} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/[.1] bg-white/[.04] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[.07]">Continue with GitHub</a>
      <p className="mt-3 text-center text-[11px] leading-5 text-white/28">GitHub sign-in works for both new and existing Arboreal Planet accounts and does not rely on confirmation email delivery.</p>
      <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-white/[.06]"/><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/20">or use email</span><div className="h-px flex-1 bg-white/[.06]"/></div>
    </div>
    <div className="grid grid-cols-2 border-y border-white/[.06] p-2">
      <button onClick={() => {setMode("login");setError(null);setMessage(null)}} className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[.12em] ${mode === "login" ? "bg-emerald-300 text-[#06100c]" : "text-white/35"}`}>Log in</button>
      <button onClick={() => {setMode("signup");setError(null);setMessage(null)}} className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[.12em] ${mode === "signup" ? "bg-emerald-300 text-[#06100c]" : "text-white/35"}`}>Create account</button>
    </div>
    <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
      {mode === "signup" ? <label className="block"><span className="mb-2 block text-xs font-bold text-white/40">Display name</span><input name="displayName" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" placeholder="How people will know you" /></label> : null}
      <label className="block"><span className="mb-2 block text-xs font-bold text-white/40">Email</span><input required name="email" type="email" autoComplete="email" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" /></label>
      <label className="block"><span className="mb-2 block text-xs font-bold text-white/40">Password</span><input required minLength={8} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" /></label>
      {mode === "signup" ? <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-[11px] leading-5 text-amber-100/50">Email signup is limited until Arboreal Planet has its own outbound auth email service. GitHub signup above is the recommended route for now.</div> : null}
      {error ? <div className="rounded-2xl border border-red-300/15 bg-red-300/[.04] p-3 text-xs text-red-100/70">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-xs text-emerald-100/70">{message}</div> : null}
      <button disabled={loading} className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c] disabled:opacity-50">{loading ? "Working…" : mode === "login" ? "Enter Arboreal Planet" : "Create account"}</button>
    </form>
  </div>;
}
