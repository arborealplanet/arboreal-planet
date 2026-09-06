"use client";

import { useState } from "react";

type MarketChartFrameProps = {
  title: string;
  subtitle: string;
  legends?: string[];
  status?: string;
  compact?: boolean;
};

const ranges = ["1M", "3M", "6M", "1Y", "5Y", "ALL"];

export function MarketChartFrame({
  title,
  subtitle,
  legends = [],
  status = "Trend unlocks after enough dated observations accumulate.",
  compact = false,
}: MarketChartFrameProps) {
  const [range, setRange] = useState("1Y");

  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-4 border-b border-white/[.065] px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white sm:text-lg">{title}</h3>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/38 sm:text-sm">{subtitle}</p>
        </div>
        {legends.length ? (
          <div className="flex max-w-full flex-wrap gap-2">
            {legends.map((legend, index) => (
              <span key={legend} className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] bg-black/10 px-2.5 py-1 text-[10px] font-semibold text-white/50">
                <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-emerald-300" : index === 1 ? "bg-cyan-300" : index === 2 ? "bg-amber-200" : "bg-violet-300"}`} />
                {legend}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 border-b border-white/[.055] sm:grid-cols-4">
        {[
          ["Median", "—"],
          ["Q25–Q75", "—"],
          ["Observations", "—"],
          ["Confidence", "Pending"],
        ].map(([label, value], index) => (
          <div key={label} className={`${index ? "border-l border-white/[.05]" : ""} px-4 py-3.5`}>
            <div className="text-[8px] font-bold uppercase tracking-[.14em] text-white/20">{label}</div>
            <div className="mt-1.5 text-sm font-semibold text-white/48">{value}</div>
          </div>
        ))}
      </div>

      <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_62%_34%,rgba(57,230,125,.045),transparent_30%)] ${compact ? "h-64" : "h-80"}`}>
        <div className="absolute inset-x-5 top-4 z-10 flex items-center justify-between text-[8px] font-bold uppercase tracking-[.16em] text-white/18">
          <span>USD · median</span>
          <span>{range}</span>
        </div>

        <div className="absolute inset-x-5 bottom-12 top-10 border-b border-l border-white/[.055]">
          {[20, 40, 60, 80].map((top) => (
            <div key={`h-${top}`} className="absolute inset-x-0 border-t border-white/[.045]" style={{ top: `${top}%` }} />
          ))}
          {[20, 40, 60, 80].map((left) => (
            <div key={`v-${left}`} className="absolute inset-y-0 border-l border-white/[.035]" style={{ left: `${left}%` }} />
          ))}

          <div className="absolute -left-1 top-0 -translate-x-full pr-2 text-[8px] text-white/14">HIGH</div>
          <div className="absolute -left-1 top-1/2 -translate-x-full -translate-y-1/2 pr-2 text-[8px] text-white/14">MID</div>
          <div className="absolute -left-1 bottom-0 -translate-x-full pr-2 text-[8px] text-white/14">LOW</div>

          <div className="absolute inset-0 grid place-items-center px-5 text-center">
            <div className="max-w-sm rounded-2xl border border-white/[.065] bg-[#07100d]/85 px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <div className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-emerald-300/15 bg-emerald-300/[.05] text-sm text-emerald-200/60">↗</div>
              <div className="mt-3 text-sm font-semibold text-white/62">Awaiting qualified observations</div>
              <p className="mt-1.5 text-[11px] leading-5 text-white/30">{status}</p>
            </div>
          </div>

          <div className="absolute bottom-1 left-2 text-[8px] font-medium uppercase tracking-[.12em] text-white/14">Older</div>
          <div className="absolute bottom-1 right-2 text-[8px] font-medium uppercase tracking-[.12em] text-white/14">Recent</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[.055] bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hide-scrollbar flex gap-1 overflow-x-auto">
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={range === item}
              onClick={() => setRange(item)}
              className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black tracking-[.08em] transition ${range === item ? "bg-emerald-300 text-[#06100c]" : "text-white/28 hover:bg-white/[.04] hover:text-white/55"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] font-bold uppercase tracking-[.12em] text-white/18">
          <span>Median line</span>
          <span>Quartile band when supported</span>
          <span>No interpolation</span>
        </div>
      </div>
    </div>
  );
}
