"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Blocked = { id: string; username: string | null; display_name: string | null; since: string };

export function BlockedKeepersManager() {
  const [rows, setRows] = useState<Blocked[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/blocks", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        setRows(Array.isArray(d?.blocked) ? d.blocked : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { active = false; };
  }, []);

  async function unblock(username: string) {
    setBusy(username);
    try {
      const r = await fetch("/api/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (r.ok) {
        setRows((rs) => rs.filter((x) => x.username !== username));
        window.dispatchEvent(new CustomEvent("ap:block-changed", { detail: { username, blocked: false } }));
      }
    } finally {
      setBusy(null);
    }
  }

  if (!loaded || rows.length === 0) return null;

  return (
    <section className="panel rounded-[24px] p-6 sm:p-8">
      <h2 className="text-sm font-bold text-white/75">Blocked keepers</h2>
      <p className="mt-1 text-xs text-white/40">Blocked keepers can&apos;t follow you, friend you, or message you — and you can&apos;t reach them either.</p>
      <ul className="mt-4 space-y-2">
        {rows.map((x) => (
          <li key={x.id} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-3">
            {x.username ? (
              <Link href={`/keepers/${encodeURIComponent(x.username)}`} className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-white/70">{x.display_name || `@${x.username}`}</div>
                <div className="truncate text-[10px] text-white/30">@{x.username}</div>
              </Link>
            ) : (
              <div className="min-w-0 flex-1 text-xs text-white/40">A keeper whose profile is no longer visible</div>
            )}
            <button
              type="button"
              disabled={busy === x.username}
              onClick={() => x.username && void unblock(x.username)}
              className="shrink-0 rounded-lg border border-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/50 transition hover:border-emerald-300/20 hover:text-emerald-100/70 disabled:opacity-45"
            >
              {busy === x.username ? "…" : "Unblock"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
