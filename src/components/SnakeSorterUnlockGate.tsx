"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

export function SnakeSorterUnlockGate() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/snake-sorter/security", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Could not load lock status.");
        setHasPin(data.hasPin === true);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load lock status."));
  }, []);

  const title = hasPin === false ? "Create Snake Sorter PIN" : "Unlock Snake Sorter";
  const detail = hasPin === false
    ? "Choose a private 4–8 digit PIN. It is stored as a one-way hash and is separate from your Arboreal Planet login."
    : "Enter your Snake Sorter PIN to continue.";

  const valid = useMemo(() => /^\d{4,8}$/.test(pin) && (hasPin !== false || pin === confirmPin), [pin, confirmPin, hasPin]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/snake-sorter/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: hasPin === false ? "setup" : "unlock", pin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not unlock Snake Sorter.");
      window.location.replace("/snake-sorter");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not unlock Snake Sorter.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4 py-8 text-white">
      <section className="w-full overflow-hidden rounded-[30px] border border-emerald-300/12 bg-[#06100c]">
        <div className="border-b border-white/[.06] bg-white p-4">
          <Image
            src="/branding/snake-sorter-logo.svg"
            alt="Snake Sorter"
            width={384}
            height={384}
            priority
            unoptimized
            className="mx-auto h-auto w-full max-w-[240px]"
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200/48">Private app lock</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-white/42">{detail}</p>

          {hasPin === null && !message ? (
            <div className="mt-6 rounded-2xl border border-white/[.06] bg-black/20 p-4 text-sm text-white/40">Checking security…</div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">
                  {hasPin === false ? "New PIN" : "PIN"}
                </span>
                <input
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={hasPin === false ? "new-password" : "current-password"}
                  className="w-full rounded-2xl border border-white/[.09] bg-black/30 px-4 py-3 text-center text-2xl font-black tracking-[.35em] text-white outline-none transition focus:border-emerald-300/35"
                  placeholder="••••"
                  aria-label="Snake Sorter PIN"
                />
              </label>

              {hasPin === false && (
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-white/40">Confirm PIN</span>
                  <input
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-white/[.09] bg-black/30 px-4 py-3 text-center text-2xl font-black tracking-[.35em] text-white outline-none transition focus:border-emerald-300/35"
                    placeholder="••••"
                    aria-label="Confirm Snake Sorter PIN"
                  />
                </label>
              )}

              {message && (
                <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[.05] px-4 py-3 text-sm text-rose-100/70">{message}</div>
              )}

              <button
                type="submit"
                disabled={!valid || busy || hasPin === null}
                className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-[#06100c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Please wait…" : hasPin === false ? "Create PIN & Unlock" : "Unlock Snake Sorter"}
              </button>

              <p className="text-center text-[11px] leading-5 text-white/28">
                Five failed attempts lock Snake Sorter for 15 minutes. Successful unlock lasts up to 12 hours.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
