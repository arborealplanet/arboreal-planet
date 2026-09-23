import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/AppShell";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "News | Arboreal Planet",
  description: "Source-linked Green Tree Python, reptile keeping, plant, conservation, and U.S. market news.",
};

type Story = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  published_at: string;
  source_urls: string[] | null;
};

const topics = [
  { label: "All news", category: "" },
  { label: "Breeding & husbandry", category: "BREEDING" },
  { label: "U.S. market", category: "MARKET" },
  { label: "Research & taxonomy", category: "TAXONOMY" },
  { label: "Conservation", category: "CONSERVATION" },
  { label: "Industry", category: "INDUSTRY" },
];

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: requested } = await searchParams;
  const selected = topics.some((topic) => topic.category === requested) ? requested ?? "" : "";
  let stories: Story[] = [];
  let unavailable = false;
  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/journal_articles?status=eq.PUBLISHED&content_type=eq.NEWS&select=id,slug,title,excerpt,category,published_at,source_urls&order=published_at.desc&limit=100`,
      { headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}` }, cache: "no-store" },
    );
    if (!response.ok) throw new Error("News feed unavailable");
    const rows: Story[] = await response.json();
    stories = rows.filter((story) => Array.isArray(story.source_urls) && story.source_urls.some((url) => /^https?:\/\//i.test(url)));
  } catch {
    unavailable = true;
  }
  const visible = selected ? stories.filter((story) => story.category === selected) : stories;

  return <main>
    <PageIntro eyebrow="News desk" title="Stories that matter to arboreal keepers."
      description="A focused look at Green Tree Pythons, husbandry research, U.S. market developments, conservation and rules affecting keepers. Stories are published with source links and their actual dates." />
    <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
      <div className="panel mb-8 rounded-3xl p-5 sm:p-7">
        <div className="section-kicker">Daily story watch</div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">We check these topics regularly. A quiet day stays quiet: no recycled headlines or invented daily updates. News is reviewed before publication.</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="News topics">
          {topics.map(({ label, category }) => <Link key={label} href={category ? `/news?category=${category}` : "/news"}
            aria-current={selected === category ? "page" : undefined}
            className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition ${selected === category ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-white/10 text-white/55 hover:border-emerald-300/25 hover:text-white"}`}>{label}</Link>)}
        </div>
      </div>
      {unavailable ? <div className="panel rounded-3xl p-8 text-white/60">News is temporarily unavailable. Please check back soon.</div>
        : visible.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((story) => <Link key={story.id} href={`/learn/${story.slug}`} className="panel interactive-card rounded-3xl p-6">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-200/65">
              <span>{story.category.toLowerCase().replaceAll("_", " ")}</span>
              <time dateTime={story.published_at}>{new Date(story.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time>
            </div>
            <h2 className="mt-5 text-xl font-semibold leading-snug text-white/85">{story.title}</h2>
            {story.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/50">{story.excerpt}</p>}
            <span className="mt-6 block text-xs font-bold text-emerald-200/70">Read story and sources →</span>
          </Link>)}
        </div> : <div className="panel rounded-3xl p-8">
          <h2 className="text-xl font-semibold text-white/80">No sourced stories in this view yet</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">Published news will appear here after review. Explore the <Link href="/learn" className="text-emerald-200 underline">Journal</Link> for guides and explainers in the meantime.</p>
        </div>}
    </div>
  </main>;
}
