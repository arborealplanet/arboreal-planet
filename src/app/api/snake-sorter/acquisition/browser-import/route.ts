import { NextResponse } from "next/server";

/**
 * Retired. This legacy browser-helper import stored MorphMarket CDN image URLs
 * and hardcoded every image as the advertised animal, violating the harvest
 * capture protocol (screenshots only, never CDN URLs; never label every
 * gallery image as the advertised animal by default).
 *
 * Canonical pipeline: POST /api/gtp-harvest/import (records first), then
 * upload eligible screenshots to /api/snake-sorter/acquisition/media-upload.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "browser-import is retired. Use POST /api/gtp-harvest/import for listing records, then /api/snake-sorter/acquisition/media-upload for screenshots.",
      retired: true,
      canonical_import: "/api/gtp-harvest/import",
      canonical_upload: "/api/snake-sorter/acquisition/media-upload",
    },
    { status: 410 },
  );
}
