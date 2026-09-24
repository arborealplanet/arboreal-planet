"use client";

import Link from "next/link";

export type FriendEntry = {
  friendshipId: string;
  since: string;
  profile: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
};

export function FriendRow({
  entry,
  accent,
  actions,
}: {
  entry: FriendEntry;
  accent: string;
  actions?: React.ReactNode;
}) {
  const p = entry.profile;
  if (!p) return null;
  return (
    <div className="panel flex items-center gap-4 rounded-2xl p-4">
      <Link href={`/keepers/${encodeURIComponent(p.username)}`} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-[#0d1c15]">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt={`${p.display_name || p.username} avatar`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-black" style={{ color: `${accent}77` }}>
            {(p.display_name || p.username).slice(0, 1).toUpperCase()}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/keepers/${encodeURIComponent(p.username)}`} className="block truncate font-semibold text-white/85 hover:text-white">
          {p.display_name || p.username}
        </Link>
        <div className="truncate text-xs text-white/40">@{p.username}</div>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function FriendAvatarGrid({ entries, accent }: { entries: FriendEntry[]; accent: string }) {
  if (!entries.length) return null;
  return (
    <div className="flex -space-x-2">
      {entries.slice(0, 8).map((e) => {
        const p = e.profile;
        if (!p) return null;
        return (
          <Link
            key={e.friendshipId}
            href={`/keepers/${encodeURIComponent(p.username)}`}
            title={p.display_name || p.username}
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-[#07110d] bg-[#0d1c15]"
          >
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-black" style={{ color: `${accent}99` }}>
                {(p.display_name || p.username).slice(0, 1).toUpperCase()}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
