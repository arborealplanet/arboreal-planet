# Muse → GTP Harvest Import Contract

This repository accepts one structured Green Tree Python harvest and routes it into both Snake Stocks and Snake Sorter. Facebook harvests route into Snake Sorter only — no market data is ever collected from Facebook.

## 1. Metadata import

Authenticated owner endpoint:

`POST /api/gtp-harvest/import`

Send JSON:

```json
{
  "harvest_id": "HARVEST_MM_GTP_20260923_001",
  "captured_at": "2026-09-23T14:00:00Z",
  "market_country": "USA",
  "items": [
    {
      "listing_id": "123456",
      "source_url": "https://www.morphmarket.com/us/c/reptiles/pythons/green-tree-pythons/123456",
      "title": "Pure Jayapura female",
      "description": "...",
      "seller_name": "Example Breeder",
      "seller_country": "USA",
      "market_country": "USA",
      "listing_status": "available",
      "observed_at": "2024-06-15T12:00:00Z",
      "listed_at": "2024-06-10T00:00:00Z",
      "sold_at": null,
      "price": 1500,
      "price_currency": "USD",
      "price_type": "individual",
      "price_format": "fixed",
      "locality": "Jayapura",
      "sex": "female",
      "life_stage": "juvenile",
      "neonate_color": "red"
    }
  ]
}
```

`harvest_id` must match `HARVEST_MM_GTP_YYYYMMDD_NNN`. Up to 500 listings may be sent per request; large harvests can be chunked while reusing the same `harvest_id`. The response separates per-chunk counts (`stored_in_this_chunk`, `failed_in_this_chunk`, `qualified_in_this_chunk`, `review_in_this_chunk`) from batch-cumulative totals — use the per-chunk counts for chunk reconciliation.

The response returns, per listing:

- `master_animal_id`
- `market_observation_id`
- `candidate_id` when the animal qualifies for Snake Sorter acquisition
- `us_market_eligible`
- `market_review_status` (`QUALIFIED` or `NEEDS_REVIEW` with reasons)
- `description_changed` when the listing description differs from the last observation
- `possible_relist_of` when the listing looks like a relist of a known animal

Repeated imports update the same harvest/listing records instead of multiplying them.

### Listing statuses

`listing_status` normalizes to `ACTIVE`, `SOLD`, `PENDING`, `UNLISTED`, `REMOVED`, or `UNKNOWN`. `PENDING` (sale pending) and `UNLISTED` (delisted) are distinct terminal-ish states — never conflate them with `SOLD`.

### Price edge cases

`price_type` is restricted to `individual | pair | group | unknown`. How the price is offered belongs in `price_format` (`fixed | auction | inquire | trade | payment_plan | unknown`) plus the dedicated fields: `inquire_only`, `auction_ends_at`, `trade_terms`, `payment_plan_terms`, `price_note`. An unrecognized format is `unknown` — never guessed as `fixed`. Pairs and groups never create Snake Sorter candidates.

### Historical date semantics

Snake Stocks separates **capture time** from **market time**:

- `captured_at` = when Muse collected/imported the record.
- `observed_at` = the date the displayed price is documented to represent. For a historical backfill, send the historical source date here rather than today's scrape date.
- `listed_at` = original listing date when known.
- `sold_at` = sold/closed date when known. Sold and confirmed-sale charts use `sold_at` when available, otherwise `observed_at`.

Do not invent a historical month or day. If the source cannot support a historical date, leave the record as a current capture by omitting `observed_at`; the importer will use `captured_at`.

Each accepted market date automatically refreshes true monthly, quarterly, and yearly aggregate snapshots. These aggregates are calculated from the underlying listing prices, not by averaging pre-aggregated medians.

### Relists and merges

A listing that matches another listing from the same seller with the same normalized title sets `possible_relist_of` on the master animal for reviewer confirmation — imports never merge animals automatically. Reviewer-confirmed merges are recorded in `gtp_animal_merges` (from → into, reason, evidence, who/when) and can be reverted; they are never silent row surgery.

### Facebook platform payloads

The same endpoint also accepts Facebook harvests for Snake Sorter (no market data — prices are never collected from Facebook):

```json
{
  "harvest_id": "HARVEST_FB_GTP_20260924_001",
  "source_platform": "facebook",
  "captured_at": "2026-09-24T14:00:00Z",
  "items": [
    {
      "post_id": "2925426421144507",
      "source_url": "https://facebook.com/groups/967131100307392/permalink/2925426421144507/",
      "group_or_page": { "name": "Green Tree Pythons", "url": "https://facebook.com/groups/967131100307392" },
      "poster_name": "Example Keeper",
      "post_created_at": "2026-09-20T18:30:00Z",
      "post_text": "Pure Biak female, captive bred",
      "locality_claims_verbatim": "Biak",
      "origin_claims_verbatim": "captive bred",
      "localities_normalized": ["Biak"],
      "pure_subspecies": true,
      "ancestry_class": "pure_locality",
      "facets": { "subspecies": "Morelia azurea utaraensis", "sex": "female" },
      "photo_total": 7
    }
  ]
}
```

`harvest_id` must match `HARVEST_FB_GTP_YYYYMMDD_NNN` and `source_platform` must be `"facebook"` (MorphMarket payloads keep `HARVEST_MM_GTP_…` with `source_platform: "morphmarket"`; id prefix and platform are cross-checked).

Facebook items key on `facebook:<post_id>` — `post_id` explicit, else parsed from `/permalink/<id>`, `/posts/<id>`, `/posts/pfbid<id>`, or `/reel/<id>` URLs, never invented. They create/update `gtp_observed_animals` with `source_type: "facebook"`, preserving post metadata and verbatim claims. Eligible pure-locality / same-subspecies-locality-cross animals get Snake Sorter acquisition candidates (`review_status: pending`); cross-subspecies, hybrid, and designer animals are excluded; unknown ancestry goes to review. No market observations, import batches, prices, or snapshot refreshes are written for Facebook items.

Possible reposts (same poster + same post text as a known Facebook animal) set `possible_repost_of` on the master animal for reviewer confirmation — never auto-merged.

For screenshot uploads of Facebook records, `source_media_url` is the Facebook post permalink — never a CDN/image URL.

## 2. Screenshot upload

For every unique screenshot belonging to a returned Snake Sorter `candidate_id`:

`POST /api/snake-sorter/acquisition/media-upload`

Use multipart form data:

- `candidate_id`
- `file` (JPEG/PNG/WebP, ≤ 15 MB)
- `gallery_index` + `gallery_total` — must be sent together; the index must be within the total
- `image_subject` — normally `listed_animal`; reviewers can correct it later
- `source_capture_kind` — `screenshot`
- `source_media_url` — the MorphMarket **listing page** URL, never a CDN/image URL
- `perceptual_hash` — 64-bit dHash as exactly 16 lowercase hex chars

The upload endpoint calculates SHA-256 itself. Duplicates are linked, not silently dropped:

- Same candidate + same bytes (or same source photo): rejected with 409 — the photo is already represented.
- Different candidate + same bytes or perceptually near-identical photo (Hamming distance ≤ 8 on the dHash, so resizes/recompressions/crops are caught): no new bytes are stored; a linked media row is created (`duplicate_of` → the canonical row, shared `canonical_photo_id`) and an occurrence is recorded in `snake_sorter_media_occurrences` — the same photo under another listing is relist evidence.

Screenshots are stored in the private `snake-sorter-acquisition` bucket and remain staged until review. They are not automatically treated as final training/reference images. Candidates that were rejected or excluded cannot accept uploads.

Two sibling entry points share the same storage pipeline (same dedup, same gallery accounting, same rollback): `POST /api/snake-sorter/acquisition/browser-capture` (base64 JSON, used by the browser helper) and `POST /api/snake-sorter/acquisition/capture-result` (multipart, used by capture jobs). The legacy `browser-import` endpoint is retired (410).

## 3. Snake Stocks routing

Each listing creates or updates one `market_observations` row for that harvest.

Multiple screenshots never create multiple price observations.

Default market snapshots are generated for `market_country = USA`. International records may be stored and converted to USD but remain assigned to their actual market.

Snake Stocks maintains two complementary time-series layers:

- **Daily current snapshots** for forward/live market movement.
- **Event-period snapshots** calculated directly from dated observations for monthly, quarterly, and yearly historical charts.

The public chart uses monthly points for recent history and quarterly points for older history, while preserving the original dated observation underneath so the display resolution can change later without losing source detail.

## 4. Snake Sorter routing

A shared `gtp_observed_animals` record links the market listing and Snake Sorter candidate.

Documented pure-locality animals and same-subspecies locality crosses may enter acquisition review. Cross-subspecies, designer, hybrid animals are rejected; unresolved ancestry goes to `needs_review` — never auto-rejected, never auto-accepted.

## 5. De-duplication

Identity layers:

1. Stable MorphMarket listing/source key
2. Shared master animal ID
3. SHA-256 exact screenshot hash
4. Perceptual screenshot fingerprint (16-char dHash, Hamming distance ≤ 8)
5. Canonical photo linkage (`duplicate_of` / `canonical_photo_id`) plus occurrence records
6. Gallery index/total accounting — expected slots, captured slots, missing slots are reconciled explicitly; no silent gaps
