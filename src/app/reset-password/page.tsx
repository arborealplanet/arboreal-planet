"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setLoading(false);
      setError("The passwords do not match.");
      return;
    }
    const response = await fetch("/api/auth/password-reset/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Unable to update password.");
      return;
    }
    router.replace("/profile");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-16 sm:px-6">
      <div className="panel rounded-[30px] p-6 sm:p-8">
        <div className="section-kicker">Account recovery</div>
        <h1 className="mt-3 text-3xl font-semibold">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-white/40">Enter a new password for your Arboreal Planet account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-bold text-white/40">New password</span><input required minLength={8} name="password" type="password" autoComplete="new-password" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-white/40">Confirm password</span><input required minLength={8} name="confirm" type="password" autoComplete="new-password" className="w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 outline-none" /></label>
          {error ? <div className="rounded-2xl border border-red-300/15 bg-red-300/[.04] p-3 text-xs text-red-100/70">{error}</div> : null}
          <button disabled={loading} className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#06100c] disabled:opacity-50">{loading ? "Updating…" : "Set new password"}</button>
        </form>
      </div>
    </main>
  );
}
