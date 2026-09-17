"use client";

import { useEffect, useState } from "react";
import { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";
import { ArborealKeeperFacilityOverview } from "@/components/ArborealKeeperFacilityOverview";
import { ArborealKeeperMyAnimals } from "@/components/ArborealKeeperMyAnimals";
import { ArborealKeeperProgressionStrip } from "@/components/ArborealKeeperProgressionStrip";
import { ArborealKeeperSpeciesPrograms } from "@/components/ArborealKeeperSpeciesPrograms";

type HubView = "programs" | "emeralds" | "animals" | "facility";
type EmeraldView = "market" | "colony" | "breeding" | "clutches";

const HUB_VIEWS: Array<{ id: HubView; label: string }> = [
  { id: "programs", label: "Programs" },
  { id: "emeralds", label: "Emerald Boas" },
  { id: "animals", label: "My Animals" },
  { id: "facility", label: "Facility" },
];

const EMERALD_VIEWS: Array<{ id: EmeraldView; label: string }> = [
  { id: "market", label: "Market" },
  { id: "colony", label: "My Boas" },
  { id: "breeding", label: "Breeding" },
  { id: "clutches", label: "Litters" },
];

function isKeeperHomeActive() {
  const dock = document.querySelector('nav[aria-label="Chondro Breeder navigation"]');
  if (!dock) return true;

  const buttons = Array.from(dock.querySelectorAll("button"));
  const selected = buttons.findIndex((button) => button.getAttribute("aria-current") === "page");
  return selected === 0;
}

export function ArborealKeeperProgramHub() {
  const [view, setView] = useState<HubView>("programs");
  const [emeraldView, setEmeraldView] = useState<EmeraldView>("market");
  const [homeActive, setHomeActive] = useState(true);

  useEffect(() => {
    const syncVisibility = () => setHomeActive(isKeeperHomeActive());
    syncVisibility();

    const observer = new MutationObserver(syncVisibility);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-current"],
    });

    return () => observer.disconnect();
  }, []);

  if (!homeActive) return null;

  return (
    <section className="border-b border-white/[.055] bg-[#030806] py-4 sm:py-5">
      <div className="mx-auto max-w-[1500px] px-3 sm:px-5">
        <div className="overflow-hidden rounded-[28px] border border-emerald-300/10 bg-[#05100b] shadow-[0_24px_70px_rgba(0,0,0,.24)]">
          <div className="border-b border-white/[.055] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.19em] text-emerald-200/52">Arboreal Keeper</div>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">Your shared arboreal facility</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/44">
                  Green Tree Pythons and Emerald Tree Boas share keeper progression, rooms and compatible enclosure inventory while retaining species-specific breeding systems.
                </p>
              </div>
              <div className="rounded-full border border-white/[.06] bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] text-white/38">
                Individual housing only
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {HUB_VIEWS.map((item) => {
                const selected = item.id === view;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    aria-current={selected ? "page" : undefined}
                    className={`rounded-2xl border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] transition ${selected ? "border-emerald-300/18 bg-emerald-300/[.075] text-emerald-100/75" : "border-white/[.055] bg-black/15 text-white/38 hover:bg-white/[.025] hover:text-white/60"}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {view === "programs" ? (
            <div className="p-4 sm:p-5">
              <ArborealKeeperProgressionStrip />
              <ArborealKeeperSpeciesPrograms />
            </div>
          ) : null}

          {view === "emeralds" ? (
            <div>
              <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {EMERALD_VIEWS.map((item) => {
                    const selected = item.id === emeraldView;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEmeraldView(item.id)}
                        className={`rounded-xl border px-3 py-2 text-[10px] font-semibold transition ${selected ? "border-emerald-300/18 bg-emerald-300/[.07] text-emerald-100/70" : "border-white/[.05] bg-black/15 text-white/32 hover:text-white/55"}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <ArborealKeeperEmeraldWorkspace mode={emeraldView} />
              <div className="h-5" />
            </div>
          ) : null}

          {view === "animals" ? <div className="pb-5"><ArborealKeeperMyAnimals /></div> : null}
          {view === "facility" ? <div className="pt-5"><ArborealKeeperFacilityOverview /></div> : null}
        </div>

        <div className="mt-5 rounded-[22px] border border-white/[.055] bg-white/[.02] px-4 py-3">
          <div className="text-[9px] font-black uppercase tracking-[.16em] text-white/28">Green Tree Python program</div>
          <div className="mt-1 text-sm text-white/52">The mature Chondro Breeder workspace continues below while its systems are migrated into the shared Arboreal Keeper shell.</div>
        </div>
      </div>
    </section>
  );
}
