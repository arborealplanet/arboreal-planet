import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type EpisodeInput = {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number | null;
  episode_number?: number | null;
  submitted_by?: string;
  featured?: boolean;
};

type Action = "save" | "publish" | "archive";

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

function cleanUrl(value: unknown) {
  const text = String(value ?? "").trim().slice(0, 1200);
  return /^https?:\/\//i.test(text) ? text : "";
}

function cleanInt(value: unknown) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

const SELECT = "id,slug,title,description,video_url,thumbnail_url,duration_seconds,episode_number,submitted_by,featured,status,published_at,created_at,updated_at";

export async function GET() {
  const identity = await adminIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/episodes?select=${SELECT}&order=updated_at.desc&limit=250`,
    { headers: headers(identity.token), cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not load Episodes workspace." }, { status: 500 });
  return NextResponse.json({ episodes: await response.json().catch(() => []) });
}

export async function POST(request: Request) {
  const identity = await adminIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null) as { action?: Action; episode?: EpisodeInput } | null;
  const action: Action = body?.action === "publish" || body?.action === "archive" ? body.action : "save";
  const input = body?.episode ?? {};

  const title = String(input.title ?? "").trim().slice(0, 180);
  const slug = cleanSlug(String(input.slug || title));
  const videoUrl = cleanUrl(input.video_url);
  if (!title || !slug) return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
  if (!videoUrl) return NextResponse.json({ error: "A valid video URL is required." }, { status: 400 });

  const now = new Date().toISOString();
  const payload = {
    slug,
    title,
    description: String(input.description ?? "").trim().slice(0, 5000) || null,
    video_url: videoUrl,
    thumbnail_url: cleanUrl(input.thumbnail_url) || null,
    duration_seconds: cleanInt(input.duration_seconds),
    episode_number: cleanInt(input.episode_number),
    submitted_by: String(input.submitted_by ?? "").trim().slice(0, 120) || null,
    featured: Boolean(input.featured),
    status: action === "publish" ? "PUBLISHED" : action === "archive" ? "ARCHIVED" : "DRAFT",
    published_at: action === "publish" ? now : null,
    updated_at: now,
  };

  const id = String(input.id ?? "").trim();
  const isUpdate = /^[0-9a-f-]{36}$/i.test(id);
  const url = isUpdate
    ? `${SUPABASE_AUTH_URL}/rest/v1/episodes?id=eq.${encodeURIComponent(id)}`
    : `${SUPABASE_AUTH_URL}/rest/v1/episodes`;

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
  const rows = await response.json().catch(() => null) as Array<Record<string, unknown>> | { message?: string } | null;
  if (!response.ok) {
    const message = !Array.isArray(rows) && rows?.message ? rows.message : "Could not save episode.";
    return NextResponse.json({ error: message }, { status: response.status });
  }
  return NextResponse.json({ episode: Array.isArray(rows) ? rows[0] ?? null : null });
}
