import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GtpLocalityConfidenceGuide } from "@/components/GtpLocalityConfidenceGuide";
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
        <GtpLocalityConfidenceGuide />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:pb-20">
        <GtpSubspeciesCalculator />
      </section>
    </main>
  );
}
