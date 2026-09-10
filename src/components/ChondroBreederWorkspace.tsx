"use client";

import { useState } from "react";
import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroBreederManagementView } from "@/components/ChondroBreederCommandCenter";
import { ChondroBreederSubspeciesPhenotypes } from "@/components/ChondroBreederSubspeciesPhenotypes";
import { ChondroPatternBanner } from "@/components/ChondroPatternBanner";
import { ChondroRetiredBreedersPanel } from "@/components/ChondroRetiredBreedersPanel";
import { ChondroClutchOutcomeExplainer } from "@/components/ChondroClutchOutcomeExplainer";
import { ChondroConservationPartnerships } from "@/components/ChondroConservationPartnerships";
import { ChondroBreedingFocusHeader } from "@/components/ChondroBreedingFocusHeader";

type WorkspaceView = "home" | "breeding" | "colony" | "market" | "career" | "projects" | "conservation" | "community" | "guide";

type ViewMeta = {
  label: string;
  detail: string;
  icon: string;
};

const views: Array<{ id: WorkspaceView } & ViewMeta> = [
  { id: "home", label: "Home", detail: "Breeder overview", icon: "⌂" },
  { id: "breeding", label: "Breeding", detail: "Cycles & clutches", icon: "◇" },
  { id: "colony", label: "Colony", detail: "Animals & records", icon: "◎" },
  { id: "market", label: "Market", detail: "Buy & sell", icon: "$" },
  { id: "career", label: "Career", detail: "Facility & shows", icon: "↗" },
  { id: "projects", label: "Projects", detail: "Lines & goals", icon: "◈" },
  { id: "conservation", label: "Conservation", detail: "Regional program", icon: "⌁" },
  { id: "community", label: "Community", detail: "Breeder network", icon: "◌" },
  { id: "guide", label: "Guide", detail: "Subspecies & traits", icon: "?" },
];

export function ChondroBreederWorkspace() {
  const [view, setView] = useState<WorkspaceView>("home");
  const active = views.find((item) => item.id === view) ?? views[0];

  function openView(next: WorkspaceView) {
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
        <ChondroPatternBanner compact />
      </div>

      <div className="sticky top-[72px] z-30 mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:top-[76px]">
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
        {view === "market" ? <ChondroBreederExpandedShop /> : null}
        {view === "career" ? <ChondroBreederManagementView section="career" /> : null}
        {view === "projects" ? <ChondroBreederManagementView section="projects" /> : null}
        {view === "conservation" ? <ChondroConservationPartnerships /> : null}
        {view === "community" ? <ChondroBreederManagementView section="community" /> : null}
        {view === "guide" ? <ChondroBreederSubspeciesPhenotypes /> : null}
      </div>
    </div>
  );
}

function BreederHome({ onOpen }: { onOpen: (view: WorkspaceView) => void }) {
  const primary: WorkspaceView[] = ["breeding", "colony", "market"];
  const secondary: WorkspaceView[] = ["career", "projects", "conservation", "community", "guide"];
  return (
    <section className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="panel rounded-[28px] p-5 sm:p-6">
          <div className="section-kicker">Breeder overview</div>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-.04em] text-white">Manage the breeding program from one clear workspace.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">Breeding, colony management and the market are separated into focused areas, with career, projects, conservation and reference tools available from the same navigation.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
