"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FriendRow, type FriendEntry } from "@/components/FriendList";

type FriendsData = { friends: FriendEntry[]; pendingReceived: FriendEntry[]; pendingSent: FriendEntry[] };

const chip =
  "rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] transition disabled:opacity-50";

export function FriendsManager() {
  const [data, setData] = useState<FriendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/friends", { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) {
          setError(data.error || "Could not load friends.");
          return;
        }
        setData({ friends: data.friends ?? [], pendingReceived: data.pendingReceived ?? [], pendingSent: data.pendingSent ?? [] });
        setError("");
      })
      .catch(() => {
        if (active) setError("Could not load friends.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch("/api/friends", { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setError(d.error || "Could not load friends.");
      setData({ friends: d.friends ?? [], pendingReceived: d.pendingReceived ?? [], pendingSent: d.pendingSent ?? [] });
      setError("");
    } catch {
      setError("Could not load friends.");
    } finally {
      setLoading(false);
    }
  }

  async function act(username: string, action: string, friendshipId: string) {
    if (busy) return;
    setBusy(friendshipId + action);
    try {
      const r = await fetch(`/api/keepers/${encodeURIComponent(username)}/friendship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (r.ok) await reload();
    } finally {
      setBusy(null);
    }
  }

  if (loading)
    return <div className="panel rounded-3xl p-10 text-center text-sm text-white/30">Loading friends…</div>;
  if (error || !data)
    return (
      <div className="panel rounded-3xl p-10 text-center">
        <div className="font-semibold text-white/60">Friends unavailable.</div>
        <p className="mt-2 text-xs text-red-200/60">{error}</p>
        <button onClick={() => { setLoading(true); void reload(); }} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/60">
          Try again
        </button>
      </div>
    );

  const { friends, pendingReceived, pendingSent } = data;
  const isBusy = (id: string, action: string) => busy === id + action;

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="section-kicker">Requests</div>
            <h2 className="mt-2 text-2xl font-semibold">Incoming friend requests</h2>
          </div>
          {pendingReceived.length > 0 && <span className="text-xs font-bold text-emerald-300">{pendingReceived.length} waiting</span>}
        </div>
        {pendingReceived.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingReceived.map((e) => (
              <FriendRow
                key={e.friendshipId}
                entry={e}
                accent="#6ee7b7"
                actions={
                  <>
                    <button disabled={!!busy} onClick={() => e.profile && act(e.profile.username, "accept", e.friendshipId)} className={`${chip} border-emerald-300/40 bg-emerald-300/10 text-emerald-200`}>
                      {isBusy(e.friendshipId, "accept") ? "…" : "Accept"}
                    </button>
                    <button disabled={!!busy} onClick={() => e.profile && act(e.profile.username, "decline", e.friendshipId)} className={`${chip} border-white/[.1] text-white/55 hover:text-white/80`}>
                      {isBusy(e.friendshipId, "decline") ? "…" : "Decline"}
                    </button>
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <div className="panel rounded-[22px] py-10 text-center text-sm text-white/45">No incoming requests. When someone adds you, it lands here.</div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <div className="section-kicker">Sent</div>
          <h2 className="mt-2 text-2xl font-semibold">Requests you sent</h2>
        </div>
        {pendingSent.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingSent.map((e) => (
              <FriendRow
                key={e.friendshipId}
                entry={e}
                accent="#6ee7b7"
                actions={
                  <button disabled={!!busy} onClick={() => e.profile && act(e.profile.username, "cancel", e.friendshipId)} className={`${chip} border-white/[.1] text-white/55 hover:text-white/80`}>
                    {isBusy(e.friendshipId, "cancel") ? "…" : "Cancel"}
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <div className="panel rounded-[22px] py-10 text-center text-sm text-white/45">Nothing pending. Find keepers in the <Link href="/community" className="font-bold text-emerald-200">Community</Link> and add them as friends.</div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="section-kicker">Circle</div>
            <h2 className="mt-2 text-2xl font-semibold">Your friends</h2>
          </div>
          {friends.length > 0 && <span className="text-xs font-bold text-emerald-300">{friends.length} total</span>}
        </div>
        {friends.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {friends.map((e) => (
              <FriendRow
                key={e.friendshipId}
                entry={e}
                accent="#6ee7b7"
                actions={
                  <button disabled={!!busy} onClick={() => e.profile && act(e.profile.username, "remove", e.friendshipId)} className={`${chip} border-white/[.1] text-white/40 hover:text-white/70`}>
                    {isBusy(e.friendshipId, "remove") ? "…" : "Unfriend"}
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <div className="panel rounded-[22px] py-10 text-center text-sm text-white/45">No friends yet — every keeper starts somewhere.</div>
        )}
      </section>
    </div>
  );
}
