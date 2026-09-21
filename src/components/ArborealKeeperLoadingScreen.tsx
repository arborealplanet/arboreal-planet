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
        className="h-full w-full object-contain"
        src="/branding/arboreal-keeper-loading.mp4?v=2026-09-21-exact-v4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        aria-hidden="true"
      />
      <span className="sr-only">{message}</span>
    </div>
  );
}
