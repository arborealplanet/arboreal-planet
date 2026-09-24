"use client";

import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

type Device = {
  id: string;
  label: string | null;
  created_at: string;
};

const button = "rounded-xl border px-3 py-2 text-[9px] font-black transition disabled:opacity-35";

export function SnakeSorterSecurity() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState("");
  const [webauthnSupported] = useState(
    () => typeof window !== "undefined" && !!window.PublicKeyCredential,
  );

  async function load() {
    const response = await fetch("/api/snake-sorter/biometric", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setDevices(data.devices ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/snake-sorter/biometric", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) setDevices(data.devices ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function register() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!webauthnSupported) throw new Error("This browser does not support fingerprint unlock.");
      const optionsResponse = await fetch("/api/snake-sorter/biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register-options" }),
      });
      const optionsData = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(optionsData.error ?? "Could not start registration.");
      const attestation = await startRegistration({ optionsJSON: optionsData.options });
      const verifyResponse = await fetch("/api/snake-sorter/biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register-verify", response: attestation, label: label.trim() }),
      });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verifyData.error ?? "Could not register this device.");
      setLabel("");
      setMessage("This device can now unlock Snake Sorter with fingerprint / Face ID.");
      await load();
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "Registration was cancelled."
          : error instanceof Error ? error.message : "Could not register this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(device: Device) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/snake-sorter/biometric", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentialId: device.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not remove device.");
    else setMessage("Device removed.");
    await load();
    setBusy(false);
  }

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="section-kicker">Security</div>
      <h2 className="mt-2 text-2xl font-semibold">App lock</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">
        Snake Sorter locks behind your PIN. Register this device&apos;s fingerprint or Face ID as a faster way
        through the lock screen. Biometric data never leaves your device — only a cryptographic key is stored.
      </p>

      {message && <div className="mt-4 rounded-xl border border-white/[.06] bg-black/[.05] px-3 py-2 text-[10px] text-white/38">{message}</div>}

      <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/[.06] p-4">
        <div className="text-[9px] font-black uppercase tracking-[.1em] text-white/34">Registered devices</div>
        {!loaded ? (
          <div className="mt-2 text-xs text-white/28">Loading…</div>
        ) : devices.length === 0 ? (
          <div className="mt-2 text-xs text-white/28">No fingerprint devices registered yet.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.05] bg-black/[.05] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-white/60">{device.label || "Fingerprint device"}</div>
                  <div className="text-[9px] text-white/24">Added {new Date(device.created_at).toLocaleString()}</div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(device)}
                  className={`${button} border-rose-300/12 bg-rose-300/[.025] text-rose-100/48`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={80}
          placeholder="Device name (e.g. iPhone 16)"
          className="min-w-[200px] flex-1 rounded-xl border border-white/[.08] bg-black/15 px-3 py-2 text-xs text-white outline-none placeholder:text-white/18 focus:border-sky-300/25"
        />
        <button
          type="button"
          disabled={busy || !webauthnSupported}
          onClick={() => void register()}
          className={`${button} border-sky-300/15 bg-sky-300/[.05] px-4 text-sky-100/70`}
        >
          {busy ? "Waiting…" : "Register this device"}
        </button>
      </div>
      {!webauthnSupported && (
        <p className="mt-2 text-[10px] text-white/24">This browser does not support WebAuthn, so fingerprint unlock is unavailable here.</p>
      )}
    </section>
  );
}
