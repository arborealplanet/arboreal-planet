"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "arboreal_gtp_family_tree_v1";

type LocalAnimal = {
  id: string;
  name: string;
  sex?: string;
  locality?: string;
  breederId?: string;
  hatchYear?: string;
  notes?: string;
  damId?: string | null;
  sireId?: string | null;
  photoDataUrl?: string;
  visibility?: "private" | "public";
};

function readLocalAnimals(): LocalAnimal[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is LocalAnimal => Boolean(item && typeof item === "object" && typeof (item as LocalAnimal).id === "string" && typeof (item as LocalAnimal).name === "string")) : [];
  } catch {
    return [];
  }
}

export function GtpPedigreeCloudSync() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [cloudCount, setCloudCount] = useState(0);
  const [status, setStatus] = useState("Checking account sync…");
  const [busy, setBusy] = useState(false);

  async function inspectCloud() {
    try {
      const response = await fetch("/api/genetics/pedigree", { cache: "no-store" });
      if (response.status === 401) {
        setSignedIn(false);
        setCloudCount(0);
        setStatus("Sign in to save this pedigree to your Arboreal Planet account.");
        return;
      }
      const data = await response.json().catch(() => null) as { animals?: LocalAnimal[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not check account pedigree.");
      setSignedIn(true);
      setCloudCount(Array.isArray(data?.animals) ? data.animals.length : 0);
      setStatus(Array.isArray(data?.animals) && data.animals.length ? `${data.animals.length} cloud animal${data.animals.length === 1 ? "" : "s"} available.` : "No cloud pedigree saved yet.");
    } catch (error) {
      setSignedIn(null);
      setStatus(error instanceof Error ? error.message : "Could not check cloud sync.");
    }
  }

  useEffect(() => { void inspectCloud(); }, []);

  async function saveToCloud() {
    const animals = readLocalAnimals();
    if (!animals.length) {
      setStatus("Add at least one animal to the family tree before syncing.");
      return;
    }
    if (cloudCount > 0 && !window.confirm(`Replace your current ${cloudCount}-animal cloud pedigree with the ${animals.length}-animal pedigree saved on this device?`)) return;

    setBusy(true);
    setStatus("Saving pedigree to your account…");
    try {
      const response = await fetch("/api/genetics/pedigree", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animals: animals.map(({ photoDataUrl: _photoDataUrl, ...animal }) => ({ ...animal, visibility: animal.visibility ?? "private" })) }),
      });
      const data = await response.json().catch(() => null) as { count?: number; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not save pedigree.");
      setCloudCount(data?.count ?? animals.length);
      setStatus(`Saved ${data?.count ?? animals.length} animal${(data?.count ?? animals.length) === 1 ? "" : "s"} to your account. Photos remain in this browser for this first cloud-sync version.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save pedigree.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFromCloud() {
    const local = readLocalAnimals();
    if (local.length && !window.confirm(`Replace the ${local.length}-animal pedigree on this device with your cloud pedigree? Export a backup first if you want to keep both.`)) return;

    setBusy(true);
    setStatus("Loading your account pedigree…");
    try {
      const response = await fetch("/api/genetics/pedigree", { cache: "no-store" });
      const data = await response.json().catch(() => null) as { animals?: LocalAnimal[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not load pedigree.");
      const animals = Array.isArray(data?.animals) ? data.animals : [];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(animals));
      setStatus(`Loaded ${animals.length} cloud animal${animals.length === 1 ? "" : "s"}. Refreshing the pedigree…`);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load pedigree.");
      setBusy(false);
    }
  }

  return (
    <section className="panel rounded-[26px] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Account pedigree</div>
          <h2 className="mt-2 text-xl font-semibold text-white/80">Keep the family tree with your Arboreal Planet account.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Browser storage still works offline. Account sync gives the pedigree a private cloud copy that can later power optional public lineage records.</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${signedIn ? "border-emerald-300/15 text-emerald-100/65" : "border-white/[.08] text-white/40"}`}>{signedIn ? `${cloudCount} CLOUD` : signedIn === false ? "SIGN IN REQUIRED" : "CHECKING"}</span>
      </div>

      <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        {signedIn === false ? (
          <Link href="/login?next=/genetics" className="primary-action !min-h-0 !px-4 !py-2.5 !text-xs">Sign in to sync</Link>
        ) : (
          <>
            <button type="button" disabled={busy || signedIn !== true} onClick={() => void saveToCloud()} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c] disabled:opacity-30">Save device pedigree to account</button>
            <button type="button" disabled={busy || signedIn !== true || cloudCount === 0} onClick={() => void loadFromCloud()} className="rounded-xl border border-white/[.08] px-4 py-2.5 text-xs font-bold text-white/55 disabled:opacity-30">Load account pedigree on this device</button>
          </>
        )}
      </div>
    </section>
  );
}
