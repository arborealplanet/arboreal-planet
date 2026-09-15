"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { GtpBreederConfirmations } from "@/components/GtpBreederConfirmations";
import { GtpBreedingWorkflow } from "@/components/GtpBreedingWorkflow";
import { GtpFamilyTreeMaker } from "@/components/GtpFamilyTreeMaker";
import { GtpLocalityConfidenceGuide } from "@/components/GtpLocalityConfidenceGuide";
import { GtpMyAnimalsDashboard } from "@/components/GtpMyAnimalsDashboard";
import { GtpPairingClutchManager } from "@/components/GtpPairingClutchManager";
import { GtpPairingRecords } from "@/components/GtpPairingRecords";
import { GtpPedigreeCloudSync } from "@/components/GtpPedigreeCloudSync";
import { GtpPedigreePublishing } from "@/components/GtpPedigreePublishing";
import { GtpPedigreeTransfers } from "@/components/GtpPedigreeTransfers";
import { GtpRegisteredParentLinker } from "@/components/GtpRegisteredParentLinker";
import { GtpSubspeciesCalculator } from "@/components/GtpSubspeciesCalculator";

type HubTab = "calculator" | "animals" | "breeding" | "pedigrees" | "database";

const tabs: Array<{ id: HubTab; label: string; short: string; description: string }> = [
  {
    id: "calculator",
    label: "Calculator",
    short: "Subspecies education",
    description: "Compare locality labels, see their Arboreal Planet taxon grouping and calculate pedigree ancestry without predicting phenotype or traits.",
  },
  {
    id: "animals",
    label: "My Animals",
    short: "Cloud records",
    description: "See your registered collection, sync pedigree animals to your account, choose what becomes public and transfer a permanent registry record when an animal changes keepers.",
  },
  {
    id: "breeding",
    label: "Breeding",
    short: "Pairings & clutches",
    description: "Link registered parents across keepers, record outside breedings or partnerships, group clutch offspring and request producer confirmation.",
  },
  {
    id: "pedigrees",
    label: "Pedigrees",
    short: "Build family trees",
    description: "Create and maintain family trees with animal names, photos, parent links, IDs, hatch years and keeper notes.",
  },
  {
    id: "database",
    label: "Public Database",
    short: "Explore lineages",
    description: "Search opt-in public records, move through ancestors and descendants, view producer credits and open printable pedigree records.",
  },
];

function isHubTab(value: string): value is HubTab {
  return tabs.some((tab) => tab.id === value);
}

function subscribeToLocation(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

function getLocationSnapshot(): HubTab {
  const hash = window.location.hash.replace("#", "");
  return isHubTab(hash) ? hash : "calculator";
}

function getServerSnapshot(): HubTab {
  return "calculator";
}

export function GtpGeneticsHub() {
  const active = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, getServerSnapshot);

  function selectTab(tab: HubTab) {
    const nextUrl = `${window.location.pathname}${window.location.search}#${tab}`;
    window.history.replaceState(null, "", nextUrl);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:pb-20">
      <section className="panel overflow-hidden rounded-[30px]">
        <div className="border-b border-white/[.06] p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Genetics hub sections">
            {tabs.map((tab) => {
              const selected = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  aria-pressed={selected}
                  className={`min-w-max rounded-2xl border px-4 py-3 text-left transition sm:min-w-[155px] ${selected ? "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-100" : "border-white/[.06] bg-black/10 text-white/44 hover:border-white/[.11] hover:text-white/65"}`}
                >
                  <div className="text-xs font-black">{tab.label}</div>
                  <div className={`mt-1 text-[9px] font-medium ${selected ? "text-emerald-100/45" : "text-white/24"}`}>{tab.short}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 border-b border-white/[.06] bg-black/10 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="section-kicker">Genetics Hub · {current.label}</div>
            <h2 className="mt-2 text-2xl font-semibold text-white/82">{current.label}</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-white/40">{current.description}</p>
          </div>
          {active !== "database" ? <Link href="/genetics/database" className="secondary-action !min-h-0 !px-4 !py-2.5 !text-xs">Open public database →</Link> : null}
        </div>
      </section>

      <div className={active === "calculator" ? "mt-5 space-y-5" : "hidden"} aria-hidden={active !== "calculator"}>
        <GtpLocalityConfidenceGuide />
        <GtpSubspeciesCalculator />
      </div>

      <div className={active === "animals" ? "mt-5 space-y-5" : "hidden"} aria-hidden={active !== "animals"}>
        <GtpMyAnimalsDashboard />
        <div id="cloud-sync"><GtpPedigreeCloudSync /></div>
        <div id="publishing"><GtpPedigreePublishing /></div>
        <div id="transfers"><GtpPedigreeTransfers /></div>
      </div>

      <div className={active === "breeding" ? "mt-5 space-y-5" : "hidden"} aria-hidden={active !== "breeding"}>
        <GtpBreedingWorkflow />
        <div id="breeding-parents"><GtpRegisteredParentLinker /></div>
        <div id="breeding-pairing"><GtpPairingRecords /></div>
        <div id="breeding-clutch"><GtpPairingClutchManager /></div>
        <div id="breeding-producers"><GtpBreederConfirmations /></div>
      </div>

      <div className={active === "pedigrees" ? "mt-5" : "hidden"} aria-hidden={active !== "pedigrees"}>
        <GtpFamilyTreeMaker />
      </div>

      <div className={active === "database" ? "mt-5" : "hidden"} aria-hidden={active !== "database"}>
        <section className="panel rounded-[28px] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div>
              <div className="section-kicker">Community lineage registry</div>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-white/84">Explore the public Green Tree Python lineage database.</h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/42">Only records their keepers explicitly publish appear in the database. Search by animal, AP registry ID, locality, taxon, keeper or confirmed producer, then move through parents, siblings, offspring, pairing history and ownership history where those records are public.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/genetics/database" className="primary-action !min-h-0 !px-5 !py-3 !text-xs">Search public lineages</Link>
                <Link href="/animals/green-tree-python" className="secondary-action !min-h-0 !px-5 !py-3 !text-xs">Green Tree Python reference</Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/45">Private by default</div><p className="mt-2 text-xs leading-5 text-white/38">Cloud pedigree records do not enter the public database until their current keeper chooses to publish them.</p></div>
              <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/45">Permanent identity</div><p className="mt-2 text-xs leading-5 text-white/38">An AP registry ID stays with an animal through keeper transfers, while producer credits and parentage remain separate from ownership.</p></div>
              <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.13em] text-emerald-200/45">Lax by design</div><p className="mt-2 text-xs leading-5 text-white/38">The registry accommodates breeding loans, partnerships, co-production and sales rather than forcing every relationship into one ownership model.</p></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
