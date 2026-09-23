import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { AnimalRecordTabs } from "@/components/AnimalRecordTabs";

export default function GreenTreePythonPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database · Pythonidae"
        title="Green Tree Python"
        description="The Green Tree Python reference record connects subspecies, locality, husbandry, breeding, lineage and keeper discovery without mixing seller or community claims into reference facts."
        aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Reference species</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-6">
        <div className="mb-4 text-xs text-white/26"><Link href="/animals" className="hover:text-emerald-200">Animal Database</Link> <span className="mx-2">/</span> Green Tree Python</div>
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="relative grid min-h-[390px] overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative z-10 p-7 sm:p-9">
              <div className="text-xs italic text-white/35">Morelia viridis complex</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">One animal record. One shared structure.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">Taxonomy, localities, husbandry and breeding live in the reference record. Listings stay in Marketplace, pedigrees stay in Genetics, and keeper discussion stays in Community.</p>
              <div className="mt-7 grid max-w-lg grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {["4 reference groups", "13 localities", "Pedigree-linked", "8 record sections"].map((item) => <div key={item} className="rounded-xl border border-white/[.07] bg-black/10 px-3 py-2 text-center font-semibold text-white/42">{item}</div>)}
              </div>
            </div>
            <div className="relative min-h-[340px] overflow-hidden border-t border-white/[.06] bg-[radial-gradient(circle_at_55%_35%,rgba(57,230,125,.10),transparent_38%),#06100c] p-6 lg:border-l lg:border-t-0 sm:p-8">
              <div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/55">Reference structure</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["M. a. azurea", "Biak · Numfor"],
                  ["M. a. pulcher", "Manokwari · Arfak · Sorong · Timika · Kofiau"],
                  ["M. a. utaraensis", "Cyclops · Jayapura · Lereh · Wamena · Yapen"],
                  ["M. viridis", "Aru · Merauke"],
                ].map(([taxon, localities]) => (
                  <div key={taxon} className="rounded-2xl border border-white/[.06] bg-black/18 p-4">
                    <div className="text-sm font-semibold text-white/72">{taxon}</div>
                    <div className="mt-2 text-[11px] leading-5 text-white/34">{localities}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.03] p-4 text-xs leading-5 text-white/40">
                Custom Green Tree Python hero artwork will live here without changing the reference structure around it.
              </div>
            </div>
          </div>

          <div className="grid border-t border-white/[.06] sm:grid-cols-3">
            <Link href="/genetics" className="border-b border-white/[.055] p-5 transition hover:bg-emerald-300/[.025] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-300/55">Genetics & lineage</div><div className="mt-2 font-semibold">Open Genetics Hub ↗</div><p className="mt-1 text-xs text-white/30">Ancestry tools, pedigrees and permanent animal records.</p></Link>
            <Link href="/marketplace" className="border-b border-white/[.055] p-5 transition hover:bg-white/[.02] sm:border-b-0 sm:border-r"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Available animals</div><div className="mt-2 font-semibold">Browse Marketplace</div><p className="mt-1 text-xs text-white/30">Listings remain separate from reference facts.</p></Link>
            <Link href="/community" className="p-5 transition hover:bg-white/[.02]"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-white/28">Keeper knowledge</div><div className="mt-2 font-semibold">Community discussions</div><p className="mt-1 text-xs text-white/30">Questions, posts and breeding discussion.</p></Link>
          </div>
        </div>
      </section>

      <AnimalRecordTabs />

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-3 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/[.07] bg-white/[.018] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="section-kicker">Reference architecture</div><p className="mt-2 max-w-3xl text-sm leading-6 text-white/38">The record tabs are now functional. As we add verified species content, each section can grow independently without turning the page into one giant wall of information.</p></div>
          <Link href="/genetics/database" className="w-fit rounded-xl border border-emerald-300/15 bg-emerald-300/[.055] px-4 py-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-300/[.09]">OPEN PEDIGREE DATABASE →</Link>
        </div>
      </section>
    </main>
  );
}
