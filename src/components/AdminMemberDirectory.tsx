"use client";

import { useEffect, useMemo, useState } from "react";

type MemberRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: "user" | "moderator" | "admin" | "owner";
  seller_verification_status: string | null;
  created_at: string;
};

export function AdminMemberDirectory() {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading members…");

  async function load(search = query) {
    setStatus("Loading members…");
    const response = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`, { cache: "no-store" });
    const data = await response.json().catch(() => null) as { rows?: MemberRow[]; error?: string } | null;
    if (!response.ok) {
      setRows([]);
      setStatus(data?.error || "Could not load members.");
      return;
    }
    const next = data?.rows ?? [];
    setRows(next);
    setStatus(`${next.length} member${next.length === 1 ? "" : "s"}`);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/users?q=", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) as { rows?: MemberRow[]; error?: string } | null }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) {
          setRows([]);
          setStatus(data?.error || "Could not load members.");
          return;
        }
        const next = data?.rows ?? [];
        setRows(next);
        setStatus(`${next.length} member${next.length === 1 ? "" : "s"}`);
      });
    return () => { active = false; };
  }, []);

  const joinedThisMonth = useMemo(() => {
    const now = new Date();
    return rows.filter((row) => {
      const joined = new Date(row.created_at);
      return joined.getFullYear() === now.getFullYear() && joined.getMonth() === now.getMonth();
    }).length;
  }, [rows]);

  const staffCount = rows.filter((row) => row.role === "owner" || row.role === "admin" || row.role === "moderator").length;

  return (
    <div className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Member directory</div>
          <h3 className="mt-2 text-xl font-semibold">Arboreal Planet members</h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-white/34">
            Owner-only account directory showing who has joined, when they joined, their current role, and seller-verification status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-2xl border border-white/[.06] bg-black/[.08] px-4 py-3 text-center">
            <div className="text-xl font-semibold text-white/68">{rows.length}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/22">Members</div>
          </div>
          <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] px-4 py-3 text-center">
            <div className="text-xl font-semibold text-emerald-100/68">{joinedThisMonth}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-emerald-100/28">Joined this month</div>
          </div>
          <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[.025] px-4 py-3 text-center">
            <div className="text-xl font-semibold text-amber-100/68">{staffCount}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-amber-100/28">Staff</div>
          </div>
        </div>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="mt-5 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 120))}
          placeholder="Search display name or username…"
          className="min-w-[240px] flex-1 rounded-xl border border-white/[.08] bg-black/15 px-3 py-2.5 text-xs text-white/70 outline-none placeholder:text-white/20"
        />
        <button type="submit" className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.035] px-4 py-2.5 text-xs font-black text-emerald-100/65">
          Search
        </button>
        <button type="button" onClick={() => { setQuery(""); void load(""); }} className="rounded-xl border border-white/[.07] px-4 py-2.5 text-xs font-black text-white/40">
          All members
        </button>
      </form>

      <div className="mt-3 text-[10px] text-white/28">{status}</div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-xs">
          <thead className="text-[9px] font-black uppercase tracking-[.1em] text-white/22">
            <tr>
              <th className="px-3">Member</th>
              <th className="px-3">Joined</th>
              <th className="px-3">Role</th>
              <th className="px-3">Seller status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="bg-white/[.018]">
                <td className="rounded-l-xl px-3 py-3">
                  <div className="font-semibold text-white/68">{row.display_name || row.username || "Unnamed account"}</div>
                  <div className="mt-1 text-[10px] text-white/28">{row.username ? `@${row.username}` : "No username"}</div>
                </td>
                <td className="px-3 py-3 text-white/38">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${row.role === "owner" ? "border-amber-300/15 bg-amber-300/[.04] text-amber-100/70" : row.role === "admin" || row.role === "moderator" ? "border-cyan-300/15 bg-cyan-300/[.035] text-cyan-100/60" : "border-white/[.06] text-white/32"}`}>
                    {row.role}
                  </span>
                </td>
                <td className="rounded-r-xl px-3 py-3 text-white/40">{row.seller_verification_status || "unverified"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
