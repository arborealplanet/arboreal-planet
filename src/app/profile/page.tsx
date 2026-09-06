import { PageIntro } from "@/components/AppShell";

export default function ProfilePage() {
  return (
    <main>
      <PageIntro
        eyebrow="Profile"
        title="Your corner of Arboreal Planet."
        description="Profiles are designed for keepers, breeders, sellers and plant people without forcing everyone into the same identity. Banner, avatar, accent color, bio, social links, privacy and seller information all have a place."
        aside={<button className="rounded-xl border border-white/[.08] bg-white/[.025] px-4 py-3 text-xs font-bold text-white/55">Edit profile</button>}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6">
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="relative h-48 overflow-hidden bg-[radial-gradient(circle_at_25%_50%,rgba(57,230,125,.18),transparent_30%),linear-gradient(110deg,#0b2117,#07100c_58%,#102b1c)] sm:h-56">
            <div className="absolute inset-0 grid-surface opacity-30" />
            <div className="absolute right-5 top-5 rounded-full border border-white/[.08] bg-black/20 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-white/32">Banner image area</div>
          </div>
          <div className="relative p-6 sm:p-8">
            <div className="-mt-20 grid h-28 w-28 place-items-center rounded-full border-[6px] border-[#07110d] bg-[#10251a] text-2xl font-black text-emerald-300/45 shadow-xl">AP</div>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold">Keeper Profile</h2>
                <div className="mt-1 text-sm text-white/30">@username · Location optional</div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/38">Bio, keeper focus, breeder information and social links will populate from the connected profile record.</p>
              </div>
              <div className="flex flex-wrap gap-2">{["Keeper", "Breeder", "Seller"].map((item) => <span key={item} className="rounded-full border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white/35">{item}</span>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-6 lg:grid-cols-[.78fr_1.22fr]">
        <div className="space-y-5">
          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Customization</div>
            <h2 className="mt-3 text-xl font-semibold">Make the profile yours.</h2>
            <div className="mt-5 space-y-4">
              <div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/24">Accent color</div><div className="mt-3 flex gap-2">{["bg-emerald-300","bg-cyan-300","bg-amber-200","bg-violet-300","bg-rose-300"].map((color) => <span key={color} className={`h-7 w-7 rounded-full border-2 border-[#07110d] ring-1 ring-white/10 ${color}`} />)}</div></div>
              <div className="border-t border-white/[.055] pt-4"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/24">Banner</div><div className="mt-2 rounded-xl border border-dashed border-white/[.08] px-4 py-4 text-xs text-white/26">Upload or choose profile banner</div></div>
              <div className="border-t border-white/[.055] pt-4"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-white/24">Avatar</div><div className="mt-2 rounded-xl border border-dashed border-white/[.08] px-4 py-4 text-xs text-white/26">Upload profile picture</div></div>
            </div>
          </div>

          <div className="panel rounded-3xl p-6">
            <div className="section-kicker">Privacy</div>
            <div className="mt-4 space-y-3 text-sm">
              {["Public profile", "Follower-only animal records", "Private breeder records", "Message permissions"].map((item) => <div key={item} className="flex items-center justify-between rounded-xl border border-white/[.055] px-4 py-3"><span className="text-white/42">{item}</span><span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/24">Configure</span></div>)}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel rounded-3xl p-6">
            <div className="flex items-end justify-between"><div><div className="section-kicker">Profile activity</div><h2 className="mt-3 text-2xl font-semibold">Animals, posts and marketplace history.</h2></div><span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/22">Backend pending</span></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Animals","—"],["Followers","—"],["Listings","—"]].map(([label,value]) => <div key={label} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-5"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/22">{label}</div><div className="mt-2 text-2xl font-semibold text-white/48">{value}</div></div>)}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {["Recent posts", "Public animals", "Marketplace listings", "Saved content"].map((item) => <div key={item} className="min-h-36 rounded-2xl border border-white/[.06] bg-white/[.014] p-5"><div className="font-semibold text-white/52">{item}</div><p className="mt-2 text-xs leading-5 text-white/25">This section will populate from real account data.</p></div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-300/10 bg-emerald-300/[.035] p-6">
            <div className="section-kicker">Role security</div>
            <h2 className="mt-3 text-xl font-semibold">Admin tools are not a public profile feature.</h2>
            <p className="mt-3 text-sm leading-6 text-white/38">Owner, admin and moderator access should be enforced server-side. Users without permission should not receive admin controls merely hidden with CSS or client-side checks.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
