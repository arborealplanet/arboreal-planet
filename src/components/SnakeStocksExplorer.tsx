"use client";

import { useEffect, useMemo, useState } from "react";

const timeRanges = ["1M", "3M", "6M", "1Y", "5Y", "ALL"];
const origins = ["All origins", "Captive Bred", "Import"];
const colors = ["All neo colors", "Red", "Yellow"];
const sexes = ["All sexes", "Female", "Male"];
const ages = ["All ages", "Neonate", "Juvenile", "Subadult", "Adult"];
const localities = ["All localities", "Wamena", "Lereh", "Cyclops", "Jayapura", "Manokwari", "Aru", "Merauke"];

type EvidenceRow = {
  observation_kind: "CURRENT_ASKING" | "SOLD_LISTING" | "CONFIRMED_SALE";
  eligible_count: number | null;
  captured_at: string;
  source_name: string | null;
};

type EvidenceResponse = {
  current?: EvidenceRow | null;
  sold?: EvidenceRow | null;
  error?: string;
};

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
  const [origin, setOrigin] = useState(origins[0]);
  const [neoColor, setNeoColor] = useState(colors[0]);
  const [sex, setSex] = useState(sexes[0]);
  const [age, setAge] = useState(ages[0]);
  const [locality, setLocality] = useState(localities[0]);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/market/evidence", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as EvidenceResponse;
        if (!response.ok) throw new Error(data.error ?? "Evidence API unavailable");
        return data;
      })
      .then((data) => {
        if (!cancelled) setEvidence(data);
      })
      .catch(() => {
        if (!cancelled) setEvidence({ error: "Backend evidence unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const context = useMemo(() => {
    const bits = [locality, origin, neoColor, sex, age].filter((x) => !x.startsWith("All "));
    return bits.length ? bits.join(" · ") : "Entire qualified Green Tree Python market";
  }, [locality, origin, neoColor, sex, age]);

  const currentCount = evidence?.current?.eligible_count ?? null;
  const soldCount = evidence?.sold?.eligible_count ?? null;
  const activeEvidenceCount = mode === "FOR SALE" ? currentCount : soldCount;
  const backendState = evidence === null ? "Connecting" : evidence.error ? "Unavailable" : "Connected";

  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-4 border-b border-white/[.06] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300/65">Green Tree Python</div>
          <h2 className="mt-1.5 text-2xl font-semibold">Morelia viridis complex market explorer</h2>
          <p className="mt-2 text-xs text-white/30">Interactive filters are live now. Market values remain blank until qualified records support them.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span className={`rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.13em] ${backendState === "Connected" ? "border-emerald-300/15 bg-emerald-300/[.05] text-emerald-200/60" : backendState === "Connecting" ? "border-white/[.07] text-white/35" : "border-amber-300/15 bg-amber-300/[.04] text-amber-100/55"}`}>Data backend · {backendState}</span>
          <div className="inline-flex w-fit rounded-xl border border-white/[.07] bg-black/15 p-1 text-[11px] font-bold">
            {(["FOR SALE", "SOLD HISTORY"] as const).map((item) => (
              <button key={item} onClick={() => setMode(item)} className={`rounded-lg px-4 py-2 transition ${mode === item ? "bg-emerald-300 text-[#06100c]" : "text-white/38 hover:text-white/60"}`}>{item}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-white/[.06] p-5 xl:grid-cols-3">
        <ChoiceRow label="Time" values={timeRanges} active={time} onChange={setTime} />
        <ChoiceRow label="Locality" values={localities} active={locality} onChange={setLocality} />
        <ChoiceRow label="Origin" values={origins} active={origin} onChange={setOrigin} />
        <ChoiceRow label="Neonate color" values={colors} active={neoColor} onChange={setNeoColor} />
        <ChoiceRow label="Sex" values={sexes} active={sex} onChange={setSex} />
        <ChoiceRow label="Age" values={ages} active={age} onChange={setAge} />
      </div>

      <div className="grid grid-cols-2 border-b border-white/[.06] sm:grid-cols-3 lg:grid-cols-6">
        {[
          [mode === "FOR SALE" ? "Median ask" : "Median last-listed", "—"],
          ["Typical range", "—"],
          [mode === "FOR SALE" ? "Eligible current" : "Readable sold", activeEvidenceCount === null ? "—" : String(activeEvidenceCount)],
          ["Unique sellers", "—"],
          ["Sources", evidence?.current?.source_name || evidence?.sold?.source_name ? "1+" : "—"],
          ["Confidence", "Pending"],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-r border-white/[.055] px-4 py-5 lg:border-b-0">
            <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/24">{label}</div>
            <div className={`mt-2 font-semibold ${activeEvidenceCount !== null && value === String(activeEvidenceCount) ? "text-2xl text-white" : "text-lg text-white/58"}`}>{value}</div>
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
            <div className="mt-4 text-base font-semibold text-white/62">Trend line intentionally withheld</div>
            <p className="mt-2 text-xs leading-5 text-white/30">This view will render real median and quartile history once multiple dated snapshots support the selected filters. Changing filters never invents a price.</p>
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-5 flex justify-between text-[9px] text-white/18"><span>OLDER</span><span>RECENT</span></div>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[.06] bg-black/10 px-5 py-4 text-[10px] leading-5 text-white/28 sm:flex-row sm:items-center sm:justify-between">
        <span>FOR SALE = asking prices · SOLD HISTORY = last displayed listing price when marked sold</span>
        <span className="font-bold uppercase tracking-[.12em] text-emerald-300/45">No fake production data</span>
      </div>
    </div>
  );
}
