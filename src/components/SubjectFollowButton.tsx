"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SubjectType = "ANIMAL" | "PLANT" | "TOPIC" | "SECTION";

export function SubjectFollowButton({ type, id = "", subjectKey, label = "Follow" }: { type: SubjectType; id?: string; subjectKey: string; label?: string }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = `type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&key=${encodeURIComponent(subjectKey)}`;
  const statusUrl = `/api/subject-follows?${query}`;
  const sendToLogin = () => router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);

  useEffect(() => {
    let active = true;
    void fetch(statusUrl, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => null) as { signedIn?: boolean; following?: boolean } | null }))
      .then(({ response, data }) => {
        if (!active) return;
        // Fail open: if the check fails we leave signedIn null and keep the
        // button usable — the toggle re-checks before acting.
        if (!response.ok || !data) return;
        setSignedIn(Boolean(data.signedIn));
        setFollowing(Boolean(data.following));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [statusUrl]);

  async function toggle() {
    if (busy) return;
    setError(null);
    // Fail open: when the sign-in state is unknown, re-check now instead of
    // leaving the button permanently disabled.
    let knownSignedIn = signedIn;
    if (knownSignedIn === null) {
      try {
        const response = await fetch(statusUrl, { cache: "no-store" });
        const data = await response.json().catch(() => null) as { signedIn?: boolean; following?: boolean } | null;
        if (response.ok && data) {
          knownSignedIn = Boolean(data.signedIn);
          setSignedIn(knownSignedIn);
          setFollowing(Boolean(data.following));
        }
      } catch {}
    }
    if (knownSignedIn === false) {
      sendToLogin();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(statusUrl, { method: "POST" });
      if (response.status === 401) {
        sendToLogin();
        return;
      }
      const data = await response.json().catch(() => null) as { following?: boolean; error?: string } | null;
      if (response.ok && typeof data?.following === "boolean") {
        setSignedIn(true);
        setFollowing(data.following);
        window.dispatchEvent(new CustomEvent("subject-follow-changed", { detail: { type, id, subjectKey, following: data.following } }));
        router.refresh();
      } else {
        setError(data?.error || "Couldn't update your follows. Try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] transition disabled:opacity-40 ${following ? "border-sky-300/18 bg-sky-300/[.055] text-sky-100/70" : "border-white/[.08] bg-white/[.02] text-white/42 hover:border-sky-300/18 hover:text-sky-100/65"}`}
      >
        {busy ? "Working…" : following ? "Following" : signedIn === false ? `Sign in to ${label.toLowerCase()}` : label}
      </button>
      {error ? <span role="alert" className="max-w-40 text-[10px] leading-4 text-red-200/70">{error}</span> : null}
    </span>
  );
}
