import { NextRequest, NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

const MM_LISTING_RE = /^https:\/\/(?:www\.)?morphmarket\.com\/(?:us|eu|za|mx)\/c\/reptiles\/pythons\/green-tree-pythons\/(\d+)\/?(?:\?.*)?$/i;

const LOCALITIES: Array<[string,string]> = [
  ["jayapura","Jayapura"],["cyclops","Cyclops"],["lereh","Lereh"],["yapen","Yapen"],
  ["wamena","Wamena"],["arfak","Arfak"],["sorong","Sorong"],["timika","Timika"],
  ["manokwari","Manokwari"],["kofiau","Kofiau"],["aru","Aru"],["merauke","Merauke"],
  ["biak","Biak"],["numfor","Numfor"],["numfoor","Numfor"],
];

function classify(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  const localities = [...new Set(
    LOCALITIES.filter(([needle]) => text.includes(needle)).map(([,label]) => label)
  )];

  let exclusionReason: string | null = null;
  if (/\bdesigner\b|\bcalico\b/.test(text)) exclusionReason = "designer";
  else if (/\bhybrid\b/.test(text)) exclusionReason = "hybrid";
  else if (/\bmixed locality\b|\blocality cross\b/.test(text)) exclusionReason = "mixed locality";
  else if (/\bunknown locality\b|\bunknown lineage\b/.test(text)) exclusionReason = "unknown locality";
  else if (localities.length > 1) exclusionReason = "mixed locality";
  else if (/\s[x×]\s/i.test(` ${title} `) && localities.length >= 1) exclusionReason = "locality cross";
  else if (localities.length === 0) exclusionReason = "unknown locality";

  const neonateColor =
    /\bred\b/.test(text) ? "red" :
    /\byellow\b/.test(text) ? "yellow" :
    null;

  const lifeStage =
    /\bhatchling\b/.test(text) ? "hatchling" :
    /\bneo(?:nate)?\b/.test(text) ? "neonate" :
    /\bjuvenile\b|\bjuvi\b/.test(text) ? "juvenile" :
    /\bsubadult\b/.test(text) ? "subadult" :
    /\badult\b/.test(text) ? "adult" :
    null;

  return {
    localities,
    locality: localities.length === 1 ? localities[0] : null,
    review_status: exclusionReason ? "rejected" : "pending",
    exclusion_reason: exclusionReason,
    neonate_color_hint: neonateColor,
    life_stage_hint: lifeStage,
  };
}

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
  const description = String(body.description ?? "").trim().slice(0, 2000);
  const parts = titleParts(rawTitle);
  const decision = classify(parts.title, description);
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
  let candidate = candidates[0];
  let candidateCreated = false;

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
          source_type: "morphmarket",
          source_key: sourceKey,
          source_id: sourceId,
          source_url: sourceUrl,
          thumbnail_url: imageUrls[0] || null,
          title: parts.title || rawTitle || null,
          seller_or_observer: parts.seller,
          taxon_raw: "Green Tree Python",
          locality_raw: decision.locality,
          provisional_locality: decision.locality,
          life_stage_hint: decision.life_stage_hint,
          neonate_color_hint: decision.neonate_color_hint,
          rights_status: "metadata_only",
          review_status: decision.review_status,
          exclusion_reason: decision.exclusion_reason,
          source_metadata: {
            discovery_method: "owner_browser_helper",
            description,
            media_downloaded: false,
            browser_helper_import: true,
            single_locality_candidate: decision.review_status === "pending",
            locality_mentions: decision.localities,
          },
          created_by: identity.user.id,
          acquisition_stage: "media_collected",
        }),
        cache: "no-store",
      },
    );

    const created = createResponse.ok
      ? await createResponse.json() as Array<{ id: string; source_key: string; source_url: string; title: string | null; thumbnail_url: string | null }>
      : [];

    if (!createResponse.ok || !created[0]) {
      return NextResponse.json({ error: "Could not create a Snake Sorter candidate for this listing." }, { status: 502 });
    }

    candidate = created[0];
    candidateCreated = true;
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
        title: candidate.title || parts.title || rawTitle || null,
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
    title: candidate.title || parts.title || rawTitle || null,
    attached: inserted.length,
    live_reference_count: imageUrls.length,
    stored_copies: 0,
    candidate_created: candidateCreated,
  });
}
