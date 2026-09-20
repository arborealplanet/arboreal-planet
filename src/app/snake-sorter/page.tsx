import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { SnakeSorterWorkspace } from "@/components/SnakeSorterWorkspace";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export const metadata = {
  title: "Snake Sorter",
  robots: { index: false, follow: false },
};

export default async function SnakeSorterPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/login?next=/snake-sorter");

  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") notFound();

  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 pt-7 sm:px-6 sm:pt-9">
        <div className="overflow-hidden rounded-[34px] border border-emerald-300/10 bg-[radial-gradient(circle_at_50%_0%,rgba(74,222,128,.09),transparent_42%),rgba(0,0,0,.12)] p-5 shadow-[0_30px_80px_rgba(0,0,0,.22)] sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[30px] border border-white/10 bg-white p-2 shadow-[0_24px_70px_rgba(0,0,0,.35)] sm:max-w-[410px] sm:p-3">
              <Image
                src="/branding/snake-sorter-logo.svg"
                alt="Snake Sorter — Identify, Classify, Sort, Conserve"
                width={384}
                height={384}
                priority
                unoptimized
                className="h-auto w-full"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/65">Visual identification system</span>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-amber-100/70">★ Owner only</span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-[-.035em] text-white/90 sm:text-4xl">Snake Sorter Laboratory</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38 sm:text-[15px]">
              Private Green Tree Python identification workspace for image, video, and live-camera analysis, curated reference data, model review, and dataset training.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-semibold uppercase tracking-[.11em] text-white/24">
              <span>Quick Scan</span>
              <span className="text-emerald-300/35">•</span>
              <span>Deep Scan</span>
              <span className="text-emerald-300/35">•</span>
              <span>Live Guide</span>
              <span className="text-emerald-300/35">•</span>
              <span>Reference Lab</span>
            </div>
          </div>
        </div>
      </section>
      <SnakeSorterWorkspace />
    </main>
  );
}
