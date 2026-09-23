"use client";

import { useEffect, useMemo, useState } from "react";
import { SnakeStocksPriceChart, type SnakeStocksPricePoint } from "@/components/SnakeStocksPriceChart";

const timeRanges = ["1M", "3M", "1Y", "3Y", "5Y", "10Y", "ALL"];
const origins = ["All origins", "Captive Bred", "Import"];
const colors = ["All neo colors", "Red", "Yellow"];
const sexes = ["All sexes", "Female", "Male"];
const ages = ["All ages", "Neonate", "Juvenile", "Subadult", "Adult"];

const marketGroups = [
  { label: "All market groups", localities: [] },
  { label: "M. a. azurea", localities: ["Numfor"] },
  { label: "M. a. pulcher", localities: ["Timika", "Sorong", "Manokwari", "Arfak", "Kofiau", "Batanta · review"] },
  { label: "M. a. utaraensis", localities: ["Wamena", "Lereh / Highland", "Cyclops", "Jayapura", "Yapen"] },
  { label: "M. viridis", localities: ["Aru", "Merauke", "Biak"] },
  { label: "Designer / line projects", localities: [] },
  { label: "Unspecified", localities: [] },
];

const allLocalities = Array.from(
  new Set(marketGroups.flatMap((group) => group.localities.filter((locality) => !locality.includes("review"))))
);


function money(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—";
}

function ChoiceRow({ label, values, active, onChange }: { label: string; values: string[]; active: string; onChange: (value: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-[9px] font-bold uppercase tracking-[.15em] text-white/25">{label}</div>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        {values.map((value) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${active === value ? "border-emerald-300/30 bg-emerald-300/[.1] text-emerald-100" : "border-white/[.07] bg-white/[.025] text-white/40 hover:text-white/65"}`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SnakeStocksExplorer() {
  const [mode, setMode] = useState<"FOR SALE" | "SOLD HISTORY">("FOR SALE");
  const [time, setTime] = useState("1Y");
  const [marketGroup, setMarketGroup] = useState(marketGroups[0].label);
  const [origin, setOrigin] = useState(origins[0]);
  const [neoColor, setNeoColor] = useState(colors[0]);
  const [sex, setSex] = useState(sexes[0]);
  const [age, setAge] = useState(ages[0]);
  const [locality, setLocality] = useState("All localities");
  const [marketResult, setMarketResult] = useState<{ query: string; points: SnakeStocksPricePoint[] }>({
    query: "",
    points: [],
  });

  const activeGroup = marketGroups.find((group) => group.label === marketGroup) ?? marketGroups[0];
  const localityOptions = [
    "All localities",
    ...(marketGroup === "All market groups" ? allLocalities : activeGroup.localities),
  ];

  const changeMarketGroup = (value: string) => {
    setMarketGroup(value);
    setLocality("All localities");
  };

  const marketQuery = useMemo(() => new URLSearchParams({
    range: time,
    locality,
    view: mode === "FOR SALE" ? "CURRENT_ASKING" : "SOLD_LISTING",
    origin: origin === "Captive Bred" ? "CAPTIVE_BRED" : origin === "Import" ? "IMPORT" : "ALL",
    sex: sex === "Female" ? "FEMALE" : sex === "Male" ? "MALE" : "ALL",
    age: age === "All ages" ? "ALL" : age.toUpperCase(),
    color: neoColor === "Red" ? "RED" : neoColor === "Yellow" ? "YELLOW" : "ALL",
  }).toString(), [time, locality, mode, origin, sex, age, neoColor]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/market/snapshots?${marketQuery}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Market snapshot request failed")))
      .then((payload: { points?: SnakeStocksPricePoint[] }) => {
        setMarketResult({
          query: marketQuery,
          points: Array.isArray(payload.points) ? payload.points : [],
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMarketResult({ query: marketQuery, points: [] });
      });

    return () => controller.abort();
  }, [marketQuery]);

  const marketLoading = marketResult.query !== marketQuery;
  const snapshotPoints = marketLoading ? [] : marketResult.points;
  const latest = snapshotPoints.at(-1) ?? null;

  const context = useMemo(() => {
    const bits = [marketGroup, locality, origin, neoColor, sex, age].filter(
      (value) => !value.startsWith("All ") && value !== "All market groups"
    );
    return bits.length ? bits.join(" · ") : "Entire Green Tree Python market";
  }, [marketGroup, locality, origin, neoColor, sex, age]);

  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-4 border-b border-white/[.06] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300/65">Green Tree Python</div>
          <h2 className="mt-1.5 text-2xl font-semibold">Morelia viridis complex market explorer</h2>
          <p className="mt-2 text-xs text-white/30">Filter market observations by subspecies group, locality, origin, neonate color, sex and age.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span className="rounded-full border border-amber-300/15 bg-amber-300/[.04] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-amber-100/55">{marketLoading ? "Loading market data" : latest ? `${latest.sample_size} reviewed observations` : "Dataset awaiting reviewed observations"}</span>
          <div className="inline-flex w-fit rounded-xl border border-white/[.07] bg-black/15 p-1 text-[11px] font-bold">
            {(["FOR SALE", "SOLD HISTORY"] as const).map((item) => (
              <button key={item} onClick={() => setMode(item)} className={`rounded-lg px-4 py-2 transition ${mode === item ? "bg-emerald-300 text-[#06100c]" : "text-white/38 hover:text-white/60"}`}>{item}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-white/[.06] p-5 xl:grid-cols-3">
        <ChoiceRow label="Time" values={timeRanges} active={time} onChange={setTime} />
        <ChoiceRow label="Market group" values={marketGroups.map((group) => group.label)} active={marketGroup} onChange={changeMarketGroup} />
        <ChoiceRow label="Locality" values={localityOptions} active={locality} onChange={setLocality} />
        <ChoiceRow label="Origin" values={origins} active={origin} onChange={setOrigin} />
        <ChoiceRow label="Neonate color" values={colors} active={neoColor} onChange={setNeoColor} />
        <ChoiceRow label="Sex" values={sexes} active={sex} onChange={setSex} />
        <ChoiceRow label="Age" values={ages} active={age} onChange={setAge} />
      </div>

      <div className="grid grid-cols-2 border-b border-white/[.06] sm:grid-cols-3 lg:grid-cols-6">
        {[
          [mode === "FOR SALE" ? "Median ask" : "Median last-listed", money(latest?.median)],
          ["Typical range", latest ? `${money(latest.q25)}–${money(latest.q75)}` : "—"],
          [mode === "FOR SALE" ? "Eligible current" : "Readable sold", latest ? String(latest.sample_size) : "—"],
          ["Unique sellers", latest ? String(latest.seller_count) : "—"],
          ["Sources", latest ? String(latest.source_count) : "—"],
          ["Confidence", latest?.confidence?.replaceAll("_", " ") ?? (marketLoading ? "Loading" : "Pending")],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-r border-white/[.055] px-4 py-5 lg:border-b-0">
            <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/24">{label}</div>
            <div className="mt-2 text-lg font-semibold text-white/58">{value}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid relative min-h-[330px] overflow-hidden bg-[radial-gradient(circle_at_65%_42%,rgba(57,230,125,.05),transparent_28%)]">
        <SnakeStocksPriceChart
          points={snapshotPoints}
          loading={marketLoading}
          mode={mode}
          range={time}
          context={context}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[.06] bg-black/10 px-5 py-4 text-[10px] leading-5 text-white/28 sm:flex-row sm:items-center sm:justify-between">
        <span>Market group → locality → origin → sex / age / neonate color</span>
        <span className="font-bold uppercase tracking-[.12em] text-emerald-300/45">Median-first analysis</span>
      </div>
    </div>
  );
}