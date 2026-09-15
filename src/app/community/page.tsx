import { PageIntro } from "@/components/AppShell";
import { CommunityComposer } from "@/components/CommunityComposer";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityTopicButtons } from "@/components/CommunityTopicButtons";

const topics=["Green Tree Pythons","Boiga","Tree Monitors","Nepenthes","Breeding","Husbandry","Enclosures"] as const;

export default async function CommunityPage({searchParams}:{searchParams:Promise<{keeper?:string;q?:string}>}){const params=await searchParams;const initial=((params.keeper??params.q)??"").trim().slice(0,120);return <main>
  <PageIntro eyebrow="Community" title="Keeper posts, questions and breeding updates." description="Share husbandry notes, photos, questions and project updates. Browse the public Explore feed or switch to posts from keepers you follow." aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/70">Explore · Following</div>}/>
  <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.5fr)]">
    <div className="min-w-0 space-y-4">
      <CommunityComposer/>
      <CommunityFeed initialQuery={initial}/>
    </div>
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <div className="panel rounded-[26px] p-5">
        <div className="section-kicker">Browse topics</div>
        <p className="mt-2 text-xs leading-5 text-white/32">Jump straight into the live feed by subject.</p>
        <div className="mt-4"><CommunityTopicButtons topics={topics}/></div>
      </div>
      <div className="panel-soft rounded-[26px] p-5">
        <div className="section-kicker">Community features</div>
        <div className="mt-4 grid gap-3 text-xs leading-5 text-white/48">
          <div>Comments, replies and reactions</div>
          <div>Photo uploads and video links</div>
          <div>Keeper follows and saved posts</div>
          <div>Editing, removal and reporting</div>
        </div>
      </div>
      <div className="rounded-[26px] border border-emerald-300/10 bg-emerald-300/[.035] p-5">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/65">Linked records</div>
        <p className="mt-3 text-sm leading-6 text-white/48">Community posts can connect to species and plant records without mixing user-submitted content into reference data.</p>
      </div>
    </aside>
  </section>
</main>}
