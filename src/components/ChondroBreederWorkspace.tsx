"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  { id: "home", label: "Breeder Desk", detail: "Program overview", icon: "⌂" },
  { id: "breeding", label: "Breeding", detail: "Cycles, pairings and reproductive progress", icon: "◇" },
  { id: "colony", label: "Colony", detail: "Animals, records and retired breeders", icon: "◎" },
  { id: "clutches", label: "Clutches", detail: "Eggs, hatchlings and clutch history", icon: "◉" },
  { id: "market", label: "Market", detail: "Acquire, list and track animals", icon: "$" },
  { id: "career", label: "Career", detail: "Facility, shows and progression", icon: "↗" },
  { id: "projects", label: "Projects", detail: "Lines, traits and breeding goals", icon: "◈" },
  { id: "conservation", label: "Conservation", detail: "Regional conservation program", icon: "⌁" },
  { id: "community", label: "Network", detail: "Breeder community and activity", icon: "◌" },
  { id: "guide", label: "Field Guide", detail: "Subspecies, locality and phenotype reference", icon: "?" },
];

export function ChondroBreederWorkspace() {
  const [view, setView] = useState<WorkspaceView>("home");
  const active = views.find((item) => item.id === view) ?? views[0];
  const inWindow = view !== "home";

  function openView(next: WorkspaceView) {
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }

  function closeWindow() {
    setView("home");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }

  useEffect(() => {
    if (!inWindow) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeWindow();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inWindow]);

  return (
    <div className="min-h-screen bg-[#030806] text-white">
      <header className="sticky top-0 z-[70] border-b border-white/[.06] bg-[#030806]/96 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[62px] max-w-[1500px] items-center gap-3 px-3 sm:min-h-[68px] sm:px-5">
          <Link
            href="/"
            aria-label="Exit Chondro Breeder and return to Arboreal Planet"
            title="Exit to Arboreal Planet"
            className="group grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/[.06] bg-white/[.025] transition hover:border-emerald-300/20 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40"
          >
            <ArborealPlanetMark className="h-9 w-9 transition group-hover:scale-[1.03]" />
          </Link>

          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/45">Chondro Breeder</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-white/78">{inWindow ? active.label : "Breeder Desk"}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {inWindow ? (
              <button
                type="button"
                onClick={closeWindow}
                className="rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] text-white/58 transition hover:bg-white/[.065] hover:text-white/82"
              >
                Close window
              </button>
            ) : (
              <span className="hidden rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/50 sm:block">Game running</span>
            )}
          </div>
        </div>
      </header>

      {!inWindow ? <BreederDesktop onOpen={openView} /> : <GameWindow active={active} onClose={closeWindow}>{renderWorkspace(view)}</GameWindow>}
    </div>
  );
}

function BreederDesktop({ onOpen }: { onOpen: (view: WorkspaceView) => void }) {
  const primary: WorkspaceView[] = ["breeding", "colony", "clutches", "market"];
  const secondary: WorkspaceView[] = ["career", "projects", "conservation", "community", "guide"];

  return (
    <main className="mx-auto max-w-[1500px] px-3 py-3 sm:px-5 sm:py-5">
      <div className="relative overflow-hidden rounded-[30px] border border-white/[.07] bg-[#06100c] shadow-[0_26px_90px_rgba(0,0,0,.32)]">
        <div className="absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_0%,rgba(52,211,153,.15),transparent_34%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,.08),transparent_28%)]" />
        <div className="relative p-3 sm:p-5">
          <ChondroPatternBanner compact />
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-[26px] border border-white/[.07] bg-black/20 p-4 sm:p-6">
              <div className="section-kicker">Breeder Desk</div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-.045em] text-white sm:text-4xl">Chondro Breeder</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/46">Choose a workstation to manage the breeding program. Each system opens as its own focused game window and closes back to this desk.</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] px-4 py-3 text-left sm:text-right">
                  <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/45">Program status</div>
                  <div className="mt-1 text-sm font-semibold text-white/72">Active breeder file</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {primary.map((id) => {
                  const item = views.find((entry) => entry.id === id)!;
                  return <DesktopApp key={id} item={item} onClick={() => onOpen(id)} featured />;
                })}
              </div>
            </section>

            <aside className="rounded-[26px] border border-white/[.07] bg-black/20 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="section-kicker">Program tools</div>
                  <h2 className="mt-2 text-lg font-semibold text-white/82">Other workstations</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/25">5 apps</span>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
                {secondary.map((id) => {
                  const item = views.find((entry) => entry.id === id)!;
                  return <DesktopApp key={id} item={item} onClick={() => onOpen(id)} />;
                })}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function GameWindow({ active, onClose, children }: { active: ViewMeta; onClose: () => void; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1500px] px-2 py-2 sm:px-4 sm:py-4">
      <section className="min-h-[calc(100vh-82px)] overflow-hidden rounded-[24px] border border-white/[.08] bg-[#050c09] shadow-[0_30px_100px_rgba(0,0,0,.42)] sm:rounded-[30px]">
        <div className="sticky top-[62px] z-50 flex min-h-[58px] items-center gap-3 border-b border-white/[.065] bg-[#07100d]/96 px-3 backdrop-blur-xl sm:top-[68px] sm:px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.03] text-sm text-emerald-200/70">{active.icon}</span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-[-.02em] text-white/86 sm:text-lg">{active.label}</h1>
            <p className="hidden truncate text-[11px] text-white/38 sm:block">{active.detail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${active.label}`}
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] bg-white/[.025] text-lg text-white/42 transition hover:bg-white/[.06] hover:text-white/80"
          >
            ×
          </button>
        </div>
        <div className="pb-8">{children}</div>
      </section>
    </main>
  );
}

function renderWorkspace(view: WorkspaceView) {
  if (view === "breeding") {
    return (
      <>
        <ChondroBreedingFocusHeader />
        <ChondroBreederManagementView section="breeding" />
        <ChondroBreederGameV3 />
        <ChondroClutchOutcomeExplainer />
      </>
    );
  }
  if (view === "colony") {
    return (
      <>
        <ChondroBreederManagementView section="colony" />
        <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div>
      </>
    );
  }
  if (view === "clutches") {
    return (
      <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
        <div className="panel rounded-[28px] p-4 sm:p-5"><ChondroClutchHistoryTable /></div>
      </section>
    );
  }
  if (view === "market") {
    return (
      <>
        <ChondroBreederExpandedShop />
        <ChondroBreederManagementView section="market" />
      </>
    );
  }
  if (view === "career") return <ChondroBreederManagementView section="career" />;
  if (view === "projects") return <ChondroBreederManagementView section="projects" />;
  if (view === "conservation") return <ChondroConservationPartnerships />;
  if (view === "community") return <ChondroBreederManagementView section="community" />;
  if (view === "guide") return <ChondroBreederSubspeciesPhenotypes />;
  return null;
}

function DesktopApp({ item, onClick, featured = false }: { item: ViewMeta; onClick: () => void; featured?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex text-left transition hover:-translate-y-0.5 ${featured ? "min-h-[150px] flex-col rounded-[22px] border border-white/[.075] bg-white/[.03] p-4 hover:border-emerald-300/20 hover:bg-white/[.05]" : "min-h-[74px] items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-3.5 hover:border-white/[.11] hover:bg-white/[.04]"}`}
    >
      <span className={`grid shrink-0 place-items-center border border-white/[.075] bg-black/25 text-emerald-200/72 ${featured ? "h-11 w-11 rounded-[15px] text-lg" : "h-9 w-9 rounded-xl text-sm"}`}>{item.icon}</span>
      <span className={featured ? "mt-auto" : "min-w-0 flex-1"}>
        <span className={`block font-bold text-white/80 ${featured ? "text-base" : "text-sm"}`}>{item.label}</span>
        <span className={`mt-1 block text-white/40 ${featured ? "text-xs leading-5" : "truncate text-[11px]"}`}>{item.detail}</span>
      </span>
      {!featured ? <span className="ml-auto text-xs text-emerald-200/42 transition group-hover:translate-x-0.5 group-hover:text-emerald-200/70">→</span> : null}
    </button>
  );
}
