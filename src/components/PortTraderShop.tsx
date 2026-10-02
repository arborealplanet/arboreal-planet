"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Port trader item shape — CanopyHunter reuses these types so the shop */
/* and the expedition stay in sync.                                    */
/* ------------------------------------------------------------------ */

export type PortTraderItemId = "lantern-oil" | "scent-lure" | "sure-grip" | "local-intel";

export interface PortTraderItem {
  id: PortTraderItemId;
  name: string;
  cost: number;
  desc: string;
  emoji: string;
  iconSrc?: string;
}

const TRADER_NIGHT_ART = "/arcade/canopy-hunter/port-river-night.webp";
const TRADER_PORTRAIT = "/arcade/canopy-hunter/port-trader.webp";

/**
 * The trader's idle animation loops. Empty for now — Gage generates the
 * animation; the still portrait holds the slot until the clips land, and
 * this component starts playing them the moment the array is filled.
 */
const TRADER_CLIPS: string[] = [];

function TraderAnimation() {
  const [clip, setClip] = useState(0);
  const refs = useRef<Array<HTMLVideoElement | null>>([]);

  const advance = () => {
    const next = (clip + 1) % TRADER_CLIPS.length;
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
      {TRADER_CLIPS.map((src, i) => {
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
            onEnded={active ? advance : undefined}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
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

/**
 * Placeholder until the animation lands: the night port backdrop with a slow
 * drift, the trader's portrait bobbing gently at his stall, and a flickering
 * lantern glow behind him — the same "shopkeeper in his window" read as
 * Hank's store, minus the motion.
 */
function TraderPlaceholder() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 animate-[port-drift_32s_ease-in-out_infinite_alternate]">
        <Image
          src={TRADER_NIGHT_ART}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 48rem"
          draggable={false}
          className="scale-110 object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,8,.15)_0%,transparent_45%,rgba(4,10,8,.55)_100%)]" />
      {/* Lantern glow behind the trader */}
      <div className="absolute bottom-[8%] left-[2%] h-[72%] w-[42%] animate-[port-glow_3.8s_ease-in-out_infinite] rounded-full bg-amber-400/[.22] blur-3xl" />
      {/* The trader at his stall */}
      <div className="absolute bottom-0 left-[5%] h-[92%] animate-[port-bob_7s_ease-in-out_infinite]">
        <div className="relative h-full aspect-[1122/1402]">
          <Image
            src={TRADER_PORTRAIT}
            alt=""
            fill
            sizes="220px"
            draggable={false}
            className="object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,.55)]"
          />
        </div>
      </div>
    </div>
  );
}

const TRADER_TIPS = [
  "Evening, hunter. I stock what the river lets through — and the shelf's slimming fast.",
  "Lantern oil's the cheapest edge you'll buy all night. Ask anyone.",
  "Fresh shed skins — I pay good metal for those. Or trade you what I know.",
  "That board's got a name on it with your coin attached. Go have a look.",
  "The boatman leaves when you say. The river don't wait — but I do.",
];

export interface PortTraderShopProps {
  items: PortTraderItem[];
  soldIds: PortTraderItemId[];
  boughtCount: number;
  buyLimit?: number;
  tokenBal: number;
  sheds: number;
  intelTaken: boolean;
  onBuy: (item: PortTraderItem) => void;
  onTradeShed: (forIntel: boolean) => void;
}

/**
 * The river port trader's shop — Hank's store structure with the trader's
 * stock: tip bar, shopkeeper window, tonight's stock carousel, shed trades.
 * The animation slot is a still portrait until Gage's loops arrive.
 */
export function PortTraderShop({
  items,
  soldIds,
  boughtCount,
  buyLimit = 2,
  tokenBal,
  sheds,
  intelTaken,
  onBuy,
  onTradeShed,
}: PortTraderShopProps) {
  const [tip, setTip] = useState(0);
  const buysLeft = buyLimit - boughtCount;

  return (
    <div className="mt-4 overflow-hidden rounded-[26px] border border-white/[.07] bg-white/[.02]">
      {/* Trader's tip — slim row above the store, tap for another tip */}
      <button
        type="button"
        onClick={() => setTip((t) => (t + 1) % TRADER_TIPS.length)}
        title="Ask the trader for another tip"
        className="flex w-full items-center gap-2 border-b border-white/[.06] bg-white/[.96] px-4 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 text-[11px] leading-4 text-[#0a120d] sm:text-[12px] lg:text-sm lg:leading-5">
          <span className="font-semibold">Trader says:</span> {TRADER_TIPS[tip]}
        </span>
        <span className="shrink-0 text-[9px] font-black uppercase tracking-[.12em] text-[#0a120d]/40">↻ tip</span>
      </button>

      {/* Shopkeeper window — animation loops when they exist, still portrait until then */}
      <div className="relative h-56 w-full flex-none overflow-hidden bg-black sm:h-72">
        {TRADER_CLIPS.length > 0 ? <TraderAnimation /> : <TraderPlaceholder />}
        <span className="absolute right-2 top-2 z-10 rounded-full border border-amber-200/30 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-amber-100 backdrop-blur-sm">
          🛒 {buysLeft} {buysLeft === 1 ? "buy" : "buys"} left tonight
        </span>
      </div>

      {/* Tonight's stock */}
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200/60">Tonight&apos;s stock</h3>
          <span className="rounded-full border border-amber-200/25 bg-amber-200/[.07] px-3 py-1 text-xs font-bold text-amber-100">
            🪙 {tokenBal} tokens
          </span>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {items.map((item) => {
            const sold = soldIds.includes(item.id);
            const limited = boughtCount >= buyLimit;
            const poor = tokenBal < item.cost;
            const disabled = sold || limited || poor;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onBuy(item)}
                disabled={disabled}
                className="relative min-w-[208px] max-w-[248px] flex-1 snap-start rounded-2xl border border-white/[.08] bg-black/30 p-4 text-left transition hover:border-amber-200/40 hover:bg-black/45 active:scale-[.98] disabled:opacity-45"
              >
                <span className="flex items-center gap-2.5">
                  {item.iconSrc ? (
                    <span className="relative h-11 w-11 shrink-0">
                      <Image src={item.iconSrc} alt="" aria-hidden="true" fill sizes="44px" draggable={false} className="object-contain" />
                    </span>
                  ) : (
                    <span className="text-[28px] leading-none" aria-hidden="true">{item.emoji}</span>
                  )}
                  <span className="text-sm font-bold text-white">{item.name}</span>
                </span>
                <span className="mt-2 block min-h-[2.5rem] text-xs leading-5 text-white/45">{item.desc}</span>
                <span className="mt-2 block text-xs font-black uppercase tracking-[.12em] text-amber-100">
                  {sold ? "Sold" : limited ? "Two's the limit" : poor ? `${item.cost} tokens — short` : `${item.cost} tokens`}
                </span>
                {sold ? (
                  <span className="absolute right-3 top-3 rotate-6 rounded-md border-2 border-amber-200/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-[.14em] text-amber-200/80">
                    Sold
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Shed trades */}
        {sheds > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onTradeShed(false)}
              className="rounded-full border border-amber-200/30 bg-amber-200/[.07] px-4 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-200/[.14] active:scale-95"
            >
              Trade a shed → +4 tokens ({sheds} in hand)
            </button>
            {!intelTaken ? (
              <button
                type="button"
                onClick={() => onTradeShed(true)}
                className="rounded-full border border-sky-200/30 bg-sky-300/[.07] px-4 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-300/[.14] active:scale-95"
              >
                Trade a shed → local intel
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs italic text-white/35">
            Bring me a fresh shed skin next time, hunter — I pay good metal for those.
          </p>
        )}
      </div>
    </div>
  );
}
