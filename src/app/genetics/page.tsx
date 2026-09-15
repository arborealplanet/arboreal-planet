import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GtpGeneticsHub } from "@/components/GtpGeneticsHub";

export default function GeneticsCalculatorPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Green Tree Python Genetics Hub"
        title="Calculate ancestry. Build pedigrees. Track real lineages."
        description="Use the subspecies calculator for education, maintain private cloud pedigree records, document pairings and producer credits, or explore the opt-in public Green Tree Python lineage database."
        aside={<div className="flex flex-wrap gap-2"><Link href="/genetics/database" className="secondary-action">Public lineage database →</Link><Link href="/animals/green-tree-python" className="secondary-action">GTP reference →</Link></div>}
      />
      <GtpGeneticsHub />
    </main>
  );
}
