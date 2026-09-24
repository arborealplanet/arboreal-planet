"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";
import { consumeStockRotated, isHankScaleMuted, playHankScaleLine, setHankScaleMuted } from "@/lib/hank-scale-voice";

const BUNN_TIPS = [
  "Howdy! Bunn here. Buy your housing before your snakes — every chondro needs a home.",
  "The Dojo 2 Stack is where the neonates start out.",
  "Raise subadults to adults to unlock breeding.",
  "Check the Player Market for deals from other keepers.",
  "Holdbacks build your lineage — don't sell your best babies.",
];

type View = "animals" | "enclosures" | "market";

const VIEWS: Array<{ id: View; label: string; blurb: string; thumb: string }> = [
  { id: "animals", label: "Animals", blurb: "20 snakes, refreshed daily", thumb: "/hatchery/game/dock/animals.webp" },
  { id: "enclosures", label: "Enclosures", blurb: "Housing before snakes", thumb: "/hatchery/game/pvc-enclosure.webp" },
  { id: "market", label: "Player Market", blurb: "Virtual animals from other players", thumb: "/hatchery/game/dock/breed.webp" },
];

export function ArborealKeeperReptiShop() {
  const [view, setView] = useState<View>("animals");
  const [tip, setTip] = useState(0);
  const [qaOpen, setQaOpen] = useState(false);
  const [muted, setMuted] = useState(() => isHankScaleMuted());
  const introducedRef = useRef(false);

  // Hank Scale voice line per tip index (BUNN_TIPS order).
  const TIP_LINES = [3, 4, 5, 6, 7];
  const VIEW_LINES: Record<View, number> = { animals: 2, enclosures: 3, market: 6 };

  useEffect(() => {
    const onMuteChange = () => setMuted(isHankScaleMuted());
    window.addEventListener("hank-scale-mute-changed", onMuteChange);
    return () => window.removeEventListener("hank-scale-mute-changed", onMuteChange);
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setHankScaleMuted(next);
  }

  function handleTipClick() {
    const next = (tip + 1) % BUNN_TIPS.length;
    setTip(next);
    if (!introducedRef.current) {
      introducedRef.current = true;
      playHankScaleLine(1);
    } else {
      playHankScaleLine(TIP_LINES[next]);
    }
  }

  function selectView(next: View) {
    if (next === view) return;
    setView(next);
    // After a daily stock rotation, the animals tab gets the fresh-stock
    // greeting instead of the standard one — once.
    playHankScaleLine(next === "animals" && consumeStockRotated() ? 11 : VIEW_LINES[next]);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setTip((i) => (i + 1) % BUNN_TIPS.length), 9000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!qaOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [qaOpen]);

  const active = VIEWS.find((v) => v.id === view) ?? VIEWS[0];

  return (
    <div className="mx-auto flex h-[calc(100dvh-164px-env(safe-area-inset-bottom))] w-full max-w-5xl flex-col overflow-hidden px-4 py-3 sm:h-[calc(100dvh-170px-env(safe-area-inset-bottom))] sm:px-6">
      {/* Bunn's animated store — fills its space, options on top of it */}
      <div className="relative min-h-0 w-full flex-[1.25] overflow-hidden rounded-[24px] border border-emerald-300/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,.35)]">
        <button
          type="button"
          onClick={handleTipClick}
          title="Ask Bunn for a tip"
          aria-label="Ask Bunn for a tip"
          className="absolute inset-0 block h-full w-full cursor-pointer"
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            poster="/hatchery/game/bunn-shop-counter.webp"
            className="h-full w-full object-cover [object-position:center_35%]"
          >
            <source src="/hatchery/game/bunn-shop-loop.mp4" type="video/mp4" />
          </video>
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent p-3 pb-8 sm:p-4 sm:pb-10">
          <div className="max-w-[82%] rounded-2xl border border-white/[.08] bg-white/[.96] p-2.5 text-[12px] leading-5 text-[#0a120d] shadow-[0_10px_30px_rgba(0,0,0,.35)] sm:max-w-[62%] sm:text-[13px]">
            <span className="font-semibold">Bunn says:</span> {BUNN_TIPS[tip]}
          </div>
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            title={muted ? "Unmute the shopkeeper's voice" : "Mute the shopkeeper's voice"}
            aria-label={muted ? "Unmute the shopkeeper's voice" : "Mute the shopkeeper's voice"}
            className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1.5 text-[11px] text-white/75 backdrop-blur hover:bg-black/80"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <div className="pointer-events-none rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-white/75 backdrop-blur">
            Bunn&apos;s Repti-Shop
          </div>
        </div>

        {/* Options on top of the animation */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 px-4">
          {VIEWS.map((v) => {
            const selected = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => selectView(v.id)}
                aria-current={selected ? "true" : undefined}
                className={`rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-[.08em] backdrop-blur transition ${
                  selected
                    ? "border-emerald-200/60 bg-emerald-300 text-[#06100c]"
                    : "border-white/20 bg-black/60 text-white/75 hover:bg-black/80 hover:text-white"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* The one bottom bar with every store option */}
      <nav
        aria-label="Store sections"
        className="mt-3 grid flex-none grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/70 p-2 shadow-[0_12px_40px_rgba(0,0,0,.5)] backdrop-blur"
      >
        {VIEWS.map((v) => {
          const selected = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => selectView(v.id)}
              aria-current={selected ? "true" : undefined}
              className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-black transition ${
                selected
                  ? "bg-emerald-300 text-[#06100c]"
                  : "border border-white/[.07] bg-white/[.03] text-white/60 hover:bg-white/[.07] hover:text-white/85"
              }`}
            >
              <span className="relative hidden h-7 w-7 shrink-0 overflow-hidden rounded-lg sm:block">
                <Image src={v.thumb} alt="" fill sizes="28px" className="object-cover" />
              </span>
              {v.label}
            </button>
          );
        })}
      </nav>

      {/* Current-view carousel — fills the remaining space, never scrolls the page */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[9px] font-black uppercase tracking-[.17em] text-white/35">Now viewing</span>
            <h2 className="truncate text-sm font-bold text-white">{active.label}</h2>
            <p className="hidden truncate text-xs text-white/40 sm:block">{active.blurb}</p>
          </div>
          <button
            type="button"
            onClick={() => setQaOpen(true)}
            className="shrink-0 text-[11px] font-semibold text-white/30 underline decoration-white/15 underline-offset-4 hover:text-white/60"
          >
            Sprite QA
          </button>
        </div>
        <div key={view} className="pb-2">
          {view === "animals" ? (
            <ChondroBreederExpandedShop section="snakes" layout="carousel" />
          ) : view === "enclosures" ? (
            <ChondroBreederExpandedShop section="enclosures" layout="carousel" />
          ) : (
            <ChondroPlayerMarket bare layout="carousel" />
          )}
        </div>
      </div>

      {qaOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Sprite QA">
          <button type="button" aria-label="Close sprite QA" onClick={() => setQaOpen(false)} className="absolute inset-0 cursor-default bg-black/72 backdrop-blur-sm" />
          <div className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#071009] sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3 border-b border-white/[.06] p-4 sm:p-5">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.17em] text-violet-200/50">Production tool</div>
                <h3 className="mt-1 text-lg font-bold text-white">Sprite QA</h3>
                <p className="mt-0.5 text-xs text-white/40">Every game animal sprite slot — review and flag what needs tweaking.</p>
              </div>
              <button
                type="button"
                onClick={() => setQaOpen(false)}
                aria-label="Close"
                className="rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2 text-sm font-black text-white/70 hover:bg-white/[.08]"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">
              <ChondroBreederExpandedShop section="qa" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
