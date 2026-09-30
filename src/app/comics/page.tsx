import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/AppShell";

export const metadata: Metadata = { title: "Comics", description: "Original reptile humor and comics from Arboreal Planet." };

export default function ComicsPage() {
  return <main>
    <PageIntro eyebrow="Reptile humor" title="The Comics" description="Original reptile comics for keepers and anyone who has ever watched a lizard do absolutely nothing with complete confidence." />
    <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-6">
      <section className="panel rounded-3xl border border-amber-200/20 p-7 sm:p-10">
        <p className="section-kicker">New series</p>
        <h2 className="mt-3 text-3xl font-bold text-white">Big Plans Today</h2>
        <p className="mt-4 max-w-2xl text-white/65">A leopard gecko, an ambitious to-do list, and the irresistible appeal of a warm rock. Our first strip is being prepared for the gallery.</p>
        <p className="mt-5 text-sm text-amber-100/80">New comics planned every other day.</p>
      </section>
      <Link href="/news" className="mt-8 inline-block text-sm font-semibold text-emerald-200 hover:text-white">← Back to news</Link>
    </div>
  </main>;
}
