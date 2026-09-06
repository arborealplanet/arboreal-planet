import { PageIntro } from "@/components/AppShell";

const topics = ["Green Tree Pythons", "Boiga", "Tree Monitors", "Nepenthes", "Breeding", "Husbandry", "Enclosures"];

export default function CommunityPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Community"
        title="Keeper activity with useful context."
        description="Follow people, animals, plants and topics. Share questions, breeding updates, photos, videos, husbandry notes and discussions without burying the useful stuff under a generic social feed."
        aside={<button className="rounded-xl bg-emerald-300 px-4 py-3 text-xs font-bold text-[#06100c]">Create post</button>}
      />

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-14 sm:px-6 lg:grid-cols-[.72fr_1.45fr_.83fr]">
        <aside className="space-y-4">
          <div className="panel rounded-3xl p-5">
            <div className="section-kicker">Feed</div>
            <div className="mt-4 space-y-1 text-sm">
              {["Following", "Explore", "Saved", "Questions", "Breeding updates"].map((item, index) => <div key={item} className={`rounded-xl px-3 py-2.5 ${index === 0 ? "bg-emerald-300/[.07] font-semibold text-emerald-200" : "text-white/42"}`}>{item}</div>)}
            </div>
          </div>
          <div className="panel rounded-3xl p-5">
            <div className="section-kicker">Topics</div>
            <div className="mt-4 flex flex-wrap gap-2">{topics.map((topic) => <span key={topic} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-[11px] text-white/38">{topic}</span>)}</div>
          </div>
        </aside>

        <div className="space-y-4">
          {["Keeper update", "Husbandry discussion", "Breeding note"].map((type, index) => (
            <article key={type} className="panel overflow-hidden rounded-3xl">
              <div className="flex items-center gap-3 p-5">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-white/[.07] bg-white/[.025] text-xs text-white/22">○</div>
                <div><div className="text-sm font-semibold text-white/62">{type}</div><div className="mt-1 text-[10px] uppercase tracking-[.12em] text-white/22">Interface preview · real accounts later</div></div>
              </div>
              {index === 0 ? <div className="grid-surface grid h-64 place-items-center border-y border-white/[.06] bg-emerald-300/[.015]"><div className="text-center"><div className="text-3xl text-white/10">◇</div><div className="mt-2 text-xs text-white/20">Keeper media area</div></div></div> : null}
              <div className="p-5">
                <div className="h-3 w-5/6 rounded-full bg-white/[.055]" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-white/[.035]" />
                <div className="mt-5 flex gap-5 border-t border-white/[.055] pt-4 text-[11px] font-semibold text-white/26"><span>♡ React</span><span>○ Comment</span><span>↗ Share</span><span>◇ Save</span></div>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="panel rounded-3xl p-5">
            <div className="section-kicker">Keeper spaces</div>
            <div className="mt-4 space-y-3">{["Green Tree Python", "Carnivorous Plants", "Arboreal Enclosures"].map((space) => <div key={space} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-4"><div className="text-sm font-semibold">{space}</div><div className="mt-1 text-xs text-white/26">Follow topic</div></div>)}</div>
          </div>
          <div className="rounded-3xl border border-emerald-300/10 bg-emerald-300/[.035] p-5">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300/60">Database-aware posts</div>
            <p className="mt-3 text-sm leading-6 text-white/38">Posts can eventually attach to species, localities, individual animals, plants and marketplace listings without becoming database facts themselves.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
