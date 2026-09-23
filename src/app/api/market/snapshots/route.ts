import { NextRequest, NextResponse } from "next/server";
import { supabasePublicFetch } from "@/lib/supabase-public";

type CommonPoint = {
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
};

type DailySnapshotRow = CommonPoint & {
  snapshot_date: string;
};

type PeriodSnapshotRow = CommonPoint & {
  period_start: string;
  period_end: string;
  granularity: "MONTH" | "QUARTER" | "YEAR";
};

type MarketPoint = CommonPoint & {
  point_date: string;
  point_end: string | null;
  granularity: "DAY" | "MONTH" | "QUARTER" | "YEAR";
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

function monthFloor(date: string | null) {
  return date ? `${date.slice(0, 7)}-01` : null;
}

function recentMonthlyCutoff() {
  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - 24);
  const month = now.getUTCMonth();
  const quarterMonth = Math.floor(month / 3) * 3;
  return new Date(Date.UTC(now.getUTCFullYear(), quarterMonth, 1)).toISOString().slice(0, 10);
}

function enumValue(value: string | null, allowed: string[], fallback: string) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/[ -]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}

function pointFromDaily(row: DailySnapshotRow): MarketPoint {
  return {
    ...row,
    point_date: row.snapshot_date,
    point_end: row.snapshot_date,
    granularity: "DAY",
  };
}

function pointFromPeriod(row: PeriodSnapshotRow): MarketPoint {
  return {
    ...row,
    point_date: row.period_start,
    point_end: row.period_end,
    granularity: row.granularity,
  };
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

  const commonFilters = [
    "market_country=eq.USA",
    `view_kind=eq.${viewKind}`,
    `public_origin=eq.${origin}`,
    `sex=eq.${sex}`,
    `age_class=eq.${age}`,
    `neonate_color=eq.${color}`,
    localityId === null ? "locality_id=is.null" : `locality_id=eq.${encodeURIComponent(localityId)}`,
  ];

  const periodSelect = "period_start,period_end,granularity,sample_size,seller_count,source_count,low,q25,median,mean,q75,high,confidence";
  const dailySelect = "snapshot_date,sample_size,seller_count,source_count,low,q25,median,mean,q75,high,confidence";

  let points: MarketPoint[] = [];
  let resolution = "MONTH";

  const useDailyLive = viewKind === "CURRENT_ASKING" && (range === "1M" || range === "3M");

  if (useDailyLive) {
    const filters = [...commonFilters];
    if (startDate) filters.push(`snapshot_date=gte.${startDate}`);
    const dailyRows = await supabasePublicFetch<DailySnapshotRow[]>(
      `market_daily_snapshots?select=${dailySelect}&${filters.join("&")}&order=snapshot_date.asc`,
    );
    points = dailyRows.map(pointFromDaily);
    resolution = "DAY";

    if (!points.length) {
      const fallbackFilters = [...commonFilters, "granularity=eq.MONTH"];
      const periodStart = monthFloor(startDate);
      if (periodStart) fallbackFilters.push(`period_start=gte.${periodStart}`);
      const periodRows = await supabasePublicFetch<PeriodSnapshotRow[]>(
        `market_period_snapshots?select=${periodSelect}&${fallbackFilters.join("&")}&order=period_start.asc`,
      );
      points = periodRows.map(pointFromPeriod);
      resolution = "MONTH";
    }
  } else if (["1M", "3M", "1Y", "3Y"].includes(range)) {
    const filters = [...commonFilters, "granularity=eq.MONTH"];
    const periodStart = monthFloor(startDate);
    if (periodStart) filters.push(`period_start=gte.${periodStart}`);
    const rows = await supabasePublicFetch<PeriodSnapshotRow[]>(
      `market_period_snapshots?select=${periodSelect}&${filters.join("&")}&order=period_start.asc`,
    );
    points = rows.map(pointFromPeriod);
    resolution = "MONTH";
  } else {
    const cutoff = recentMonthlyCutoff();
    const quarterlyFilters = [...commonFilters, "granularity=eq.QUARTER", `period_start=lt.${cutoff}`];
    const quarterStart = monthFloor(startDate);
    if (quarterStart) quarterlyFilters.push(`period_start=gte.${quarterStart}`);

    const monthlyFilters = [...commonFilters, "granularity=eq.MONTH", `period_start=gte.${cutoff}`];

    const quarterlyRows = await supabasePublicFetch<PeriodSnapshotRow[]>(
      `market_period_snapshots?select=${periodSelect}&${quarterlyFilters.join("&")}&order=period_start.asc`,
    );
    const monthlyRows = await supabasePublicFetch<PeriodSnapshotRow[]>(
      `market_period_snapshots?select=${periodSelect}&${monthlyFilters.join("&")}&order=period_start.asc`,
    );

    points = [...quarterlyRows.map(pointFromPeriod), ...monthlyRows.map(pointFromPeriod)]
      .sort((a, b) => a.point_date.localeCompare(b.point_date));
    resolution = "QUARTER_TO_MONTH";
  }

  return NextResponse.json({
    market_country: "USA",
    range,
    locality: localityName || "All localities",
    resolution,
    points,
    latest: points.at(-1) ?? null,
  });
}
