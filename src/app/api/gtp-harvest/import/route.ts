import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  classifyGtpListing,
  normalizeAgeClass,
  normalizeListingStatus,
  normalizeLocalityLabel,
  normalizeMarketCountry,
  normalizeNeonateColor,
  normalizeOrigin,
  normalizePriceFormat,
  normalizePriceType,
  normalizeSex,
} from "@/lib/gtp-harvest";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

// Keep the route well under the Vercel function timeout: items are processed
// with bounded concurrency (below) instead of one-by-one.
export const maxDuration = 60;

type HarvestItem = Record<string, unknown>;

type MasterRow = { id: string };
type CandidateRow = { id: string; reviewed_at: string | null };
type LocalityRow = { id: string; name: string; slug: string };

const HARVEST_ID_RE = /^HARVEST_MM_GTP_\d{8}_\d{3}$/;
const IMPORT_CONCURRENCY = 8;
const MAX_SANE_PRICE = 1000000;

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

function text(value: unknown, max = 4000) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalText(value: unknown, max = 4000) {
  const valueText = text(value, max);
  return valueText || null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function dateOrNull(value: unknown) {
  const raw = text(value, 40);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function dateOnlyOrNull(value: unknown) {
  const raw = text(value, 40);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function descriptionHashFor(description: string) {
  return createHash("sha256")
    .update(description.toLowerCase().replace(/\s+/g, " ").trim())
    .digest("hex");
}

function ancestryFromItem(item: HarvestItem, title: string, description: string) {
  const supplied = text(item.ancestry_class, 80);
  if (["pure_locality","pure_subspecies_locality_cross","cross_subspecies","designer","hybrid","unknown"].includes(supplied)) {
    const eligible = supplied === "pure_locality" || supplied === "pure_subspecies_locality_cross";
    return {
      ancestry_class: supplied,
      pure_locality: supplied === "pure_locality",
      pure_subspecies: eligible,
      snake_sorter_eligible: eligible,
      exclusion_reason: eligible ? null : supplied,
      taxon: optionalText(item.normalized_taxon ?? item.subspecies, 120),
      locality: normalizeLocalityLabel(item.normalized_locality ?? item.locality),
      localities: Array.isArray(item.localities) ? item.localities.map((v) => text(v, 120)).filter(Boolean) : [],
      life_stage_hint: optionalText(item.life_stage, 40),
      neonate_color_hint: optionalText(item.neonate_color, 40),
    };
  }
  return classifyGtpListing(title, description);
}

async function countRows(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
    cache: "no-store",
  });
  const range = response.headers.get("content-range") ?? "";
  const match = range.match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

type ImportContext = {
  h: Record<string, string>;
  writeHeaders: Record<string, string>;
  batchId: string;
  harvestId: string;
  capturedAt: string;
  sourceId: string;
  speciesId: string;
  localityByName: Map<string, LocalityRow>;
  ownerUserId: string;
  periodDates: Set<string>;
};

async function processListing(item: HarvestItem, ctx: ImportContext): Promise<Record<string, unknown>> {
  const { h, writeHeaders, batchId, harvestId, capturedAt, sourceId, speciesId, localityByName, ownerUserId, periodDates } = ctx;

  const listingId = text(item.listing_id ?? item.source_listing_id, 120);
  const listingUrl = text(item.listing_url ?? item.source_url, 1000);
  if (!listingId || !listingUrl) {
    return { ok: false, listing_id: listingId || null, error: "listing_id and listing_url are required" };
  }

  const sourceKey = `morphmarket:${listingId}`;
  const title = text(item.listing_title ?? item.title, 255);
  const description = text(item.listing_description ?? item.description, 12000);
  const sellerName = optionalText(item.seller_name ?? item.seller, 255);
  const ancestry = ancestryFromItem(item, title, description);
  // market_country is NEVER backfilled from seller_country: a missing market
  // country must flag the observation for review (contract §9).
  const marketCountry = normalizeMarketCountry(item.market_country);
  const sellerCountry = normalizeMarketCountry(item.seller_country);
  const sellerRegion = optionalText(item.seller_region ?? item.seller_state_or_region, 160);
  const marketRegion = optionalText(item.market_region, 160);
  const rawPriceType = text(item.price_type, 40).toLowerCase();
  const priceType = normalizePriceType(item.price_type);
  const priceFormat = normalizePriceFormat(
    item.price_format ?? (["auction", "deposit", "payment"].includes(rawPriceType) ? rawPriceType : "fixed"),
  );
  const inquireOnly = bool(item.inquire_only) || priceFormat === "inquire" || rawPriceType.includes("inquire") || rawPriceType === "poa";
  const displayedPrice = inquireOnly ? null : numberOrNull(item.original_price ?? item.asking_price ?? item.price);
  const priceSane = displayedPrice === null || (displayedPrice > 0 && displayedPrice <= MAX_SANE_PRICE);
  const currency = text(item.original_currency ?? item.currency ?? (marketCountry === "USA" ? "USD" : "UNKNOWN"), 12).toUpperCase() || "UNKNOWN";
  const convertedPriceUsd = numberOrNull(item.converted_price_usd ?? (currency === "USD" ? displayedPrice : null));
  const fxRate = numberOrNull(item.fx_rate);
  const fxRateDate = dateOnlyOrNull(item.fx_rate_date);
  const fxSource = optionalText(item.fx_source, 160);
  const status = normalizeListingStatus(item.listing_status ?? item.status);
  const confirmedTransactionPrice = numberOrNull(item.confirmed_transaction_price);
  const observedAt = dateOrNull(item.observed_at) ?? capturedAt;
  const listedAt = dateOrNull(item.listed_at);
  const soldAt = dateOrNull(item.sold_at ?? item.date_sold_or_closed);
  // Date semantics for the Snake Stocks charts: the price event is anchored at
  // the sale/close date when the listing is sold, otherwise at observation time.
  const marketEventAt = (confirmedTransactionPrice !== null || status === "SOLD")
    ? (soldAt ?? observedAt)
    : observedAt;
  periodDates.add(marketEventAt.slice(0, 10));
  const localityName = normalizeLocalityLabel(ancestry.locality ?? item.locality);
  const locality = localityName ? localityByName.get(localityName.toLowerCase()) ?? null : null;
  const singleAnimal = priceType === "individual" && Number(item.quantity ?? 1) === 1;
  const reviewReasons: string[] = [];
  if (bool(item.review_required) && item.review_reason) reviewReasons.push(text(item.review_reason, 1000));
  if (!singleAnimal) reviewReasons.push("Pair/group listings need review before analytics.");
  if (displayedPrice === null && !inquireOnly) reviewReasons.push("No numeric price captured.");
  if (inquireOnly) reviewReasons.push("Inquire-only price: no numeric price; flagged per contract.");
  if (!priceSane) reviewReasons.push(`Displayed price ${displayedPrice} looks invalid (must be > 0 and <= ${MAX_SANE_PRICE}).`);
  if (!marketCountry) reviewReasons.push("Market country missing.");
  const marketReviewRequired = reviewReasons.length > 0;
  const marketReviewStatus = marketReviewRequired ? "NEEDS_REVIEW" : "QUALIFIED";
  const usMarketEligible = marketCountry === "USA" && singleAnimal && displayedPrice !== null && priceSane;
  const publicOrigin = normalizeOrigin(item.public_origin ?? item.captive_status ?? item.origin_status);
  const sex = normalizeSex(item.sex);
  const ageClass = normalizeAgeClass(item.life_stage ?? item.age_class);
  const neonateColor = normalizeNeonateColor(item.neonate_color);
  const explicitSorterEligibility = typeof item.snake_sorter_eligible === "boolean" ? item.snake_sorter_eligible : null;
  // Pairs/groups can NEVER be admitted: gallery screenshots cannot be
  // attributed to one animal, so one-snake-one-folder would break. An explicit
  // snake_sorter_eligible=true from the harvest is a deliberate call, but it
  // only applies to single-animal listings.
  const sorterEligible = singleAnimal && (explicitSorterEligibility ?? ancestry.snake_sorter_eligible);
  const descHash = description ? descriptionHashFor(description) : null;

  // Relist detection: the same animal sold under a new listing_id must keep its
  // master_animal_id. We never auto-merge — a possible relist is flagged for
  // review so price history is never silently split or wrongly joined.
  let possibleRelistOf: string | null = null;
  if (sellerName && title) {
    const relistResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/gtp_observed_animals?seller_name=eq.${encodeURIComponent(sellerName)}&select=id,source_key,listing_title&limit=50`,
      { headers: h, cache: "no-store" },
    );
    if (relistResponse.ok) {
      const rows = await relistResponse.json() as Array<{ id: string; source_key: string; listing_title: string | null }>;
      const normalizedTitle = title.toLowerCase();
      const match = rows.find((row) => row.source_key !== sourceKey && (row.listing_title ?? "").toLowerCase() === normalizedTitle);
      if (match) possibleRelistOf = match.id;
    }
  }

  const masterResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/gtp_observed_animals?on_conflict=source_key`,
    {
      method: "POST",
      headers: { ...writeHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        species_id: speciesId,
        source_type: "morphmarket",
        source_key: sourceKey,
        source_id: listingId,
        source_url: listingUrl,
        seller_name: sellerName,
        listing_title: title || null,
        normalized_taxon: ancestry.taxon ?? optionalText(item.normalized_taxon ?? item.subspecies, 120),
        normalized_locality: localityName,
        ancestry_class: ancestry.ancestry_class,
        pure_locality: bool(item.pure_locality, ancestry.pure_locality),
        pure_subspecies: bool(item.pure_subspecies, ancestry.pure_subspecies),
        possible_relist_of: possibleRelistOf,
        sex: sex === "UNKNOWN" ? null : sex.toLowerCase(),
        hatch_year: numberOrNull(item.hatch_year),
        life_stage: optionalText(item.life_stage, 40) ?? ancestry.life_stage_hint,
        neonate_color: optionalText(item.neonate_color, 40) ?? ancestry.neonate_color_hint,
        provenance_confidence: optionalText(item.provenance_confidence, 40),
        classification_confidence: optionalText(item.classification_confidence, 40),
        source_metadata: {
          harvest_id: harvestId,
          seller_country: sellerCountry,
          seller_region: sellerRegion,
          market_region: marketRegion,
          description,
          source_record: item,
        },
        last_seen_at: observedAt,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );
  const masterRows = masterResponse.ok ? await masterResponse.json() as MasterRow[] : [];
  const masterAnimalId = masterRows[0]?.id ?? null;
  if (!masterAnimalId) {
    return { ok: false, listing_id: listingId, error: "master animal upsert failed" };
  }

  const existingObservationResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/market_observations?batch_id=eq.${encodeURIComponent(batchId)}&source_listing_id=eq.${encodeURIComponent(listingId)}&select=id,description_hash&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const existingObservationRows = existingObservationResponse.ok
    ? await existingObservationResponse.json() as Array<{ id: string; description_hash: string | null }>
    : [];
  const existingObservation = existingObservationRows[0] ?? null;
  const descriptionChanged = Boolean(
    descHash && existingObservation?.description_hash && existingObservation.description_hash !== descHash,
  );

  const marketPayload = {
    batch_id: batchId,
    source_id: sourceId,
    source_listing_id: listingId,
    species_id: speciesId,
    locality_id: locality?.id ?? null,
    master_animal_id: masterAnimalId,
    observed_at: observedAt,
    listing_status: status,
    price_context: confirmedTransactionPrice !== null ? "CONFIRMED_TRANSACTION" : status === "SOLD" ? "SOLD_DISPLAYED" : "ASKING",
    displayed_price: displayedPrice,
    confirmed_transaction_price: confirmedTransactionPrice,
    currency,
    price_type: priceType,
    price_format: priceFormat,
    inquire_only: inquireOnly,
    price_note: optionalText(item.price_note, 1000),
    auction_ends_at: dateOrNull(item.auction_ends_at ?? item.auction_end_time),
    trade_terms: optionalText(item.trade_terms, 2000),
    payment_plan_terms: optionalText(item.payment_plan_terms, 2000),
    description_hash: descHash,
    description_changed_at: descriptionChanged ? observedAt : (existingObservation ? undefined : null),
    seller_name: sellerName,
    seller_source_id: optionalText(item.seller_source_id, 160),
    listing_url: listingUrl,
    listed_at: listedAt,
    last_seen_at: observedAt,
    sold_at: soldAt,
    raw_origin_label: optionalText(item.raw_origin_label ?? item.captive_status, 120),
    public_origin: publicOrigin,
    origin_subtype: optionalText(item.origin_subtype, 120),
    sex,
    age_class: ageClass,
    neonate_color: neonateColor,
    quantity: Math.max(1, Math.trunc(numberOrNull(item.quantity) ?? 1)),
    is_single_animal_eligible: singleAnimal,
    duplicate_group_key: sourceKey,
    review_status: marketReviewStatus,
    exclusion_reason: marketReviewRequired ? reviewReasons.join(" ") : null,
    raw_record: item,
    market_country: marketCountry,
    seller_country: sellerCountry,
    seller_region: sellerRegion,
    market_region: marketRegion,
    converted_price_usd: convertedPriceUsd,
    fx_rate: fxRate,
    fx_rate_date: fxRateDate,
    fx_source: fxSource,
    us_market_eligible: usMarketEligible,
    ancestry_class: ancestry.ancestry_class,
    normalized_taxon: ancestry.taxon ?? optionalText(item.normalized_taxon ?? item.subspecies, 120),
    pure_locality: bool(item.pure_locality, ancestry.pure_locality),
    pure_subspecies: bool(item.pure_subspecies, ancestry.pure_subspecies),
    updated_at: new Date().toISOString(),
  };

  let marketObservationId: string | null = existingObservation?.id ?? null;
  if (marketObservationId) {
    const patchBody: Record<string, unknown> = { ...marketPayload };
    // Preserve the original change timestamp on later re-observations.
    if (!descriptionChanged) delete patchBody.description_changed_at;
    await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/market_observations?id=eq.${encodeURIComponent(marketObservationId)}`,
      {
        method: "PATCH",
        headers: { ...writeHeaders, Prefer: "return=minimal" },
        body: JSON.stringify(patchBody),
        cache: "no-store",
      },
    );
  } else {
    const marketResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/market_observations`, {
      method: "POST",
      headers: { ...writeHeaders, Prefer: "return=representation" },
      body: JSON.stringify(marketPayload),
      cache: "no-store",
    });
    const marketRows = marketResponse.ok ? await marketResponse.json() as Array<{ id: string }> : [];
    marketObservationId = marketRows[0]?.id ?? null;
  }

  let candidateId: string | null = null;
  let candidateCreated = false;
  if (sorterEligible) {
    const existingCandidateResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?source_key=eq.${encodeURIComponent(sourceKey)}&select=id,reviewed_at&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const existingCandidates = existingCandidateResponse.ok
      ? await existingCandidateResponse.json() as CandidateRow[]
      : [];
    const existingCandidate = existingCandidates[0];

    const candidatePayload: Record<string, unknown> = {
      master_animal_id: masterAnimalId,
      source_type: "morphmarket",
      source_key: sourceKey,
      source_id: listingId,
      source_url: listingUrl,
      title: title || null,
      seller_or_observer: sellerName,
      taxon_raw: "Green Tree Python",
      locality_raw: localityName,
      provisional_taxon: ancestry.taxon ?? optionalText(item.normalized_taxon ?? item.subspecies, 120),
      provisional_locality: localityName,
      life_stage_hint: ancestry.life_stage_hint && ancestry.life_stage_hint !== "unknown" ? ancestry.life_stage_hint : null,
      neonate_color_hint: ancestry.neonate_color_hint && ancestry.neonate_color_hint !== "unknown" ? ancestry.neonate_color_hint : null,
      rights_status: "metadata_only",
      exclusion_reason: null,
      source_metadata: {
        harvest_id: harvestId,
        import_method: "muse_unified_harvest",
        ancestry_class: ancestry.ancestry_class,
        pure_locality: ancestry.pure_locality,
        pure_subspecies: ancestry.pure_subspecies,
        seller_country: sellerCountry,
        gallery_total: numberOrNull(item.gallery_total ?? item.screenshot_count),
        description,
      },
      acquisition_stage: "discovered",
      last_seen_at: observedAt,
    };

    if (existingCandidate) {
      candidateId = existingCandidate.id;
      if (!existingCandidate.reviewed_at) candidatePayload.review_status = "pending";
      await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?id=eq.${encodeURIComponent(candidateId)}`,
        {
          method: "PATCH",
          headers: { ...writeHeaders, Prefer: "return=minimal" },
          body: JSON.stringify(candidatePayload),
          cache: "no-store",
        },
      );
    } else {
      const candidateResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates`, {
        method: "POST",
        headers: { ...writeHeaders, Prefer: "return=representation" },
        body: JSON.stringify({
          ...candidatePayload,
          review_status: "pending",
          created_by: ownerUserId,
        }),
        cache: "no-store",
      });
      const candidateRows = candidateResponse.ok ? await candidateResponse.json() as Array<{ id: string }> : [];
      candidateId = candidateRows[0]?.id ?? null;
      if (candidateId) candidateCreated = true;
    }
  }

  return {
    ok: Boolean(marketObservationId),
    listing_id: listingId,
    master_animal_id: masterAnimalId,
    market_observation_id: marketObservationId,
    candidate_id: candidateId,
    candidate_created: candidateCreated,
    snake_sorter_eligible: sorterEligible,
    us_market_eligible: usMarketEligible,
    market_review_status: marketReviewStatus,
    market_review_reasons: marketReviewRequired ? reviewReasons : [],
    description_changed: descriptionChanged,
    possible_relist_of: possibleRelistOf,
    qualified: marketReviewStatus === "QUALIFIED",
  };
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Owner session expired or missing. Sign in again, then retry the import." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const harvestId = text(body.harvest_id, 160);
  const capturedAtRaw = text(body.captured_at, 40);
  const items = Array.isArray(body.items) ? body.items.filter((item): item is HarvestItem => Boolean(item) && typeof item === "object") : [];

  if (!harvestId || !HARVEST_ID_RE.test(harvestId)) {
    return NextResponse.json(
      { error: "A stable harvest_id is required, in the form HARVEST_MM_GTP_YYYYMMDD_NNN (e.g. HARVEST_MM_GTP_20260924_001)." },
      { status: 400 },
    );
  }
  let capturedAt: string;
  if (capturedAtRaw) {
    const parsed = dateOrNull(capturedAtRaw);
    if (!parsed) return NextResponse.json({ error: "captured_at is not a valid date." }, { status: 400 });
    capturedAt = parsed;
  } else {
    capturedAt = new Date().toISOString();
  }
  if (!items.length || items.length > 500) {
    return NextResponse.json({ error: "Send between 1 and 500 listing records per request. Large harvests can use multiple chunks with the same harvest_id." }, { status: 400 });
  }

  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };
  const writeHeaders = {
    ...h,
    "Content-Type": "application/json",
  };

  const [sourceResponse, speciesResponse] = await Promise.all([
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/market_sources?name=eq.MorphMarket&select=id&limit=1`, { headers: h, cache: "no-store" }),
    fetch(`${SUPABASE_AUTH_URL}/rest/v1/species?slug=eq.green-tree-python&select=id&limit=1`, { headers: h, cache: "no-store" }),
  ]);

  const sourceRows = sourceResponse.ok ? await sourceResponse.json() as Array<{ id: string }> : [];
  const speciesRows = speciesResponse.ok ? await speciesResponse.json() as Array<{ id: string }> : [];
  const sourceId = sourceRows[0]?.id;
  const speciesId = speciesRows[0]?.id;

  if (!sourceId || !speciesId) {
    return NextResponse.json({ error: "MorphMarket source or Green Tree Python species record is missing." }, { status: 502 });
  }

  const localityResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/localities?species_id=eq.${encodeURIComponent(speciesId)}&active=eq.true&select=id,name,slug`,
    { headers: h, cache: "no-store" },
  );
  const localityRows = localityResponse.ok ? await localityResponse.json() as LocalityRow[] : [];
  const localityByName = new Map(localityRows.map((row) => [row.name.toLowerCase(), row]));

  const existingBatchResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/market_import_batches?harvest_id=eq.${encodeURIComponent(harvestId)}&select=id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const existingBatchRows = existingBatchResponse.ok ? await existingBatchResponse.json() as Array<{ id: string }> : [];
  let batchId = existingBatchRows[0]?.id ?? null;

  if (!batchId) {
    const batchResponse = await fetch(`${SUPABASE_AUTH_URL}/rest/v1/market_import_batches`, {
      method: "POST",
      headers: { ...writeHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        source_id: sourceId,
        harvest_id: harvestId,
        label: harvestId,
        observation_kind: "MIXED",
        captured_at: capturedAt,
        source_scope: "MorphMarket Green Tree Pythons · Availability All · worldwide collection · USA default analytics",
        raw_count: 0,
        eligible_count: 0,
        notes: optionalText(body.notes, 2000) ?? "Muse unified Snake Sorter + Snake Stocks harvest.",
      }),
      cache: "no-store",
    });
    const batchRows = batchResponse.ok ? await batchResponse.json() as Array<{ id: string }> : [];
    batchId = batchRows[0]?.id ?? null;
  }

  if (!batchId) return NextResponse.json({ error: "Could not create the market import batch." }, { status: 502 });

  const periodDates = new Set<string>();
  const ctx: ImportContext = {
    h,
    writeHeaders,
    batchId,
    harvestId,
    capturedAt,
    sourceId,
    speciesId,
    localityByName,
    ownerUserId: identity.user.id,
    periodDates,
  };

  const results = await mapWithConcurrency(items, IMPORT_CONCURRENCY, (item) => processListing(item, ctx));

  const storedInChunk = results.filter((r) => r.ok).length;
  const failedInChunk = results.filter((r) => !r.ok).length;
  const qualifiedInChunk = results.filter((r) => r.ok && r.qualified).length;
  const reviewInChunk = results.filter((r) => r.ok && !r.qualified).length;
  const newCandidates = results.filter((r) => r.candidate_created).length;
  const relistFlags = results.filter((r) => r.possible_relist_of).length;
  const descriptionChanges = results.filter((r) => r.description_changed).length;

  const totalCount = await countRows(
    `${SUPABASE_AUTH_URL}/rest/v1/market_observations?batch_id=eq.${encodeURIComponent(batchId)}&select=id`,
    h,
  );
  const eligibleCount = await countRows(
    `${SUPABASE_AUTH_URL}/rest/v1/market_observations?batch_id=eq.${encodeURIComponent(batchId)}&review_status=eq.QUALIFIED&select=id`,
    h,
  );

  await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/market_import_batches?id=eq.${encodeURIComponent(batchId)}`,
    {
      method: "PATCH",
      headers: { ...writeHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ raw_count: totalCount, eligible_count: eligibleCount }),
      cache: "no-store",
    },
  );

  let snapshotRows = 0;
  let snapshotError: string | null = null;
  const refreshResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/rpc/refresh_gtp_market_daily_snapshots`,
    {
      method: "POST",
      headers: writeHeaders,
      body: JSON.stringify({
        p_snapshot_date: capturedAt.slice(0, 10),
        p_market_country: "USA",
      }),
      cache: "no-store",
    },
  );
  if (refreshResponse.ok) {
    const value = await refreshResponse.json().catch(() => 0);
    snapshotRows = Number(value ?? 0);
  } else {
    snapshotError = `daily snapshot refresh failed (HTTP ${refreshResponse.status})`;
  }

  let periodSnapshotRows = 0;
  if (periodDates.size) {
    const periodRefreshResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/rpc/refresh_gtp_market_period_snapshots_for_dates`,
      {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          p_dates: Array.from(periodDates),
          p_market_country: "USA",
        }),
        cache: "no-store",
      },
    );
    if (periodRefreshResponse.ok) {
      const value = await periodRefreshResponse.json().catch(() => 0);
      periodSnapshotRows = Number(value ?? 0);
    } else if (!snapshotError) {
      snapshotError = `period snapshot refresh failed (HTTP ${periodRefreshResponse.status})`;
    }
  }

  return NextResponse.json({
    ok: true,
    harvest_id: harvestId,
    batch_id: batchId,
    received: items.length,
    // Per-chunk counts (use these for per-chunk reconciliation):
    stored_in_this_chunk: storedInChunk,
    failed_in_this_chunk: failedInChunk,
    qualified_in_this_chunk: qualifiedInChunk,
    review_in_this_chunk: reviewInChunk,
    new_snake_sorter_candidates: newCandidates,
    possible_relists_flagged: relistFlags,
    description_changes_detected: descriptionChanges,
    // Batch-cumulative counts (grow as more chunks land in this batch):
    stored_market_observations: totalCount,
    qualified_market_observations: eligibleCount,
    usa_snapshot_rows: snapshotRows,
    usa_period_snapshot_rows: periodSnapshotRows,
    snapshot_refresh_error: snapshotError,
    refreshed_market_dates: Array.from(periodDates).sort(),
    screenshot_upload_endpoint: "/api/snake-sorter/acquisition/media-upload",
    results,
  });
}
