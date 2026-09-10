"use client";

import { useEffect, useState } from "react";

type Props = {
  animalId: string;
  initialName: string;
  initialNotes?: string;
  favorite: boolean;
};

type SaveState = {
  colony?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";

export function ChondroAnimalRecordActions({ animalId, initialName, initialNotes = "", favorite }: Props) {
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [isFavorite, setIsFavorite] = useState(favorite);
  const [busy, setBusy] = useState<"record" | "favorite" | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setName(initialName);
    setNotes(initialNotes);
    setIsFavorite(favorite);
  }, [animalId, initialName, initialNotes, favorite]);

  async function saveRecord() {
    const cleanName = name.trim();
    if (!cleanName || busy) return;
    setBusy("record");
    setStatus("");
    try {
      let state: SaveState | null = null;
      let authenticated = false;
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        authenticated = Boolean(data.authenticated);
        if (data.save?.state && typeof data.save.state === "object") state = data.save.state as SaveState;
      } catch {}

      if (!state) {
        try {
          const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
          const parsed = raw ? JSON.parse(raw) : null;
          if (parsed && typeof parsed === "object") state = parsed as SaveState;
        } catch {}
      }

      if (!state || !Array.isArray(state.colony)) throw new Error("No breeder save loaded");
      const next: SaveState = {
        ...state,
        colony: state.colony.map((animal) => String(animal.id ?? "") === animalId ? { ...animal, name: cleanName, notes } : animal),
      };

      try { window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(next)); } catch {}
      if (authenticated) {
        const response = await fetch("/api/hatchery/chondro-breeder/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) throw new Error("Cloud save failed");
      }

      window.dispatchEvent(new Event("arboreal-chondro-breeder-save-change"));
      setStatus("Animal record saved.");
    } catch {
      setStatus("That record could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFavorite() {
    if (busy) return;
    const nextFavorite = !isFavorite;
    setBusy("favorite");
    setStatus("");
    try {
      const response = await fetch("/api/hatchery/chondro-breeder/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snakeId: animalId, favorite: nextFavorite }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Favorite failed");
      setIsFavorite(nextFavorite);
      window.dispatchEvent(new Event("arboreal-chondro-favorites-change"));
      setStatus(nextFavorite ? "Protected as a favorite." : "Removed from favorites.");
    } catch {
      setStatus("Favorite status could not be changed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="section-kicker">Animal record</div>
          <p className="mt-2 text-xs leading-5 text-white/40">Keep the everyday edits here so the Colony screen can stay focused on browsing your snakes.</p>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void toggleFavorite()}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] transition disabled:opacity-40 ${isFavorite ? "border-amber-200/22 bg-amber-200/[.05] text-amber-100/80" : "border-white/[.08] text-white/48 hover:text-white/75"}`}
        >
          {isFavorite ? "★ Favorite" : "☆ Favorite"}
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/34">Name</span>
        <input
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-sm text-white/76 outline-none transition focus:border-emerald-300/25"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/34">Notes</span>
        <textarea
          value={notes}
          maxLength={1200}
          rows={4}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Breeding notes, behavior, project goals, lineage reminders…"
          className="mt-2 w-full resize-y rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-sm leading-6 text-white/70 outline-none transition placeholder:text-white/20 focus:border-emerald-300/25"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span role="status" className="text-[10px] text-emerald-100/55">{status}</span>
        <button
          type="button"
          disabled={busy !== null || !name.trim()}
          onClick={() => void saveRecord()}
          className="rounded-xl border border-emerald-300/18 bg-emerald-300/[.055] px-4 py-2 text-[10px] font-black uppercase tracking-[.08em] text-emerald-100/80 transition hover:bg-emerald-300/[.09] disabled:opacity-35"
        >
          {busy === "record" ? "Saving…" : "Save record"}
        </button>
      </div>
    </section>
  );
}
