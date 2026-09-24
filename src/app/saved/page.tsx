import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { SavedSections } from "@/components/SavedSections";
import { getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

type WatchRow = { item_type: "ANIMAL" | "PLANT" | "MARKET_LISTING" | "JOURNAL" | "EVENT"; item_id: string; created_at: string };
type Species = { id: string; slug: string; common_name: string; scientific_name: string; animal_group: string };
type Plant = { id: string; slug: string; name: string; scientific_name: string; plant_group: string; status: string };
type Listing = { id: string; title: string; category: string; price: number | null; currency: string; image_urls: string[] | null; status: string };
type Journal = { id:string; slug:string; title:string; excerpt:string|null; content_type:string; category:string; published_at:string };
type EventRow = { id:string; slug:string; title:string; event_type:string; starts_at:string; city:string; state_region:string|null; country:string; venue_name:string|null };
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
  const eventIds = watchlist.filter((x) => x.item_type === "EVENT").map((x) => ({ item_id: x.item_id }));
  const aIds = ids(animalIds, "item_id"), pIds = ids(plantIds, "item_id"), lIds = ids(listingIds, "item_id"), jIds = ids(journalIds,"item_id"), eIds = ids(eventIds,"item_id"), postIds = ids(savedPosts, "post_id"), keeperIds = ids(follows, "following_id");

  const [animals, plants, listings, journal, events, posts, keepers] = await Promise.all([
    aIds.length ? fetchRows<Species>(`species?id=in.(${aIds.join(",")})&published=eq.true&select=id,slug,common_name,scientific_name,animal_group`, token) : [],
    pIds.length ? fetchRows<Plant>(`plant_collections?id=in.(${pIds.join(",")})&status=neq.PLANNED&select=id,slug,name,scientific_name,plant_group,status`, token) : [],
    lIds.length ? fetchRows<Listing>(`marketplace_listings?id=in.(${lIds.join(",")})&status=eq.ACTIVE&select=id,title,category,price,currency,image_urls,status`, token) : [],
    jIds.length ? fetchRows<Journal>(`journal_articles?id=in.(${jIds.join(",")})&status=eq.PUBLISHED&select=id,slug,title,excerpt,content_type,category,published_at`, token) : [],
    eIds.length ? fetchRows<EventRow>(`events?id=in.(${eIds.join(",")})&status=eq.PUBLISHED&select=id,slug,title,event_type,starts_at,city,state_region,country,venue_name&order=starts_at.asc`, token) : [],
    postIds.length ? fetchRows<Post>(`community_posts?id=in.(${postIds.join(",")})&deleted_at=is.null&select=id,body,type,tags,created_at`, token) : [],
    keeperIds.length ? fetchRows<Keeper>(`profiles?id=in.(${keeperIds.join(",")})&profile_visibility=eq.public&select=id,username,display_name,avatar_url,bio`, token) : [],
  ]);

  return <main>
    <PageIntro eyebrow="Your Arboreal Planet" title="Saved & Following" description="Your personal corner of Arboreal Planet: watched reference records, Journal pieces, events, listings, saved Community posts and keepers you follow." />
    <SavedSections events={events} journal={journal} animals={animals} plants={plants} listings={listings} posts={posts} keepers={keepers} />
  </main>;
}
