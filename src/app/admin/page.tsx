import { notFound, redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { AdminAccountDeletionReview } from "@/components/AdminAccountDeletionReview";
import { AdminCommunityModeration } from "@/components/AdminCommunityModeration";
import { AdminEventReview } from "@/components/AdminEventReview";
import { AdminGtpPedigreeReports } from "@/components/AdminGtpPedigreeReports";
import { AdminJournalEditor } from "@/components/AdminJournalEditor";
import { AdminReferenceEditor } from "@/components/AdminReferenceEditor";
import { AdminSellerVerification } from "@/components/AdminSellerVerification";
import { OwnerConsoleOverview } from "@/components/OwnerConsoleOverview";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

const adminSections=[
  ["Journal","journal"],["Events","events"],["Sellers","sellers"],["Pedigrees","pedigrees"],["References","references"],["Accounts","accounts"],["Moderation","moderation"]
] as const;

export default async function AdminPage(){
  const identity=await getServerIdentity();
  if(!identity) redirect("/login?next=/admin");
  const profile=await fetchOwnProfile(identity.token,identity.user.id) as {role?:string}|null;
  if(!profile || !["admin","owner"].includes(profile.role??"")) notFound();

  return <main>
    <PageIntro
      eyebrow="Administration"
      title="Arboreal Planet administration"
      description="Private moderation, publishing, event review, seller verification, lineage review, account requests and reference tools for authorized Arboreal Planet staff. Unauthorized accounts receive a 404 for this route."
      aside={<div className="rounded-full border border-amber-300/15 bg-amber-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-100/65">{profile.role}</div>}
    />

    {profile.role==="owner"&&<OwnerConsoleOverview/>}

    <nav aria-label="Admin sections" className="mx-auto mb-8 flex max-w-7xl gap-2 overflow-x-auto px-5 sm:px-6">
      {adminSections.map(([label,id])=><a key={id} href={`#${id}`} className="shrink-0 rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.08em] text-white/45 transition hover:border-emerald-300/18 hover:text-emerald-100/70">{label}</a>)}
    </nav>

    <section id="journal" className="scroll-mt-28 mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5 panel rounded-3xl p-6">
        <div className="section-kicker">Journal publishing</div>
        <h2 className="mt-3 text-2xl font-semibold">Learn / Arboreal Planet Journal</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">Create drafts, preview editorial content, attach sources, connect pieces to animal or plant records, publish finished work and archive older pieces without touching the database directly.</p>
      </div>
      <AdminJournalEditor/>
    </section>

    <section id="events" className="scroll-mt-28 mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5 panel rounded-3xl p-6">
        <div className="section-kicker">Shows & Events</div>
        <h2 className="mt-3 text-2xl font-semibold">Event suggestion review</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">Verify submitted event details against the original source before publishing. Approval publishes the event and closes the submission in one transactional action.</p>
      </div>
      <AdminEventReview/>
    </section>

    <section id="sellers" className="scroll-mt-28 mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5 panel rounded-3xl p-6">
        <div className="section-kicker">Seller verification</div>
        <h2 className="mt-3 text-2xl font-semibold">Seller approval queue</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">Review seller requests before a keeper can create marketplace listings. Approval is server-enforced, not just hidden in the interface.</p>
      </div>
      <AdminSellerVerification/>
    </section>

    <section id="pedigrees" className="scroll-mt-28 mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5 panel rounded-3xl p-6">
        <div className="section-kicker">Lineage database</div>
        <h2 className="mt-3 text-2xl font-semibold">Pedigree correction queue</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">Review possible duplicates, parentage issues and other corrections submitted against public Green Tree Python records. Resolving a report never rewrites lineage automatically; staff can mark a record reviewed after checking it.</p>
      </div>
      <AdminGtpPedigreeReports/>
    </section>

    <section id="references" className="scroll-mt-28 mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5 panel rounded-3xl p-6">
        <div className="section-kicker">Reference publishing</div>
        <h2 className="mt-3 text-2xl font-semibold">Animal and plant reference editor</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">Edit overview text, tags, husbandry, breeding, taxonomy, natural-history and cultivation fields without changing site code. Empty fields remain marked as pending on the public record.</p>
      </div>
      <AdminReferenceEditor/>
    </section>

    <section id="accounts" className="scroll-mt-28 mx-auto max-w-7xl px-5 pb-12 sm:px-6">
      <div className="mb-5 panel rounded-3xl p-6">
        <div className="section-kicker">Account requests</div>
        <h2 className="mt-3 text-2xl font-semibold">Account deletion review</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/38">Review deletion requests before any irreversible account action. Use the processing states to document checks around public content, marketplace history and lineage attribution; this queue deliberately does not perform a hard account deletion.</p>
      </div>
      <AdminAccountDeletionReview/>
    </section>

    <section id="moderation" className="scroll-mt-28 mx-auto max-w-7xl px-5 pb-16 sm:px-6">
      <div className="mb-5 panel rounded-3xl p-6">
        <div className="section-kicker">Community moderation</div>
        <h2 className="mt-3 text-2xl font-semibold">Report review queue</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/38">Review member reports, dismiss reports that do not require action, or hide posts that violate moderation rules. These controls remain behind the server-side admin and owner role check.</p>
      </div>
      <AdminCommunityModeration/>
    </section>
  </main>;
}
