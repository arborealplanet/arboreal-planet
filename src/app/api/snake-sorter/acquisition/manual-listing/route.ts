import { NextRequest, NextResponse } from "next/server";
import { classifyGtpListing, normalizeAgeClass, normalizeLocalityLabel, normalizeNeonateColor } from "@/lib/gtp-harvest";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

// Same listing-URL shape the harvest import accepts (any MorphMarket region).
const MM_LISTING_RE = /^https:\/\/(?:www\.)?morphmarket\.com\/[a-z]{2}\/c\/reptiles\/pythons\/green-tree-pythons\/(\d+)\/?(?:\?.*)?$/i;

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Owner session expired or missing. Sign in again, then retry." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const sourceUrl = String(body.source_url ?? "").trim();
  const title = String(body.title ?? "").trim().slice(0, 255);
  const match = sourceUrl.match(MM_LISTING_RE);

  if (!match) {
    return NextResponse.json({ error: "Paste a Green Tree Python listing URL from MorphMarket." }, { status: 400 });
  }

  // Run the same classifier the harvest import uses so manual listings get
  // real taxonomy instead of free-text guesses.
  const decision = classifyGtpListing(title, "");
  const locality = normalizeLocalityLabel(body.locality) ?? decision.locality;
  const lifeStageHint = (() => {
    const normalized = normalizeAgeClass(body.life_stage);
    return normalized === "UNKNOWN" ? (decision.life_stage_hint ?? null) : normalized.toLowerCase();
  })();
  const neonateColorHint = (() => {
    const normalized = normalizeNeonateColor(body.neonate_color);
    return normalized === "UNKNOWN" ? (decision.neonate_color_hint ?? null) : normalized.toLowerCase();
  })();

  const sourceId = match[1];
  const sourceKey = `morphmarket:${sourceId}`;
  const now = new Date().toISOString();
  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  // Upsert on source_key: idempotent, no check-then-insert race.
  const upsertResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?on_conflict=source_key`,
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
        title: title || `MorphMarket listing ${sourceId}`,
        taxon_raw: "Green Tree Python",
        locality_raw: locality,
        provisional_taxon: decision.taxon,
        provisional_locality: locality,
        life_stage_hint: lifeStageHint,
        neonate_color_hint: neonateColorHint,
        rights_status: "metadata_only",
        review_status: "pending",
        source_metadata: {
          discovery_method: "owner_manual_listing",
          media_downloaded: false,
          ancestry_class: decision.ancestry_class,
          pure_locality: decision.pure_locality,
          pure_subspecies: decision.pure_subspecies,
          locality_mentions: decision.localities,
        },
        created_by: identity.user.id,
        acquisition_stage: "discovered",
        last_seen_at: now,
        updated_at: now,
      }),
      cache: "no-store",
    },
  );

  const rows = upsertResponse.ok ? await upsertResponse.json() as Array<Record<string, unknown>> : [];
  if (!upsertResponse.ok || !rows[0]) {
    return NextResponse.json({ error: "Could not add MorphMarket listing." }, { status: 502 });
  }

  return NextResponse.json(
    {
      ok: true,
      candidate: rows[0],
      created: true,
      ancestry_class: decision.ancestry_class,
      snake_sorter_eligible: decision.snake_sorter_eligible,
    },
    { status: 201 },
  );
}
