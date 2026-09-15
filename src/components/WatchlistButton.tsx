"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ItemType = "ANIMAL" | "PLANT" | "MARKET_LISTING";

export function WatchlistButton({ type, id, label = "Save" }: { type: ItemType; id: string; label?: string }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/watchlist?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => null) as { signedIn?: boolean; saved?: boolean } | null }))
      .then(({ response, data }) => {
        if (!active || !response.ok || !data) return;
        setSignedIn(Boolean(data.signedIn));
        setSaved(Boolean(data.saved));
      });
    return () => { active = false; };
  }, [type, id]);

  async function toggle() {
    if (busy) return;
    if (signedIn === false) {
      router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/watchlist?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, { method: "POST" });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      const data = await response.json().catch(() => null) as { saved?: boolean } | null;
      if (response.ok && typeof data?.saved === "boolean") {
        setSignedIn(true);
        setSaved(data.saved);
      }
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" onClick={() => void toggle()} disabled={busy || signedIn === null} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] transition disabled:opacity-40 ${saved ? "border-emerald-300/18 bg-emerald-300/[.055] text-emerald-100/70" : "border-white/[.08] bg-white/[.02] text-white/42 hover:border-emerald-300/18 hover:text-emerald-100/65"}`}>{busy ? "Working…" : saved ? "Saved" : signedIn === false ? `Sign in to ${label.toLowerCase()}` : label}</button>;
}
