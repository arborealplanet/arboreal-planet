"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const initialError = params.get("authError");
  const [error, setError] = useState<string | null>(
    initialError === "invalid_confirmation"
      ? "That confirmation link is invalid or expired. Please request a new confirmation email."
      : null,
  );
  const next = params.get("next") || "/profile";

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Unable to sign in.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSignupSent(false);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const payload = {
      displayName: String(form.get("displayName") ?? "").trim(),
      email,
      password: String(form.get("password") ?? ""),
      next,
    };
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Unable to create account.");
      return;
    }
    if (data.needsConfirmation) {
      setSignupEmail(email);
      setSignupSent(true);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="panel mx-auto max-w-xl overflow-hidden rounded-[30px]">
      <div className="grid grid-cols-2 border-b border-white/[.06] p-2">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setSignupSent(false);
          }}
          className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[.12em] ${mode === "login" ? "bg-white/[.08] text-white/80" : "text-white/35"}`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setSignupSent(false);
          }}
          className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[.12em] ${mode === "signup" ? "bg-white/[.08] text-white/80" : "text-white/35"}`}
        >
          Create account
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={submitLogin} className="space-y-4 p-6 sm:p-8">
          <div>
            <div className="text-lg font-semibold text-white/80">Welcome back</div>
            <p className="mt-2 text-xs leading-5 text-white/38">Sign in with the email and password attached to your Arboreal Planet account.</p>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/40">Email</span>
            <input required name="email" type="email" autoComplete="email" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/40">Password</span>
            <input required minLength={8} name="password" type="password" autoComplete="current-password" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" />
          </label>
          {error ? <div className="rounded-2xl border border-red-300/15 bg-red-300/[.04] p-3 text-xs text-red-100/70">{error}</div> : null}
          <button disabled={loading} className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c] disabled:opacity-50">
            {loading ? "Signing in…" : "Enter Arboreal Planet"}
          </button>
        </form>
      ) : signupSent ? (
        <div className="space-y-4 p-6 sm:p-8">
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] p-5">
            <div className="text-base font-bold text-emerald-100/85">Check your email</div>
            <p className="mt-2 text-xs leading-5 text-white/45">
              We sent a confirmation link to <span className="font-semibold text-white/70">{signupEmail}</span>. Click it to verify your email and finish creating your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSignupSent(false);
              setError(null);
            }}
            className="w-full rounded-2xl border border-white/[.1] bg-white/[.04] px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-white/65"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submitSignup} className="space-y-4 p-6 sm:p-8">
          <div>
            <div className="text-lg font-semibold text-white/80">Create your Arboreal Planet account</div>
            <p className="mt-2 text-xs leading-5 text-white/38">We&apos;ll email you a confirmation link. Your account becomes active after you verify the address.</p>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/40">Display name</span>
            <input name="displayName" type="text" maxLength={60} autoComplete="name" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/40">Email</span>
            <input required name="email" type="email" autoComplete="email" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/40">Password</span>
            <input required minLength={8} name="password" type="password" autoComplete="new-password" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" />
          </label>
          {error ? <div className="rounded-2xl border border-red-300/15 bg-red-300/[.04] p-3 text-xs leading-5 text-red-100/70">{error}</div> : null}
          <button disabled={loading} className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c] disabled:opacity-50">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}
