"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  LIZARD_MUSIC,
  RADIO_ARTWORK_URL,
  radioTrackUrl,
} from "@/lib/lizard-music";

const STORE_KEY = "arboreal-radio:v1";

type Persisted = {
  volume: number;
  muted: boolean;
  trackIndex: number;
  dismissed: boolean;
};

const DEFAULTS: Persisted = { volume: 70, muted: false, trackIndex: 0, dismissed: false };

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      volume: typeof p.volume === "number" ? Math.min(100, Math.max(0, p.volume)) : DEFAULTS.volume,
      muted: p.muted === true,
      trackIndex:
        typeof p.trackIndex === "number" &&
        p.trackIndex >= 0 &&
        p.trackIndex < LIZARD_MUSIC.length
          ? Math.floor(p.trackIndex)
          : 0,
      dismissed: p.dismissed === true,
    };
  } catch {
    return DEFAULTS;
  }
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function EqBars() {
  return (
    <span className="flex h-4 items-end gap-[3px] motion-reduce:hidden" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom animate-[radio-eq_0.9s_ease-in-out_infinite] rounded-full bg-emerald-300"
          style={{ animationDelay: `${i * 0.18}s`, height: "100%" }}
        />
      ))}
      <style>{`@keyframes radio-eq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}`}</style>
    </span>
  );
}

function subscribeNoop() {
  return () => {};
}

export function ArborealRadioPlayer() {
  // SSR-safe client gate: server and hydration pass render null, then the
  // client re-renders with the real player. No hydration mismatch.
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);
  // Lazy initializers are SSR-safe: localStorage only exists in the browser.
  const [persisted, setPersisted] = useState<Persisted>(() =>
    typeof window === "undefined" ? DEFAULTS : loadPersisted()
  );
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [srcLoaded, setSrcLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(persisted.trackIndex);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the ref mirror in sync outside of render.
  useEffect(() => {
    trackIndexRef.current = persisted.trackIndex;
  }, [persisted.trackIndex]);

  const save = useCallback((next: Persisted) => {
    setPersisted(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — player still works for the session */
    }
  }, []);

  const flashNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
  }, []);

  const playTrackRef = useRef<((index: number, autoplay: boolean) => void) | null>(null);

  const setMediaSession = useCallback((index: number) => {
    try {
      if (!("mediaSession" in navigator)) return;
      const track = LIZARD_MUSIC[index];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: "Arboreal Radio",
        album: "Lizard music",
        artwork: [{ src: RADIO_ARTWORK_URL, sizes: "512x512", type: "image/webp" }],
      });
      navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play().catch(() => {}));
      navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        playTrackRef.current?.(
          (trackIndexRef.current + LIZARD_MUSIC.length - 1) % LIZARD_MUSIC.length,
          true
        )
      );
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        playTrackRef.current?.((trackIndexRef.current + 1) % LIZARD_MUSIC.length, true)
      );
    } catch {
      /* Media Session is best-effort */
    }
  }, []);

  const playTrack = useCallback(
    (index: number, autoplay: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;
      const track = LIZARD_MUSIC[index];
      setPersisted((prev) => {
        const next = { ...prev, trackIndex: index };
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      setCurrentTime(0);
      setDuration(0);
      setSrcLoaded(true);
      audio.src = radioTrackUrl(track);
      setMediaSession(index);
      if (autoplay) audio.play().catch(() => setPlaying(false));
    },
    [setMediaSession]
  );

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  // Single audio element for the whole session.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => {
      if (audio.duration && Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      const next = (trackIndexRef.current + 1) % LIZARD_MUSIC.length;
      playTrack(next, true);
    };
    const onError = () => {
      // Skip dead files gracefully — never leave a stuck player.
      flashNotice("Track unavailable — skipping");
      const next = (trackIndexRef.current + 1) % LIZARD_MUSIC.length;
      playTrack(next, true);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply volume/mute to the element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = persisted.muted ? 0 : persisted.volume / 100;
  }, [persisted.volume, persisted.muted]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (!srcLoaded) playTrack(trackIndexRef.current, true);
      else audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playTrack, srcLoaded]);

  const seekByRatio = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !srcLoaded) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    const duration = audio.duration || LIZARD_MUSIC[trackIndexRef.current].seconds;
    audio.currentTime = clamped * duration;
    setCurrentTime(audio.currentTime);
  }, [srcLoaded]);

  const onSeekKey = useCallback(
    (e: React.KeyboardEvent) => {
      const audio = audioRef.current;
      if (!audio || !srcLoaded) return;
      if (e.key === "ArrowRight") { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { audio.currentTime = Math.max(0, audio.currentTime - 10); e.preventDefault(); }
      else if (e.key === "Home") { audio.currentTime = 0; e.preventDefault(); }
      else if (e.key === "End" && audio.duration) { audio.currentTime = audio.duration; e.preventDefault(); }
    },
    [srcLoaded]
  );

  if (!hydrated) return null;

  const track = LIZARD_MUSIC[persisted.trackIndex];
  const shownDuration = duration > 0 ? duration : track.seconds;
  const progress = shownDuration > 0 ? Math.min(1, currentTime / shownDuration) : 0;

  if (persisted.dismissed) {
    return (
      <div className="fixed bottom-[calc(78px+env(safe-area-inset-bottom))] right-4 z-40 xl:bottom-6">
        <button
          type="button"
          onClick={() => save({ ...persisted, dismissed: false })}
          className="rounded-full border-2 border-black bg-[#06100c]/95 px-4 py-2 text-[11px] font-black uppercase tracking-[.14em] text-emerald-200 shadow-[0_8px_24px_rgba(0,0,0,.45)] backdrop-blur transition hover:bg-emerald-300 hover:text-[#06100c]"
          aria-label="Open Arboreal Radio player"
        >
          ◉ Arboreal Radio
        </button>
      </div>
    );
  }

  const btn =
    "grid place-items-center rounded-xl border border-white/[.08] bg-white/[.03] text-white/70 transition hover:bg-emerald-300/[.12] hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-300";

  return (
    <div
      className="fixed bottom-[calc(78px+env(safe-area-inset-bottom))] right-4 z-40 w-[calc(100vw-2rem)] max-w-[340px] xl:bottom-6"
      role="region"
      aria-label="Arboreal Radio music player"
    >
      <div className="overflow-hidden rounded-3xl border-[3px] border-black bg-[#06100c]/97 shadow-[0_18px_60px_rgba(0,0,0,.5)] backdrop-blur-xl">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 pt-3">
          <img
            src={RADIO_ARTWORK_URL}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl border border-white/10 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300/80">
              Arboreal Radio
            </div>
            <div className="truncate text-sm font-semibold text-white/90" title={track.title}>
              {track.title}
            </div>
          </div>
          {playing && !minimized ? <EqBars /> : null}
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className={`${btn} h-8 w-8 text-sm`}
              onClick={() => setMinimized((v) => !v)}
              aria-label={minimized ? "Expand player" : "Minimize player"}
            >
              {minimized ? "▴" : "▾"}
            </button>
            <button
              type="button"
              className={`${btn} h-8 w-8 text-sm`}
              onClick={() => {
                audioRef.current?.pause();
                save({ ...persisted, dismissed: true });
              }}
              aria-label="Close Arboreal Radio player"
            >
              ✕
            </button>
          </div>
        </div>

        {!minimized ? (
          <div className="px-4 pb-4">
            {/* Seek bar */}
            <div className="mt-3 flex items-center gap-2 text-[10px] tabular-nums text-white/40">
              <span>{formatTime(currentTime)}</span>
              <div
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.round(shownDuration)}
                aria-valuenow={Math.round(currentTime)}
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(shownDuration)}`}
                className="relative h-5 flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300 rounded"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekByRatio((e.clientX - rect.left) / rect.width);
                }}
                onKeyDown={onSeekKey}
              >
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-300"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
              <span>{formatTime(shownDuration)}</span>
            </div>

            {/* Transport */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                className={`${btn} h-10 w-10 text-base`}
                onClick={() =>
                  playTrack(
                    (persisted.trackIndex + LIZARD_MUSIC.length - 1) % LIZARD_MUSIC.length,
                    playing || srcLoaded
                  )
                }
                aria-label="Previous track"
              >
                ⏮
              </button>
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300 text-xl text-[#06100c] transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-white active:scale-95"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "⏸" : "▶"}
              </button>
              <button
                type="button"
                className={`${btn} h-10 w-10 text-base`}
                onClick={() =>
                  playTrack((persisted.trackIndex + 1) % LIZARD_MUSIC.length, playing || srcLoaded)
                }
                aria-label="Next track"
              >
                ⏭
              </button>
              <button
                type="button"
                className={`${btn} h-10 w-10 text-base ${playlistOpen ? "bg-emerald-300/[.15] text-emerald-200" : ""}`}
                onClick={() => setPlaylistOpen((v) => !v)}
                aria-label={playlistOpen ? "Hide playlist" : "Show playlist"}
                aria-expanded={playlistOpen}
              >
                ☰
              </button>
            </div>

            {/* Volume */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className={`${btn} h-8 w-8 text-sm`}
                onClick={() => save({ ...persisted, muted: !persisted.muted })}
                aria-label={persisted.muted ? "Unmute" : "Mute"}
              >
                {persisted.muted || persisted.volume === 0 ? "🔇" : "🔊"}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={persisted.muted ? 0 : persisted.volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  save({ ...persisted, volume: v, muted: v === 0 ? true : false });
                }}
                className="h-1.5 flex-1 cursor-pointer accent-emerald-300"
                aria-label="Volume"
              />
            </div>

            {/* Playlist drawer */}
            {playlistOpen ? (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-white/[.07] bg-black/30">
                {LIZARD_MUSIC.map((t, i) => (
                  <button
                    key={t.file}
                    type="button"
                    onClick={() => playTrack(i, true)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition hover:bg-emerald-300/[.07] ${
                      i === persisted.trackIndex ? "bg-emerald-300/[.1] text-emerald-200" : "text-white/60"
                    }`}
                    aria-current={i === persisted.trackIndex}
                  >
                    <span className="w-6 shrink-0 tabular-nums text-white/30">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="shrink-0 tabular-nums text-white/30">{formatTime(t.seconds)}</span>
                    {i === persisted.trackIndex && playing ? <EqBars /> : null}
                  </button>
                ))}
              </div>
            ) : null}

            {notice ? (
              <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-3 py-2 text-center text-[11px] text-amber-100/80">
                {notice}
              </div>
            ) : null}
          </div>
        ) : (
          /* Slim minimized bar */
          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-300 text-base text-[#06100c] transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-white"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <div className="min-w-0 flex-1 truncate text-xs text-white/70">{track.title}</div>
            {playing ? <EqBars /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
