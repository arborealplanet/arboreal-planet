import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const ACCENTS = new Set(["arboreal", "emerald", "jungle", "blue", "purple", "red", "orange", "gold", "teal", "neutral"]);
const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$/;
const HANDLE_RE = /^@?[a-zA-Z0-9._-]{1,80}$/;

function cleanText(value: unknown, max: number) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function normalizeUrl(value: unknown, provider?: "instagram" | "facebook") {
  let text = String(value ?? "").trim();
  if (!text) return null;

  if (provider && HANDLE_RE.test(text)) {
    const handle = text.replace(/^@/, "");
    text = provider === "instagram" ? `https://instagram.com/${handle}` : `https://facebook.com/${handle}`;
  } else if (provider === "instagram" && text.startsWith("@")) {
    text = `https://instagram.com/${text.slice(1)}`;
  }

  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (provider === "instagram" && !(host === "instagram.com" || host.endsWith(".instagram.com"))) return false;
    if (provider === "facebook" && !(host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com")) return false;
    return url.toString().slice(0, 1000);
  } catch {
    return false;
  }
}

export async function GET() {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: identity.user, profile: await fetchOwnProfile(identity.token, identity.user.id) });
}

export async function PATCH(request: Request) {
  const identity = await getServerIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  if (has("username")) {
    const username = cleanText(body.username, 30);
    if (username && !USERNAME_RE.test(username)) {
      return NextResponse.json({ error: "Username must be 3–30 characters and use only letters, numbers, dots, dashes, or underscores." }, { status: 400 });
    }
    allowed.username = username;
  }
  if (has("display_name")) allowed.display_name = cleanText(body.display_name, 80);
  if (has("bio")) allowed.bio = cleanText(body.bio, 600);
  if (has("location")) allowed.location = cleanText(body.location, 120);
  if (has("avatar_url")) allowed.avatar_url = cleanText(body.avatar_url, 1000);
  if (has("banner_url")) allowed.banner_url = cleanText(body.banner_url, 1000);

  if (has("website_url")) {
    const website = normalizeUrl(body.website_url);
    if (website === false) return NextResponse.json({ error: "Website must be a valid web address." }, { status: 400 });
    allowed.website_url = website;
  }
  if (has("instagram_url")) {
    const instagram = normalizeUrl(body.instagram_url, "instagram");
    if (instagram === false) return NextResponse.json({ error: "Instagram can be an @handle, plain handle, or instagram.com link." }, { status: 400 });
    allowed.instagram_url = instagram;
  }
  if (has("facebook_url")) {
    const facebook = normalizeUrl(body.facebook_url, "facebook");
    if (facebook === false) return NextResponse.json({ error: "Facebook can be a page handle or facebook.com link." }, { status: 400 });
    allowed.facebook_url = facebook;
  }
  if (has("accent_color")) {
    const accent = String(body.accent_color ?? "emerald").toLowerCase();
    if (!ACCENTS.has(accent)) return NextResponse.json({ error: "Invalid profile accent." }, { status: 400 });
    allowed.accent_color = accent;
  }
  if (has("profile_visibility")) allowed.profile_visibility = body.profile_visibility === "private" ? "private" : "public";
  if (has("seller_enabled")) allowed.seller_enabled = Boolean(body.seller_enabled);

  if (Object.keys(allowed).length === 1) return NextResponse.json({ ok: true, profile: await fetchOwnProfile(identity.token, identity.user.id) });

  const response = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(identity.user.id)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_AUTH_KEY,
      Authorization: `Bearer ${identity.token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(allowed),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = Array.isArray(data) ? undefined : (data as { code?: string } | null)?.code;
    const detail = Array.isArray(data) ? null : data as { message?: string } | null;
    const message = code === "23505" ? "That username is already taken." : detail?.message || "Unable to update profile";
    return NextResponse.json({ error: message, detail: data }, { status: response.status });
  }

  return NextResponse.json({ ok: true, profile: Array.isArray(data) ? data[0] : data });
}
