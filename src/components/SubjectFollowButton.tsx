"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SubjectType = "ANIMAL" | "PLANT" | "TOPIC";

export function SubjectFollowButton({ type, id = "", subjectKey, label = "Follow" }: { type: SubjectType; id?: string; subjectKey: string; label?: string }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = `type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&key=${encodeURIComponent(subjectKey)}`;

  useEffect(() => {
    let active = true;
    void fetch(`/api/subject-follows?${query}`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => null) as { signedIn?: boolean; following?: boolean } | null }))
      .then(({ response, data }) => {
        if (!active || !response.ok || !data) return;
        setSignedIn(Boolean(data.signedIn));
        setFollowing(Boolean(data.following));
      });
    return () => { active = false; };
  }, [query]);

  async function toggle() {
    if (busy) return;
    if (signedIn === false) {
      router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/subject-follows?${query}`, { method: "POST" });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      const data = await response.json().catch(() => null) as { following?: boolean } | null;
      if (response.ok && typeof data?.following === "boolean") {
        setSignedIn(true);
        setFollowing(data.following);
        window.dispatchEvent(new CustomEvent("subject-follow-changed", { detail: { type, id, subjectKey, following: data.following } }));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" onClick={() => void toggle()} disabled={busy || signedIn === null} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] transition disabled:opacity-40 ${following ? "border-sky-300/18 bg-sky-300/[.055] text-sky-100/70" : "border-white/[.08] bg-white/[.02] text-white/42 hover:border-sky-300/18 hover:text-sky-100/65"}`}>{busy ? "Working…" : following ? "Following" : signedIn === false ? `Sign in to ${label.toLowerCase()}` : label}</button>;
}
