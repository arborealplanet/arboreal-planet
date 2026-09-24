"use client";

import { useEffect, useRef, useState } from "react";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";

// Three blink variants of Bunn's idle loop. Every clip opens and closes on
// the same eyes-open pose, so cutting between them is as invisible as each
// clip's own loop point — the store never visibly repeats.
const SHOP_CLIPS = [
  "/hatchery/game/bunn-shop-loop-a.mp4",
  "/hatchery/game/bunn-shop-loop-b.mp4",
  "/hatchery/game/bunn-shop-loop-c.mp4",
];

function ShopLoopVideo() {
  const [clip, setClip] = useState(0);
  const refs = useRef<Array<HTMLVideoElement | null>>([]);

  const advance = () => {
    const next = (clip + 1) % SHOP_CLIPS.length;
    const upcoming = refs.current[next];
    if (upcoming) {
      upcoming.currentTime = 0;
      void upcoming.play().catch(() => {});
    }
    refs.current[clip]?.pause();
    setClip(next);
  };

  return (
    <>
      {SHOP_CLIPS.map((src, i) => {
        const active = i === clip;
        return (
          <video
            key={src}
            ref={(el) => {
              refs.current[i] = el;
            }}
            autoPlay={i === 0}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden={!active}
            poster="/hatchery/game/bunn-shop-counter.webp"
            onEnded={active ? advance : undefined}
            className={`absolute inset-0 h-full w-full object-cover [object-position:center_35%] transition-opacity duration-150 ${
              active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <source src={src} type="video/mp4" />
          </video>
        );
      })}
    </>
  );
}

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

  return (
    <div className="mx-auto flex h-[calc(100dvh-164px-env(safe-area-inset-bottom))] w-full max-w-5xl flex-col overflow-hidden px-4 py-3 sm:h-[calc(100dvh-170px-env(safe-area-inset-bottom))] sm:px-6">
      {/* Bunn's tip — slim row above the store, tap for another tip */}
      <button
        type="button"
        onClick={() => setTip((i) => (i + 1) % BUNN_TIPS.length)}
        title="Ask Bunn for another tip"
        className="mb-2 flex w-full flex-none items-center gap-2 rounded-2xl border border-white/[.08] bg-white/[.96] px-3 py-2 text-left shadow-[0_10px_30px_rgba(0,0,0,.35)]"
      >
        <span className="min-w-0 flex-1 text-[11px] leading-4 text-[#0a120d] sm:text-[12px]">
          <span className="font-semibold">Hank says:</span> {BUNN_TIPS[tip]}
        </span>
        <span className="shrink-0 text-[9px] font-black uppercase tracking-[.12em] text-[#0a120d]/40">↻ tip</span>
      </button>

      {/* Bunn's animated store — as large as possible, completely clean */}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[24px] border border-emerald-300/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,.35)]">
        <div className="absolute inset-0">
          <ShopLoopVideo />
        </div>
      </div>

      {/* View buttons — small, below the animation, Sprite QA kept quiet */}
      <div className="mt-2 flex flex-none items-center gap-2">
        <div className="flex gap-1.5">
          {VIEWS.map((v) => {
            const selected = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={selected ? "true" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[.06em] transition ${
                  selected
                    ? "border-emerald-200/60 bg-emerald-300 text-[#06100c]"
                    : "border-white/15 bg-white/[.04] text-white/60 hover:bg-white/[.08] hover:text-white"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setQaOpen(true)}
          className="ml-auto shrink-0 text-[10px] font-semibold text-white/30 underline decoration-white/15 underline-offset-4 hover:text-white/60"
        >
          Sprite QA
        </button>
      </div>

      {/* Current-view inventory — horizontal carousel, never scrolls vertically */}
      <div className="mt-2 min-h-0 flex-1 overflow-hidden">
        <div key={view} className="h-full">
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
