"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";

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

  const active = VIEWS.find((v) => v.id === view) ?? VIEWS[0];

  return (
    <div className="pb-10">
      <section className="mx-auto max-w-5xl px-5 pt-5 sm:px-6">
        {/* Bunn's animated store */}
        <div className="relative overflow-hidden rounded-[30px] border border-emerald-300/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,.35)]">
          <button
            type="button"
            onClick={() => setTip((i) => (i + 1) % BUNN_TIPS.length)}
            title="Ask Bunn for a tip"
            aria-label="Ask Bunn for a tip"
            className="block w-full cursor-pointer"
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              poster="/hatchery/game/bunn-shop-counter.webp"
              className="block h-auto w-full"
            >
              <source src="/hatchery/game/bunn-shop-loop.mp4" type="video/mp4" />
            </video>
          </button>

          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent p-4 pb-10 sm:p-5">
            <div className="max-w-[78%] rounded-2xl border border-white/[.08] bg-white/[.96] p-3 text-[13px] leading-5 text-[#0a120d] shadow-[0_10px_30px_rgba(0,0,0,.35)] sm:max-w-[60%]">
              <span className="font-semibold">Bunn says:</span> {BUNN_TIPS[tip]}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-4 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-white/75 backdrop-blur">
            Tap Bunn for a tip
          </div>
          <div className="pointer-events-none absolute bottom-3 right-4 rounded-full border border-emerald-200/20 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-emerald-100/80 backdrop-blur">
            Bunn&apos;s Repti-Shop
          </div>
        </div>

        {/* Viewing panel with the one bottom bar */}
        <div className="mt-4 overflow-hidden rounded-[28px] border border-white/[.07] bg-[#071009]">
          <div className="border-b border-white/[.06] px-4 pt-4 sm:px-5">
            <div className="text-[9px] font-black uppercase tracking-[.17em] text-white/35">Now viewing</div>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold text-white">{active.label}</h2>
              <p className="truncate text-xs text-white/40">{active.blurb}</p>
            </div>
          </div>

          <div className="px-4 pt-4 sm:px-5" key={view}>
            {view === "animals" ? (
              <ChondroBreederExpandedShop section="snakes" layout="carousel" />
            ) : view === "enclosures" ? (
              <ChondroBreederExpandedShop section="enclosures" layout="carousel" />
            ) : (
              <ChondroPlayerMarket bare layout="carousel" />
            )}
          </div>

          <div className="sticky bottom-3 z-10 mx-4 mb-4 mt-2 sm:mx-5">
            <nav aria-label="Store sections" className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/70 p-2 shadow-[0_12px_40px_rgba(0,0,0,.5)] backdrop-blur">
              {VIEWS.map((v) => {
                const selected = v.id === view;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
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
          </div>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setQaOpen(true)}
            className="text-[11px] font-semibold text-white/30 underline decoration-white/15 underline-offset-4 hover:text-white/60"
          >
            Sprite QA — review every game animal sprite
          </button>
        </div>
      </section>

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
