import Image from "next/image";

export default function ArcadeLoading() {
  return (
    <main className="grid min-h-[65vh] place-items-center px-5 py-16" aria-label="Loading Arboreal Arcade">
      <div className="text-center">
        <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-[24px] border border-emerald-300/20 shadow-[0_0_60px_rgba(52,211,153,.16)]">
          <Image src="/branding/arboreal-planet-app-icon.webp" alt="" fill sizes="96px" className="object-cover" priority />
          <div className="absolute inset-0 animate-pulse rounded-[24px] ring-2 ring-inset ring-emerald-200/25" />
        </div>
        <div className="mt-6 text-[10px] font-black uppercase tracking-[.24em] text-emerald-200/65">Entering Arboreal Arcade</div>
        <div className="mx-auto mt-4 h-1 w-36 overflow-hidden rounded-full bg-white/[.06]">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-200/80" />
        </div>
      </div>
    </main>
  );
}
