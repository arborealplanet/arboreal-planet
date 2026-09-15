import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type ArticleInput = {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  content_type?: string;
  category?: string;
  author_display?: string;
  cover_image_url?: string;
  tags?: string[];
  source_urls?: string[];
  related_species_id?: string | null;
  related_plant_id?: string | null;
  editorial_note?: string;
};

type Action = "save" | "publish" | "archive";

const CONTENT_TYPES = new Set(["GUIDE", "ARTICLE", "NEWS", "EXPLAINER", "CONSERVATION"]);
const CATEGORIES = new Set(["HUSBANDRY", "BREEDING", "TAXONOMY", "LOCALITY", "PLANTS", "MARKET", "CONSERVATION", "INDUSTRY", "GENERAL"]);

function headers(token: string, prefer?: string) {
  return {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function adminIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (!profile || !["admin", "owner"].includes(profile.role ?? "")) return null;
  return identity;
}

function cleanSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

function cleanList(value: unknown, max = 12) {
  return Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, max) : [];
}

function optionalUuid(value: unknown) {
  const text = String(value ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(text) ? text : null;
}

export async function GET() {
  const identity = await adminIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [articlesResponse, speciesResponse, plantsResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/journal_articles?select=id,slug,title,excerpt,body,content_type,category,author_display,cover_image_url,tags,source_urls,related_species_id,related_plant_id,editorial_note,status,published_at,created_at,updated_at&order=updated_at.desc&limit=250`, { headers: headers(identity.token), cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/species?published=eq.true&select=id,common_name,scientific_name&order=common_name.asc`, { headers: headers(identity.token), cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/plant_collections?status=neq.PLANNED&select=id,name,scientific_name&order=name.asc`, { headers: headers(identity.token), cache: "no-store" }),
  ]);

  if (!articlesResponse.ok) return NextResponse.json({ error: "Could not load Journal workspace." }, { status: 500 });

  return NextResponse.json({
    articles: await articlesResponse.json().catch(() => []),
    species: speciesResponse.ok ? await speciesResponse.json().catch(() => []) : [],
    plants: plantsResponse.ok ? await plantsResponse.json().catch(() => []) : [],
  });
}

export async function POST(request: Request) {
  const identity = await adminIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as { action?: Action; article?: ArticleInput } | null;
  const action: Action = body?.action === "publish" || body?.action === "archive" ? body.action : "save";
  const input = body?.article ?? {};

  const title = String(input.title ?? "").trim().slice(0, 180);
  const articleBody = String(input.body ?? "").trim().slice(0, 100000);
  const slug = cleanSlug(String(input.slug || title));
  if (!title || !slug) return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
  if (action === "publish" && !articleBody) return NextResponse.json({ error: "Add article content before publishing." }, { status: 400 });

  const now = new Date().toISOString();
  const payload = {
    slug,
    title,
    excerpt: String(input.excerpt ?? "").trim().slice(0, 600) || null,
    body: articleBody,
    content_type: CONTENT_TYPES.has(String(input.content_type)) ? String(input.content_type) : "ARTICLE",
    category: CATEGORIES.has(String(input.category)) ? String(input.category) : "GENERAL",
    author_display: String(input.author_display ?? "").trim().slice(0, 120) || null,
    author_profile_id: identity.user.id,
    cover_image_url: String(input.cover_image_url ?? "").trim().slice(0, 1200) || null,
    tags: cleanList(input.tags, 20),
    source_urls: cleanList(input.source_urls, 20).filter((url) => /^https?:\/\//i.test(url)),
    related_species_id: optionalUuid(input.related_species_id),
    related_plant_id: optionalUuid(input.related_plant_id),
    editorial_note: String(input.editorial_note ?? "").trim().slice(0, 3000) || null,
    status: action === "publish" ? "PUBLISHED" : action === "archive" ? "ARCHIVED" : "DRAFT",
    published_at: action === "publish" ? now : null,
    updated_at: now,
  };

  const id = String(input.id ?? "").trim();
  const isUpdate = /^[0-9a-f-]{36}$/i.test(id);
  const url = isUpdate
    ? `${SUPABASE_AUTH_URL}/rest/v1/journal_articles?id=eq.${encodeURIComponent(id)}`
    : `${SUPABASE_AUTH_URL}/rest/v1/journal_articles`;

  if (isUpdate && action === "save") {
    delete (payload as { published_at?: string | null }).published_at;
    delete (payload as { status?: string }).status;
  }

  const response = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: headers(identity.token, "return=representation"),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | { message?: string; details?: string } | null;
  if (!response.ok) {
    const message = !Array.isArray(rows) && rows?.message ? rows.message : "Could not save Journal piece.";
    return NextResponse.json({ error: message }, { status: response.status });
  }
  return NextResponse.json({ article: Array.isArray(rows) ? rows[0] ?? null : null });
}
