import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { HarvestImportRunner, HarvestMediaUpload, StagedMediaBatchUpload } from "@/components/HarvestImportTools";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

export default async function HarvestImportPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/login?next=/admin/harvest-import");
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  // Owner-only: harvest imports write directly to the acquisition pipeline.
  if (!profile || profile.role !== "owner") notFound();

  return (
    <main>
      <PageIntro
        eyebrow="Owner tools"
        title="Harvest import"
        description="Run a Snake Sorter harvest import (MorphMarket or Facebook records) and upload the staged screenshots that belong to it. Imports run with this browser's owner session; uploaded media stays staged pending review and is never promoted from here."
        aside={
          <div className="rounded-full border border-amber-300/15 bg-amber-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">
            owner
          </div>
        }
      />
      <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
        <HarvestImportRunner />
        <HarvestMediaUpload />
        <StagedMediaBatchUpload />
      </div>
    </main>
  );
}
