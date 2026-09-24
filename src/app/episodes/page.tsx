import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/AppShell";
import { EpisodePlayer, formatDuration } from "@/components/EpisodePlayer";
import { EpisodeSubmitForm, EPISODE_SUBMISSIONS_EMAIL } from "@/components/EpisodeSubmitForm";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Episodes | Arboreal Planet",
  description: "Arboreal Planet TV: keeper-made episodes on green tree pythons, plants and the hobby. Submit your episode by email.",
};

export type Episode = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  episode_number: number | null;
  submitted_by: string | null;
  featured: boolean;
  published_at: string | null;
};

const SELECT = "id,slug,title,description,video_url,thumbnail_url,duration_seconds,episode_number,submitted_by,featured,published_at";

async function getEpisodes(): Promise<{ episodes: Episode[]; unavailable: boolean }> {
  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/episodes?status=eq.PUBLISHED&select=${SELECT}&order=published_at.desc&limit=100`,
      { headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}` }, cache: "no-store" },
    );
    if (!response.ok) throw new Error("Episodes unavailable");
    return { episodes: (await response.json()) as Episode[], unavailable: false };
  } catch {
    return { episodes: [], unavailable: true };
  }
}

function episodeMeta(episode: Episode) {
  const parts: string[] = [];
  if (episode.episode_number) parts.push(`Ep. ${episode.episode_number}`);
  if (episode.submitted_by) parts.push(`by ${episode.submitted_by}`);
  const duration = formatDuration(episode.duration_seconds);
  if (duration) parts.push(duration);
  if (episode.published_at) parts.push(new Date(episode.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));
  return parts.join(" · ");
}

export default async function EpisodesPage() {
  const { episodes, unavailable } = await getEpisodes();
  const featured = episodes.find((episode) => episode.featured) ?? episodes[0] ?? null;
  const rest = featured ? episodes.filter((episode) => episode.id !== featured.id) : [];

  return <main>
    <PageIntro
      eyebrow="Arboreal Planet TV"
      title="Episodes: television by keepers, for keepers."
      description="Husbandry walkthroughs, breeding projects, plant builds and field notes — filmed by the community and aired here. New episodes land after review."
      aside={<a href="#submit" className="primary-action">Submit an episode</a>}
    />

    <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
      {unavailable ? <div className="panel rounded-3xl p-8 text-white/60">Episodes are temporarily unavailable. Please check back soon.</div>
        : featured ? <>
          <section className="panel overflow-hidden rounded-[28px]">
            <EpisodePlayer videoUrl={featured.video_url} title={featured.title} />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-[.13em]">
                <span className="rounded-full border border-amber-200/15 bg-amber-200/[.05] px-3 py-1 text-amber-100/70">Now airing</span>
                <span className="text-white/30">{episodeMeta(featured)}</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-.02em] text-white/85 sm:text-3xl">{featured.title}</h2>
              {featured.description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">{featured.description}</p> : null}
              <Link href={`/episodes/${featured.slug}`} className="mt-5 inline-block text-xs font-bold text-emerald-200/60 hover:text-emerald-200">Episode page →</Link>
            </div>
          </section>

          {rest.length ? <section className="mt-10">
            <div className="mb-5"><div className="section-kicker">More episodes</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.025em]">From the station archive</h2></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rest.map((episode) => <Link key={episode.id} href={`/episodes/${episode.slug}`} className="panel interactive-card overflow-hidden rounded-[24px]">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={episode.thumbnail_url ?? "/episodes/station-banner.jpg"} alt="" className="h-44 w-full border-b border-white/[.055] object-cover" />
                  {formatDuration(episode.duration_seconds) ? <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white/80">{formatDuration(episode.duration_seconds)}</span> : null}
                </div>
                <div className="p-5">
                  <div className="text-[8px] font-black uppercase tracking-[.12em] text-emerald-200/55">{episodeMeta(episode) || "Episode"}</div>
                  <h3 className="mt-3 text-lg font-semibold text-white/72">{episode.title}</h3>
                  {episode.description ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/34">{episode.description}</p> : null}
                  <div className="mt-4 text-xs font-bold text-emerald-200/50">Watch →</div>
                </div>
              </Link>)}
            </div>
          </section> : null}
        </>
        : <section className="panel overflow-hidden rounded-[28px] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/episodes/station-banner.jpg" alt="" className="h-56 w-full border-b border-white/[.055] object-cover sm:h-72" />
          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-semibold text-white/80">The station is warming up</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/45">No episodes have aired yet. The first broadcasts will be keeper-made: your setups, your animals, your projects. Send yours in and it could open the station.</p>
            <a href="#submit" className="primary-action mt-6 inline-block">Submit the first episode</a>
          </div>
        </section>}

      <section id="submit" className="panel mt-10 scroll-mt-28 rounded-[28px] p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="section-kicker">Get on the station</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-.025em]">Submit your episode</h2>
            <p className="mt-4 text-sm leading-7 text-white/50">Filmed a setup tour, a feeding session, a breeding project update or a plant build? Email it to <a href={`mailto:${EPISODE_SUBMISSIONS_EMAIL}`} className="font-semibold text-emerald-200/75 hover:text-emerald-200">{EPISODE_SUBMISSIONS_EMAIL}</a> and the crew will review it for broadcast.</p>
            <ul className="mt-6 space-y-3 text-xs leading-6 text-white/42">
              <li><span className="font-bold text-white/60">1.</span> Upload your video to YouTube or Vimeo (unlisted is fine) — or host the file somewhere with a direct link.</li>
              <li><span className="font-bold text-white/60">2.</span> Fill in the form — it composes the submission email for you with everything we need.</li>
              <li><span className="font-bold text-white/60">3.</span> Hit send. We review every submission and publish the ones that fit the station.</li>
            </ul>
          </div>
          <div className="rounded-[22px] border border-white/[.06] bg-black/15 p-5 sm:p-6"><EpisodeSubmitForm /></div>
        </div>
      </section>
    </div>
  </main>;
}
