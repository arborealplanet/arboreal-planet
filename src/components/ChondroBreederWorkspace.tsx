"use client";

import Link from "next/link";
import { useState } from "react";
import { ArborealPlanetMark } from "@/components/BrandVisuals";
import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroBreederManagementView } from "@/components/ChondroBreederCommandCenter";
import { ChondroBreederSubspeciesPhenotypes } from "@/components/ChondroBreederSubspeciesPhenotypes";
import { ChondroPatternBanner } from "@/components/ChondroPatternBanner";
import { ChondroRetiredBreedersPanel } from "@/components/ChondroRetiredBreedersPanel";
import { ChondroClutchOutcomeExplainer } from "@/components/ChondroClutchOutcomeExplainer";
import { ChondroConservationPartnerships } from "@/components/ChondroConservationPartnerships";
import { ChondroBreedingFocusHeader } from "@/components/ChondroBreedingFocusHeader";
import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";

type WorkspaceView = "home" | "breeding" | "colony" | "clutches" | "market" | "career" | "projects" | "conservation" | "community" | "guide";

type ViewMeta = {
  label: string;
  detail: string;
  icon: string;
};

const views: Array<{ id: WorkspaceView } & ViewMeta> = [
  { id: "home", label: "Home", detail: "Breeder overview", icon: "⌂" },
  { id: "breeding", label: "Breeding", detail: "Cycles & pairings", icon: "◇" },
  { id: "colony", label: "Colony", detail: "Animals & records", icon: "◎" },
  { id: "clutches", label: "Clutches", detail: "Eggs & offspring", icon: "◉" },
  { id: "market", label: "Market", detail: "Buy & sell", icon: "$" },
  { id: "career", label: "Career", detail: "Facility & shows", icon: "↗" },
  { id: "projects", label: "Projects", detail: "Lines & goals", icon: "◈" },
  { id: "conservation", label: "Conservation", detail: "Regional program", icon: "⌁" },
  { id: "community", label: "Community", detail: "Breeder network", icon: "◌" },
  { id: "guide", label: "Guide", detail: "Subspecies & traits", icon: "?" },
];

const mobileViews: WorkspaceView[] = ["home", "breeding", "colony", "clutches", "market"];

export function ChondroBreederWorkspace() {
  const [view, setView] = useState<WorkspaceView>("home");
  const active = views.find((item) => item.id === view) ?? views[0];

  function openView(next: WorkspaceView) {
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  return (
    <div className="min-h-screen bg-[#050c09] pb-[calc(82px+env(safe-area-inset-bottom))] lg:pb-12">
      <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#050c09]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] max-w-7xl items-center gap-3 px-4 sm:min-h-[70px] sm:px-6">
          <Link href="/" aria-label="Exit Chondro Breeder and return to Arboreal Planet" className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40">
            <ArborealPlanetMark className="h-10 w-10 transition group-hover:scale-[1.03]" />
            <div className="hidden sm:block">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200/58">Arboreal Planet</div>
              <div className="mt-0.5 text-sm font-semibold text-white/82">Chondro Breeder</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/55 sm:block">Breeder Mode</div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-3 py-2 text-right">
              <div className="text-[8px] font-bold uppercase tracking-[.12em] text-white/28">Current</div>
              <div className="mt-0.5 text-[11px] font-bold text-white/68">{active.label}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-5">
        <ChondroPatternBanner compact />
      </div>

      <div className="sticky top-[64px] z-40 mx-auto mt-3 hidden max-w-7xl px-4 sm:top-[70px] sm:px-6 lg:block">
        <div className="rounded-3xl border border-white/[.08] bg-[#07100d]/94 p-2 shadow-[0_18px_50px_rgba(0,0,0,.32)] backdrop-blur-xl">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {views.map((item) => (
              <WorkspaceButton key={item.id} active={view === item.id} onClick={() => openView(item.id)} {...item} />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[.06] pb-4">
          <div>
            <div className="section-kicker">Chondro Breeder</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white sm:text-3xl">{active.label}</h1>
            <p className="mt-1 text-sm text-white/46">{active.detail}</p>
          </div>
          {view !== "home" ? <button type="button" onClick={() => openView("home")} className="btn-secondary px-3 py-2 text-[10px]">Breeder Home</button> : null}
        </div>
      </div>

      <div className="mt-1">
        {view === "home" ? <BreederHome onOpen={openView} /> : null}
        {view === "breeding" ? (
          <>
            <ChondroBreedingFocusHeader />
            <ChondroBreederManagementView section="breeding" />
            <ChondroBreederGameV3 />
            <ChondroClutchOutcomeExplainer />
          </>
        ) : null}
        {view === "colony" ? (
          <>
            <ChondroBreederManagementView section="colony" />
            <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div>
          </>
        ) : null}
        {view === "clutches" ? (
          <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
            <div className="panel rounded-[28px] p-4 sm:p-5"><ChondroClutchHistoryTable /></div>
          </section>
        ) : null}
        {view === "market" ? (
          <>
            <ChondroBreederExpandedShop />
            <ChondroBreederManagementView section="market" />
          </>
        ) : null}
        {view === "career" ? <ChondroBreederManagementView section="career" /> : null}
        {view === "projects" ? <ChondroBreederManagementView section="projects" /> : null}
        {view === "conservation" ? <ChondroConservationPartnerships /> : null}
        {view === "community" ? <ChondroBreederManagementView section="community" /> : null}
        {view === "guide" ? <ChondroBreederSubspeciesPhenotypes /> : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(70px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-white/[.08] bg-[#050c09]/97 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-18px_50px_rgba(0,0,0,.3)] backdrop-blur-xl lg:hidden" aria-label="Chondro Breeder navigation">
        {mobileViews.map((id) => {
          const item = views.find((entry) => entry.id === id)!;
          const selected = view === id;
          return (
            <button key={id} type="button" onClick={() => openView(id)} aria-current={selected ? "page" : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-bold uppercase tracking-[.04em] transition ${selected ? "text-emerald-200" : "text-white/38"}`}>
              <span className={`grid h-8 w-8 place-items-center rounded-xl text-base transition ${selected ? "bg-emerald-300/[.12] text-emerald-200" : "bg-white/[.025]"}`}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function BreederHome({ onOpen }: { onOpen: (view: WorkspaceView) => void }) {
  const primary: WorkspaceView[] = ["breeding", "colony", "clutches", "market"];
  const secondary: WorkspaceView[] = ["career", "projects", "conservation", "community", "guide"];
  return (
    <section className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Breeder overview</div>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-.04em] text-white">Run the whole breeding program from one dedicated game workspace.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">Breeding, colony management, clutch records and the market are the primary work areas. Career, projects, conservation, community and reference tools stay one tap away from here.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {primary.map((id) => {
              const item = views.find((entry) => entry.id === id)!;
              return <HomeCard key={id} item={item} onClick={() => onOpen(id)} featured />;
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {secondary.map((id) => {
            const item = views.find((entry) => entry.id === id)!;
            return <HomeCard key={id} item={item} onClick={() => onOpen(id)} />;
          })}
        </div>
      </div>
    </section>
  );
}

function HomeCard({ item, onClick, featured = false }: { item: ViewMeta; onClick: () => void; featured?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`group flex items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/20 hover:bg-white/[.04] ${featured ? "min-h-32 flex-col items-start justify-between" : "min-h-20"}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-black/20 text-sm text-emerald-200/70">{item.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white/78">{item.label}</span>
        <span className="mt-1 block text-xs text-white/42">{item.detail}</span>
      </span>
      <span className="text-xs text-emerald-200/55 transition group-hover:translate-x-0.5">→</span>
    </button>
  );
}

function WorkspaceButton({ active, onClick, label, detail, icon }: { active: boolean; onClick: () => void } & ViewMeta) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`min-w-[118px] shrink-0 rounded-2xl px-3 py-2.5 text-left transition ${active ? "bg-emerald-300 text-[#06100c] shadow-[0_8px_24px_rgba(57,230,125,.14)]" : "text-white/48 hover:bg-white/[.045] hover:text-white/72"}`}
    >
      <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.1em]"><span className="text-sm">{icon}</span>{label}</span>
      <span className="mt-1 block text-[9px] opacity-65">{detail}</span>
    </button>
  );
}
