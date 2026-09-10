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
  { id: "home", label: "Home", detail: "Breeder command center", icon: "⌂" },
  { id: "breeding", label: "Breeding", detail: "Cycles, pairings and reproductive progress", icon: "◇" },
  { id: "colony", label: "Colony", detail: "Animals and breeder records", icon: "◎" },
  { id: "clutches", label: "Clutches", detail: "Eggs, hatchlings and clutch history", icon: "◉" },
  { id: "market", label: "Market", detail: "Acquire, list and track animals", icon: "$" },
  { id: "career", label: "Career", detail: "Facility, shows and progression", icon: "↗" },
  { id: "projects", label: "Projects", detail: "Lines, traits and breeding goals", icon: "◈" },
  { id: "conservation", label: "Conservation", detail: "Regional conservation program", icon: "⌁" },
  { id: "community", label: "Network", detail: "Breeder community and activity", icon: "◌" },
  { id: "guide", label: "Field Guide", detail: "Subspecies, locality and phenotype reference", icon: "?" },
];

const dockViews: WorkspaceView[] = ["home", "breeding", "colony", "clutches", "market"];

export function ChondroBreederWorkspace() {
  const [view, setView] = useState<WorkspaceView>("home");
  const active = views.find((item) => item.id === view) ?? views[0];

  function openView(next: WorkspaceView) {
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }

  return (
    <div className="min-h-[100dvh] bg-[#030806] pb-[calc(86px+env(safe-area-inset-bottom))] text-white">
      <header className="sticky top-0 z-[70] border-b border-white/[.055] bg-[#030806]/96 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[60px] max-w-[1500px] items-center gap-3 px-3 sm:min-h-[66px] sm:px-5">
          <Link
            href="/"
            aria-label="Exit Chondro Breeder and return to Arboreal Planet"
            title="Return to Arboreal Planet"
            className="group grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/[.07] bg-white/[.025] transition hover:border-emerald-300/20 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40"
          >
            <ArborealPlanetMark className="h-9 w-9 transition group-hover:scale-[1.03]" />
          </Link>

          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/44">Chondro Breeder</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-white/80">{active.label}</div>
          </div>

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <div className="rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/48">Game running</div>
          </div>
        </div>
      </header>

      <main>
        {view === "home" ? <BreederHome onOpen={openView} /> : null}
        {view === "breeding" ? <BreedingScreen /> : null}
        {view === "colony" ? <ColonyScreen /> : null}
        {view === "clutches" ? <ClutchesScreen /> : null}
        {view === "market" ? <MarketScreen /> : null}
        {view === "career" ? <SecondaryScreen active={active} onBack={() => openView("home")}><ChondroBreederManagementView section="career" /></SecondaryScreen> : null}
        {view === "projects" ? <SecondaryScreen active={active} onBack={() => openView("home")}><ChondroBreederManagementView section="projects" /></SecondaryScreen> : null}
        {view === "conservation" ? <SecondaryScreen active={active} onBack={() => openView("home")}><ChondroConservationPartnerships /></SecondaryScreen> : null}
        {view === "community" ? <SecondaryScreen active={active} onBack={() => openView("home")}><ChondroBreederManagementView section="community" /></SecondaryScreen> : null}
        {view === "guide" ? <SecondaryScreen active={active} onBack={() => openView("home")}><ChondroBreederSubspeciesPhenotypes /></SecondaryScreen> : null}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-[80] mx-auto grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-white/[.08] bg-[#030806]/97 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-18px_50px_rgba(0,0,0,.34)] backdrop-blur-xl lg:bottom-4 lg:h-[72px] lg:max-w-[680px] lg:rounded-[22px] lg:border lg:px-3 lg:pb-1.5"
        aria-label="Chondro Breeder navigation"
      >
        {dockViews.map((id) => {
          const item = views.find((entry) => entry.id === id)!;
          const selected = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openView(id)}
              aria-current={selected ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-bold uppercase tracking-[.04em] transition sm:text-[10px] ${selected ? "bg-emerald-300/[.08] text-emerald-200" : "text-white/38 hover:bg-white/[.035] hover:text-white/68"}`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl text-base transition ${selected ? "bg-emerald-300/[.12] text-emerald-200" : "bg-white/[.025]"}`}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function ScreenHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7">
      <div className="border-b border-white/[.055] pb-4">
        <div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/42">{eyebrow}</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">{detail}</p>
      </div>
    </div>
  );
}

function BreederHome({ onOpen }: { onOpen: (view: WorkspaceView) => void }) {
  const tools: WorkspaceView[] = ["career", "projects", "conservation", "community", "guide"];
  return (
    <div className="mx-auto max-w-[1500px] px-3 py-3 sm:px-5 sm:py-5">
      <div className="overflow-hidden rounded-[28px] border border-white/[.065] bg-[#06100c] shadow-[0_26px_90px_rgba(0,0,0,.28)]">
        <div className="p-3 sm:p-5">
          <ChondroPatternBanner compact />
          <section className="mt-4 rounded-[24px] border border-white/[.06] bg-black/18 p-4 sm:p-6">
            <div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/44">Breeder command center</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-white sm:text-4xl">Your breeding program</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/44">Use the game dock for the four systems you move between most. Everything else lives here when you need it.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {tools.map((id) => {
                const item = views.find((entry) => entry.id === id)!;
                return <ToolCard key={id} item={item} onClick={() => onOpen(id)} />;
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BreedingScreen() {
  return (
    <>
      <ScreenHeading eyebrow="Reproduction" title="Breeding" detail="Prepare breeders, choose the pair and follow the active reproductive cycle." />
      <ChondroBreedingFocusHeader />
      <ChondroBreederManagementView section="breeding" />
      <ChondroBreederGameV3 />
      <ChondroClutchOutcomeExplainer />
    </>
  );
}

function ColonyScreen() {
  return (
    <>
      <ScreenHeading eyebrow="Collection" title="Colony" detail="Inspect active animals, pairing material, lineage and retired breeders." />
      <ChondroBreederManagementView section="colony" />
      <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div>
    </>
  );
}

function ClutchesScreen() {
  return (
    <>
      <ScreenHeading eyebrow="Offspring" title="Clutches" detail="Review active and historical clutch records without leaving the breeder app." />
      <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
        <div className="panel rounded-[28px] p-4 sm:p-5"><ChondroClutchHistoryTable /></div>
      </section>
    </>
  );
}

function MarketScreen() {
  return (
    <>
      <ScreenHeading eyebrow="Exchange" title="Market" detail="Shop daily offers, review player listings and move animals into or out of the program." />
      <ChondroBreederExpandedShop />
      <ChondroBreederManagementView section="market" />
    </>
  );
}

function SecondaryScreen({ active, onBack, children }: { active: ViewMeta; onBack: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
        <button type="button" onClick={onBack} className="secondary-action px-3 py-2 text-[10px]">← Breeder Home</button>
      </div>
      <ScreenHeading eyebrow="Breeder tools" title={active.label} detail={active.detail} />
      <div>{children}</div>
    </>
  );
}

function ToolCard({ item, onClick }: { item: ViewMeta; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[112px] flex-col items-start rounded-[20px] border border-white/[.065] bg-white/[.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/18 hover:bg-white/[.045]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/[.07] bg-black/25 text-base text-emerald-200/70">{item.icon}</span>
      <span className="mt-auto pt-4 text-sm font-bold text-white/80">{item.label}</span>
      <span className="mt-1 text-[11px] leading-4 text-white/38">{item.detail}</span>
    </button>
  );
}
