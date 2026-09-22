"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SnakeSorterScanner } from "@/components/SnakeSorterScanner";
import { SnakeSorterScanHistory } from "@/components/SnakeSorterScanHistory";
import { SnakeSorterAcquisitionQueue } from "@/components/SnakeSorterAcquisitionQueue";
import {
  SnakeSorterReferenceManager,
  type SnakeReferenceAnimal,
  type SnakeReferenceMedia,
} from "@/components/SnakeSorterReferenceManager";
import { SnakeSorterModelStatus } from "@/components/SnakeSorterModelStatus";
import { SnakeSorterMembers } from "@/components/SnakeSorterMembers";
import { SnakeSorterBulkImport } from "@/components/SnakeSorterBulkImport";
import { SnakeSorterOperations } from "@/components/SnakeSorterOperations";
import { SnakeSorterInstallButton } from "@/components/SnakeSorterInstallButton";
import { SnakeSorterDatasetDiagnostics } from "@/components/SnakeSorterDatasetDiagnostics";

type View = "home" | "scan" | "candidates" | "references" | "history" | "more";
type AccessLevel = "owner" | "reviewer" | "scanner" | string | null;

type CandidateStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  permission_required: number;
  staged: number;
  open_license: number;
  metadata_only: number;
};

const emptyCandidateStats: CandidateStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  permission_required: 0,
  staged: 0,
  open_license: 0,
  metadata_only: 0,
};

const viewMeta: Record<View, { label: string; short: string; detail: string; icon: string }> = {
  home: { label: "Home", short: "Home", detail: "Snake Sorter command center", icon: "⌂" },
  scan: { label: "Scanner", short: "Scan", detail: "Photo, video and live-camera identification", icon: "◎" },
  candidates: { label: "Candidates", short: "Review", detail: "Harvested listings and reference candidates", icon: "◇" },
  references: { label: "Reference Library", short: "Library", detail: "Curated animals and accepted reference media", icon: "▦" },
  history: { label: "Scan History", short: "History", detail: "Past analysis runs and feedback", icon: "↺" },
  more: { label: "Laboratory", short: "More", detail: "Models, members, imports and system health", icon: "•••" },
};

export function SnakeSorterLabShell({
  isOwner,
  accessLevel,
}: {
  isOwner: boolean;
  accessLevel: AccessLevel;
}) {
  const canReview = isOwner || accessLevel === "reviewer";
  const canInstall = isOwner || accessLevel === "reviewer" || accessLevel === "scanner";
  const [view, setView] = useState<View>("home");
  const [animals, setAnimals] = useState<SnakeReferenceAnimal[]>([]);
  const [media, setMedia] = useState<SnakeReferenceMedia[]>([]);
  const [candidateStats, setCandidateStats] = useState<CandidateStats>(emptyCandidateStats);
  const [moreTool, setMoreTool] = useState<"models" | "diagnostics" | "members" | "import" | "system">("diagnostics");

  async function loadReferences() {
    if (!isOwner) return;
    const response = await fetch("/api/snake-sorter/references", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setAnimals(data.animals ?? []);
    setMedia(data.media ?? []);
  }

  async function loadCandidateStats() {
    if (!canReview) return;
    const response = await fetch("/api/snake-sorter/acquisition", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setCandidateStats(data.stats ?? emptyCandidateStats);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReferences();
      void loadCandidateStats();
    }, 0);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, canReview]);

  const dockViews = useMemo<View[]>(() => {
    if (isOwner) return ["home", "scan", "candidates", "references", "more"];
    if (canReview) return ["home", "scan", "candidates", "history"];
    return ["home", "scan", "history"];
  }, [isOwner, canReview]);

  const active = viewMeta[view];

  async function lockSnakeSorter() {
    await fetch("/api/snake-sorter/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock" }),
    }).catch(() => undefined);
    window.location.replace("/snake-sorter/unlock");
  }

  function openView(next: View) {
    if (next === "candidates" && !canReview) return;
    if ((next === "references" || next === "more") && !isOwner) return;
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }

  return (
    <div className="min-h-[100dvh] bg-[#020705] pb-[calc(92px+env(safe-area-inset-bottom))] text-white">
      <header className="sticky top-0 z-[70] border-b border-white/[.055] bg-[#020705]/96 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[62px] max-w-[1500px] items-center gap-3 px-3 sm:min-h-[68px] sm:px-5">
          <Link
            href="/snake-sorter"
            aria-label="Snake Sorter home"
            title="Snake Sorter home"
            className="group grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/[.07] bg-white/[.025] transition hover:border-emerald-300/20 hover:bg-white/[.045]"
          >
            <Image src="/branding/snake-sorter-app-icon-512.png" alt="" width={36} height={36} className="rounded-xl" />
          </Link>

          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-200/45">Snake Sorter</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-white/82">{active.label}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {canInstall && <SnakeSorterInstallButton />}
            <button
              type="button"
              onClick={() => void lockSnakeSorter()}
              className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-white/45 transition hover:border-white/[.14] hover:bg-white/[.045]"
              title="Lock Snake Sorter"
            >
              Lock
            </button>
            {canReview && candidateStats.pending > 0 && (
              <button
                type="button"
                onClick={() => openView("candidates")}
                className="hidden rounded-full border border-amber-300/12 bg-amber-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-amber-100/55 sm:block"
              >
                {candidateStats.pending} to review
              </button>
            )}
            <span className="rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-emerald-100/48">
              {isOwner ? "Owner" : accessLevel === "reviewer" ? "Reviewer" : "Scanner"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-3 py-3 sm:px-5 sm:py-5">
        {view === "home" && (
          <Home
            isOwner={isOwner}
            canReview={canReview}
            canInstall={canInstall}
            animals={animals}
            media={media}
            candidateStats={candidateStats}
            onOpen={openView}
          />
        )}

        {view === "scan" && (
          <Screen title="Scan a snake" detail="Use photos, video, or the live camera. Scan media remains separate from the reference/training library.">
            <SnakeSorterScanner canManageReferences={false} canViewReferenceMedia={false} />
          </Screen>
        )}

        {view === "history" && (
          <Screen title="Scan history" detail="Review previous analysis runs, confidence and feedback without storing the original scan media.">
            <SnakeSorterScanHistory />
          </Screen>
        )}

        {view === "candidates" && canReview && (
          <Screen title="Candidate review" detail="Review harvested listing data and candidate references before anything can enter the curated library.">
            <SnakeSorterAcquisitionQueue onPromoted={isOwner ? loadReferences : undefined} canHarvest={isOwner} canPromote={isOwner} />
          </Screen>
        )}

        {view === "references" && isOwner && (
          <Screen title="Reference library" detail="Curated animals and media used to build controlled, versioned Snake Sorter datasets.">
            <SnakeSorterReferenceManager animals={animals} media={media} onRefresh={loadReferences} />
          </Screen>
        )}

        {view === "more" && isOwner && (
          <Screen title="Laboratory tools" detail="Keep the heavy administration out of the main workflow until you need it.">
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {([
                ["diagnostics", "Diagnostics", "Coverage gaps & dataset balance"],
                ["models", "Models", "Model registry & snapshots"],
                ["members", "Members", "Scanner/reviewer access"],
                ["import", "Import", "Bulk reference intake"],
                ["system", "System", "Inference health"],
              ] as const).map(([id, label, detail]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMoreTool(id)}
                  className={`rounded-[20px] border p-3 text-left transition ${moreTool === id ? "border-emerald-300/20 bg-emerald-300/[.055]" : "border-white/[.06] bg-black/[.08] hover:border-white/[.11]"}`}
                >
                  <div className="text-xs font-bold text-white/72">{label}</div>
                  <div className="mt-1 text-[9px] leading-4 text-white/28">{detail}</div>
                </button>
              ))}
            </div>
            {moreTool === "diagnostics" && (
              <SnakeSorterDatasetDiagnostics
                animals={animals}
                media={media}
                onOpenCandidates={() => openView("candidates")}
                onOpenReferences={() => openView("references")}
                onRefreshReferences={loadReferences}
              />
            )}
            {moreTool === "models" && <SnakeSorterModelStatus />}
            {moreTool === "members" && <SnakeSorterMembers />}
            {moreTool === "import" && <SnakeSorterBulkImport onImported={loadReferences} />}
            {moreTool === "system" && <SnakeSorterOperations />}
          </Screen>
        )}
      </main>

      <nav
        className={`fixed inset-x-0 bottom-0 z-[80] mx-auto grid h-[calc(84px+env(safe-area-inset-bottom))] gap-1 border-t border-white/[.08] bg-[#020705]/97 px-1.5 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_50px_rgba(0,0,0,.34)] backdrop-blur-xl sm:px-3 lg:bottom-4 lg:h-[84px] lg:max-w-[760px] lg:rounded-[24px] lg:border lg:px-4 lg:pb-2 ${dockViews.length === 5 ? "grid-cols-5" : dockViews.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
        aria-label="Snake Sorter navigation"
      >
        {dockViews.map((id) => {
          const item = viewMeta[id];
          const selected = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openView(id)}
              aria-current={selected ? "page" : undefined}
              className={`group flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-1 transition ${selected ? "bg-emerald-300/[.09]" : "hover:bg-white/[.035]"}`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-[13px] border text-base transition ${selected ? "border-emerald-200/35 bg-emerald-300/[.08] text-emerald-100" : "border-white/[.07] bg-black/25 text-white/42"}`}>
                {item.icon}
              </span>
              <span className={`mt-1 truncate text-[8px] font-black uppercase tracking-[.06em] ${selected ? "text-emerald-100/70" : "text-white/28"}`}>{item.short}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Screen({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 border-b border-white/[.055] px-1 pb-4">
        <div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/42">Snake Sorter laboratory</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-white/40">{detail}</p>
      </div>
      {children}
    </section>
  );
}

function Home({
  isOwner,
  canReview,
  canInstall,
  animals,
  media,
  candidateStats,
  onOpen,
}: {
  isOwner: boolean;
  canReview: boolean;
  canInstall: boolean;
  animals: SnakeReferenceAnimal[];
  media: SnakeReferenceMedia[];
  candidateStats: CandidateStats;
  onOpen: (view: View) => void;
}) {
  const approved = animals.filter((animal) => animal.review_status === "approved").length;
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[30px] border border-emerald-300/10 bg-[radial-gradient(circle_at_75%_10%,rgba(74,222,128,.08),transparent_34%),#06100c]">
        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <div className="border-b border-white/[.06] bg-white p-3 lg:border-b-0 lg:border-r">
            <Image src="/branding/snake-sorter-logo.svg" alt="Snake Sorter" width={420} height={420} priority unoptimized className="mx-auto h-auto w-full max-w-[300px]" />
          </div>
          <div className="flex items-center p-5 sm:p-7 lg:p-9">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-200/52">Private visual identification lab</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-white sm:text-4xl">Scan. Review. Curate. Improve.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/44">The scanner stays simple. Candidate acquisition, reference curation, model work, and member access live in separate workspaces so the tool remains usable as the dataset grows.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpen("scan")} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-[10px] font-black text-[#06100c]">Start scan</button>
                {canInstall && <SnakeSorterInstallButton prominent />}
                {canReview && <button type="button" onClick={() => onOpen("candidates")} className="rounded-xl border border-amber-300/14 bg-amber-300/[.035] px-4 py-2.5 text-[10px] font-black text-amber-100/60">Review candidates</button>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Pending candidates", canReview ? candidateStats.pending : "—"],
          ["Candidate total", canReview ? candidateStats.total : "—"],
          ["Reference animals", isOwner ? animals.length : "Private"],
          ["Reference images", isOwner ? media.length : "Private"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[20px] border border-white/[.06] bg-black/[.08] p-4">
            <div className="text-2xl font-semibold text-white/68">{value}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.09em] text-white/22">{label}</div>
          </div>
        ))}
      </section>

      {isOwner && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HomeCard title="Candidate review" detail={`${candidateStats.pending} pending · ${candidateStats.rejected} rejected`} action="Open review queue" onClick={() => onOpen("candidates")} />
          <HomeCard title="Reference library" detail={`${approved} approved animals · ${media.length} images`} action="Open library" onClick={() => onOpen("references")} />
          <HomeCard title="Scanner" detail="Quick, deep and live-camera workflows" action="Start scan" onClick={() => onOpen("scan")} />
          <HomeCard title="Laboratory" detail="Models, members, imports and system health" action="Open tools" onClick={() => onOpen("more")} />
        </section>
      )}

      {!isOwner && canReview && (
        <section className="rounded-[24px] border border-amber-300/10 bg-amber-300/[.025] p-4">
          <div className="text-sm font-semibold text-amber-50/65">Reviewer workspace</div>
          <p className="mt-2 text-xs leading-5 text-white/35">You can scan snakes and help triage harvested candidates. Curated references, model controls and member administration remain owner-only.</p>
        </section>
      )}
    </div>
  );
}

function HomeCard({ title, detail, action, onClick }: { title: string; detail: string; action: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group min-h-[128px] rounded-[22px] border border-white/[.06] bg-white/[.022] p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/16 hover:bg-white/[.04]">
      <div className="text-sm font-bold text-white/76">{title}</div>
      <div className="mt-2 text-[11px] leading-5 text-white/34">{detail}</div>
      <div className="mt-4 text-[9px] font-black uppercase tracking-[.08em] text-emerald-100/45">{action} →</div>
    </button>
  );
}
