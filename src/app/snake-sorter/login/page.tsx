import { Suspense } from "react";
import Image from "next/image";
import { AuthPanel } from "@/components/AuthPanel";
import { SnakeSorterInstallButton } from "@/components/SnakeSorterInstallButton";

export default function SnakeSorterLoginPage() {
  return <main className="mx-auto max-w-xl px-5 py-10">
    <Image src="/branding/snake-sorter-app-icon-512.png" alt="Snake Sorter" width={128} height={128} className="mx-auto rounded-3xl" priority />
    <h1 className="mt-5 text-center text-3xl font-bold">Snake Sorter</h1>
    <p className="my-5 text-center text-sm text-white/65">Sign in directly to your private sorter with your existing account. Owner approval and your security unlock are still required.</p>
    <div className="mb-6 text-center"><SnakeSorterInstallButton prominent /></div>
    <Suspense><AuthPanel appName="Snake Sorter" destination="/snake-sorter" /></Suspense>
  </main>;
}
