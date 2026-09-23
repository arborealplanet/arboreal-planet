import { NextRequest, NextResponse } from "next/server";
import { supabasePublicFetch } from "@/lib/supabase-public";

type SnapshotRow = {
  snapshot_date: string;
  locality_id: string | null;
  public_origin: string;
  sex: string;
  age_class: string;
  neonate_color: string;
  view_kind: string;
  sample_size: number;
  seller_count: number;
  source_count: number;
  low: number | null;
  q25: number | null;
  median: number | null;
  mean: number | null;
  q75: number | null;
  high: number | null;
  confidence: string;
  market_country: string;
  display_currency: string;
};

function dateFloor(range: string) {
  if (range === "ALL") return null;
  const now = new Date();
  const months =
    range === "1M" ? 1 :
    range === "3M" ? 3 :
    range === "1Y" ? 12 :
    range === "3Y" ? 36 :
    range === "5Y" ? 60 :
    range === "10Y" ? 120 : 12;
  now.setUTCMonth(now.getUTCMonth() - months);
  return now.toISOString().slice(0, 10);
}

function enumValue(value: string | null, allowed: string[], fallback: string) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/[ -]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const range = params.get("range") ?? "1Y";
  const localityName = String(params.get("locality") ?? "").trim();
  const viewKind = enumValue(params.get("view"), ["CURRENT_ASKING","SOLD_LISTING","CONFIRMED_SALE"], "CURRENT_ASKING");
  const origin = enumValue(params.get("origin"), ["ALL","CAPTIVE_BRED","IMPORT","UNKNOWN"], "ALL");
  const sex = enumValue(params.get("sex"), ["ALL","FEMALE","MALE","UNKNOWN"], "ALL");
  const age = enumValue(params.get("age"), ["ALL","NEONATE","JUVENILE","SUBADULT","ADULT","UNKNOWN"], "ALL");
  const color = enumValue(params.get("color"), ["ALL","RED","YELLOW","UNKNOWN","NOT_APPLICABLE"], "ALL");
  const startDate = dateFloor(range);

  let localityId: string | null = null;
  if (localityName && localityName !== "All localities") {
    const lookupName = localityName === "Lereh" ? "Lereh / Highland" : localityName.replace(/ · review$/i, "");
    const localities = await supabasePublicFetch<Array<{ id: string }>>(
      `localities?name=eq.${encodeURIComponent(lookupName)}&active=eq.true&select=id&limit=1`,
    );
    localityId = localities[0]?.id ?? "__missing__";
  }

  const filters = [
    "market_country=eq.USA",
    `view_kind=eq.${viewKind}`,
    `public_origin=eq.${origin}`,
    `sex=eq.${sex}`,
    `age_class=eq.${age}`,
    `neonate_color=eq.${color}`,
    localityId === null ? "locality_id=is.null" : `locality_id=eq.${encodeURIComponent(localityId)}`,
  ];
  if (startDate) filters.push(`snapshot_date=gte.${startDate}`);

  const rows = await supabasePublicFetch<SnapshotRow[]>(
    `market_daily_snapshots?select=snapshot_date,locality_id,public_origin,sex,age_class,neonate_color,view_kind,sample_size,seller_count,source_count,low,q25,median,mean,q75,high,confidence,market_country,display_currency&${filters.join("&")}&order=snapshot_date.asc`,
  );

  return NextResponse.json({
    market_country: "USA",
    range,
    locality: localityName || "All localities",
    points: rows,
    latest: rows.at(-1) ?? null,
  });
}
