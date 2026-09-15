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

function photoBlob(dataUrl: string) {
  const match = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const bytes = atob(match[2]);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
  return new Blob([buffer], { type: match[1].toLowerCase() });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not prepare photo."));
    reader.onerror = () => reject(reader.error || new Error("Could not prepare photo."));
    reader.readAsDataURL(blob);
  });
}

async function localizeCloudPhoto(photoUrl: string) {
  if (!photoUrl || photoUrl.startsWith("data:image/")) return photoUrl;
  const response = await fetch(photoUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not download a pedigree photo for offline use.");
  return blobToDataUrl(await response.blob());
}

async function uploadAnimalPhoto(animal: LocalAnimal) {
  if (!animal.photoDataUrl?.startsWith("data:image/")) return false;
  const blob = photoBlob(animal.photoDataUrl);
  if (!blob) return false;
  const form = new FormData();
  form.set("id", animal.id);
  form.set("file", blob, `${animal.id}.${blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp"}`);
  const response = await fetch("/api/genetics/pedigree/photo", { method: "POST", body: form });
  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(data?.error || `Could not upload the photo for ${animal.name}.`);
  return true;
}

async function deleteAnimalPhoto(animal: LocalAnimal) {
  const response = await fetch(`/api/genetics/pedigree/photo?id=${encodeURIComponent(animal.id)}`, { method: "DELETE" });
  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(data?.error || `Could not remove the cloud photo for ${animal.name}.`);
}

export function GtpPedigreeCloudSync() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [cloudCount, setCloudCount] = useState(0);
  const [cloudAnimals, setCloudAnimals] = useState<LocalAnimal[]>([]);
  const [status, setStatus] = useState("Checking account sync…");
  const [busy, setBusy] = useState(false);

  async function inspectCloud() {
    try {
      const response = await fetch("/api/genetics/pedigree", { cache: "no-store" });
      if (response.status === 401) {
        setSignedIn(false);
        setCloudCount(0);
        setCloudAnimals([]);
        setStatus("Sign in to save this pedigree to your Arboreal Planet account.");
        return;
      }
      const data = await response.json().catch(() => null) as { animals?: LocalAnimal[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not check account pedigree.");
      const next = Array.isArray(data?.animals) ? data.animals : [];
      setSignedIn(true);
      setCloudAnimals(next);
      setCloudCount(next.length);
      setStatus(next.length ? `${next.length} cloud animal${next.length === 1 ? "" : "s"} available.` : "No cloud pedigree saved yet.");
    } catch (error) {
      setSignedIn(null);
      setStatus(error instanceof Error ? error.message : "Could not check cloud sync.");
    }
  }

  useEffect(() => { void inspectCloud(); }, []);

  async function saveToCloud() {
    const animals = readLocalAnimals();
    if (!animals.length && cloudCount === 0) {
      setStatus("Add at least one animal to the family tree before syncing.");
      return;
    }
    if (!animals.length && cloudCount > 0 && !window.confirm(`Remove all ${cloudCount} animals from your cloud pedigree? This does not affect exported backups.`)) return;
    if (animals.length && cloudCount > 0 && !window.confirm(`Replace your current ${cloudCount}-animal cloud pedigree with the ${animals.length}-animal pedigree saved on this device?`)) return;

    setBusy(true);
    setStatus(animals.length ? "Saving pedigree to your account…" : "Clearing your cloud pedigree…");
    try {
      const previousCloudById = new Map(cloudAnimals.map((animal) => [animal.id, animal]));
      const response = await fetch("/api/genetics/pedigree", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animals }),
      });
      const data = await response.json().catch(() => null) as { count?: number; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not save pedigree.");

      const uploads = animals.filter((animal) => animal.photoDataUrl?.startsWith("data:image/"));
      const removals = animals.filter((animal) => !animal.photoDataUrl && Boolean(previousCloudById.get(animal.id)?.photoDataUrl));
      let uploaded = 0;
      let removed = 0;

      for (const animal of uploads) {
        setStatus(`Saving pedigree photos… ${uploaded + 1} of ${uploads.length}`);
        if (await uploadAnimalPhoto(animal)) uploaded += 1;
      }

      for (const animal of removals) {
        setStatus(`Removing old cloud photos… ${removed + 1} of ${removals.length}`);
        await deleteAnimalPhoto(animal);
        removed += 1;
      }

      setCloudAnimals(animals);
      setCloudCount(data?.count ?? animals.length);
      if (!animals.length) {
        setStatus("Cloud pedigree cleared.");
      } else {
        const photoSummary = [uploaded ? `${uploaded} photo${uploaded === 1 ? "" : "s"} saved` : "", removed ? `${removed} photo${removed === 1 ? "" : "s"} removed` : ""].filter(Boolean).join(", ");
        setStatus(`Saved ${data?.count ?? animals.length} animal${(data?.count ?? animals.length) === 1 ? "" : "s"} to your account${photoSummary ? ` · ${photoSummary}` : ""}.`);
      }
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
      let localizedPhotos = 0;
      const localized = await Promise.all(animals.map(async (animal) => {
        if (!animal.photoDataUrl) return animal;
        setStatus(`Preparing pedigree photos for offline use… ${localizedPhotos + 1}`);
        try {
          const photoDataUrl = await localizeCloudPhoto(animal.photoDataUrl);
          localizedPhotos += 1;
          return { ...animal, photoDataUrl };
        } catch {
          return animal;
        }
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localized));
      setStatus(`Loaded ${localized.length} cloud animal${localized.length === 1 ? "" : "s"}${localizedPhotos ? ` and cached ${localizedPhotos} photo${localizedPhotos === 1 ? "" : "s"} for offline use` : ""}. Refreshing the pedigree…`);
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
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">Browser storage still works offline. Account sync keeps the pedigree and its animal photos with your account. Records stay private unless you explicitly publish an animal.</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${signedIn ? "border-emerald-300/15 text-emerald-100/65" : "border-white/[.08] text-white/40"}`}>{signedIn ? `${cloudCount} CLOUD` : signedIn === false ? "SIGN IN REQUIRED" : "CHECKING"}</span>
      </div>

      <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        {signedIn === false ? (
          <Link href="/login?next=%2Fgenetics%23animals" className="primary-action !min-h-0 !px-4 !py-2.5 !text-xs">Sign in to sync</Link>
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
