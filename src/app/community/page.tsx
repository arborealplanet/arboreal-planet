import Link from "next/link";
import { PageIntro } from "@/components/AppShell";
import { CommunityComposer } from "@/components/CommunityComposer";
import { CommunityFeed } from "@/components/CommunityFeed";
import { HankScaleIntroButton } from "@/components/HankScaleIntroButton";
import { SubjectFollowButton } from "@/components/SubjectFollowButton";
import { COMMUNITY_SECTION_GROUPS, normalizeCommunitySection } from "@/lib/community-sections";

export default async function CommunityPage({searchParams}:{searchParams:Promise<{keeper?:string;q?:string;section?:string}>}){
  const params=await searchParams;
  const initial=((params.keeper??params.q)??"").trim().slice(0,120);
  const initialSection=normalizeCommunitySection(params.section)??"";

  return <main>
    <PageIntro
      eyebrow="Community"
      title="Keeper posts, questions and breeding updates."
      description="Share husbandry notes, photos, questions and project updates. Browse Explore, filter by section, or switch to posts from keepers, animals, plants, topics and sections you follow."
      aside={<div className="flex flex-wrap gap-2"><HankScaleIntroButton src="/audio/hank-scale/community-intro.mp3" label="Play Hank Scale's community intro" /><Link href="/interests" className="secondary-action">Tune Following</Link><div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/70">Explore · Following</div></div>}
    />
    <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.5fr)]">
      <div className="min-w-0 space-y-4">
        <CommunityComposer/>
        <CommunityFeed initialQuery={initial} initialSection={initialSection}/>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="panel rounded-[26px] p-5">
          <div className="section-kicker">Browse & follow sections</div>
          <p className="mt-2 text-xs leading-5 text-white/32">Open a section in Explore or follow it so matching posts can enter your Following feed.</p>
          <div className="mt-5 space-y-5">
            {COMMUNITY_SECTION_GROUPS.map((group)=><div key={group.key}>
              <div className="mb-2 text-[9px] font-black uppercase tracking-[.16em] text-emerald-300/50">{group.heading}</div>
              <div className="grid gap-2">{group.sections.map((section)=><div key={section} className="flex items-center gap-2">
                <Link href={`/community?section=${encodeURIComponent(section)}`} className="min-w-0 flex-1 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2 text-left text-[11px] font-medium text-white/52 transition hover:border-emerald-300/20 hover:bg-emerald-300/[.035] hover:text-emerald-100/70">{section}</Link>
                <SubjectFollowButton type="SECTION" subjectKey={section} label="Follow"/>
              </div>)}</div>
            </div>)}
          </div>
          <Link href="/interests" className="mt-5 block text-xs font-bold text-emerald-200/55">Manage all interests →</Link>
        </div>
        <div className="panel-soft rounded-[26px] p-5">
          <div className="section-kicker">Community features</div>
          <div className="mt-4 grid gap-3 text-xs leading-5 text-white/48">
            <div>Comments, replies and reactions</div>
            <div>Photo uploads and video links</div>
            <div>Follow keepers, animals, plants, topics and sections</div>
            <div>Editing, removal and reporting</div>
          </div>
        </div>
        <div className="rounded-[26px] border border-emerald-300/10 bg-emerald-300/[.035] p-5">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/65">Linked records</div>
          <p className="mt-3 text-sm leading-6 text-white/48">Community posts can connect to species and plant records without mixing user-submitted content into reference data.</p>
        </div>
      </aside>
    </section>
  </main>;
}
