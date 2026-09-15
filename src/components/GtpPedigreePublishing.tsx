"use client";

import { useEffect, useState } from "react";

type CloudAnimal = {
  id: string;
  name: string;
  sex?: string;
  locality?: string;
  breederId?: string;
  hatchYear?: string;
  visibility?: "private" | "public";
};

export function GtpPedigreePublishing() {
  const [animals, setAnimals] = useState<CloudAnimal[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [status, setStatus] = useState("Checking publishing controls…");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/genetics/pedigree", { cache: "no-store" });
      if (response.status === 401) {
        setSignedIn(false);
        setStatus("Sign in and sync a pedigree before publishing animals.");
        return;
      }
      const data = await response.json().catch(() => null) as { animals?: CloudAnimal[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not load publishing controls.");
      const next = Array.isArray(data?.animals) ? data.animals : [];
      setAnimals(next);
      setSignedIn(true);
      setStatus(next.length ? "Choose which animals, if any, you want to contribute to the public lineage database." : "Sync your pedigree to your account first, then publishing controls will appear here.");
    } catch (error) {
      setSignedIn(null);
      setStatus(error instanceof Error ? error.message : "Could not load publishing controls.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function setVisibility(animal: CloudAnimal, visibility: "private" | "public") {
    setBusyId(animal.id);
    setStatus(visibility === "public" ? `Publishing ${animal.name}…` : `Making ${animal.name} private…`);
    try {
      const response = await fetch("/api/genetics/pedigree", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: animal.id, visibility }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not update visibility.");
      setAnimals((current) => current.map((item) => item.id === animal.id ? { ...item, visibility } : item));
      setStatus(visibility === "public" ? `${animal.name} is now included in the public lineage database.` : `${animal.name} is private again.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update visibility.");
    } finally {
      setBusyId(null);
    }
  }

  if (signedIn === false) return null;

  return (
    <section className="panel rounded-[26px] p-5 sm:p-6">
      <div className="section-kicker">Optional contribution</div>
      <h2 className="mt-2 text-xl font-semibold text-white/80">Public lineage database</h2>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Your cloud pedigree is private by default. Publish only the individual animals you want other keepers to be able to discover. You can make them private again at any time.</p>

      <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>

      {animals.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {animals.map((animal) => {
            const isPublic = animal.visibility === "public";
            return (
              <div key={animal.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-black/10 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white/72">{animal.name}</div>
                  <div className="mt-1 truncate text-[10px] text-white/32">{animal.locality || "Mixed / Unknown"}{animal.breederId ? ` · ${animal.breederId}` : ""}</div>
                </div>
                <button
                  type="button"
                  disabled={busyId === animal.id}
                  onClick={() => void setVisibility(animal, isPublic ? "private" : "public")}
                  className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black disabled:opacity-40 ${isPublic ? "border border-emerald-300/15 bg-emerald-300/[.04] text-emerald-100/70" : "border border-white/[.08] text-white/50"}`}
                >
                  {isPublic ? "PUBLIC · MAKE PRIVATE" : "PUBLISH"}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
