"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChondroTraitFocusPanel } from "@/components/ChondroTraitFocusPanel";
import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";
import { ChondroCollectionManager } from "@/components/ChondroCollectionManager";
import { ChondroAchievementsPanel } from "@/components/ChondroAchievementsPanel";
import { ChondroCareerSystemsPanel } from "@/components/ChondroCareerSystemsPanel";
import { ChondroBreederLines } from "@/components/ChondroBreederLines";
import { ChondroBreederProgression } from "@/components/ChondroBreederProgression";
import { ChondroBreederSocial } from "@/components/ChondroBreederSocial";
import { ChondroBreederFacility } from "@/components/ChondroBreederFacility";
import { ChondroConservationPartnerships } from "@/components/ChondroConservationPartnerships";
import { ChondroPairingPlanner } from "@/components/ChondroPairingPlanner";

type Tab = "manage" | "career" | "projects" | "community";

const tabs: Array<{ id: Tab; label: string; detail: string }> = [
  { id: "manage", label: "Manage", detail: "Pairings · collection · favorites · trait focus" },
  { id: "career", label: "Career", detail: "Facility · contracts · achievements" },
  { id: "projects", label: "Projects", detail: "Lines · progression · conservation" },
  { id: "community", label: "Community", detail: "Social breeder systems" },
];

export function ChondroBreederCommandCenter() {
  const [tab, setTab] = useState<Tab>("manage");
  const active = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
      <div className="panel overflow-hidden rounded-[28px]">
        <div className="border-b border-white/[.06] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="section-kicker">Breeder command center</div>
              <div className="mt-1 text-sm font-bold text-white/70">{active.label}</div>
              <div className="mt-1 text-[10px] text-white/30">{active.detail}</div>
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/[.06] bg-black/20 p-1">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] transition ${tab === item.id ? "bg-white/10 text-white/80" : "text-white/35 hover:text-white/60"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-3 sm:p-4">
          {tab === "manage" ? (
            <div className="space-y-3">
              <CompactBlock title="Pairing Planner" defaultOpen><ChondroPairingPlanner /></CompactBlock>
              <CompactBlock title="Trait Focus"><ChondroTraitFocusPanel /></CompactBlock>
              <CompactBlock title="Favorites & Player Market"><ChondroFavoritesMarketPanel /></CompactBlock>
              <ChondroCollectionManager />
            </div>
          ) : null}

          {tab === "career" ? (
            <div className="space-y-3">
              <ChondroCareerSystemsPanel />
              <CompactBlock title="Achievements & Titles"><ChondroAchievementsPanel /></CompactBlock>
              <CompactBlock title="Legacy Career Progression"><ChondroBreederProgression /></CompactBlock>
              <CompactBlock title="Facility Detail"><ChondroBreederFacility /></CompactBlock>
            </div>
          ) : null}

          {tab === "projects" ? (
            <div className="space-y-3">
              <CompactBlock title="Breeder Lines" defaultOpen><ChondroBreederLines /></CompactBlock>
              <CompactBlock title="Conservation Partnerships"><ChondroConservationPartnerships /></CompactBlock>
            </div>
          ) : null}

          {tab === "community" ? <ChondroBreederSocial /> : null}
        </div>
      </div>
    </section>
  );
}

function CompactBlock({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="rounded-2xl border border-white/[.06] bg-black/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-white/60 [&::-webkit-details-marker]:hidden">
        <span>{title}</span><span className="text-lg text-white/30">+</span>
      </summary>
      <div className="border-t border-white/[.05] p-3">{children}</div>
    </details>
  );
}
