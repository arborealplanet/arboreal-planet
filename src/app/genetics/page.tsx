import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GtpSubspeciesCalculator } from "@/components/GtpSubspeciesCalculator";

export default function GeneticsCalculatorPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Education Tool"
        title="Green Tree Python subspecies genetics calculator."
        description="Choose parent localities, see which taxon each belongs to, and follow the expected locality and subspecies ancestry through later generations. No phenotype or trait predictions are included."
        aside={<Link href="/animals/green-tree-python" className="secondary-action">Open GTP reference →</Link>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="panel rounded-[30px] p-5 sm:p-7">
          <div className="section-kicker">How to interpret locality labels</div>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Subspecies first. Locality second.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/52">
            Locality can be valuable pedigree information, but it is a much finer claim than subspecies. A locality name is meant to describe where an animal or its founding stock came from. If a captive snake does not have reliable collection history or documented provenance tied to a known place, appearance alone cannot prove that it is Jayapura, Cyclops, Biak, Sorong, or another specific locality.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-[22px] border border-emerald-300/10 bg-emerald-300/[.025] p-5">
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/50">Broader assignment</div>
              <h3 className="mt-2 text-lg font-semibold text-white/78">Subspecies is usually the stronger question.</h3>
              <p className="mt-3 text-xs leading-6 text-white/42">The recognized taxa represent broader evolutionary groups. Their differences are supported by population-level molecular and morphological research, so placing an animal within the correct broader taxon can often be more defensible than assigning it to one exact locality. For animals without documented ancestry, that placement should still be treated as an informed identification rather than absolute proof.</p>
            </article>

            <article className="rounded-[22px] border border-amber-200/10 bg-amber-200/[.025] p-5">
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-amber-100/50">Fine-scale assignment</div>
              <h3 className="mt-2 text-lg font-semibold text-white/78">A locality label needs provenance.</h3>
              <p className="mt-3 text-xs leading-6 text-white/42">The most useful evidence is documented, georeferenced provenance: collection or founding-stock records tied to a known geographic origin, ideally supported by a traceable captive pedigree. Without that evidence, two animals can resemble the same locality while actually coming from different populations.</p>
            </article>

            <article className="rounded-[22px] border border-sky-300/10 bg-sky-300/[.025] p-5">
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-sky-100/50">Where this can go</div>
              <h3 className="mt-2 text-lg font-semibold text-white/78">Better reference data could narrow the map.</h3>
              <p className="mt-3 text-xs leading-6 text-white/42">As more wild-origin samples are tied to precise geographic records and modern genetic testing builds stronger reference datasets, future assignment may become much more precise. With dense enough sampling, genetics may eventually distinguish some local populations with high confidence rather than relying mainly on trade labels or appearance.</p>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/10 p-4 text-xs leading-6 text-white/38">
            <strong className="text-white/62">A good rule for Arboreal Planet:</strong> preserve a documented locality when the pedigree supports it; otherwise describe locality as reported or provisional, and avoid turning a visual resemblance into a definitive geographic claim.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:pb-20">
        <GtpSubspeciesCalculator />
      </section>
    </main>
  );
}
