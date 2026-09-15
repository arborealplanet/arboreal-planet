"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KeeperMessageAction({ username }: { username: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/keepers/${encodeURIComponent(username)}/message`, { method: "POST" });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/keepers/${username}`)}`);
        return;
      }
      const data = await response.json().catch(() => null) as { conversationId?: string; error?: string } | null;
      if (response.ok && data?.conversationId) router.push(`/messages/${encodeURIComponent(data.conversationId)}`);
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" onClick={() => void start()} disabled={busy} className="rounded-xl border border-white/[.08] bg-white/[.02] px-4 py-2.5 text-xs font-black text-white/55 transition hover:border-emerald-300/18 hover:bg-emerald-300/[.025] hover:text-emerald-100/70 disabled:opacity-45">{busy ? "Opening…" : "Message"}</button>;
}
