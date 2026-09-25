"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SubjectFollowButton } from "@/components/SubjectFollowButton";

type ItemType = "ANIMAL" | "PLANT" | "MARKET_LISTING" | "JOURNAL" | "EVENT";

export function WatchlistButton({ type, id, label = "Save" }: { type: ItemType; id: string; label?: string }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusUrl = `/api/watchlist?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  const sendToLogin = () => router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);

  useEffect(() => {
    let active = true;
    void fetch(statusUrl, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => null) as { signedIn?: boolean; saved?: boolean } | null }))
      .then(({ response, data }) => {
        if (!active) return;
        // Fail open: if the check fails we leave signedIn null and keep the
        // button usable — the toggle re-checks before acting.
        if (!response.ok || !data) return;
        setSignedIn(Boolean(data.signedIn));
        setSaved(Boolean(data.saved));
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
        const data = await response.json().catch(() => null) as { signedIn?: boolean; saved?: boolean } | null;
        if (response.ok && data) {
          knownSignedIn = Boolean(data.signedIn);
          setSignedIn(knownSignedIn);
          setSaved(Boolean(data.saved));
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
      const data = await response.json().catch(() => null) as { saved?: boolean; error?: string } | null;
      if (response.ok && typeof data?.saved === "boolean") {
        setSignedIn(true);
        setSaved(data.saved);
      } else {
        setError(data?.error || "Couldn't update your saved items. Try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const saveButton = (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] transition disabled:opacity-40 ${saved ? "border-emerald-300/18 bg-emerald-300/[.055] text-emerald-100/70" : "border-white/[.08] bg-white/[.02] text-white/42 hover:border-emerald-300/18 hover:text-emerald-100/65"}`}
      >
        {busy ? "Working…" : saved ? "Saved" : signedIn === false ? `Sign in to ${label.toLowerCase()}` : label}
      </button>
      {error ? <span role="alert" className="max-w-40 text-[10px] leading-4 text-red-200/70">{error}</span> : null}
    </span>
  );

  if (type !== "ANIMAL" && type !== "PLANT") return saveButton;
  return (
    <span className="inline-flex flex-wrap items-start gap-2">
      {saveButton}
      <SubjectFollowButton type={type} id={id} subjectKey="" label={type === "ANIMAL" ? "Follow animal" : "Follow plant"} />
    </span>
  );
}
