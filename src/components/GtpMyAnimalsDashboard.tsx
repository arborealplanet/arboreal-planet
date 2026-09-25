"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Animal = {
  id: string;
  registryCode?: string;
  name: string;
  sex?: string;
  locality?: string;
  hatchYear?: string;
  visibility?: "private" | "public";
  photoDataUrl?: string;
};

export function GtpMyAnimalsDashboard() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState("Loading your registered animals…");

  useEffect(() => {
    let active = true;
    setCheckFailed(false);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    void (async () => {
      try {
        const response = await fetch("/api/genetics/pedigree", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          if (!active) return;
          setSignedIn(false);
          setStatus("Sign in to see your registered Green Tree Pythons.");
          return;
        }
        const data = await response.json().catch(() => null) as { animals?: Animal[]; error?: string } | null;
        if (!response.ok) throw new Error(data?.error || "Could not load your animals.");
        if (!active) return;
        const next = Array.isArray(data?.animals) ? data.animals : [];
        setAnimals(next);
        setSignedIn(true);
        setStatus(next.length ? `${next.length} registered animal${next.length === 1 ? "" : "s"} on your account.` : "No cloud pedigree animals yet.");
      } catch (error) {
        if (!active) return;
        setSignedIn(null);
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus("The sign-in check timed out. Check your connection and try again.");
        } else {
          setStatus(error instanceof Error ? error.message : "Could not load your animals.");
        }
        setCheckFailed(true);
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => { active = false; };
  }, [reloadKey]);

  const stats = useMemo(() => {
    const published = animals.filter((animal) => animal.visibility === "public").length;
    const privateCount = animals.length - published;
    const withPhotos = animals.filter((animal) => Boolean(animal.photoDataUrl)).length;
    return { published, privateCount, withPhotos };
  }, [animals]);

  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">My collection</div>
          <h2 className="mt-2 text-2xl font-semibold text-white/82">Your registered Green Tree Pythons.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-white/40">This is your account-level registry collection. Public status, ownership, producer credits and pedigree relationships stay separate so the record can follow the animal through real-world breeding and sales.</p>
        </div>
        {signedIn === false ? <Link href="/login?next=%2Fgenetics%23animals" className="primary-action !min-h-0 !px-4 !py-2.5 !text-xs">Sign in</Link> : <Link href="#pedigrees" className="secondary-action !min-h-0 !px-4 !py-2.5 !text-xs">Open pedigree builder →</Link>}
      </div>

      {checkFailed ? (
        <div role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-500/[.07] p-3">
          <p className="text-xs font-bold text-red-100/85">Couldn&apos;t check your sign-in status.</p>
          <p className="mt-1 text-xs leading-5 text-white/45">{status}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-3 rounded-xl border border-white/[.12] px-4 py-2 text-xs font-bold text-white/75 transition hover:border-white/25 hover:text-white">Retry</button>
        </div>
      ) : (
        <div role="status" className="mt-4 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-white/45">{status}</div>
      )}

      {signedIn && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Registered</div><div className="mt-2 text-2xl font-semibold text-white/78">{animals.length}</div></div>
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/42">Published</div><div className="mt-2 text-2xl font-semibold text-emerald-100/72">{stats.published}</div></div>
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">Private</div><div className="mt-2 text-2xl font-semibold text-white/72">{stats.privateCount}</div></div>
            <div className="panel-soft rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.12em] text-white/24">With photos</div><div className="mt-2 text-2xl font-semibold text-white/72">{stats.withPhotos}</div></div>
          </div>

          {animals.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{animals.slice(0, 9).map((animal) => (
            <article key={animal.id} className="overflow-hidden rounded-2xl border border-white/[.06] bg-black/10">
              {animal.photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={animal.photoDataUrl} alt={`${animal.name} pedigree photo`} className="h-36 w-full object-cover" />
              ) : null}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="truncate font-semibold text-white/72">{animal.name}</div><div className="mt-1 truncate font-mono text-[9px] text-emerald-100/40">{animal.registryCode || "Registry ID pending"}</div></div>
                  <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase ${animal.visibility === "public" ? "border-emerald-300/12 text-emerald-100/58" : "border-white/[.07] text-white/32"}`}>{animal.visibility === "public" ? "Public" : "Private"}</span>
                </div>
                <div className="mt-3 text-xs text-white/35">{animal.locality || "Mixed / Unknown"}{animal.sex ? ` · ${animal.sex}` : ""}{animal.hatchYear ? ` · ${animal.hatchYear}` : ""}</div>
                <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold">{animal.visibility === "public" ? <Link href={`/genetics/database/${encodeURIComponent(animal.id)}`} className="text-emerald-200/65">Open public record →</Link> : <span className="text-white/25">Private record</span>}<Link href="#breeding" className="text-white/38 hover:text-white/60">Breeding tools</Link></div>
              </div>
            </article>
          ))}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/[.07] p-7 text-center"><div className="text-sm font-semibold text-white/52">Start with the pedigree builder.</div><p className="mt-2 text-xs leading-5 text-white/30">Create animals locally, then use cloud sync below to give them permanent Arboreal Planet registry records.</p><Link href="#pedigrees" className="mt-4 inline-flex text-xs font-bold text-emerald-200/65">Build your first pedigree →</Link></div>}

          {animals.length > 9 ? <div className="mt-3 text-center text-[10px] text-white/25">Showing 9 of {animals.length} registered animals.</div> : null}
        </>
      )}
    </section>
  );
}
