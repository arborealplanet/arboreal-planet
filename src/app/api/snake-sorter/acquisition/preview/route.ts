import { NextRequest, NextResponse } from "next/server";
import { getServerIdentity, getSnakeSorterAccess } from "@/lib/supabase-auth";

const USER_AGENT = "SnakeSorterReview/1.0 (+private owner-reviewed reference workflow)";

async function reviewerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) return null;
  if (!access.isOwner && access.accessLevel !== "reviewer") return null;
  return identity;
}

function meta(html: string, key: string, attr: "property" | "name" = "property") {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = new RegExp(`<meta[^>]+${attr}=["\']${escaped}["\'][^>]+content=["\']([^"\']+)["\'][^>]*>`, "i");
  const second = new RegExp(`<meta[^>]+content=["\']([^"\']+)["\'][^>]+${attr}=["\']${escaped}["\'][^>]*>`, "i");
  return html.match(first)?.[1] ?? html.match(second)?.[1] ?? null;
}

function decode(value: string | null) {
  if (!value) return null;
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export async function POST(request: NextRequest) {
  const identity = await reviewerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { source_url?: unknown };
  const sourceUrl = String(body.source_url ?? "").trim();

  let url: URL;
  try { url = new URL(sourceUrl); } catch {
    return NextResponse.json({ error: "Invalid source URL" }, { status: 400 });
  }

  const host = url.hostname.toLowerCase();
  if (!(host === "www.morphmarket.com" || host === "morphmarket.com" || host.endsWith(".morphmarket.com"))) {
    return NextResponse.json({ error: "Preview is limited to MorphMarket listings." }, { status: 400 });
  }

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    return NextResponse.json({ error: `MorphMarket preview returned HTTP ${response.status}.` }, { status: 502 });
  }

  const html = await response.text();
  const imageUrl = decode(meta(html, "og:image"));
  const description = decode(meta(html, "og:description"));
  const title = decode(meta(html, "og:title"));

  if (!imageUrl) {
    return NextResponse.json({ error: "No public listing preview image was exposed by this page.", title, description }, { status: 404 });
  }

  return NextResponse.json({ ok: true, image_url: imageUrl, title, description });
}