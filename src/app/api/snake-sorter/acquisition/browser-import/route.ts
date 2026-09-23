import { NextRequest, NextResponse } from "next/server";
import { classifyGtpListing } from "@/lib/gtp-harvest";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const MM_LISTING_RE = /^https:\/\/(?:www\.)?morphmarket\.com\/[a-z]{2}\/c\/reptiles\/pythons\/green-tree-pythons\/(\d+)\/?(?:\?.*)?$/i;

function titleParts(raw: string) {
  const clean = raw.replace(/\s*-\s*MorphMarket.*$/i, "").trim();
  const match = clean.match(/^(.*?)\s+by\s+(.+)$/i);
  return {
    title: (match?.[1] || clean).trim(),
    seller: (match?.[2] || "").trim() || null,
  };
}

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
  const rawTitle = String(body.title ?? "").trim().slice(0, 255);
  const description = String(body.description ?? "").trim().slice(0, 4000);
  const parts = titleParts(rawTitle);
  const decision = classifyGtpListing(parts.title, description);
  const match = sourceUrl.match(MM_LISTING_RE);

  if (!match) {
    return NextResponse.json({ error: "This is not an approved MorphMarket Green Tree Python listing URL." }, { status: 400 });
  }

  const imageUrls = [...new Set(
    (Array.isArray(body.image_urls) ? body.image_urls : [])
      .map(normalizeMediaUrl)
      .filter((value): value is string => Boolean(value)),
  )].slice(0, 40);

  if (!imageUrls.length) {
    return NextResponse.json({ error: "No usable live image references were found on the listing." }, { status: 409 });
  }

  const sourceId = match[1];
  const sourceKey = `morphmarket:${sourceId}`;
  const now = new Date().toISOString();
  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  const masterResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/gtp_observed_animals?on_conflict=source_key`,
    {
      method: "POST",
      headers: {
        ...h,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        source_type: "morphmarket",
        source_key: sourceKey,
        source_id: sourceId,
        source_url: sourceUrl,
        seller_name: parts.seller,
        listing_title: parts.title || rawTitle || null,
        normalized_taxon: decision.taxon,
        normalized_locality: decision.locality,
        ancestry_class: decision.ancestry_class,
        pure_locality: decision.pure_locality,
        pure_subspecies: decision.pure_subspecies,
        life_stage: decision.life_stage_hint,
        neonate_color: decision.neonate_color_hint,
        source_metadata: {
          description,
          locality_mentions: decision.localities,
          browser_helper_import: true,
        },
        last_seen_at: now,
        updated_at: now,
      }),
      cache: "no-store",
    },
  );

  const masterRows = masterResponse.ok
    ? await masterResponse.json() as Array<{ id: string }>
    : [];
  const masterAnimalId = masterRows[0]?.id ?? null;

  if (!masterAnimalId) {
    return NextResponse.json({ error: "Could not create or update the shared GTP animal record." }, { status: 502 });
  }

  const candidateResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?source_key=eq.${encodeURIComponent(sourceKey)}&select=id,source_key,source_url,title,thumbnail_url,reviewed_at&limit=1`,
    { headers: h, cache: "no-store" },
  );

  const candidates = candidateResponse.ok
    ? await candidateResponse.json() as Array<{
        id: string;
        source_key: string;
        source_url: string;
        title: string | null;
        thumbnail_url: string | null;
        reviewed_at: string | null;
      }>
    : [];

  let candidate = candidates[0];
  let candidateCreated = false;

  const candidateFields = {
    master_animal_id: masterAnimalId,
    source_type: "morphmarket",
    source_key: sourceKey,
    source_id: sourceId,
    source_url: sourceUrl,
    thumbnail_url: imageUrls[0] || null,
    title: parts.title || rawTitle || null,
    seller_or_observer: parts.seller,
    taxon_raw: "Green Tree Python",
    locality_raw: decision.locality,
    provisional_taxon: decision.taxon,
    provisional_locality: decision.locality,
    life_stage_hint: decision.life_stage_hint,
    neonate_color_hint: decision.neonate_color_hint,
    rights_status: "metadata_only",
    source_metadata: {
      discovery_method: "owner_browser_helper",
      description,
      media_downloaded: false,
      browser_helper_import: true,
      snake_sorter_eligible: decision.snake_sorter_eligible,
      ancestry_class: decision.ancestry_class,
      pure_locality: decision.pure_locality,
      pure_subspecies: decision.pure_subspecies,
      locality_mentions: decision.localities,
      taxa_mentions: decision.taxa,
    },
    acquisition_stage: "media_collected",
    last_seen_at: now,
  };

  if (!candidate) {
    const createResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates`,
      {
        method: "POST",
        headers: {
          ...h,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          ...candidateFields,
          review_status: decision.review_status,
          exclusion_reason: decision.exclusion_reason,
          created_by: identity.user.id,
        }),
        cache: "no-store",
      },
    );

    const created = createResponse.ok
      ? await createResponse.json() as Array<typeof candidate & { id: string }>
      : [];

    if (!createResponse.ok || !created[0]) {
      return NextResponse.json({ error: "Could not create a Snake Sorter candidate for this listing." }, { status: 502 });
    }

    candidate = created[0];
    candidateCreated = true;
  } else {
    const patch: Record<string, unknown> = { ...candidateFields };
    if (!candidate.reviewed_at) {
      patch.review_status = decision.review_status;
      patch.exclusion_reason = decision.exclusion_reason;
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
        body: JSON.stringify(patch),
        cache: "no-store",
      },
    );
  }

  const rows = imageUrls.map((url, index) => ({
    candidate_id: candidate!.id,
    source_media_url: url,
    source_page_url: sourceUrl,
    media_order: index,
    gallery_index: index + 1,
    gallery_total: imageUrls.length,
    image_subject: "listed_animal",
    source_capture_kind: "live_reference",
    capture_method: index === 0 ? "page_metadata" : "gallery_url",
    rights_status: "metadata_only",
    review_status: "pending",
    quality_status: "unreviewed",
    live_reference_status: "unknown",
    source_metadata: {
      source_type: "morphmarket",
      source_key: sourceKey,
      source_id: sourceId,
      master_animal_id: masterAnimalId,
      imported_from_browser_helper: true,
      browser_helper_version: 2,
    },
    updated_at: now,
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

  return NextResponse.json({
    ok: true,
    master_animal_id: masterAnimalId,
    candidate_id: candidate!.id,
    source_key: sourceKey,
    title: candidate!.title || parts.title || rawTitle || null,
    ancestry_class: decision.ancestry_class,
    snake_sorter_eligible: decision.snake_sorter_eligible,
    attached: inserted.length,
    live_reference_count: imageUrls.length,
    stored_copies: 0,
    candidate_created: candidateCreated,
  });
}
