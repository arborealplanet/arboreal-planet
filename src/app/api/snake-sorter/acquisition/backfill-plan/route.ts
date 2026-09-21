import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const h = {
    apikey: SUPABASE_AUTH_KEY,
    Authorization: `Bearer ${identity.token}`,
    Accept: "application/json",
  };

  const candidatesResponse = await fetch(
    `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_candidates?source_type=eq.morphmarket&select=id,source_key,title,review_status,exclusion_reason,provisional_locality,locality_raw,thumbnail_url,neonate_color_hint,life_stage_hint,discovered_at`,
    { headers: h, cache: "no-store" },
  );
  if (!candidatesResponse.ok) {
    return NextResponse.json({ error: "Could not inspect MorphMarket candidates." }, { status: 502 });
  }

  const candidates = await candidatesResponse.json() as Array<{
    id: string;
    review_status: string;
    exclusion_reason: string | null;
    provisional_locality: string | null;
    locality_raw: string | null;
    thumbnail_url: string | null;
    source_key: string;
    title: string | null;
    neonate_color_hint: string | null;
    life_stage_hint: string | null;
    discovered_at: string;
  }>;

  const ids = candidates.map((candidate) => candidate.id);
  let mediaRows: Array<{
    candidate_id: string;
    source_media_url: string | null;
    staged_storage_path: string | null;
    live_reference_status: string | null;
  }> = [];
  if (ids.length) {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/snake_sorter_acquisition_media?candidate_id=in.(${ids.map(encodeURIComponent).join(",")})&select=candidate_id,source_media_url,staged_storage_path,live_reference_status`,
      { headers: h, cache: "no-store" },
    );
    if (response.ok) mediaRows = await response.json() as typeof mediaRows;
  }

  const usableMedia = new Set<string>();
  for (const row of mediaRows) {
    const staged = Boolean(row.staged_storage_path);
    const liveUsable =
      Boolean(row.source_media_url) &&
      !["unavailable","blocked","expired"].includes(String(row.live_reference_status ?? "unknown"));
    if (staged || liveUsable) usableMedia.add(row.candidate_id);
  }
  const missing = candidates.filter((candidate) => !usableMedia.has(candidate.id));
  const eligible = missing.filter((candidate) =>
    !candidate.exclusion_reason &&
    ["pending","approved"].includes(candidate.review_status),
  );

  const localityCounts = new Map<string, number>();
  for (const candidate of eligible) {
    const locality = candidate.provisional_locality || candidate.locality_raw || "Unknown";
    localityCounts.set(locality, (localityCounts.get(locality) ?? 0) + 1);
  }

  const priorityScore = (candidate: (typeof eligible)[number]) => {
    const locality = candidate.provisional_locality || candidate.locality_raw || "Unknown";
    const rarity = localityCounts.get(locality) ?? eligible.length;
    let score = 0;
    if (candidate.review_status === "approved") score += 1000;
    if (candidate.neonate_color_hint === "red") score += 300;
    if (candidate.life_stage_hint === "hatchling" || candidate.life_stage_hint === "neonate") score += 180;
    if (locality !== "Unknown") score += 120;
    score += Math.max(0, 100 - rarity);
    return score;
  };

  const suggestedPriority = [...eligible]
    .sort((a, b) => priorityScore(b) - priorityScore(a) || a.discovered_at.localeCompare(b.discovered_at))
    .slice(0, 12)
    .map((candidate) => ({
      id: candidate.id,
      source_key: candidate.source_key,
      title: candidate.title,
      locality: candidate.provisional_locality || candidate.locality_raw || "Unknown",
      neonate_color_hint: candidate.neonate_color_hint,
      life_stage_hint: candidate.life_stage_hint,
      review_status: candidate.review_status,
      priority_score: priorityScore(candidate),
    }));

  return NextResponse.json({
    ok: true,
    live_collection_started: false,
    morphmarket_candidates: candidates.length,
    candidates_with_media: candidates.length - missing.length,
    candidates_missing_media: missing.length,
    eligible_for_future_backfill: eligible.length,
    excluded_from_backfill: missing.length - eligible.length,
    candidates_with_preview_thumbnail: candidates.filter((candidate) => Boolean(candidate.thumbnail_url)).length,
    suggested_priority: suggestedPriority,
    by_locality: [...localityCounts.entries()]
      .map(([locality, count]) => ({ locality, count }))
      .sort((a, b) => b.count - a.count || a.locality.localeCompare(b.locality)),
  });
}
