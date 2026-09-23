import type { Metadata } from "next";
import Link from "next/link";
import { ArborealsByBunnBadge } from "@/components/BrandVisuals";

export const metadata: Metadata = {
  title: "Arboreals By Bunn",
  description: "Arboreals By Bunn — Green Tree Pythons, Chondro Dojo arboreal enclosures, keeper projects and reptile art.",
};

const enclosureProducts = [
  { name: "Neonate", price: "$74.99", detail: "64-qt setup · upper 1/2 in perch · lower 3/8 in perch · water branch" },
  { name: "Sub-Adult", price: "$84.99", detail: "64-qt setup · upper 1/2 in perch · lower 3/8 in perch · water branch" },
  { name: "Adult", price: "$89.99", detail: "64-qt setup · Arboreal Tri-Perch System · water branch" },
  { name: "Breeder", price: "$99.99", detail: "106-qt setup · Breeder Tri-Perch System · water branch" },
];

const nav = [
  ["About", "#about"],
  ["Animals", "#animals"],
  ["Enclosures", "#enclosures"],
  ["Merch", "#merch"],
  ["Community", "#community"],
  ["Contact", "#contact"],
] as const;

export default function ArborealsByBunnPage() {
  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/[.07] bg-black">
        <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_15%_20%,rgba(34,197,94,.14),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(127,29,29,.16),transparent_30%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,.018)_50%,transparent_100%)]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-8 sm:px-6 lg:pb-14">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] pb-6">
            <Link href="/arboreals-by-bunn" className="min-w-0">
              <div className="font-serif text-3xl font-black tracking-[.08em] text-white sm:text-5xl">ARBOREALS BY BUNN</div>
              <div className="mt-2 text-[9px] font-black uppercase tracking-[.22em] text-emerald-300/55">Green Tree Pythons · Purpose-Built Husbandry</div>
            </Link>
            <Link href="/" className="rounded-full border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/65">
              Arboreal Planet ↗
            </Link>
          </div>

          <nav aria-label="Arboreals By Bunn" className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.12em] text-white/52">
            {nav.map(([label, href]) => (
              <a key={href} href={href} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-2 transition hover:border-emerald-300/20 hover:text-white">
                {label}
              </a>
            ))}
          </nav>

          <div className="grid min-h-[560px] items-center gap-10 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-300/55">Green Tree Pythons · Purpose-Built Husbandry</div>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl font-black leading-[.96] tracking-[-.045em] text-white sm:text-6xl lg:text-7xl">
                Built around the animal.
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
                Thoughtfully raised chondros, field-tested arboreal enclosure systems, and practical support from a keeper with more than fifteen years in reptiles.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#animals" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Explore animals</a>
                <a href="#enclosures" className="rounded-xl border border-white/[.12] bg-white/[.03] px-5 py-3 text-sm font-black text-white/75">See Chondro Dojo</a>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">
              <ArborealsByBunnBadge />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["15+", "years with reptiles"],
                  ["2023", "first GTP clutch"],
                  ["4", "Chondro Dojo sizes"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-[20px] border border-white/[.07] bg-white/[.025] p-4 text-center">
                    <div className="text-2xl font-black text-emerald-200/78">{value}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[.08em] text-white/30">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-28 border-b border-white/[.06] bg-[#050505]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:py-20">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/48">Behind Arboreals By Bunn</div>
            <h2 className="mt-4 font-serif text-4xl font-black tracking-[-.035em]">The keeper, the animals, the daily work.</h2>
          </div>
          <div>
            <p className="text-base leading-8 text-white/55">
              More than fifteen years with reptiles shaped a simple approach: know the animal, keep useful records, and build around what daily care actually demands. The first Green Tree Python clutch arrived in 2023, and the projects continue to grow from there.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Follow each animal", "Red and yellow neonates, developing juveniles, and breeding projects have individual stories."],
                ["Locality-first records", "Locality labels stay visible and seller labels remain provisional when documentation is incomplete."],
                ["Designed from daily use", "Chondro Dojo systems reflect the perch and water layouts used in the collection."],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-[22px] border border-white/[.07] bg-white/[.02] p-5">
                  <h3 className="font-semibold text-white/82">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/38">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="animals" className="scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/48">Projects & availability</div>
            <h2 className="mt-4 font-serif text-4xl font-black tracking-[-.035em]">Animals worth following.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/52">
              Follow current pairings, developing juveniles, and available Green Tree Pythons. Locality information is presented clearly, with transparent records instead of turning seller claims into reference facts.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["Locality-focused", "Red & yellow neonates", "Transparent records", "Green Tree Pythons"].map((item) => (
                <span key={item} className="rounded-full border border-emerald-300/12 bg-emerald-300/[.035] px-3 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-emerald-100/55">{item}</span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/animals/green-tree-python" className="rounded-[24px] border border-white/[.07] bg-white/[.02] p-5 transition hover:border-emerald-300/20">
              <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/48">Reference</div>
              <div className="mt-2 text-xl font-semibold">Green Tree Python</div>
              <p className="mt-2 text-xs leading-5 text-white/38">Open the Arboreal Planet reference record, locality structure and pedigree tools.</p>
            </Link>
            <Link href="/marketplace" className="rounded-[24px] border border-white/[.07] bg-white/[.02] p-5 transition hover:border-emerald-300/20">
              <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300/48">Availability</div>
              <div className="mt-2 text-xl font-semibold">Marketplace</div>
              <p className="mt-2 text-xs leading-5 text-white/38">Browse current Arboreal Planet listings and seller activity.</p>
            </Link>
          </div>
        </div>
      </section>

      <section id="enclosures" className="scroll-mt-28 border-y border-white/[.06] bg-[#050805]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/48">Chondro Dojo</div>
            <h2 className="mt-4 font-serif text-4xl font-black tracking-[-.035em]">Enclosures informed by daily use.</h2>
            <p className="mt-5 text-base leading-8 text-white/52">Clean, modular arboreal systems built around secure perching, accessible water, and simple maintenance.</p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {enclosureProducts.map((product) => (
              <article key={product.name} className="rounded-[26px] border border-white/[.07] bg-black/25 p-6">
                <div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-300/45">Chondro Dojo</div>
                <h3 className="mt-3 text-2xl font-semibold">{product.name}</h3>
                <div className="mt-4 text-3xl font-black text-white">{product.price}</div>
                <p className="mt-4 text-xs leading-5 text-white/38">{product.detail}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs text-white/30">Shipping and heat pads are not included.</p>
        </div>
      </section>

      <section id="merch" className="scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-rose-200/45">Wear the canopy</div>
            <h2 className="mt-4 font-serif text-4xl font-black tracking-[-.035em]">Reptile art beyond the enclosure.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/52">
              All-over-print button-downs, logo apparel, hats, stickers, bags, and more—built from the same animals and botanical language as the brand.
            </p>
          </div>
          <a href="https://arborealsbybunn.printful.me/" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Shop merchandise ↗</a>
        </div>
      </section>

      <section id="community" className="scroll-mt-28 border-y border-white/[.06] bg-[#070707]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/48">The wider canopy</div>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-[-.035em]">Keep up with the work.</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/52">
            Follow the animals, connect with other keepers, and keep Arboreals By Bunn tied directly into the wider Arboreal Planet community.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <Link href="/community" className="rounded-[24px] border border-white/[.07] bg-white/[.02] p-5 transition hover:border-emerald-300/20">
              <div className="text-sm font-bold">Arboreal Planet Community</div>
              <p className="mt-2 text-xs leading-5 text-white/38">Keeper updates, projects, husbandry discussion and breeder activity.</p>
            </Link>
            <Link href="/marketplace" className="rounded-[24px] border border-white/[.07] bg-white/[.02] p-5 transition hover:border-emerald-300/20">
              <div className="text-sm font-bold">Projects & available animals</div>
              <p className="mt-2 text-xs leading-5 text-white/38">Follow public listings and availability through the Arboreal Planet market.</p>
            </Link>
            <Link href="/learn" className="rounded-[24px] border border-white/[.07] bg-white/[.02] p-5 transition hover:border-emerald-300/20">
              <div className="text-sm font-bold">Keeper resources</div>
              <p className="mt-2 text-xs leading-5 text-white/38">Reference material and practical learning across the platform.</p>
            </Link>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
        <div className="rounded-[30px] border border-emerald-300/10 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,.08),transparent_36%),rgba(255,255,255,.018)] p-7 sm:p-10">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/48">Start a conversation</div>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl font-black tracking-[-.035em]">Questions about an animal, enclosure, or collaboration?</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/52">Reach out through Arboreal Planet or follow the latest work as the brand section continues to grow here.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/messages" className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-[#06100c]">Message on Arboreal Planet</Link>
            <Link href="/" className="rounded-xl border border-white/[.10] bg-white/[.025] px-5 py-3 text-sm font-black text-white/70">Explore Arboreal Planet</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[.06] bg-black px-5 py-8 text-center text-xs text-white/28 sm:px-6">
        Arboreals By Bunn · Green Tree Pythons and purpose-built arboreal husbandry.
      </footer>
    </main>
  );
}
