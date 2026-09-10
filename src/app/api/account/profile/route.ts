import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const ACCENTS = new Set(["arboreal", "emerald", "jungle", "blue", "purple", "red", "orange", "gold", "teal", "neutral"]);
const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$/;

function cleanText(value: unknown, max: number) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function normalizeUrl(value: unknown, provider?: "instagram" | "facebook") {
  let text = String(value ?? "").trim();
  if (!text) return null;
  if (provider === "instagram" && text.startsWith("@")) text = `https://instagram.com/${text.slice(1)}`;
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

  const username = cleanText(body.username, 30);
  if (username && !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Username must be 3–30 characters and use only letters, numbers, dots, dashes, or underscores." }, { status: 400 });
  }

  const website = normalizeUrl(body.website_url);
  const instagram = normalizeUrl(body.instagram_url, "instagram");
  const facebook = normalizeUrl(body.facebook_url, "facebook");
  if (website === false) return NextResponse.json({ error: "Website must be a valid web address." }, { status: 400 });
  if (instagram === false) return NextResponse.json({ error: "Instagram must be an instagram.com link or @handle." }, { status: 400 });
  if (facebook === false) return NextResponse.json({ error: "Facebook must be a facebook.com link." }, { status: 400 });

  const accent = String(body.accent_color ?? "emerald").toLowerCase();
  const allowed = {
    username,
    display_name: cleanText(body.display_name, 80),
    bio: cleanText(body.bio, 600),
    location: cleanText(body.location, 120),
    avatar_url: cleanText(body.avatar_url, 1000),
    banner_url: cleanText(body.banner_url, 1000),
    website_url: website,
    instagram_url: instagram,
    facebook_url: facebook,
    accent_color: ACCENTS.has(accent) ? accent : "emerald",
    profile_visibility: body.profile_visibility === "private" ? "private" : "public",
    seller_enabled: Boolean(body.seller_enabled),
    updated_at: new Date().toISOString(),
  };

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
    const message = code === "23505" ? "That username is already taken." : "Unable to update profile";
    return NextResponse.json({ error: message, detail: data }, { status: response.status });
  }

  return NextResponse.json({ ok: true, profile: Array.isArray(data) ? data[0] : data });
}
