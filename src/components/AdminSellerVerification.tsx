"use client";

import { useEffect, useState } from "react";

type Row = { id: string; username: string | null; display_name: string | null; location: string | null; website_url: string | null; instagram_url: string | null; facebook_url: string | null; requested_at: string | null };

export function AdminSellerVerification() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/seller-verification", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!active) return;
        setRows(response.ok ? data.rows ?? [] : []);
        if (!response.ok) setMessage(data.error ?? "Could not load seller verification requests.");
      })
      .catch(() => { if (active) setMessage("Could not load seller verification requests."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(userId: string, decision: "verified" | "rejected") {
    setBusy(userId);
    setMessage(null);
    const response = await fetch("/api/admin/seller-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not review seller.");
    else {
      setRows((current) => current.filter((row) => row.id !== userId));
      setMessage(decision === "verified" ? "Seller verified." : "Seller request rejected.");
    }
    setBusy(null);
  }

  if (loading) return <div className="panel rounded-3xl p-6 text-sm text-white/45">Loading seller requests…</div>;
  return <div className="space-y-3">
    {message ? <div className="panel rounded-2xl p-4 text-xs text-emerald-100/70">{message}</div> : null}
    {!rows.length ? <div className="panel rounded-3xl p-8 text-center text-sm text-white/42">No seller verification requests are waiting.</div> : rows.map((row) => (
      <div key={row.id} className="panel rounded-3xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-white/82">{row.display_name || row.username || "Unnamed keeper"}</div>
            <div className="mt-1 text-xs text-white/38">@{row.username || "no-username"}{row.location ? ` · ${row.location}` : ""}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
              {row.website_url ? <a href={row.website_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/[.07] px-3 py-1.5 text-white/48">Website ↗</a> : null}
              {row.instagram_url ? <a href={row.instagram_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/[.07] px-3 py-1.5 text-white/48">Instagram ↗</a> : null}
              {row.facebook_url ? <a href={row.facebook_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/[.07] px-3 py-1.5 text-white/48">Facebook ↗</a> : null}
            </div>
            {row.requested_at ? <div className="mt-3 text-[10px] text-white/25">Requested {new Date(row.requested_at).toLocaleString()}</div> : null}
          </div>
          <div className="flex gap-2">
            <button disabled={busy === row.id} onClick={() => review(row.id, "verified")} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.1em] text-[#06100c] disabled:opacity-50">Verify</button>
            <button disabled={busy === row.id} onClick={() => review(row.id, "rejected")} className="rounded-xl border border-red-300/15 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.1em] text-red-100/65 disabled:opacity-50">Reject</button>
          </div>
        </div>
      </div>
    ))}
  </div>;
}
