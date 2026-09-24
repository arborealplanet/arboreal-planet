"use client";

import Link from "next/link";
import { useState } from "react";

type EventRow = { id:string; slug:string; title:string; event_type:string; starts_at:string; city:string; state_region:string|null; country:string; venue_name:string|null };
type Journal = { id:string; slug:string; title:string; excerpt:string|null; content_type:string; category:string; published_at:string };
type Species = { id:string; slug:string; common_name:string; scientific_name:string; animal_group:string };
type Plant = { id:string; slug:string; name:string; scientific_name:string; plant_group:string; status:string };
type Listing = { id:string; title:string; category:string; price:number|null; currency:string; image_urls:string[]|null; status:string };
type Post = { id:string; body:string; type:string; tags:string[]; created_at:string };
type Keeper = { id:string; username:string; display_name:string|null; avatar_url:string|null; bio:string|null };

type RemoveKind = "watch" | "post" | "follow";

async function callUnsave(kind: RemoveKind, type: string, id: string): Promise<boolean> {
  const url = kind === "watch"
    ? `/api/watchlist?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    : kind === "post"
      ? `/api/community/posts/${encodeURIComponent(id)}/save`
      : `/api/keepers/${encodeURIComponent(id)}/follow`;
  const response = await fetch(url, { method: "POST" });
  const data = await response.json().catch(() => null) as { saved?: boolean; following?: boolean } | null;
  if (!response.ok || !data) return false;
  return kind === "follow" ? data.following === false : data.saved === false;
}

function RemoveButton({ onRemove, busy }: { onRemove: () => void; busy: boolean }) {
  return <button
    type="button"
    disabled={busy}
    title="Remove from saved"
    aria-label="Remove from saved"
    onClick={(event) => { event.preventDefault(); event.stopPropagation(); onRemove(); }}
    className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/[.08] bg-black/70 text-sm leading-none text-white/55 backdrop-blur transition hover:border-red-300/25 hover:text-red-100 disabled:opacity-40"
  >{busy ? "…" : "×"}</button>;
}

export function SavedSections(props: {
  events: EventRow[]; journal: Journal[]; animals: Species[]; plants: Plant[];
  listings: Listing[]; posts: Post[]; keepers: Keeper[];
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState(props.events);
  const [journal, setJournal] = useState(props.journal);
  const [animals, setAnimals] = useState(props.animals);
  const [plants, setPlants] = useState(props.plants);
  const [listings, setListings] = useState(props.listings);
  const [posts, setPosts] = useState(props.posts);
  const [keepers, setKeepers] = useState(props.keepers);

  const total = events.length + journal.length + animals.length + plants.length + listings.length + posts.length + keepers.length;

  async function remove(kind: RemoveKind, watchType: string, key: string, id: string) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const ok = await callUnsave(kind, watchType, id);
      if (ok) {
        setRemoved((current) => new Set(current).add(key));
        if (kind === "watch") {
          if (watchType === "EVENT") setEvents((items) => items.filter((item) => item.id !== id));
          if (watchType === "JOURNAL") setJournal((items) => items.filter((item) => item.id !== id));
          if (watchType === "ANIMAL") setAnimals((items) => items.filter((item) => item.id !== id));
          if (watchType === "PLANT") setPlants((items) => items.filter((item) => item.id !== id));
          if (watchType === "MARKET_LISTING") setListings((items) => items.filter((item) => item.id !== id));
        }
        if (kind === "post") setPosts((items) => items.filter((item) => item.id !== id));
        if (kind === "follow") setKeepers((items) => items.filter((item) => item.id !== id));
      }
    } finally {
      setBusyKey(null);
    }
  }

  const gone = (key: string) => removed.has(key);

  return <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
    <div className="mb-6 text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/55">{total} saved connection{total === 1 ? "" : "s"}</div>
    {total === 0 ? <div className="panel rounded-[28px] py-16 text-center"><div className="text-lg font-semibold text-white/65">Nothing saved yet.</div><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/34">Follow keepers, save Journal pieces or events, save Community posts, or add animal and plant references to your watchlist as you explore the site.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/search" className="primary-action">Search the hub</Link><Link href="/events" className="secondary-action">Find events</Link></div></div> : null}

    {events.length ? <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Shows & Events</div><h2 className="mt-2 text-2xl font-semibold">Saved events</h2></div><Link href="/events" className="text-xs font-bold text-emerald-200/60">Events →</Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{events.map((item) => {
      const key = `EVENT:${item.id}`;
      return gone(key) ? null : <div key={item.id} className="relative"><Link href={`/events/${item.slug}`} className="panel interactive-card block rounded-[22px] p-5 pr-12"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/50">{item.event_type.replaceAll("_", " ")}</div><div className="mt-2 text-lg font-semibold text-white/72">{item.title}</div><div className="mt-3 text-xs leading-5 text-white/34">{new Date(item.starts_at).toLocaleDateString()} · {[item.venue_name, item.city, item.state_region, item.country].filter(Boolean).join(" · ")}</div><div className="mt-4 text-xs font-bold text-emerald-200/50">Open event →</div></Link><RemoveButton busy={busyKey === key} onRemove={() => void remove("watch", "EVENT", key, item.id)} /></div>;
    })}</div></section> : null}

    {journal.length ? <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Learn</div><h2 className="mt-2 text-2xl font-semibold">Saved Journal pieces</h2></div><Link href="/learn" className="text-xs font-bold text-emerald-200/60">Arboreal Planet Journal →</Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{journal.map((item) => {
      const key = `JOURNAL:${item.id}`;
      return gone(key) ? null : <div key={item.id} className="relative"><Link href={`/learn/${item.slug}`} className="panel interactive-card block rounded-[22px] p-5 pr-12"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/50">{item.content_type.replaceAll("_", " ")} · {item.category.replaceAll("_", " ")}</div><div className="mt-2 text-lg font-semibold text-white/72">{item.title}</div>{item.excerpt ? <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/32">{item.excerpt}</p> : null}<div className="mt-4 text-xs font-bold text-emerald-200/50">Read →</div></Link><RemoveButton busy={busyKey === key} onRemove={() => void remove("watch", "JOURNAL", key, item.id)} /></div>;
    })}</div></section> : null}

    {animals.length ? <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Animal watchlist</div><h2 className="mt-2 text-2xl font-semibold">Saved animal references</h2></div><Link href="/animals" className="text-xs font-bold text-emerald-200/60">Animal Database →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{animals.map((item) => {
      const key = `ANIMAL:${item.id}`;
      return gone(key) ? null : <div key={item.id} className="relative"><Link href={`/animals/${item.slug}`} className="panel interactive-card block rounded-[22px] p-5 pr-12"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/50">{item.animal_group}</div><div className="mt-2 text-lg font-semibold text-white/72">{item.common_name}</div><div className="mt-1 text-xs italic text-white/35">{item.scientific_name}</div><div className="mt-4 text-xs font-bold text-emerald-200/50">Open reference →</div></Link><RemoveButton busy={busyKey === key} onRemove={() => void remove("watch", "ANIMAL", key, item.id)} /></div>;
    })}</div></section> : null}

    {plants.length ? <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Plant watchlist</div><h2 className="mt-2 text-2xl font-semibold">Saved plant references</h2></div><Link href="/plants" className="text-xs font-bold text-emerald-200/60">Plant Database →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{plants.map((item) => {
      const key = `PLANT:${item.id}`;
      return gone(key) ? null : <div key={item.id} className="relative"><Link href={`/plants/${item.slug}`} className="panel interactive-card block rounded-[22px] p-5 pr-12"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/50">{item.plant_group}</div><div className="mt-2 text-lg font-semibold text-white/72">{item.name}</div><div className="mt-1 text-xs italic text-white/35">{item.scientific_name}</div><div className="mt-4 text-xs font-bold text-emerald-200/50">Open reference →</div></Link><RemoveButton busy={busyKey === key} onRemove={() => void remove("watch", "PLANT", key, item.id)} /></div>;
    })}</div></section> : null}

    {listings.length ? <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Marketplace watchlist</div><h2 className="mt-2 text-2xl font-semibold">Saved active listings</h2></div><Link href="/marketplace" className="text-xs font-bold text-emerald-200/60">Marketplace →</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.map((item) => {
      const key = `MARKET_LISTING:${item.id}`;
      return gone(key) ? null : <div key={item.id} className="relative"><Link href={`/marketplace/${item.id}`} className="panel interactive-card block overflow-hidden rounded-[22px]">{item.image_urls?.[0] ? <img src={item.image_urls[0]} alt={item.title} className="h-40 w-full border-b border-white/[.055] object-cover" /> : <div className="grid-surface grid h-40 place-items-center border-b border-white/[.055] text-white/12">◇</div>}<div className="p-5"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/45">{item.category}</div><div className="mt-2 font-semibold text-white/70">{item.title}</div><div className="mt-3 text-lg font-semibold">{item.price == null ? "Contact seller" : `$${Number(item.price).toLocaleString()}`}</div></div></Link><RemoveButton busy={busyKey === key} onRemove={() => void remove("watch", "MARKET_LISTING", key, item.id)} /></div>;
    })}</div></section> : null}

    {posts.length ? <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Community saves</div><h2 className="mt-2 text-2xl font-semibold">Saved posts</h2></div><Link href="/community" className="text-xs font-bold text-emerald-200/60">Community →</Link></div><div className="grid gap-3 md:grid-cols-2">{posts.map((post) => {
      const key = `post:${post.id}`;
      return gone(key) ? null : <div key={post.id} className="relative"><Link href={`/community#${post.id}`} className="panel interactive-card block rounded-[22px] p-5 pr-12"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/45">{post.type.replaceAll("_", " ")}</div><p className="mt-3 line-clamp-4 text-sm leading-6 text-white/52">{post.body || "Media post"}</p>{post.tags?.length ? <div className="mt-4 flex flex-wrap gap-2">{post.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-white/[.06] px-2 py-1 text-[9px] text-white/32">#{tag}</span>)}</div> : null}</Link><RemoveButton busy={busyKey === key} onRemove={() => void remove("post", "", key, post.id)} /></div>;
    })}</div></section> : null}

    {keepers.length ? <section><div className="mb-4 flex items-end justify-between"><div><div className="section-kicker">Following</div><h2 className="mt-2 text-2xl font-semibold">Keepers you follow</h2></div><Link href="/community" className="text-xs font-bold text-emerald-200/60">Following feed →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{keepers.map((keeper) => {
      const key = `keeper:${keeper.id}`;
      return gone(key) ? null : <div key={keeper.id} className="relative"><Link href={`/keepers/${encodeURIComponent(keeper.username)}`} className="panel interactive-card flex items-center gap-4 rounded-[22px] p-5 pr-12">{keeper.avatar_url ? <img src={keeper.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full border border-white/[.08] object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/[.08] bg-white/[.02] text-xs font-black text-emerald-200/40">AP</div>}<div className="min-w-0"><div className="truncate font-semibold text-white/70">{keeper.display_name || keeper.username}</div><div className="mt-1 truncate text-xs text-white/34">@{keeper.username}</div>{keeper.bio ? <p className="mt-2 line-clamp-1 text-xs text-white/28">{keeper.bio}</p> : null}</div></Link><RemoveButton busy={busyKey === key} onRemove={() => void remove("follow", "", key, keeper.username)} /></div>;
    })}</div></section> : null}
  </section>;
}
