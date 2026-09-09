"use client";

import { useState } from "react";
import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroBreederCommandCenter } from "@/components/ChondroBreederCommandCenter";
import { ChondroBreederSubspeciesPhenotypes } from "@/components/ChondroBreederSubspeciesPhenotypes";

type WorkspaceTab = "game" | "manage" | "guide";

export function ChondroBreederWorkspace() {
  const [tab, setTab] = useState<WorkspaceTab>("game");

  return (
    <div className="pb-10">
      <div className="sticky top-2 z-30 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/[.08] bg-[#07100d]/90 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            <WorkspaceButton active={tab === "game"} onClick={() => setTab("game")} label="Core Game" detail="Breed · buy · sell" />
            <WorkspaceButton active={tab === "manage"} onClick={() => setTab("manage")} label="Manage" detail="Career · projects · collection" />
            <WorkspaceButton active={tab === "guide"} onClick={() => setTab("guide")} label="Guide" detail="Subspecies · phenotype" />
          </div>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="shrink-0 rounded-xl border border-white/[.07] px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-white/40">Top ↑</button>
        </div>
      </div>

      <div className="mt-3">
        {tab === "game" ? (
          <>
            <ChondroBreederGameV3 />
            <ChondroBreederExpandedShop />
          </>
        ) : null}
        {tab === "manage" ? <ChondroBreederCommandCenter /> : null}
        {tab === "guide" ? <ChondroBreederSubspeciesPhenotypes /> : null}
      </div>
    </div>
  );
}

function WorkspaceButton({ active, onClick, label, detail }: { active: boolean; onClick: () => void; label: string; detail: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[132px] shrink-0 rounded-xl px-3 py-2 text-left transition ${active ? "bg-emerald-300/[.10] text-emerald-50" : "text-white/42 hover:bg-white/[.04] hover:text-white/65"}`}
    >
      <span className="block text-[11px] font-black uppercase tracking-[.12em]">{label}</span>
      <span className="mt-0.5 block text-[9px] opacity-55">{detail}</span>
    </button>
  );
}
