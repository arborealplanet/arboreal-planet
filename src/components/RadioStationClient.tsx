"use client";

import { useState } from "react";
import { LIZARD_MUSIC, RADIO_ARTWORK_URL } from "@/lib/lizard-music";

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const TOTAL_SECONDS = LIZARD_MUSIC.reduce((sum, t) => sum + t.seconds, 0);

export function RadioStationClient() {
  const [nowPlaying, setNowPlaying] = useState<number | null>(null);

  const play = (index: number) => {
    setNowPlaying(index);
    window.dispatchEvent(new CustomEvent("arboreal-radio:play", { detail: { index } }));
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={RADIO_ARTWORK_URL}
          alt="Arboreal Radio artwork"
          className="h-40 w-40 rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,.45)]"
        />
        <p className="section-kicker mt-6">Station</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Arboreal Radio
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/55">
          Lizard music — {LIZARD_MUSIC.length} tracks, {formatTime(TOTAL_SECONDS)} of canopy
          ambience. Tap a track to play it in the station player; it keeps playing while you
          browse the site.
        </p>
      </div>

      <ol className="mt-8 overflow-hidden rounded-2xl border border-white/[.07] bg-black/[.25]">
        {LIZARD_MUSIC.map((track, i) => {
          const active = nowPlaying === i;
          return (
            <li key={track.file}>
              <button
                type="button"
                onClick={() => play(i)}
                aria-current={active}
                className={`flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-emerald-300/[.06] ${
                  i > 0 ? "border-t border-white/[.05]" : ""
                } ${active ? "bg-emerald-300/[.08]" : ""}`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm ${
                    active
                      ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-200"
                      : "border-white/10 bg-white/[.03] text-white/50"
                  }`}
                  aria-hidden="true"
                >
                  {active ? "♪" : "▶"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${active ? "text-emerald-200" : "text-white/85"}`}>
                    {track.title}
                  </span>
                  <span className="block text-[11px] uppercase tracking-[.14em] text-white/30">
                    Track {i + 1}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-xs text-white/40">
                  {formatTime(track.seconds)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-center text-xs leading-5 text-white/30">
        Playback continues across pages via the station player. Use the player controls to
        pause, skip, or adjust volume.
      </p>
    </div>
  );
}
