import Link from "next/link";
import { SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

type SearchItem = { kind: string; title: string; subtitle: string; href: string; detail?: string | null; badge?: string | null };

function safeTerm(value: string) {
  return value.trim().slice(0, 80).replace(/[,*()_%]/g, " ").replace(/\s+/g, " ").trim();
}

async function publicRows(path: string) {
  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_AUTH_KEY, Authorization: `Bearer ${SUPABASE_AUTH_KEY}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [] as Array<Record<string, unknown>>;
  return response.json() as Promise<Array<Record<string, unknown>>>;
}

function filterText(rows: Array<Record<string, unknown>>, term: string, fields: string[]) {
  const q = term.toLowerCase();
  return rows.filter((row) => fields.some((field) => {
    const value = row[field];
    if (Array.isArray(value)) return value.some((entry) => String(entry ?? "").toLowerCase().includes(q));
    return String(value ?? "").toLowerCase().includes(q);
  }));
}

function money(value: unknown, currency: unknown) {
  const amount = Number(value ?? 0);
  const code = /^[A-Z]{3}$/.test(String(currency ?? "USD")) ? String(currency ?? "USD") : "USD";
  try { return amount.toLocaleString(undefined, { style: "currency", currency: code }); }
  catch { return `$${amount.toLocaleString()}`; }
}

function eventDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "Upcoming event" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const term = safeTerm(params.q ?? "");
  let items: SearchItem[] = [];

  if (term) {
    const [animals, plants, profiles, listings, posts, pedigrees, events] = await Promise.all([
      publicRows("species?published=eq.true&select=slug,common_name,scientific_name,animal_group,description,tags&limit=100"),
      publicRows("plant_collections?select=slug,name,scientific_name,plant_group,description,tags,status&limit=100"),
      publicRows("profiles?profile_visibility=eq.public&select=username,display_name,bio,location,seller_enabled,seller_verification_status&limit=100"),
      publicRows("marketplace_listings?status=eq.ACTIVE&select=id,title,description,category,price,currency,seller_location,morph,sex,age_or_year&order=created_at.desc&limit=100"),
      publicRows("community_posts?deleted_at=is.null&select=id,body,tags,type,created_at&order=created_at.desc&limit=100"),
      publicRows("gtp_pedigree_animals?visibility=eq.public&select=id,registry_code,name,sex,locality_label,breeder_animal_id,hatch_year,record_status&order=updated_at.desc&limit=300"),
      publicRows("events?status=eq.PUBLISHED&select=slug,title,organizer,event_type,description,starts_at,venue_name,city,state_region,country&order=starts_at.asc&limit=200"),
    ]);

    items = [
      ...filterText(animals, term, ["common_name", "scientific_name", "animal_group", "description", "tags"]).map((row) => ({ kind: "Animal reference", title: String(row.common_name ?? "Animal"), subtitle: String(row.scientific_name ?? row.animal_group ?? ""), href: `/animals/${row.slug}`, detail: String(row.description ?? ""), badge: "REFERENCE" })),
      ...filterText(plants, term, ["name", "scientific_name", "plant_group", "description", "tags"]).map((row) => ({ kind: "Plant collection", title: String(row.name ?? "Plant"), subtitle: String(row.scientific_name ?? row.plant_group ?? ""), href: row.status === "PLANNED" ? "/plants" : `/plants/${row.slug}`, detail: String(row.description ?? ""), badge: String(row.status ?? "") })),
      ...filterText(profiles, term, ["username", "display_name", "bio", "location"]).filter((row) => Boolean(row.username)).map((row) => ({ kind: "Keeper", title: String(row.display_name ?? row.username ?? "Keeper"), subtitle: `@${String(row.username)}`, href: `/keepers/${encodeURIComponent(String(row.username))}`, detail: String(row.location ?? row.bio ?? ""), badge: Boolean(row.seller_enabled) && row.seller_verification_status === "verified" ? "VERIFIED SELLER" : "PUBLIC PROFILE" })),
      ...filterText(listings, term, ["title", "description", "category", "seller_location", "morph", "sex", "age_or_year"]).map((row) => ({ kind: "Marketplace", title: String(row.title ?? "Listing"), subtitle: `${String(row.category ?? "Listing")} · ${money(row.price, row.currency)}`, href: `/marketplace/${row.id}`, detail: String(row.seller_location ?? row.morph ?? ""), badge: "ACTIVE LISTING" })),
      ...filterText(posts, term, ["body", "tags", "type"]).map((row) => ({ kind: "Community", title: String(row.body ?? "Community post").slice(0, 90) || "Community post", subtitle: String(row.type ?? "POST").replaceAll("_", " "), href: `/community#${row.id}`, detail: Array.isArray(row.tags) ? row.tags.slice(0, 4).map((tag) => `#${tag}`).join(" · ") : null, badge: "COMMUNITY" })),
      ...filterText(pedigrees, term, ["registry_code", "name", "locality_label", "breeder_animal_id", "record_status"]).map((row) => ({ kind: "Registered GTP", title: String(row.name ?? "Registered animal"), subtitle: [row.registry_code, row.locality_label].filter(Boolean).join(" · "), href: `/genetics/database/${row.id}`, detail: [row.sex, row.hatch_year ? `Hatched ${row.hatch_year}` : null, row.breeder_animal_id ? `Breeder ID ${row.breeder_animal_id}` : null].filter(Boolean).join(" · "), badge: String(row.record_status ?? "keeper_reported").replaceAll("_", " ").toUpperCase() })),
      ...filterText(events, term, ["title", "organizer", "event_type", "description", "venue_name", "city", "state_region", "country"]).map((row) => ({ kind: "Shows & Events", title: String(row.title ?? "Event"), subtitle: `${eventDate(row.starts_at)} · ${[row.city,row.state_region].filter(Boolean).join(", ")}`, href: `/events/${row.slug}`, detail: [row.venue_name,row.organizer].filter(Boolean).join(" · "), badge: "PUBLISHED EVENT" })),
    ];
  }

  const groups = items.reduce<Record<string, SearchItem[]>>((acc, item) => {
    (acc[item.kind] ??= []).push(item);
    return acc;
  }, {});

  return <main className="mx-auto max-w-7xl px-5 py-10 pb-20 sm:px-6 lg:py-14">
    <div className="section-kicker">Global discovery</div>
    <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Search across Arboreal Planet.</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-white/48">Find reference records, plants, keepers, active marketplace listings, community posts, published GTP pedigrees and source-linked events from one place. Private records stay private.</p>

    <form action="/search" method="get" className="panel mt-7 flex flex-col gap-3 rounded-[26px] p-4 sm:flex-row">
      <input name="q" defaultValue={term} autoFocus placeholder="Try Green Tree Python, Nepenthes, Jayapura, a show name, city, AP-GTP…, or a keeper" className="min-w-0 flex-1 rounded-2xl border border-white/[.08] bg-black/15 px-4 py-3.5 text-sm text-white/75 outline-none placeholder:text-white/22 focus:border-emerald-300/20" />
      <button type="submit" className="primary-action !min-h-0 !px-6 !py-3.5">Search</button>
    </form>

    {!term ? <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["Green Tree Python","Reference · Genetics · marketplace"],["Nepenthes","Plants · community · marketplace"],["Jayapura","Locality · pedigree · community"],["Reptile expo","Published shows and events"],["AP-GTP","Registry IDs and published pedigrees"],["Breeder name","Public keeper profiles and records"]].map(([query,copy])=><Link key={query} href={`/search?q=${encodeURIComponent(query)}`} className="panel-soft rounded-2xl p-5 transition hover:bg-emerald-300/[.025]"><div className="font-semibold text-white/68">{query}</div><div className="mt-2 text-xs text-white/30">{copy}</div></Link>)}</section> : null}

    {term ? <div className="mt-8 flex items-center justify-between gap-4"><div className="text-sm text-white/45"><strong className="text-white/72">{items.length}</strong> result{items.length === 1 ? "" : "s"} for “{term}”</div><Link href="/search" className="text-xs font-bold text-emerald-200/55">Clear search</Link></div> : null}

    {term && !items.length ? <div className="panel mt-5 rounded-[26px] py-16 text-center"><div className="font-semibold text-white/60">Nothing public matched that search.</div><p className="mt-2 text-xs text-white/32">Try a broader species, locality, plant group, event, registry ID or keeper name.</p></div> : null}

    {Object.entries(groups).map(([kind, rows]) => <section key={kind} className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-white/72">{kind}</h2><span className="text-[10px] font-black uppercase tracking-[.12em] text-white/24">{rows.length} result{rows.length === 1 ? "" : "s"}</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.slice(0, 18).map((item, index)=><Link key={`${item.href}-${index}`} href={item.href} className="panel interactive-card rounded-[22px] p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-base font-semibold text-white/72">{item.title}</div><div className="mt-1 truncate text-xs text-white/38">{item.subtitle}</div></div>{item.badge?<span className="shrink-0 rounded-full border border-emerald-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-emerald-100/48">{item.badge}</span>:null}</div>{item.detail?<p className="mt-3 line-clamp-3 text-xs leading-5 text-white/32">{item.detail}</p>:null}<div className="mt-4 text-[10px] font-bold text-emerald-200/48">Open →</div></Link>)}</div></section>)}
  </main>;
}