import { NextRequest, NextResponse } from "next/server";
import {
  classifyGtpListing,
  normalizeAgeClass,
  normalizeListingStatus,
  normalizeMarketCountry,
  normalizeNeonateColor,
  normalizeOrigin,
  normalizePriceType,
  normalizeSex,
} from "@/lib/gtp-harvest";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

type HarvestItem = Record<string, unknown>;

type MasterRow = { id: string };
type CandidateRow = { id: string; reviewed_at: string | null };
type LocalityRow = { id: string; name: string; slug: string };

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

function normalizeLocalityName(value: unknown) {
  const raw = text(value, 120);
  if (!raw) return null;
  if (/^lereh$/i.test(raw)) return "Lereh / Highland";
  if (/^numfoor$/i.test(raw)) return "Numfor";
  return raw;
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
      locality: normalizeLocalityName(item.normalized_locality ?? item.locality),
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

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const harvestId = text(body.harvest_id, 160);
  const capturedAt = dateOrNull(body.captured_at) ?? new Date().toISOString();
  const items = Array.isArray(body.items) ? body.items.filter((item): item is HarvestItem => Boolean(item) && typeof item === "object") : [];

  if (!harvestId || !/^HARVEST_[A-Z0-9_-]+$/i.test(harvestId)) {
    return NextResponse.json({ error: "A stable harvest_id is required." }, { status: 400 });
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

  const results: Array<Record<string, unknown>> = [];
  let newCandidates = 0;
  let qualifiedMarket = 0;
  let reviewMarket = 0;

  for (const item of items) {
    const listingId = text(item.listing_id ?? item.source_listing_id, 120);
    const listingUrl = text(item.listing_url ?? item.source_url, 1000);
    if (!listingId || !listingUrl) {
      results.push({ ok: false, listing_id: listingId || null, error: "listing_id and listing_url are required" });
      continue;
    }

    const sourceKey = `morphmarket:${listingId}`;
    const title = text(item.listing_title ?? item.title, 255);
    const description = text(item.listing_description ?? item.description, 12000);
    const sellerName = optionalText(item.seller_name ?? item.seller, 255);
    const ancestry = ancestryFromItem(item, title, description);
    const marketCountry = normalizeMarketCountry(item.market_country ?? item.seller_country);
    const sellerCountry = normalizeMarketCountry(item.seller_country ?? item.market_country);
    const sellerRegion = optionalText(item.seller_region ?? item.seller_state_or_region, 160);
    const marketRegion = optionalText(item.market_region, 160);
    const priceType = normalizePriceType(item.price_type);
    const displayedPrice = numberOrNull(item.original_price ?? item.asking_price ?? item.price);
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
    const localityName = normalizeLocalityName(ancestry.locality ?? item.locality);
    const locality = localityName ? localityByName.get(localityName.toLowerCase()) ?? null : null;
    const singleAnimal = priceType === "individual" && Number(item.quantity ?? 1) === 1;
    const marketReviewRequired = bool(item.review_required) || !singleAnimal || displayedPrice === null || !marketCountry;
    const marketReviewStatus = marketReviewRequired ? "NEEDS_REVIEW" : "QUALIFIED";
    const usMarketEligible = marketCountry === "USA" && singleAnimal && displayedPrice !== null;
    const publicOrigin = normalizeOrigin(item.public_origin ?? item.captive_status ?? item.origin_status);
    const sex = normalizeSex(item.sex);
    const ageClass = normalizeAgeClass(item.life_stage ?? item.age_class);
    const neonateColor = normalizeNeonateColor(item.neonate_color);
    const explicitSorterEligibility = typeof item.snake_sorter_eligible === "boolean" ? item.snake_sorter_eligible : null;
    // Pairs/groups can never be auto-admitted: gallery screenshots cannot be
    // attributed to one animal, so one-snake-one-folder would break. An explicit
    // snake_sorter_eligible=true from the harvest still overrides (deliberate call).
    const autoEligible = (explicitSorterEligibility ?? ancestry.snake_sorter_eligible) && singleAnimal;
    const sorterEligible = explicitSorterEligibility === true || autoEligible;

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
      results.push({ ok: false, listing_id: listingId, error: "master animal upsert failed" });
      continue;
    }

    const existingObservationResponse = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/market_observations?batch_id=eq.${encodeURIComponent(batchId)}&source_listing_id=eq.${encodeURIComponent(listingId)}&select=id&limit=1`,
      { headers: h, cache: "no-store" },
    );
    const existingObservationRows = existingObservationResponse.ok
      ? await existingObservationResponse.json() as Array<{ id: string }>
      : [];

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
      exclusion_reason: marketReviewRequired ? optionalText(item.review_reason, 1000) ?? "Market record needs review before analytics." : null,
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
      price_type: priceType,
      ancestry_class: ancestry.ancestry_class,
      normalized_taxon: ancestry.taxon ?? optionalText(item.normalized_taxon ?? item.subspecies, 120),
      pure_locality: bool(item.pure_locality, ancestry.pure_locality),
      pure_subspecies: bool(item.pure_subspecies, ancestry.pure_subspecies),
      updated_at: new Date().toISOString(),
    };

    let marketObservationId: string | null = existingObservationRows[0]?.id ?? null;
    if (marketObservationId) {
      await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/market_observations?id=eq.${encodeURIComponent(marketObservationId)}`,
        {
          method: "PATCH",
          headers: { ...writeHeaders, Prefer: "return=minimal" },
          body: JSON.stringify(marketPayload),
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

    if (marketReviewStatus === "QUALIFIED") qualifiedMarket += 1;
    else reviewMarket += 1;

    let candidateId: string | null = null;
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
            created_by: identity.user.id,
          }),
          cache: "no-store",
        });
        const candidateRows = candidateResponse.ok ? await candidateResponse.json() as Array<{ id: string }> : [];
        candidateId = candidateRows[0]?.id ?? null;
        if (candidateId) newCandidates += 1;
      }
    }

    results.push({
      ok: Boolean(marketObservationId),
      listing_id: listingId,
      master_animal_id: masterAnimalId,
      market_observation_id: marketObservationId,
      candidate_id: candidateId,
      snake_sorter_eligible: sorterEligible,
      us_market_eligible: usMarketEligible,
      market_review_status: marketReviewStatus,
    });
  }

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
  }

  return NextResponse.json({
    ok: true,
    harvest_id: harvestId,
    batch_id: batchId,
    received: items.length,
    stored_market_observations: totalCount,
    qualified_market_observations: eligibleCount,
    qualified_in_this_chunk: qualifiedMarket,
    review_in_this_chunk: reviewMarket,
    new_snake_sorter_candidates: newCandidates,
    usa_snapshot_rows: snapshotRows,
    screenshot_upload_endpoint: "/api/snake-sorter/acquisition/media-upload",
    results,
  });
}
