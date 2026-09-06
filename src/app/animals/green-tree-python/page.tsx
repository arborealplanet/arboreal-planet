import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GreenTreePythonArt, PitcherPlantArt } from "@/components/ArborealArt";
import { AnimalRecordTabs } from "@/components/AnimalRecordTabs";

export default function GreenTreePythonPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database · Pythonidae"
        title="Green Tree Python"
        description="The Green Tree Python reference record uses the same subspecies, locality and origin structure as Snake Stocks so biology, market structure and discovery stay connected without becoming the same dataset."
        aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Reference species</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-6">
        <div className="mb-4 text-xs text-white/26"><Link href="/animals" className="hover:text-emerald-200">Animal Database</Link> <span className="mx-2">/</span> Green Tree Python</div>
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="relative grid min-h-[390px] overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative z-10 p-7 sm:p-9">
              <div className="text-xs italic text-white/35">Morelia viridis complex</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">One animal record. One shared structure.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">Taxonomy, localities, husbandry and breeding live in the reference record. Market evidence stays inside Snake Stocks, listings stay in Marketplace, and keeper discussion stays in Community.</p>
              <div className="mt-7 grid max-w-lg grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {["4 market groups", "13 localities", "2 public origins", "8 record sections"].map((item) => <div key={item} className="rounded-xl border border-white/[.07] bg-black/10 px-3 py-2 text-center font-semibold text-white/42">{item}</div>)}
              </div>
            </div>
            <div className="grid-surface relative min-h-[340px] overflow-hidden border-t border-white/[.06] bg-emerald-300/[.025] lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_44%,rgba(57,230,125,.12),transparent_36%)]" />
              <div className="absolute bottom-0 left-0 right-0 h-[95%]"><GreenTreePythonArt /></div>
              <div className="absolute bottom-0 right-2 h-44 w-36 opacity-60"><PitcherPlantArt /></div>
              <div className="absolute left-5 top-5 rounded-full border border-emerald-300/15 bg-black/25 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-emerald-200/60">Stylized reference art</div>
            </div>
          </div>

          <div className="grid border-t border-white/[.06] sm:grid-cols-3">
            <Link href="/snake-stocks" className="border-b border-white/[.055] p-5 transition hover:bg-emerald-300/[.025] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-300/55">Market intelligence</div><div className="mt-2 font-semibold">Open Snake Stocks ↗</div><p className="mt-1 text-xs text-white/30">Captive Bred / Import market structure.</p></Link>
            <Link href="/marketplace" className="border-b border-white/[.055] p-5 transition hover:bg-white/[.02] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Available animals</div><div className="mt-2 font-semibold">Browse Marketplace</div><p className="mt-1 text-xs text-white/30">Listings remain separate from reference facts.</p></Link>
            <Link href="/community" className="p-5 transition hover:bg-white/[.02]"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Keeper knowledge</div><div className="mt-2 font-semibold">Community discussions</div><p className="mt-1 text-xs text-white/30">Questions, posts and breeding discussion.</p></Link>
          </div>
        </div>
      </section>

      <AnimalRecordTabs />

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-3 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/[.07] bg-white/[.018] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="section-kicker">Reference architecture</div><p className="mt-2 max-w-3xl text-sm leading-6 text-white/38">The record tabs are now functional. As we add verified species content, each section can grow independently without turning the page into one giant wall of information.</p></div>
          <Link href="/snake-stocks" className="w-fit rounded-xl border border-emerald-300/15 bg-emerald-300/[.055] px-4 py-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-300/[.09]">OPEN SNAKE STOCKS →</Link>
        </div>
      </section>
    </main>
  );
}
