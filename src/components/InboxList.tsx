"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Row = { conversation_id: string; listing_title: string | null; listing_image: string | null; other_display_name: string | null; other_username: string | null; other_avatar_url: string | null; last_message: string | null; unread_count: number };
type Req = { id: string; conversation_id: string; status: string; direction: "incoming" | "outgoing"; other_username: string | null; other_display_name: string | null; other_avatar_url: string | null; listing_title: string | null; created_at: string };

export function InboxList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setError("");
    const r = await fetch("/api/messages", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Could not load conversations."); return; }
    setRows(d.rows ?? []);
    setRequests(d.requests ?? []);
  }

  useEffect(() => {
    let active = true;
    const run = async () => {
      const r = await fetch("/api/messages", { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!active) return;
      if (r.ok) { setRows(d.rows ?? []); setRequests(d.requests ?? []); }
      else setError(d.error || "Could not load conversations.");
      setLoading(false);
    };
    void run();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function decide(req: Req, action: "accept" | "decline") {
    setBusy(req.id);
    try {
      const r = await fetch(`/api/messages/requests/${encodeURIComponent(req.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (r.ok) {
        setRequests((qs) => qs.filter((q) => q.id !== req.id));
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  const incomingPending = requests.filter((q) => q.direction === "incoming" && q.status === "pending");
  const hiddenConv = new Set(requests.filter((q) => q.direction === "incoming" && q.status !== "pending").map((q) => q.conversation_id));
  const outgoingState = new Map(requests.filter((q) => q.direction === "outgoing").map((q) => [q.conversation_id, q.status]));
  const visible = rows.filter((r) => !hiddenConv.has(r.conversation_id) && !incomingPending.some((q) => q.conversation_id === r.conversation_id));

  if (loading) return <div className="panel rounded-3xl p-10 text-center text-sm text-white/30">Loading conversations…</div>;
  if (error && !rows.length) return <div className="panel rounded-3xl p-10 text-center"><div className="font-semibold text-white/60">Inbox unavailable.</div><p className="mt-2 text-xs text-red-200/60">{error}</p><button onClick={() => { setLoading(true); void load().finally(() => setLoading(false)); }} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/60">Try again</button></div>;

  return (
    <div className="space-y-3">
      {error && <div className="rounded-xl border border-red-300/10 bg-red-300/[.025] px-4 py-3 text-xs text-red-200/60">{error}</div>}

      {incomingPending.length > 0 && (
        <section className="panel rounded-3xl border-amber-300/15 p-5">
          <div className="text-[10px] font-black uppercase tracking-[.14em] text-amber-100/60">Message requests · {incomingPending.length}</div>
          <p className="mt-1 text-xs text-white/35">These keepers want to message you. Accept to start the conversation, or decline to keep it out of your inbox.</p>
          <div className="mt-4 space-y-2">
            {incomingPending.map((q) => (
              <div key={q.id} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10">
                  {q.other_avatar_url ? <img src={q.other_avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-bold text-emerald-300/55">AP</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-white/70">{q.other_display_name || (q.other_username ? `@${q.other_username}` : "A keeper")}</div>
                  <div className="truncate text-[10px] text-white/30">{q.listing_title ? `About: ${q.listing_title}` : "Wants to start a conversation"}</div>
                </div>
                <button type="button" disabled={busy === q.id} onClick={() => void decide(q, "accept")} className="shrink-0 rounded-lg bg-emerald-300 px-3 py-1.5 text-[10px] font-black text-[#06100c] disabled:opacity-45">Accept</button>
                <button type="button" disabled={busy === q.id} onClick={() => void decide(q, "decline")} className="shrink-0 rounded-lg border border-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/40 hover:border-red-300/20 hover:text-red-200/70 disabled:opacity-45">Decline</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!visible.length && !incomingPending.length && (
        <div className="panel rounded-3xl py-16 text-center">
          <div className="font-semibold text-white/55">No conversations yet.</div>
          <p className="mt-2 text-xs text-white/28">Open a Marketplace listing and choose Message seller to start one.</p>
          <Link href="/marketplace" className="mt-5 inline-block rounded-xl border border-emerald-300/15 px-4 py-2.5 text-xs font-bold text-emerald-200">Browse Marketplace</Link>
        </div>
      )}

      {visible.map((r) => {
        const reqState = outgoingState.get(r.conversation_id);
        return (
          <Link href={`/messages/${r.conversation_id}`} key={r.conversation_id} className={`panel flex items-center gap-4 rounded-2xl p-4 transition hover:bg-white/[.025] ${Number(r.unread_count) > 0 ? "border-emerald-300/15" : ""}`}>
            <div className="relative h-16 w-20 shrink-0">
              <div className="grid-surface h-16 w-20 overflow-hidden rounded-xl">{r.listing_image ? <img src={r.listing_image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-white/15">◇</div>}</div>
              <div className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-[#07110d] bg-[#0d1a14]">{r.other_avatar_url ? <img src={r.other_avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[9px] font-bold text-emerald-300/55">AP</span>}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-300/50">{r.other_display_name || r.other_username || "Arboreal Planet user"} · Marketplace</div>
              <div className="mt-1 truncate font-semibold">{r.listing_title || "Private conversation"}</div>
              {r.last_message && <div className={`mt-1 truncate text-xs ${Number(r.unread_count) > 0 ? "text-white/55" : "text-white/30"}`}>{r.last_message}</div>}
              {reqState === "pending" && <div className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-amber-100/50">Request pending</div>}
              {reqState === "declined" && <div className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-red-200/50">Request declined</div>}
            </div>
            {Number(r.unread_count) > 0 ? <span className="grid h-7 min-w-7 place-items-center rounded-full bg-emerald-300 px-2 text-[10px] font-black text-[#06100c]">{r.unread_count}</span> : <span className="text-white/20">→</span>}
          </Link>
        );
      })}
    </div>
  );
}
