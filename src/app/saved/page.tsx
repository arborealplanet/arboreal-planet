import Link from "next/link";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

type WatchRow = { item_type: "ANIMAL" | "PLANT" | "MARKET_LISTING" | "JOURNAL"; item_id: string; created_at: string };
type Species = { id: string; slug: string; common_name: string; scientific_name: string; animal_group: string };
type Plant = { id: string; slug: string; name: string; scientific_name: string; plant_group: string; status: string };
type Listing = { id: string; title: string; category: string; price: number | null; currency: string; image_urls: string[] | null; status: string };
type Journal = { id:string; slug:string; title:string; excerpt:string|null; content_type:string; category:string; published_at:string };
type SavedPost = { post_id: string; created_at: string };
type Post = { id: string; body: string; type: string; tags: string[]; created_at: string };
type Follow = { following_id: string; created_at: string };
type Keeper = { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null };

function authHeaders(token: string) { return { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" }; }
function ids(rows: { item_id?: string; post_id?: string; following_id?: string }[], key: "item_id" | "post_id" | "following_id") { return [...new Set(rows.map((row) => row[key]).filter((value): value is string => Boolean(value)))]; }
async function fetchRows<T>(path: string, token: string): Promise<T[]> { const r = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`, { headers: authHeaders(token), cache: "no-store" }); return r.ok ? r.json() : []; }

export default async function SavedPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/login?next=%2Fsaved");
  const token = identity.token;
  const userId = identity.user.id;

  const [watchlist, savedPosts, follows] = await Promise.all([
    fetchRows<WatchRow>(`user_watchlist_items?user_id=eq.${encodeURIComponent(userId)}&select=item_type,item_id,created_at&order=created_at.desc`, token),
    fetchRows<SavedPost>(`community_saves?user_id=eq.${encodeURIComponent(userId)}&select=post_id,created_at&order=created_at.desc`, token),
    fetchRows<Follow>(`user_follows?follower_id=eq.${encodeURIComponent(userId)}&select=following_id,created_at&order=created_at.desc`, token),
  ]);

  const animalIds = watchlist.filter((x) => x.item_type === "ANIMAL").map((x) => ({ item_id: x.item_id }));
  const plantIds = watchlist.filter((x) => x.item_type === "PLANT").map((x) => ({ item_id: x.item_id }));
  const listingIds = watchlist.filter((x) => x.item_type === "MARKET_LISTING").map((x) => ({ item_id: x.item_id }));
  const journalIds = watchlist.filter((x) => x.item_type === "JOURNAL").map((x) => ({ item_id: x.item_id }));
  const aIds = ids(animalIds, "item_id"), pIds = ids(plantIds, "item_id"), lIds = ids(listingIds, "item_id"), jIds = ids(journalIds,"item_id"), postIds = ids(savedPosts, "post_id"), keeperIds = ids(follows, "following_id");

  const [animals, plants, listings, journal, posts, keepers] = await Promise.all([
    aIds.length ? fetchRows<Species>(`species?id=in.(${aIds.join(",")})&published=eq.true&select=id,slug,common_name,scientific_name,animal_group`, token) : [],
    pIds.length ? fetchRows<Plant>(`plant_collections?id=in.(${pIds.join(",")})&status=neq.PLANNED&select=id,slug,name,scientific_name,plant_group,status`, token) : [],
    lIds.length ? fetchRows<Listing>(`marketplace_listings?id=in.(${lIds.join(",")})&status=eq.ACTIVE&select=id,title,category,price,currency,image_urls,status`, token) : [],
    jIds.length ? fetchRows<Journal>(`journal_articles?id=in.(${jIds.join(",")})&status=eq.PUBLISHED&select=id,slug,title,excerpt,content_type,category,published_at`, token) : [],
    postIds.length ? fetchRows<Post>(`community_posts?id=in.(${postIds.join(",")})&deleted_at=is.null&select=id,body,type,tags,created_at`, token) : [],
    keeperIds.length ? fetchRows<Keeper>(`profiles?id=in.(${keeperIds.join(",")})&profile_visibility=eq.public&select=id,username,display_name,avatar_url,bio`, token) : [],
  ]);

  const total = animals.length + plants.length + listings.length + journal.length + posts.length + keepers.length;

  return <main>
    <PageIntro eyebrow="Your Arboreal Planet" title="Saved & Following" description="Your personal corner of Arboreal Planet: watched reference records, Journal pieces, listings, saved Community posts and keepers you follow." aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/65">{total} saved connection{total===1?"":"s"}</div>} />
    <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
      {total===0?<div className="panel rounded-[28px] py-16 text-center"><div className="text-lg font-semibold text-white/65">Nothing saved yet.</div><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/34">Follow keepers, save Journal pieces or Community posts, or add animal and plant references to your watchlist as you explore the site.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/search" className="primary-action">Search the hub</Link><Link href="/learn" className="secondary-action">Open Learn</Link></div></div>:null}

      {journal.length?<section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Learn</div><h2 className="mt-2 text-2xl font-semibold">Saved Journal pieces</h2></div><Link href="/learn" className="text-xs font-bold text-emerald-200/60">Arboreal Planet Journal →</Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{journal.map((item)=><Link key={item.id} href={`/learn/${item.slug}`} className="panel interactive-card rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/50">{item.content_type.replaceAll("_"," ")} · {item.category.replaceAll("_"," ")}</div><div className="mt-2 text-lg font-semibold text-white/72">{item.title}</div>{item.excerpt?<p className="mt-3 line-clamp-3 text-xs leading-5 text-white/32">{item.excerpt}</p>:null}<div className="mt-4 text-xs font-bold text-emerald-200/50">Read →</div></Link>)}</div></section>:null}

      {animals.length?<section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Animal watchlist</div><h2 className="mt-2 text-2xl font-semibold">Saved animal references</h2></div><Link href="/animals" className="text-xs font-bold text-emerald-200/60">Animal Database →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{animals.map((item)=><Link key={item.id} href={`/animals/${item.slug}`} className="panel interactive-card rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/50">{item.animal_group}</div><div className="mt-2 text-lg font-semibold text-white/72">{item.common_name}</div><div className="mt-1 text-xs italic text-white/35">{item.scientific_name}</div><div className="mt-4 text-xs font-bold text-emerald-200/50">Open reference →</div></Link>)}</div></section>:null}

      {plants.length?<section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Plant watchlist</div><h2 className="mt-2 text-2xl font-semibold">Saved plant references</h2></div><Link href="/plants" className="text-xs font-bold text-emerald-200/60">Plant Database →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{plants.map((item)=><Link key={item.id} href={`/plants/${item.slug}`} className="panel interactive-card rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/50">{item.plant_group}</div><div className="mt-2 text-lg font-semibold text-white/72">{item.name}</div><div className="mt-1 text-xs italic text-white/35">{item.scientific_name}</div><div className="mt-4 text-xs font-bold text-emerald-200/50">Open reference →</div></Link>)}</div></section>:null}

      {listings.length?<section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Marketplace watchlist</div><h2 className="mt-2 text-2xl font-semibold">Saved active listings</h2></div><Link href="/marketplace" className="text-xs font-bold text-emerald-200/60">Marketplace →</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.map((item)=><Link key={item.id} href={`/marketplace/${item.id}`} className="panel interactive-card overflow-hidden rounded-[22px]">{item.image_urls?.[0]?<img src={item.image_urls[0]} alt={item.title} className="h-40 w-full border-b border-white/[.055] object-cover"/>:<div className="grid-surface grid h-40 place-items-center border-b border-white/[.055] text-white/12">◇</div>}<div className="p-5"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/45">{item.category}</div><div className="mt-2 font-semibold text-white/70">{item.title}</div><div className="mt-3 text-lg font-semibold">{item.price==null?"Contact seller":`$${Number(item.price).toLocaleString()}`}</div></div></Link>)}</div></section>:null}

      {posts.length?<section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Community saves</div><h2 className="mt-2 text-2xl font-semibold">Saved posts</h2></div><Link href="/community" className="text-xs font-bold text-emerald-200/60">Community →</Link></div><div className="grid gap-3 md:grid-cols-2">{posts.map((post)=><Link key={post.id} href={`/community#${post.id}`} className="panel interactive-card rounded-[22px] p-5"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/45">{post.type.replaceAll("_"," ")}</div><p className="mt-3 line-clamp-4 text-sm leading-6 text-white/52">{post.body||"Media post"}</p>{post.tags?.length?<div className="mt-4 flex flex-wrap gap-2">{post.tags.slice(0,4).map((tag)=><span key={tag} className="rounded-full border border-white/[.06] px-2 py-1 text-[9px] text-white/32">#{tag}</span>)}</div>:null}</Link>)}</div></section>:null}

      {keepers.length?<section><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Following</div><h2 className="mt-2 text-2xl font-semibold">Keepers you follow</h2></div><Link href="/community" className="text-xs font-bold text-emerald-200/60">Following feed →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{keepers.map((keeper)=><Link key={keeper.id} href={`/keepers/${encodeURIComponent(keeper.username)}`} className="panel interactive-card flex items-center gap-4 rounded-[22px] p-5">{keeper.avatar_url?<img src={keeper.avatar_url} alt="" className="h-12 w-12 rounded-full border border-white/[.08] object-cover"/>:<div className="grid h-12 w-12 place-items-center rounded-full border border-white/[.08] bg-white/[.02] text-xs font-black text-emerald-200/40">AP</div>}<div className="min-w-0"><div className="truncate font-semibold text-white/70">{keeper.display_name||keeper.username}</div><div className="mt-1 truncate text-xs text-white/34">@{keeper.username}</div>{keeper.bio?<p className="mt-2 line-clamp-1 text-xs text-white/28">{keeper.bio}</p>:null}</div></Link>)}</div></section>:null}
    </section>
  </main>;
}
