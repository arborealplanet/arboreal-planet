import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const MM_LISTING_RE = /^https:\/\/(?:www\.)?morphmarket\.com\/(?:us|eu|za|mx)\/c\/reptiles\/pythons\/green-tree-pythons\/(\d+)\/?(?:\?.*)?$/i;

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

function normalizeMediaUrl(raw: unknown) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const lower = url.href.toLowerCase();
    if (/favicon|logo|avatar|badge|icon|sprite|flag|placeholder|profile|seller|store-logo|brandmark/.test(lower)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Sign in to Snake Sorter as the owner first." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const sourceUrl = String(body.source_url ?? "").trim();
  const title = String(body.title ?? "").trim().slice(0, 255);
  const match = sourceUrl.match(MM_LISTING_RE);

  if (!match) {
    return NextResponse.json({ error: "This is not an approved MorphMarket Green Tree Python listing URL." }, { status: 400 });
  }

  const imageUrls = [...new Set(
    (Array.isArray(body.image_urls) ? body.image_urls : [])
      .map(normalizeMediaUrl)
      .filter((value): value is string => Boolean(value)),
  )].slice(0, 20);

  if (!imageUrls.length) {
    return NextResponse.json({ error: "No usable live image references were found on the listing." }, { status: 409 });
  }

  const sourceId = match[1];
  const sourceKey = `morphmarket:${sourceId}`;
  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  const candidateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?source_key=eq.${encodeURIComponent(sourceKey)}&select=id,source_key,source_url,title,thumbnail_url&limit=1`,
    { headers: h, cache: "no-store" },
  );

  const candidates = candidateResponse.ok
    ? await candidateResponse.json() as Array<{ id: string; source_key: string; source_url: string; title: string | null; thumbnail_url: string | null }>
    : [];
  const candidate = candidates[0];

  if (!candidate) {
    return NextResponse.json({
      error: "This listing is not in the Snake Sorter acquisition queue yet. Discover the listing first, then import its live image references.",
      source_key: sourceKey,
    }, { status: 404 });
  }

  const rows = imageUrls.map((url, index) => ({
    candidate_id: candidate.id,
    source_media_url: url,
    source_page_url: sourceUrl,
    media_order: index,
    capture_method: index === 0 ? "page_metadata" : "gallery_url",
    rights_status: "metadata_only",
    review_status: "pending",
    quality_status: "unreviewed",
    live_reference_status: "unknown",
    source_metadata: {
      source_type: "morphmarket",
      source_key: sourceKey,
      source_id: sourceId,
      imported_from_browser_helper: true,
      browser_helper_version: 1,
    },
    updated_at: new Date().toISOString(),
  }));

  const insertResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?on_conflict=candidate_id,source_media_url`,
    {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
      cache: "no-store",
    },
  );

  const inserted = await insertResponse.json().catch(() => ([])) as Array<{ id?: string }>;
  if (!insertResponse.ok) {
    return NextResponse.json({ error: "Could not attach live image references to this candidate." }, { status: 502 });
  }

  await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidate.id)}`,
    {
      method: "PATCH",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        thumbnail_url: imageUrls[0],
        title: candidate.title || title || null,
        acquisition_stage: "media_collected",
        last_seen_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );

  return NextResponse.json({
    ok: true,
    candidate_id: candidate.id,
    source_key: sourceKey,
    title: candidate.title || title || null,
    attached: inserted.length,
    live_reference_count: imageUrls.length,
    stored_copies: 0,
  });
}
