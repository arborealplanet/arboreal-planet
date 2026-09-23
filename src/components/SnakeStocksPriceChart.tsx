"use client";

import { useMemo, useState } from "react";

export type SnakeStocksPricePoint = {
  point_date: string;
  point_end?: string | null;
  granularity: "DAY" | "MONTH" | "QUARTER" | "YEAR";
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

function money(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—";
}

function shortMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value);
}

function pointLabel(point: SnakeStocksPricePoint) {
  const date = new Date(`${point.point_date}T00:00:00Z`);
  const year = date.getUTCFullYear();
  if (point.granularity === "YEAR") return String(year);
  if (point.granularity === "QUARTER") return `${year} Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  if (point.granularity === "MONTH") {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" });
}

function confidenceLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SnakeStocksPriceChart({
  points,
  loading,
  mode,
  range,
  context,
}: {
  points: SnakeStocksPricePoint[];
  loading: boolean;
  mode: "FOR SALE" | "SOLD HISTORY";
  range: string;
  context: string;
}) {
  const usable = useMemo(
    () => points.filter((point) => typeof point.median === "number" && Number.isFinite(point.median)),
    [points],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = usable.find((point) => point.point_date === selectedDate) ?? usable.at(-1) ?? null;

  const chart = useMemo(() => {
    if (!usable.length) return null;

    const width = 1000;
    const height = 320;
    const left = 74;
    const right = 24;
    const top = 28;
    const bottom = 52;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const timestamps = usable.map((point) => new Date(`${point.point_date}T00:00:00Z`).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    const candidates = usable.flatMap((point) => [point.q25, point.median, point.q75]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    let minValue = Math.min(...candidates);
    let maxValue = Math.max(...candidates);
    if (minValue === maxValue) {
      minValue = Math.max(0, minValue * 0.85);
      maxValue = maxValue * 1.15 || 1;
    } else {
      const pad = (maxValue - minValue) * 0.12;
      minValue = Math.max(0, minValue - pad);
      maxValue += pad;
    }

    const x = (index: number) => {
      if (usable.length === 1 || minTime === maxTime) return left + plotWidth / 2;
      return left + ((timestamps[index] - minTime) / (maxTime - minTime)) * plotWidth;
    };
    const y = (value: number) => top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

    const medianPath = usable.map((point, index) => `${index ? "L" : "M"} ${x(index).toFixed(2)} ${y(point.median as number).toFixed(2)}`).join(" ");

    const bandPoints = usable
      .map((point, index) => ({ index, q25: point.q25, q75: point.q75 }))
      .filter((point): point is { index: number; q25: number; q75: number } => typeof point.q25 === "number" && typeof point.q75 === "number");

    const bandPath = bandPoints.length >= 2
      ? [
          ...bandPoints.map((point, index) => `${index ? "L" : "M"} ${x(point.index).toFixed(2)} ${y(point.q75).toFixed(2)}`),
          ...bandPoints.slice().reverse().map((point) => `L ${x(point.index).toFixed(2)} ${y(point.q25).toFixed(2)}`),
          "Z",
        ].join(" ")
      : "";

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = maxValue - ((maxValue - minValue) * index) / 4;
      return { value, y: y(value) };
    });

    const tickIndexes = Array.from(new Set([0, Math.round((usable.length - 1) * 0.25), Math.round((usable.length - 1) * 0.5), Math.round((usable.length - 1) * 0.75), usable.length - 1]));

    return { width, height, left, right, top, bottom, plotWidth, plotHeight, x, y, medianPath, bandPath, yTicks, tickIndexes };
  }, [usable]);

  if (loading) {
    return (
      <div className="grid min-h-[330px] place-items-center px-6 text-center">
        <div>
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full border border-emerald-300/20 bg-emerald-300/[.06]" />
          <div className="mt-4 text-sm font-semibold text-white/55">Loading market history</div>
        </div>
      </div>
    );
  }

  if (!chart || !usable.length) {
    return (
      <div className="grid min-h-[330px] place-items-center px-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-emerald-300/15 bg-emerald-300/[.05] text-lg text-emerald-200/60">↗</div>
          <div className="mt-4 text-base font-semibold text-white/62">Market data pending</div>
          <p className="mt-2 text-xs leading-5 text-white/30">Reviewed historical points will appear here as Muse records pass normalization.</p>
        </div>
      </div>
    );
  }

  const latest = usable.at(-1)!;

  return (
    <div className="relative">
      <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[9px] font-medium uppercase tracking-[.15em] text-white/24">{mode === "FOR SALE" ? "Asking-price history" : "Sold-listing history"} · {range}</div>
          <div className="mt-2 text-[10px] text-white/34">{context}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[.12em]">
          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[.04] px-2.5 py-1.5 text-emerald-200/65">Median line</span>
          <span className="rounded-full border border-white/[.07] bg-white/[.02] px-2.5 py-1.5 text-white/35">Q25–Q75 band</span>
          <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[.04] px-2.5 py-1.5 text-cyan-200/60">Latest bucket updates live</span>
        </div>
      </div>

      <div className="overflow-x-auto px-2 pb-1 pt-2">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="min-w-[720px] w-full" role="img" aria-label="Snake Stocks price history chart">
          {chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line x1={chart.left} x2={chart.width - chart.right} y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
              <text x={chart.left - 10} y={tick.y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,.28)">{shortMoney(tick.value)}</text>
            </g>
          ))}

          {chart.tickIndexes.map((index) => (
            <g key={`${usable[index].point_date}-tick`}>
              <line x1={chart.x(index)} x2={chart.x(index)} y1={chart.top} y2={chart.height - chart.bottom} stroke="rgba(255,255,255,.035)" strokeWidth="1" />
              <text x={chart.x(index)} y={chart.height - 22} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.28)">{pointLabel(usable[index])}</text>
            </g>
          ))}

          {chart.bandPath ? <path d={chart.bandPath} fill="rgba(110,231,183,.10)" stroke="none" /> : null}
          <path d={chart.medianPath} fill="none" stroke="rgba(110,231,183,.88)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

          {usable.map((point, index) => {
            const active = selected?.point_date === point.point_date;
            const isLatest = point.point_date === latest.point_date;
            return (
              <g key={`${point.point_date}-point`} onClick={() => setSelectedDate(point.point_date)} className="cursor-pointer">
                <circle cx={chart.x(index)} cy={chart.y(point.median as number)} r={active ? 7 : isLatest ? 6 : 4.5} fill={active ? "rgba(255,255,255,.95)" : "rgba(110,231,183,.95)"} stroke="rgba(4,17,12,.9)" strokeWidth="2" />
                <circle cx={chart.x(index)} cy={chart.y(point.median as number)} r="14" fill="transparent">
                  <title>{pointLabel(point)} · Median {money(point.median)} · {point.sample_size} observations</title>
                </circle>
              </g>
            );
          })}

          {usable.length > 1 ? (
            <text x={chart.x(usable.length - 1)} y={Math.max(16, chart.y(latest.median as number) - 14)} textAnchor="middle" fontSize="9" fontWeight="700" fill="rgba(103,232,249,.78)">LIVE</text>
          ) : null}
        </svg>
      </div>

      {selected ? (
        <div className="mx-5 mb-5 grid gap-2 rounded-2xl border border-white/[.07] bg-black/15 p-4 sm:grid-cols-5">
          <div><div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/22">Period</div><div className="mt-1 text-xs font-semibold text-white/62">{pointLabel(selected)}</div></div>
          <div><div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/22">Median</div><div className="mt-1 text-xs font-semibold text-emerald-200/80">{money(selected.median)}</div></div>
          <div><div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/22">Middle 50%</div><div className="mt-1 text-xs font-semibold text-white/58">{money(selected.q25)}–{money(selected.q75)}</div></div>
          <div><div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/22">Sample</div><div className="mt-1 text-xs font-semibold text-white/58">{selected.sample_size} · {selected.seller_count} sellers</div></div>
          <div><div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/22">Confidence</div><div className="mt-1 text-xs font-semibold text-white/58">{confidenceLabel(selected.confidence)}</div></div>
        </div>
      ) : null}
    </div>
  );
}
