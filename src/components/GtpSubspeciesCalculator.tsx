"use client";

import { useMemo, useState } from "react";
import {
  GTP_LOCALITY_TAXON,
  GTP_TAXON_LOCALITIES,
  GTP_TAXON_NOTES,
  type GtpLocality,
  type GtpTaxon,
} from "@/lib/green-tree-python-taxa";

type Parent = {
  label: string;
  localityAncestry: Partial<Record<GtpLocality, number>>;
  taxonAncestry: Partial<Record<GtpTaxon, number>>;
};

const allLocalities = Object.keys(GTP_LOCALITY_TAXON) as GtpLocality[];
const allTaxa = Object.keys(GTP_TAXON_LOCALITIES) as GtpTaxon[];

function localityParent(locality: GtpLocality): Parent {
  const taxon = GTP_LOCALITY_TAXON[locality];
  return {
    label: locality,
    localityAncestry: { [locality]: 100 },
    taxonAncestry: { [taxon]: 100 },
  };
}

function combineMaps<T extends string>(a: Partial<Record<T, number>>, b: Partial<Record<T, number>>) {
  const keys = new Set<T>([...(Object.keys(a) as T[]), ...(Object.keys(b) as T[])]);
  const result: Partial<Record<T, number>> = {};
  for (const key of keys) {
    const value = ((a[key] ?? 0) + (b[key] ?? 0)) / 2;
    if (value > 0.0001) result[key] = Math.round(value * 10) / 10;
  }
  return result;
}

function combineParents(a: Parent, b: Parent): Parent {
  return {
    label: `${a.label} × ${b.label} offspring`,
    localityAncestry: combineMaps(a.localityAncestry, b.localityAncestry),
    taxonAncestry: combineMaps(a.taxonAncestry, b.taxonAncestry),
  };
}

function entriesSorted<T extends string>(map: Partial<Record<T, number>>) {
  return (Object.entries(map) as Array<[T, number]>).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function resultLabel(parent: Parent) {
  const taxa = entriesSorted(parent.taxonAncestry);
  const localities = entriesSorted(parent.localityAncestry);
  if (taxa.length === 1) {
    const [taxon, percent] = taxa[0];
    if (percent >= 99.9) {
      if (localities.length === 1 && localities[0][1] >= 99.9) return `${localities[0][0]} · ${taxon}`;
      return `Mixed locality · ${taxon}`;
    }
  }
  const includesViridis = taxa.some(([taxon]) => taxon === "Morelia viridis");
  const includesAzurea = taxa.some(([taxon]) => taxon.startsWith("Morelia azurea"));
  return includesViridis && includesAzurea ? "Interspecific hybrid ancestry" : "Inter-subspecific hybrid ancestry";
}

function ParentCard({ title, parent, onLocalityChange }: { title: string; parent: Parent; onLocalityChange: (locality: GtpLocality) => void }) {
  return (
    <div className="rounded-[24px] border border-white/[.07] bg-black/10 p-5">
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-white/30">{title}</div>
      <select
        value={allLocalities.includes(parent.label as GtpLocality) ? parent.label : ""}
        onChange={(event) => event.target.value && onLocalityChange(event.target.value as GtpLocality)}
        className="mt-3 w-full rounded-2xl border border-white/[.08] bg-black/30 px-4 py-3 text-sm text-white/75"
      >
        <option value="">{allLocalities.includes(parent.label as GtpLocality) ? "Choose locality" : "Current parent is calculated offspring"}</option>
        {allTaxa.map((taxon) => (
          <optgroup key={taxon} label={taxon}>
            {GTP_TAXON_LOCALITIES[taxon].map((locality) => <option key={locality} value={locality}>{locality}</option>)}
          </optgroup>
        ))}
      </select>
      <div className="mt-4 text-lg font-semibold text-white/78">{parent.label}</div>
      <div className="mt-3 space-y-2">
        {entriesSorted(parent.taxonAncestry).map(([taxon, percent]) => (
          <div key={taxon} className="flex items-center justify-between gap-3 text-xs text-white/42"><span>{taxon}</span><span className="font-semibold text-emerald-100/70">{formatPercent(percent)}</span></div>
        ))}
      </div>
    </div>
  );
}

export function GtpSubspeciesCalculator() {
  const [parentA, setParentA] = useState<Parent>(() => localityParent("Jayapura"));
  const [parentB, setParentB] = useState<Parent>(() => localityParent("Lereh"));

  const offspring = useMemo(() => combineParents(parentA, parentB), [parentA, parentB]);
  const label = resultLabel(offspring);

  return (
    <div className="space-y-8">
      <section className="panel rounded-[30px] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="section-kicker">Subspecies genetics calculator</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.035em]">Choose two parents.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/46">This calculator tracks locality and taxon ancestry only. It does not predict phenotype, color, pattern or trait expression.</p>
          </div>
          <button type="button" onClick={() => { setParentA(localityParent("Jayapura")); setParentB(localityParent("Lereh")); }} className="rounded-xl border border-white/[.08] px-4 py-2 text-xs font-bold text-white/50">Reset example</button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ParentCard title="Parent A" parent={parentA} onLocalityChange={(locality) => setParentA(localityParent(locality))} />
          <ParentCard title="Parent B" parent={parentB} onLocalityChange={(locality) => setParentB(localityParent(locality))} />
        </div>

        <div className="mt-6 rounded-[26px] border border-emerald-300/15 bg-emerald-300/[.03] p-5 sm:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-100/50">Expected offspring ancestry</div>
          <div className="mt-2 text-2xl font-semibold text-white/82">{label}</div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.13em] text-white/28">Taxon ancestry</div>
              <div className="mt-3 space-y-2">
                {entriesSorted(offspring.taxonAncestry).map(([taxon, percent]) => <div key={taxon} className="rounded-xl border border-white/[.06] bg-black/10 px-3 py-2 text-sm text-white/55"><div className="flex justify-between gap-3"><span>{taxon}</span><strong className="text-emerald-100/75">{formatPercent(percent)}</strong></div></div>)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.13em] text-white/28">Locality ancestry</div>
              <div className="mt-3 space-y-2">
                {entriesSorted(offspring.localityAncestry).map(([locality, percent]) => <div key={locality} className="rounded-xl border border-white/[.06] bg-black/10 px-3 py-2 text-sm text-white/55"><div className="flex justify-between gap-3"><span>{locality}</span><strong className="text-amber-100/70">{formatPercent(percent)}</strong></div></div>)}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setParentA(offspring)} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c]">Use offspring as Parent A</button>
            <button type="button" onClick={() => setParentB(offspring)} className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.04] px-4 py-2.5 text-xs font-bold text-emerald-100/70">Use offspring as Parent B</button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-sky-300/10 bg-sky-300/[.025] p-4 text-xs leading-5 text-sky-100/55">
          Ancestry percentages are expected pedigree proportions: each offspring receives half of its ancestry from each parent. These percentages are not single-gene inheritance probabilities and do not predict appearance.
        </div>
      </section>

      <section className="panel rounded-[30px] p-5 sm:p-7">
        <div className="section-kicker">Locality reference</div>
        <h2 className="mt-3 text-2xl font-semibold">Which locality belongs to which taxon?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {allTaxa.map((taxon) => (
            <article key={taxon} className="rounded-[22px] border border-white/[.06] bg-white/[.012] p-5">
              <div className="text-lg font-semibold text-white/76">{taxon}</div>
              <div className="mt-3 flex flex-wrap gap-2">{GTP_TAXON_LOCALITIES[taxon].map((locality) => <span key={locality} className="rounded-full border border-white/[.08] px-3 py-1.5 text-xs text-white/55">{locality}</span>)}</div>
              <p className="mt-4 text-xs leading-5 text-white/34">{GTP_TAXON_NOTES[taxon]}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
