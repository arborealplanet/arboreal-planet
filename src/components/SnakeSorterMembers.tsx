"use client";

import { useEffect, useMemo, useState } from "react";

type Member = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  snake_sorter: {
    user_id: string;
    access_level: string;
    is_enabled: boolean;
    approved_at: string | null;
    notes: string | null;
  } | null;
};

type Summary = {
  arboreal_planet_members: number;
  snake_sorter_members: number;
};

const button = "rounded-xl border px-3 py-2 text-[9px] font-black transition disabled:opacity-35";
const field = "w-full rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/18 focus:border-emerald-300/20";

export function SnakeSorterMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<Summary>({ arboreal_planet_members: 0, snake_sorter_members: 0 });
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/snake-sorter/members", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not load Arboreal Planet members.");
      return;
    }
    setMembers(data.members ?? []);
    setSummary(data.summary ?? { arboreal_planet_members: 0, snake_sorter_members: 0 });
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/snake-sorter/members", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setMessage(data.error ?? "Could not load Arboreal Planet members.");
          return;
        }
        setMembers(data.members ?? []);
        setSummary(data.summary ?? { arboreal_planet_members: 0, snake_sorter_members: 0 });
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      [member.display_name, member.username, member.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [members, query]);

  async function setAccess(member: Member, enabled: boolean) {
    setBusy(member.id);
    setMessage("");
    const response = await fetch("/api/snake-sorter/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, enabled }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error ?? "Could not update Snake Sorter access.");
    else setMessage(enabled
      ? `${member.display_name || member.username || "Member"} can now use Snake Sorter.`
      : `Snake Sorter access revoked for ${member.display_name || member.username || "member"}.`);
    await load();
    setBusy("");
  }

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Member access</div>
          <h2 className="mt-2 text-2xl font-semibold">Arboreal Planet members</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/30">
            Owner-only directory. Approving a member gives them scanner access to Snake Sorter, not reference, acquisition, dataset, or model administration.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-2xl border border-white/[.06] bg-black/[.06] px-4 py-3 text-center">
            <div className="text-xl font-semibold text-white/60">{summary.arboreal_planet_members}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-white/20">AP members</div>
          </div>
          <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.02] px-4 py-3 text-center">
            <div className="text-xl font-semibold text-emerald-100/65">{summary.snake_sorter_members}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.08em] text-emerald-100/28">Sorter access</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${field} max-w-xl`}
          placeholder="Search display name, username, or role…"
        />
        <button type="button" onClick={() => void load()} className={`${button} border-white/[.07] bg-black/[.06] text-white/42`}>Refresh</button>
      </div>

      {message && <div className="mt-4 rounded-xl border border-white/[.06] bg-black/[.05] px-3 py-2 text-[10px] text-white/38">{message}</div>}

      <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[.08] p-8 text-center text-xs text-white/24">No members match this search.</div>
        ) : filtered.map((member) => {
          const isOwner = member.role === "owner";
          const enabled = isOwner || Boolean(member.snake_sorter?.is_enabled);
          const name = member.display_name || member.username || "Unnamed member";
          const initial = name.trim().slice(0, 1).toUpperCase() || "?";
          return (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.055] bg-black/[.06] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[.07] bg-white/[.035] text-sm font-black text-white/42">{initial}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white/58">{name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-white/24">
                    {member.username && <span>@{member.username}</span>}
                    <span>{member.role || "user"}</span>
                    <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.08em] ${enabled ? "border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/60" : "border-white/[.06] text-white/22"}`}>
                  {isOwner ? "Owner" : enabled ? "Snake Sorter approved" : "No access"}
                </span>
                {!isOwner && (
                  <button
                    type="button"
                    disabled={busy === member.id}
                    onClick={() => void setAccess(member, !enabled)}
                    className={`${button} ${enabled ? "border-rose-300/12 bg-rose-300/[.025] text-rose-100/48" : "border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/60"}`}
                  >
                    {busy === member.id ? "Saving…" : enabled ? "Revoke" : "Approve"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
