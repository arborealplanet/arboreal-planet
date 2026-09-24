"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

export function SnakeSorterUnlockGate() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/snake-sorter/security", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Could not load lock status.");
        setHasPin(data.hasPin === true);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load lock status."));

    // Fingerprint / Face ID is offered when this browser supports WebAuthn
    // and the user has registered at least one device.
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      void fetch("/api/snake-sorter/biometric", { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.registered === true) setBiometricReady(true);
        })
        .catch(() => undefined);
    }
  }, []);

  const title = hasPin === false ? "Create Snake Sorter PIN" : "Unlock Snake Sorter";
  const detail = hasPin === false
    ? "Choose a private 4–8 digit PIN. It is stored as a one-way hash and is separate from your Arboreal Planet login."
    : "Enter your Snake Sorter PIN to continue.";

  const valid = useMemo(() => /^\d{4,8}$/.test(pin) && (hasPin !== false || pin === confirmPin), [pin, confirmPin, hasPin]);

  async function unlockWithBiometric() {
    if (biometricBusy) return;
    setBiometricBusy(true);
    setMessage("");
    try {
      const optionsResponse = await fetch("/api/snake-sorter/biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auth-options" }),
      });
      const optionsData = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(optionsData.error ?? "Fingerprint unlock is not available.");
      const assertion = await startAuthentication({ optionsJSON: optionsData.options });
      const verifyResponse = await fetch("/api/snake-sorter/biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auth-verify", response: assertion }),
      });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verifyData.error ?? "Could not unlock Snake Sorter.");
      window.location.replace("/snake-sorter");
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError") {
        setMessage("Fingerprint was cancelled. Try again when ready.");
      } else {
        setMessage(error instanceof Error ? error.message : "Could not unlock Snake Sorter.");
      }
    } finally {
      setBiometricBusy(false);
    }
  }

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

          {biometricReady && hasPin !== null && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[.07]" />
                <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/28">or</span>
                <div className="h-px flex-1 bg-white/[.07]" />
              </div>
              <button
                type="button"
                disabled={biometricBusy}
                onClick={() => void unlockWithBiometric()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-300/[.06] px-4 py-3 text-sm font-black text-sky-100/80 transition disabled:opacity-40"
              >
                <span aria-hidden>◉</span>
                {biometricBusy ? "Waiting for fingerprint…" : "Use fingerprint / Face ID"}
              </button>
              <p className="mt-2 text-center text-[11px] leading-5 text-white/28">
                Uses this device&apos;s built-in fingerprint or face unlock. Nothing biometric ever leaves your device.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
