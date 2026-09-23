# Muse → GTP Harvest Import Contract

This repository accepts one structured Green Tree Python harvest and routes it into both Snake Stocks and Snake Sorter.

## 1. Metadata import

Authenticated owner endpoint:

`POST /api/gtp-harvest/import`

Send JSON:

```json
{
  "harvest_id": "HARVEST_MM_GTP_20260923_001",
  "captured_at": "2026-09-23T14:00:00Z",
  "items": [
    {
      "listing_id": "123456",
      "listing_url": "https://www.morphmarket.com/us/c/reptiles/pythons/green-tree-pythons/123456",
      "listing_title": "Pure Jayapura female",
      "listing_description": "...",
      "seller_name": "Example Breeder",
      "seller_country": "USA",
      "market_country": "USA",
      "listing_status": "available",
      "observed_at": "2024-06-15T12:00:00Z",
      "listed_at": "2024-06-10T00:00:00Z",
      "sold_at": null,
      "original_price": 1500,
      "original_currency": "USD",
      "price_type": "individual",
      "subspecies": "Morelia azurea utaraensis",
      "locality": "Jayapura",
      "ancestry_class": "pure_locality",
      "pure_locality": true,
      "pure_subspecies": true,
      "snake_sorter_eligible": true,
      "sex": "female",
      "life_stage": "juvenile",
      "neonate_color": "red",
      "screenshot_count": 6
    }
  ]
}
```

Up to 500 listings may be sent per request. Large harvests can be chunked while reusing the same `harvest_id`.

The response returns, per listing:

- `master_animal_id`
- `market_observation_id`
- `candidate_id` when the animal qualifies for Snake Sorter acquisition
- `us_market_eligible`
- `market_review_status`

Repeated imports update the same harvest/listing records instead of multiplying them.

### Historical date semantics

Snake Stocks now separates **capture time** from **market time**:

- `captured_at` = when Muse collected/imported the record.
- `observed_at` = the date the displayed price is documented to represent. For a historical backfill, send the historical source date here rather than today's scrape date.
- `listed_at` = original listing date when known.
- `sold_at` = sold/closed date when known. Sold and confirmed-sale charts use `sold_at` when available, otherwise `observed_at`.

Do not invent a historical month or day. If the source cannot support a historical date, leave the record as a current capture by omitting `observed_at`; the importer will use `captured_at`.

Each accepted market date automatically refreshes true monthly, quarterly, and yearly aggregate snapshots. These aggregates are calculated from the underlying listing prices, not by averaging pre-aggregated medians.

## 2. Screenshot upload

For every unique screenshot belonging to a returned Snake Sorter `candidate_id`:

`POST /api/snake-sorter/acquisition/media-upload`

Use multipart form data:

- `candidate_id`
- `file`
- `gallery_index`
- `gallery_total`
- `image_subject` — normally `listed_animal`
- `source_capture_kind` — `screenshot`
- `source_media_url` when available
- `perceptual_hash` when Muse can provide a stable perceptual fingerprint

The upload endpoint calculates SHA-256 itself and rejects exact duplicate files. When `perceptual_hash` is supplied, it also rejects an already represented source photograph with that fingerprint.

Screenshots are stored in the private `snake-sorter-acquisition` bucket and remain staged until review. They are not automatically treated as final training/reference images.

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

Documented pure-locality animals and same-subspecies locality crosses may enter acquisition review. Cross-subspecies, designer, hybrid, or unresolved ancestry stays out of automatic Snake Sorter candidacy while remaining available to market analysis.

## 5. De-duplication

Identity layers:

1. Stable MorphMarket listing/source key
2. Shared master animal ID
3. SHA-256 exact screenshot hash
4. Optional perceptual screenshot fingerprint
5. Gallery index and source media URL where available

All images from one animal remain grouped under one candidate/master animal.
