import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageIntro } from "@/components/AppShell";
import { EpisodePlayer, formatDuration } from "@/components/EpisodePlayer";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";
import type { Episode } from "@/app/episodes/page";

export const dynamic = "force-dynamic";

const SELECT = "id,slug,title,description,video_url,thumbnail_url,duration_seconds,episode_number,submitted_by,featured,published_at";

function headers() {
  return { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}` };
}

async function getEpisode(slug: string): Promise<Episode | null> {
  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/episodes?status=eq.PUBLISHED&slug=eq.${encodeURIComponent(slug)}&select=${SELECT}&limit=1`,
      { headers: headers(), cache: "no-store" },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as Episode[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getMore(currentId: string): Promise<Episode[]> {
  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/episodes?status=eq.PUBLISHED&id=neq.${encodeURIComponent(currentId)}&select=${SELECT}&order=published_at.desc&limit=3`,
      { headers: headers(), cache: "no-store" },
    );
    if (!response.ok) return [];
    return (await response.json()) as Episode[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getEpisode(slug);
  return {
    title: episode ? `${episode.title} | Episodes | Arboreal Planet` : "Episode | Arboreal Planet",
    description: episode?.description?.slice(0, 160) ?? "Watch keeper-made episodes on Arboreal Planet TV.",
  };
}

export default async function EpisodeWatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const episode = await getEpisode(slug);
  if (!episode) notFound();
  const more = await getMore(episode.id);

  const meta: string[] = [];
  if (episode.episode_number) meta.push(`Episode ${episode.episode_number}`);
  if (episode.submitted_by) meta.push(`Submitted by ${episode.submitted_by}`);
  const duration = formatDuration(episode.duration_seconds);
  if (duration) meta.push(duration);
  if (episode.published_at) meta.push(new Date(episode.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));

  return <main>
    <PageIntro
      eyebrow="Arboreal Planet TV"
      title={episode.title}
      description={meta.join(" · ")}
      aside={<Link href="/episodes" className="secondary-action">All episodes</Link>}
    />
    <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
      <section className="panel overflow-hidden rounded-[28px]">
        <EpisodePlayer videoUrl={episode.video_url} title={episode.title} />
      </section>
      {episode.description ? <section className="panel mt-5 rounded-[26px] p-6 sm:p-8">
        <div className="section-kicker">About this episode</div>
        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-8 text-white/55">{episode.description}</p>
      </section> : null}

      <section className="panel mt-5 rounded-[26px] p-6 sm:p-8">
        <div className="section-kicker">Your turn</div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-sm leading-7 text-white/50">Filmed something worth airing? Email your submission and it could be the next episode on the station.</p>
          <Link href="/episodes#submit" className="primary-action">Submit an episode</Link>
        </div>
      </section>

      {more.length ? <section className="mt-10">
        <div className="mb-5"><div className="section-kicker">Keep watching</div><h2 className="mt-2 text-2xl font-semibold tracking-[-.025em]">More episodes</h2></div>
        <div className="grid gap-4 md:grid-cols-3">
          {more.map((item) => <Link key={item.id} href={`/episodes/${item.slug}`} className="panel interactive-card overflow-hidden rounded-[24px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumbnail_url ?? "/episodes/station-banner.jpg"} alt="" className="h-40 w-full border-b border-white/[.055] object-cover" />
            <div className="p-5">
              <h3 className="text-base font-semibold text-white/72">{item.title}</h3>
              <div className="mt-3 text-xs font-bold text-emerald-200/50">Watch →</div>
            </div>
          </Link>)}
        </div>
      </section> : null}
    </div>
  </main>;
}
