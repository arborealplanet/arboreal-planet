"use client";

import { useEffect, useState } from "react";

type MarketGroup =
  | "all"
  | "pythons"
  | "boas"
  | "colubrids"
  | "geckos"
  | "monitors"
  | "other-lizards"
  | "amphibians"
  | "conservation";

const GROUPS: Array<{ id: MarketGroup; label: string; active: boolean; detail: string }> = [
  { id: "all", label: "All Animals", active: true, detail: "Show every currently unlocked market bar." },
  { id: "pythons", label: "Pythons", active: true, detail: "Green Tree Pythons and future python programs." },
  { id: "boas", label: "Boas", active: true, detail: "Northern and Amazon Basin Emerald Tree Boas, with more boas planned." },
  { id: "colubrids", label: "Colubrids", active: false, detail: "Planned: Boiga and future arboreal colubrids." },
  { id: "geckos", label: "Geckos", active: false, detail: "Planned: Crested, Gargoyle, Tokay and Leachianus programs." },
  { id: "monitors", label: "Monitors", active: false, detail: "Planned: Emerald Tree Monitor and future tree monitors." },
  { id: "other-lizards", label: "Other Lizards", active: false, detail: "Future arboreal lizard programs." },
  { id: "amphibians", label: "Amphibians", active: false, detail: "Future frog and amphibian programs." },
  { id: "conservation", label: "Conservation", active: false, detail: "Certification-gated conservation animals and special projects." },
];

const STORAGE_KEY = "arboreal_keeper_market_group_v1";

export function ArborealKeeperMarketFilterBar() {
  const [group, setGroup] = useState<MarketGroup>("all");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as MarketGroup | null;
    if (stored && GROUPS.some((item) => item.id === stored && item.active)) setGroup(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, group);
    const sections = document.querySelectorAll<HTMLElement>("[data-keeper-market-group]");
    sections.forEach((section) => {
      const sectionGroup = section.dataset.keeperMarketGroup as MarketGroup | undefined;
      section.hidden = group !== "all" && sectionGroup !== group;
    });
    window.dispatchEvent(new CustomEvent("arboreal-keeper-market-filter-change", { detail: { group } }));
  }, [group]);

  const selected = GROUPS.find((item) => item.id === group) ?? GROUPS[0];

  return (
    <section className="mx-auto max-w-7xl px-5 pt-4 sm:px-6">
      <div className="rounded-[24px] border border-white/[.06] bg-[#05100b] p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.16em] text-amber-100/42">Animal Market filters</div>
            <div className="mt-1 text-xs text-white/38">{selected.detail}</div>
          </div>
          <div className="rounded-full border border-white/[.055] bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white/35">{selected.label}</div>
        </div>

        <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
          {GROUPS.map((item) => {
            const selectedGroup = item.id === group;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.active}
                onClick={() => setGroup(item.id)}
                title={item.active ? item.detail : `${item.detail} Locked until its species program is added.`}
                className={`shrink-0 snap-start rounded-full border px-3 py-2 text-[10px] font-bold transition ${selectedGroup ? "border-amber-200/18 bg-amber-200/[.075] text-amber-50/75" : item.active ? "border-white/[.06] bg-white/[.02] text-white/45 hover:bg-white/[.04]" : "border-white/[.035] bg-black/10 text-white/20"}`}
              >
                {item.label}{item.active ? "" : " · Locked"}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
