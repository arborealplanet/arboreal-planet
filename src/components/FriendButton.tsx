"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "signedOut" | "isSelf" | "none" | "pending_sent" | "pending_received" | "friends";

export function FriendButton({ username, accent }: { username: string; accent: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/keepers/${encodeURIComponent(username)}/friendship`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok || !data.signedIn) return setStatus("signedOut");
        if (data.isSelf) return setStatus("isSelf");
        setStatus((data.status ?? "none") as Status);
      })
      .catch(() => {
        if (active) setStatus("signedOut");
      });
    fetch(`/api/keepers/${encodeURIComponent(username)}/block-status`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && d.canInteract === false) setStatus("signedOut");
      })
      .catch(() => {});
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { username?: string; blocked?: boolean } | undefined;
      if (detail?.username === username && active && detail.blocked) setStatus("signedOut");
    };
    window.addEventListener("ap:block-changed", onChange);
    return () => {
      active = false;
      window.removeEventListener("ap:block-changed", onChange);
    };
  }, [username]);

  async function act(action: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/keepers/${encodeURIComponent(username)}/friendship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.status) setStatus(d.status as Status);
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "signedOut" || status === "isSelf") return null;

  const chip =
    "rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[.1em] transition disabled:opacity-50";

  if (status === "none")
    return (
      <button disabled={busy} onClick={() => act("request")} className={chip} style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14`, color: accent }}>
        {busy ? "Sending…" : "+ Add friend"}
      </button>
    );

  if (status === "pending_sent")
    return (
      <button disabled={busy} onClick={() => act("cancel")} className={`${chip} border-white/[.1] text-white/55 hover:text-white/80`} title="Cancel friend request">
        {busy ? "Working…" : "Request sent · cancel"}
      </button>
    );

  if (status === "pending_received")
    return (
      <span className="flex gap-2">
        <button disabled={busy} onClick={() => act("accept")} className={chip} style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14`, color: accent }}>
          Accept
        </button>
        <button disabled={busy} onClick={() => act("decline")} className={`${chip} border-white/[.1] text-white/55 hover:text-white/80`}>
          Decline
        </button>
      </span>
    );

  return (
    <button disabled={busy} onClick={() => act("remove")} className={`${chip} border-white/[.1] text-white/55 hover:text-white/80`} title="Remove friend">
      {busy ? "Working…" : "✓ Friends"}
    </button>
  );
}
