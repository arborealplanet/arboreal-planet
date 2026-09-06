import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GreenTreePythonArt } from "@/components/ArborealArt";

const coming = ["Emerald Tree Boa", "Boiga", "Tree Monitors", "Dart Frogs", "Nepenthes-linked habitat records"];

export default function AnimalsPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Animal Database"
        title="Species records built to connect the platform."
        description="Animal pages combine taxonomy, locality structure, keeper knowledge, husbandry, breeding context and links to relevant marketplace and Snake Stocks data without turning community claims into database facts."
        aside={<div className="rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">1 published record</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="grid lg:grid-cols-[1fr_1fr]">
            <Link href="/animals/green-tree-python" className="group relative min-h-[390px] overflow-hidden border-b border-white/[.06] bg-[radial-gradient(circle_at_56%_42%,rgba(57,230,125,.11),transparent_34%),#08130e] lg:border-b-0 lg:border-r">
              <div className="absolute inset-0 grid-surface opacity-25" />
              <div className="absolute inset-x-0 bottom-0 h-[88%]"><GreenTreePythonArt /></div>
              <div className="absolute left-5 top-5 rounded-full border border-emerald-300/15 bg-black/25 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-200/70">Published · Reference species</div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#06100c] via-[#06100c]/85 to-transparent p-6 pt-20">
                <div className="text-xs italic text-white/34">Morelia viridis complex</div>
                <h2 className="mt-1 text-3xl font-semibold">Green Tree Python</h2>
                <div className="mt-3 text-xs font-bold text-emerald-300/70 transition group-hover:text-emerald-200">OPEN ANIMAL RECORD →</div>
              </div>
            </Link>

            <div className="p-6 sm:p-8">
              <div className="section-kicker">Why this one first</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em]">One species all the way through.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/42">Green Tree Python is the reference implementation for locality, origin normalization, Animal Database, Marketplace linking, community context and Snake Stocks. The goal is to make one species work properly before multiplying half-finished records.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[["Localities", "Biak · Wamena · Manokwari · Aru · more"],["Public origins", "Captive Bred · Import"],["Market variables", "Locality · sex · age · neonate color"],["Cross-links", "Snake Stocks · Marketplace · Community"]].map(([label,value]) => <div key={label} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-sm leading-5 text-white/50">{value}</div></div>)}
              </div>
              <div className="mt-7 flex flex-wrap gap-3"><Link href="/animals/green-tree-python" className="rounded-xl bg-emerald-300 px-4 py-3 text-xs font-bold text-[#06100c]">Explore Green Tree Python</Link><Link href="/snake-stocks" className="rounded-xl border border-white/[.08] px-4 py-3 text-xs font-bold text-white/50">Open Snake Stocks</Link></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-black/[.12]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <div className="section-kicker">Database expansion</div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><h2 className="text-2xl font-semibold">More records come after the reference pipeline works.</h2><span className="text-xs text-white/25">No fake published records</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {coming.map((name) => <div key={name} className="panel-soft min-h-36 rounded-3xl p-5"><div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.06] text-white/15">◇</div><div className="mt-5 text-sm font-semibold text-white/45">{name}</div><div className="mt-2 text-[9px] font-bold uppercase tracking-[.13em] text-white/20">Not published yet</div></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}
