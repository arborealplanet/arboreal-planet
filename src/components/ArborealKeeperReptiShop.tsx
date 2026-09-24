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

type Panel = "enclosures" | "snakes" | "market" | "qa" | null;

const PANEL_META: Record<Exclude<Panel, null>, { title: string; blurb: string }> = {
  enclosures: { title: "Enclosures", blurb: "Housing first — every chondro needs a home." },
  snakes: { title: "Snakes", blurb: "Today's keeper stock, refreshed daily." },
  market: { title: "Player Market", blurb: "Animals listed by other Arboreal Keeper players." },
  qa: { title: "Sprite QA", blurb: "Artwork review — every game animal sprite slot." },
};

const OPTIONS: Array<{ id: Exclude<Panel, null>; label: string; detail: string; thumb: string }> = [
  { id: "enclosures", label: "Enclosures", detail: "Dojo 2 Stacks and PVC arboreals", thumb: "/hatchery/game/pvc-enclosure.webp" },
  { id: "snakes", label: "Snakes", detail: "20 fresh listings, refreshed daily", thumb: "/hatchery/game/dock/animals.webp" },
  { id: "market", label: "Player Market", detail: "Virtual animals from other players", thumb: "/hatchery/game/dock/breed.webp" },
];

export function ArborealKeeperReptiShop() {
  const [panel, setPanel] = useState<Panel>(null);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTip((i) => (i + 1) % BUNN_TIPS.length), 8000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [panel]);

  return (
    <div className="pb-8">
      <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
        <div className="overflow-hidden rounded-[30px] border border-emerald-300/12 bg-[#071009] shadow-[0_24px_70px_rgba(0,0,0,.35)]">
          <div className="grid md:grid-cols-2">
            <button
              type="button"
              onClick={() => setTip((i) => (i + 1) % BUNN_TIPS.length)}
              title="Ask Bunn for a tip"
              className="relative block aspect-square w-full cursor-pointer overflow-hidden bg-black"
            >
              <Image
                src="/hatchery/game/bunn-shop-counter.webp"
                alt="Bunn the shopkeeper behind his wooden reptile-shop counter"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-white/75 backdrop-blur">
                Tap Bunn for a tip
              </span>
            </button>

            <div className="relative flex flex-col justify-center bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,.08),transparent_46%),#071009] p-5 sm:p-7">
              <div className="text-[9px] font-black uppercase tracking-[.19em] text-emerald-100/55">Bunn&apos;s Repti-Shop</div>

              <div className="relative mt-4 rounded-2xl border border-white/[.08] bg-white/[.96] p-4 text-sm leading-6 text-[#0a120d] shadow-[0_10px_30px_rgba(0,0,0,.35)]">
                <span aria-hidden className="absolute -left-2 top-6 hidden h-4 w-4 rotate-45 border-b border-l border-white/[.08] bg-white/[.96] md:block" />
                <span className="font-semibold">Bunn says:</span> {BUNN_TIPS[tip]}
              </div>

              <h2 className="mt-5 text-xl font-semibold tracking-[-.02em] text-white">What are you after today?</h2>

              <div className="mt-4 grid gap-2.5">
                {OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPanel(option.id)}
                    className="group flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-2.5 text-left transition hover:border-emerald-200/25 hover:bg-emerald-300/[.05]"
                  >
                    <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <Image src={option.thumb} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white/90">{option.label}</span>
                      <span className="block truncate text-xs text-white/40">{option.detail}</span>
                    </span>
                    <span className="pr-2 text-lg text-emerald-200/50 transition group-hover:translate-x-0.5 group-hover:text-emerald-200/90">→</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPanel("qa")}
                className="mt-4 self-start text-[11px] font-semibold text-violet-200/50 underline decoration-violet-200/25 underline-offset-4 hover:text-violet-200/90"
              >
                Sprite QA — review every game animal sprite
              </button>
            </div>
          </div>
        </div>
      </section>

      {panel ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={PANEL_META[panel].title}>
          <button type="button" aria-label="Close panel" onClick={() => setPanel(null)} className="absolute inset-0 cursor-default bg-black/72 backdrop-blur-sm" />
          <div className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#071009] shadow-[0_-20px_80px_rgba(0,0,0,.6)] sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3 border-b border-white/[.06] p-4 sm:p-5">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-100/50">Bunn&apos;s Repti-Shop</div>
                <h3 className="mt-1 text-lg font-bold text-white">{PANEL_META[panel].title}</h3>
                <p className="mt-0.5 text-xs text-white/40">{PANEL_META[panel].blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Close"
                className="rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2 text-sm font-black text-white/70 hover:bg-white/[.08]"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">
              {panel === "market" ? (
                <ChondroPlayerMarket bare />
              ) : (
                <ChondroBreederExpandedShop section={panel} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
