import Image from "next/image";
import { SnakeSorterInstallButton } from "@/components/SnakeSorterInstallButton";

export default function SnakeSorterInstallPage() {
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 py-10 text-center">
    <Image src="/branding/snake-sorter-app-icon-512.png" alt="Snake Sorter" width={192} height={192} priority className="rounded-3xl" />
    <h1 className="text-4xl font-bold">Snake Sorter</h1>
    <p className="text-white/70">Your private snake identification app. Launch directly from its own home-screen icon.</p>
    <SnakeSorterInstallButton prominent />
    <a href="/snake-sorter" className="rounded-xl border border-white/20 px-6 py-3">Open Snake Sorter</a>
    <p className="text-sm text-white/55">Install from Chrome or Safari, not from inside the Arboreal Planet app. The installation confirmation should say Snake Sorter.</p>
  </main>;
}
