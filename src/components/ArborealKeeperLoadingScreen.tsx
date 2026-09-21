"use client";

import Image from "next/image";

export function ArborealKeeperLoadingScreen({
  message = "Loading save file…",
}: {
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[#020604] text-white"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="absolute inset-0">
        <Image
          src="/branding/chondro-breeder-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,.10),rgba(2,6,4,.72)_48%,rgba(2,6,4,.96)_100%)]" />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
      </div>

      <div className="relative mx-auto w-full max-w-md px-6 text-center">
        <div className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-200/58">
          Arboreal Planet
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-[-.05em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,.7)] sm:text-5xl">
          Arboreal Keeper
        </h1>
        <p className="mt-3 text-sm font-medium text-white/62">{message}</p>

        <div className="mx-auto mt-6 h-1.5 w-56 overflow-hidden rounded-full border border-white/[.08] bg-white/[.07]">
          <div className="arboreal-keeper-loadbar h-full rounded-full bg-gradient-to-r from-emerald-500/45 via-emerald-200 to-emerald-500/45" />
        </div>
      </div>

      <style jsx>{`
        .arboreal-keeper-loadbar {
          width: 38%;
          animation: keeper-load 0.9s ease-in-out infinite;
        }

        @keyframes keeper-load {
          0% {
            transform: translateX(-105%);
          }
          50% {
            transform: translateX(85%);
          }
          100% {
            transform: translateX(265%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .arboreal-keeper-loadbar {
            width: 100%;
            animation: none;
            opacity: 0.72;
          }
        }
      `}</style>
    </div>
  );
}
