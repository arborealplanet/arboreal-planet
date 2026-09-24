"use client";

import { useEffect, useState } from "react";

type RsvpStatus = "going" | "interested" | null;

type RsvpPayload = { going?: number; interested?: number; mine?: RsvpStatus; signedIn?: boolean };

function applyRsvp(setters: {
  setGoing: (n: number) => void;
  setInterested: (n: number) => void;
  setMine: (s: RsvpStatus) => void;
  setSignedIn: (b: boolean) => void;
}, data: RsvpPayload) {
  setters.setGoing(data.going ?? 0);
  setters.setInterested(data.interested ?? 0);
  setters.setMine(data.mine ?? null);
  setters.setSignedIn(Boolean(data.signedIn));
}

export function EventRsvp({ eventId }: { eventId: string }) {
  const [going, setGoing] = useState(0);
  const [interested, setInterested] = useState(0);
  const [mine, setMine] = useState<RsvpStatus>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const setters = { setGoing, setInterested, setMine, setSignedIn };

  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as RsvpPayload;
        if (!response.ok) return;
        applyRsvp(setters, data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function refresh() {
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as RsvpPayload;
    if (!response.ok) return;
    applyRsvp(setters, data);
  }

  async function toggle(status: "going" | "interested") {
    if (busy || !signedIn) return;
    setBusy(true);
    try {
      if (mine === status) {
        await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, { method: "DELETE" });
      } else {
        await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const pill = (status: "going" | "interested") =>
    `rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[.1em] transition disabled:opacity-50 ${
      mine === status
        ? "border-emerald-300/40 bg-emerald-300/[.12] text-emerald-100"
        : "border-white/[.1] text-white/55 hover:border-emerald-300/25 hover:text-white/85"
    }`;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void toggle("interested")} disabled={busy || !signedIn} className={pill("interested")} title={signedIn ? "Mark as interested" : "Sign in to RSVP"}>
        {busy && mine !== "interested" ? "…" : "Interested"} · {interested}
      </button>
      <button type="button" onClick={() => void toggle("going")} disabled={busy || !signedIn} className={pill("going")} title={signedIn ? "Mark as going" : "Sign in to RSVP"}>
        {busy && mine !== "going" ? "…" : "Going"} · {going}
      </button>
      {!signedIn && <span className="text-[10px] text-white/25">Sign in to RSVP.</span>}
    </div>
  );
}
