"use client";

export function ArborealKeeperLoadingScreen({
  message = "Loading save file…",
}: {
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-black text-white"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/branding/arboreal-keeper-loading.mp4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/10" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/48 to-transparent px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24 text-center">
        <p className="text-[11px] font-semibold tracking-[.08em] text-white/72">{message}</p>
        <div className="mx-auto mt-3 h-1 w-40 overflow-hidden rounded-full bg-white/20">
          <div className="arboreal-keeper-loadbar h-full rounded-full bg-white/90" />
        </div>
      </div>

      <style jsx>{`
        .arboreal-keeper-loadbar {
          width: 34%;
          animation: keeper-load 0.85s ease-in-out infinite;
        }

        @keyframes keeper-load {
          from {
            transform: translateX(-105%);
          }
          to {
            transform: translateX(300%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .arboreal-keeper-loadbar {
            width: 100%;
            animation: none;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
