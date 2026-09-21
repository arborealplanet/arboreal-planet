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

export async function POST(request: NextRequest) {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const sourceUrl = String(body.source_url ?? "").trim();
  const title = String(body.title ?? "").trim().slice(0, 255);
  const locality = String(body.locality ?? "").trim().slice(0, 120) || null;
  const lifeStage = String(body.life_stage ?? "").trim().slice(0, 40) || null;
  const color = String(body.neonate_color ?? "").trim().slice(0, 40) || null;
  const match = sourceUrl.match(MM_LISTING_RE);

  if (!match) {
    return NextResponse.json({ error: "Paste a Green Tree Python listing URL from MorphMarket." }, { status: 400 });
  }

  const sourceId = match[1];
  const sourceKey = `morphmarket:${sourceId}`;
  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  const existingResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?source_key=eq.${encodeURIComponent(sourceKey)}&select=*&limit=1`,
    { headers: h, cache: "no-store" },
  );
  const existing = existingResponse.ok ? await existingResponse.json() as Array<Record<string, unknown>> : [];
  if (existing[0]) {
    return NextResponse.json({ ok: true, candidate: existing[0], created: false });
  }

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
        title: title || `MorphMarket listing ${sourceId}`,
        taxon_raw: "Green Tree Python",
        locality_raw: locality,
        provisional_locality: locality,
        life_stage_hint: lifeStage,
        neonate_color_hint: color,
        rights_status: "metadata_only",
        review_status: "pending",
        source_metadata: {
          discovery_method: "owner_manual_listing",
          media_downloaded: false,
          browser_helper_import: false,
        },
        created_by: identity.user.id,
        acquisition_stage: "discovered",
      }),
      cache: "no-store",
    },
  );

  const rows = createResponse.ok ? await createResponse.json() as Array<Record<string, unknown>> : [];
  if (!createResponse.ok || !rows[0]) {
    return NextResponse.json({ error: "Could not add MorphMarket listing." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, candidate: rows[0], created: true }, { status: 201 });
}
