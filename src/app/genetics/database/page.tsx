import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { GtpPublicLineageDatabase } from "@/components/GtpPublicLineageDatabase";

export default function PublicGtpLineageDatabasePage() {
  return (
    <main>
      <PageIntro
        eyebrow="Public Database"
        title="Green Tree Python lineage database."
        description="Browse keeper-published pedigree records by animal name, ID, locality label and subspecies grouping. Private pedigree records never appear here."
        aside={<Link href="/genetics" className="secondary-action">Open genetics tools →</Link>}
      />
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:pb-20">
        <GtpPublicLineageDatabase />
      </section>
    </main>
  );
}
