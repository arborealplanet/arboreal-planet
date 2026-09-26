"use client";

import Link from "next/link";
import { useEffect } from "react";

// Full-screen intro advertisement for Arboreal Keeper. Shown as the first
// thing a visitor sees on the Arboreal Keeper entry routes; the CTA dismisses
// the layer and reveals the game underneath, which stays fully intact.
// The strike-sting bumper plays full-bleed behind the copy (muted loop).
export function ArborealKeeperAdHero({ onEnter, onReplayIntro }: { onEnter: () => void; onReplayIntro?: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Arboreal Keeper advertisement"
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#020604]"
    >
      {/* Strike-sting bumper, full-bleed behind the copy */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          className="h-full w-full object-cover"
        >
          <source src="/branding/arboreal-planet-strike-sting.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Legibility grade over the video */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-[radial-gradient(1100px_520px_at_50%_-8%,rgba(57,230,125,.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_8%_108%,rgba(20,120,70,.16),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_94%_108%,rgba(20,120,70,.12),transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,4,.45)_0%,transparent_30%,transparent_60%,rgba(2,6,4,.9)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col items-center justify-center px-5 py-10 text-center sm:px-8">
        {/* Ad copy */}
        <div className="flex w-full max-w-xl flex-col items-center text-center">
          <div className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-300/70 sm:text-[11px]">
            The green tree python breeding simulator
          </div>
          <h1 className="mt-4 font-serif text-5xl font-black uppercase leading-[1.02] tracking-[.02em] text-white sm:text-6xl lg:text-7xl">
            Arboreal
            <span className="block">Keeper</span>
          </h1>
          <div className="mt-5 h-px w-28 bg-gradient-to-r from-emerald-300/60 to-transparent" aria-hidden="true" />
          <p className="mt-5 max-w-md text-[15px] leading-7 text-white/55 sm:text-base">
            Breed, incubate, hatch and build your lineage. Rare neonates don&apos;t wait —
            start your collection today.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onEnter}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-8 py-4 text-base font-black uppercase tracking-[.08em] text-[#04120a] shadow-[0_18px_50px_rgba(57,230,125,.35)] transition hover:-translate-y-0.5 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60 sm:w-auto"
            >
              Start your collection
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[.03] px-6 py-4 text-sm font-semibold text-white/60 transition hover:border-white/25 hover:text-white/90"
            >
              Back to Arboreal Planet
            </Link>
          </div>

          <div className="mt-6 text-[10px] font-bold uppercase tracking-[.22em] text-white/30">
            Free to play &middot; Your program saves as you go
          </div>

          {onReplayIntro ? (
            <button
              type="button"
              onClick={onReplayIntro}
              className="mt-5 text-xs text-white/35 underline decoration-white/20 underline-offset-4 transition hover:text-white/60"
            >
              Replay the intro
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
