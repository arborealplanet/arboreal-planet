import { PageIntro } from "@/components/AppShell";
import { ProfileCustomizer } from "@/components/ProfileCustomizer";

export default function ProfilePage() {
  return (
    <main>
      <PageIntro
        eyebrow="Profile"
        title="Your corner of Arboreal Planet."
        description="Profiles are designed for keepers, breeders, sellers and plant people without forcing everyone into the same identity. Banner, avatar, accent color, bio, social links, privacy and seller information all have a place."
        aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Live customization preview</div>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <ProfileCustomizer />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-6 lg:grid-cols-[.78fr_1.22fr]">
        <div className="panel rounded-3xl p-6">
          <div className="section-kicker">Privacy</div>
          <h2 className="mt-3 text-xl font-semibold">Control what leaves the profile.</h2>
          <div className="mt-4 space-y-3 text-sm">
            {["Public profile", "Follower-only animal records", "Private breeder records", "Message permissions"].map((item) => <div key={item} className="flex items-center justify-between rounded-xl border border-white/[.055] px-4 py-3"><span className="text-white/42">{item}</span><span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/24">Configure later</span></div>)}
          </div>
        </div>

        <div className="panel rounded-3xl p-6">
          <div className="flex items-end justify-between"><div><div className="section-kicker">Profile activity</div><h2 className="mt-3 text-2xl font-semibold">Animals, posts and marketplace history.</h2></div><span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/22">Backend pending</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Animals","—"],["Followers","—"],["Listings","—"]].map(([label,value]) => <div key={label} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-5"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-2xl font-semibold text-white/48">{value}</div></div>)}</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {["Recent posts", "Public animals", "Marketplace listings", "Saved content"].map((item) => <div key={item} className="min-h-36 rounded-2xl border border-white/[.06] bg-white/[.014] p-5"><div className="font-semibold text-white/52">{item}</div><p className="mt-2 text-xs leading-5 text-white/25">This section will populate from real account data.</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6">
        <div className="rounded-3xl border border-emerald-300/10 bg-emerald-300/[.035] p-6">
          <div className="section-kicker">Role security</div>
          <h2 className="mt-3 text-xl font-semibold">Admin tools are not a public profile feature.</h2>
          <p className="mt-3 text-sm leading-6 text-white/38">Owner, admin and moderator access will be enforced server-side. Users without permission should not receive admin controls merely hidden with CSS or client-side checks.</p>
        </div>
      </section>
    </main>
  );
}
