import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GtpBreederConfirmations } from "@/components/GtpBreederConfirmations";
import { GtpFamilyTreeMaker } from "@/components/GtpFamilyTreeMaker";
import { GtpLocalityConfidenceGuide } from "@/components/GtpLocalityConfidenceGuide";
import { GtpPedigreeCloudSync } from "@/components/GtpPedigreeCloudSync";
import { GtpPedigreePublishing } from "@/components/GtpPedigreePublishing";
import { GtpPedigreeTransfers } from "@/components/GtpPedigreeTransfers";
import { GtpRegisteredParentLinker } from "@/components/GtpRegisteredParentLinker";
import { GtpSubspeciesCalculator } from "@/components/GtpSubspeciesCalculator";

export default function GeneticsCalculatorPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Education Tool"
        title="Green Tree Python genetics calculator & family tree maker."
        description="Calculate subspecies ancestry, then build a real pedigree with names, locality labels, parent links and keeper notes. No phenotype or trait predictions are included."
        aside={<div className="flex flex-wrap gap-2"><Link href="/genetics/database" className="secondary-action">Public lineage database →</Link><Link href="/animals/green-tree-python" className="secondary-action">Open GTP reference →</Link></div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <GtpLocalityConfidenceGuide />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <GtpSubspeciesCalculator />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-6">
        <GtpPedigreeCloudSync />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-6">
        <GtpPedigreePublishing />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-6">
        <GtpPedigreeTransfers />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-6">
        <GtpRegisteredParentLinker />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-6">
        <GtpBreederConfirmations />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:pb-20">
        <GtpFamilyTreeMaker />
      </section>
    </main>
  );
}
