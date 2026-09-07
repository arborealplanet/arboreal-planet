"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const initialError = params.get("authError");
  const [error, setError] = useState<string | null>(
    initialError === "invalid_confirmation"
      ? "That confirmation link is invalid or expired."
      : initialError === "github_not_configured"
        ? "GitHub signup is installed on Arboreal Planet, but the separate GitHub OAuth app still needs to be enabled for this Supabase project."
        : initialError === "github_failed"
          ? "GitHub sign-in did not finish. Please try again."
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

  const githubHref = `/api/auth/oauth/github/start?next=${encodeURIComponent(next)}`;

  return (
    <div className="panel mx-auto max-w-xl overflow-hidden rounded-[30px]">
      <div className="p-6 pb-0 sm:p-8 sm:pb-0">
        <a
          href={githubHref}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-[#06100c] transition hover:brightness-105"
        >
          Continue with GitHub
        </a>
        <p className="mt-3 text-center text-[11px] leading-5 text-white/35">
          This is the active signup route while Arboreal Planet&apos;s public confirmation-email service is being set up.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 border-y border-white/[.06] p-2">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
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
          }}
          className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[.12em] ${mode === "signup" ? "bg-white/[.08] text-white/80" : "text-white/35"}`}
        >
          Create account
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={submitLogin} className="space-y-4 p-6 sm:p-8">
          <div className="text-xs leading-5 text-white/38">
            Existing email/password accounts can still sign in here.
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/40">Email</span>
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/40">Password</span>
            <input
              required
              minLength={8}
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none"
            />
          </label>
          {error ? <div className="rounded-2xl border border-red-300/15 bg-red-300/[.04] p-3 text-xs text-red-100/70">{error}</div> : null}
          <button
            disabled={loading}
            className="w-full rounded-2xl border border-white/[.1] bg-white/[.05] px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-white/75 disabled:opacity-50"
          >
            {loading ? "Working…" : "Enter Arboreal Planet"}
          </button>
        </form>
      ) : (
        <div className="space-y-4 p-6 sm:p-8">
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] p-4">
            <div className="text-sm font-bold text-emerald-100/80">Create your account with GitHub</div>
            <p className="mt-2 text-xs leading-5 text-white/42">
              GitHub will verify the account, then Arboreal Planet will create your normal site profile and session. No confirmation email is required.
            </p>
          </div>
          <a
            href={githubHref}
            className="flex w-full items-center justify-center rounded-2xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c]"
          >
            Create account with GitHub
          </a>
          <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4 text-[11px] leading-5 text-white/32">
            Email/password account creation is temporarily disabled instead of pretending a confirmation email was sent. It will return once outbound auth email is configured.
          </div>
          {error ? <div className="rounded-2xl border border-red-300/15 bg-red-300/[.04] p-3 text-xs text-red-100/70">{error}</div> : null}
        </div>
      )}
    </div>
  );
}
