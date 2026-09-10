"use client";

import { useMemo, useState } from "react";

const timeRanges = ["1M", "3M", "1Y", "3Y", "5Y", "10Y", "ALL"];
const origins = ["All origins", "Captive Bred", "Import"];
const colors = ["All neo colors", "Red", "Yellow"];
const sexes = ["All sexes", "Female", "Male"];
const ages = ["All ages", "Neonate", "Juvenile", "Subadult", "Adult"];

const marketGroups = [
  { label: "All market groups", localities: [] },
  { label: "M. a. azurea", localities: ["Biak", "Numfor"] },
  { label: "M. a. pulcher", localities: ["Timika", "Sorong", "Manokwari", "Kofiau", "Batanta · review"] },
  { label: "M. a. utaraensis", localities: ["Wamena", "Lereh / Highland", "Cyclops", "Jayapura"] },
  { label: "M. viridis", localities: ["Aru", "Merauke"] },
  { label: "Designer / line projects", localities: [] },
  { label: "Unspecified", localities: [] },
];

const allLocalities = Array.from(
  new Set(marketGroups.flatMap((group) => group.localities.filter((locality) => !locality.includes("review"))))
);

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

  const activeGroup = marketGroups.find((group) => group.label === marketGroup) ?? marketGroups[0];
  const localityOptions = [
    "All localities",
    ...(marketGroup === "All market groups" ? allLocalities : activeGroup.localities),
  ];

  const changeMarketGroup = (value: string) => {
    setMarketGroup(value);
    setLocality("All localities");
  };

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
          <span className="rounded-full border border-amber-300/15 bg-amber-300/[.04] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-amber-100/55">Dataset pending review</span>
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
          [mode === "FOR SALE" ? "Median ask" : "Median last-listed", "—"],
          ["Typical range", "—"],
          [mode === "FOR SALE" ? "Eligible current" : "Readable sold", "—"],
          ["Unique sellers", "—"],
          ["Sources", "—"],
          ["Confidence", "Pending"],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-r border-white/[.055] px-4 py-5 lg:border-b-0">
            <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/24">{label}</div>
            <div className="mt-2 text-lg font-semibold text-white/58">{value}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid relative min-h-[330px] overflow-hidden bg-[radial-gradient(circle_at_65%_42%,rgba(57,230,125,.05),transparent_28%)]">
        <div className="absolute inset-x-5 top-5 flex flex-wrap items-center justify-between gap-2 text-[9px] font-medium uppercase tracking-[.15em] text-white/22">
          <span>{mode === "FOR SALE" ? "Asking-price history" : "Sold-listing history"}</span>
          <span>{time} · Median-first</span>
        </div>
        <div className="absolute left-5 top-14 max-w-[calc(100%-2.5rem)] rounded-full border border-white/[.07] bg-black/20 px-3 py-1.5 text-[10px] text-white/34">{context}</div>
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div className="max-w-md">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-emerald-300/15 bg-emerald-300/[.05] text-lg text-emerald-200/60">↗</div>
            <div className="mt-4 text-base font-semibold text-white/62">Market data pending</div>
            <p className="mt-2 text-xs leading-5 text-white/30">Price lines and summary statistics will appear after the replacement dataset completes source review and normalization.</p>
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-5 flex justify-between text-[9px] text-white/18"><span>OLDER</span><span>RECENT</span></div>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[.06] bg-black/10 px-5 py-4 text-[10px] leading-5 text-white/28 sm:flex-row sm:items-center sm:justify-between">
        <span>Market group → locality → origin → sex / age / neonate color</span>
        <span className="font-bold uppercase tracking-[.12em] text-emerald-300/45">Median-first analysis</span>
      </div>
    </div>
  );
}