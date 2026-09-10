"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";

type LooseSave = {
  breedingCycle?: {
    stage?: string;
    startedAt?: number;
    completesAt?: number;
  } | null;
  clutch?: {
    offspring?: unknown[];
  } | null;
  clutchEstablished?: boolean;
};

type StageArt = {
  src: string;
  eyebrow: string;
  title: string;
  detail: string;
};

function readSave(): LooseSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
    return raw ? (JSON.parse(raw) as LooseSave) : null;
  } catch {
    return null;
  }
}

function chooseArt(save: LooseSave | null, now: number): StageArt {
  if (!save) {
    return {
      src: "/hatchery/game/fresh-eggs.webp",
      eyebrow: "Clutch room",
      title: "From laying to establishment",
      detail: "Your active clutch artwork will follow reproductive progress as the cycle advances.",
    };
  }

  if (save.clutch?.offspring?.length) {
    return {
      src: "/hatchery/game/near-hatch-eggs.webp",
      eyebrow: save.clutchEstablished ? "Established clutch" : "Hatch window",
      title: save.clutchEstablished ? "The clutch is established" : "Hatchlings are arriving",
      detail: save.clutchEstablished
        ? "The clutch has moved beyond incubation and into individual animal management."
        : "The eggs are at the end of incubation. Finish hatch-day and establishment decisions here.",
    };
  }

  const cycle = save.breedingCycle;
  const stage = cycle?.stage ?? "";

  if (stage === "hatch-day") {
    return {
      src: "/hatchery/game/near-hatch-eggs.webp",
      eyebrow: "Hatch day",
      title: "The clutch is beginning to pip",
      detail: "Cracks and pips mark the final stretch before the neonates emerge.",
    };
  }

  if (stage === "incubation") {
    const started = Number(cycle?.startedAt ?? 0);
    const completes = Number(cycle?.completesAt ?? 0);
    const span = Math.max(1, completes - started);
    const progress = Math.max(0, Math.min(1, (now - started) / span));
    if (progress >= 0.68) {
      return {
        src: "/hatchery/game/near-hatch-eggs.webp",
        eyebrow: "Late incubation",
        title: "The clutch is getting close",
        detail: "Incubation is well advanced. The visual state now reflects the approaching hatch window.",
      };
    }
    return {
      src: "/hatchery/game/fresh-eggs.webp",
      eyebrow: "Incubation",
      title: "The clutch is developing",
      detail: "Keep the clutch stable while the incubation timer progresses.",
    };
  }

  if (stage === "laying" || stage === "pre-lay") {
    return {
      src: "/hatchery/game/fresh-eggs.webp",
      eyebrow: stage === "laying" ? "Laying" : "Pre-lay",
      title: stage === "laying" ? "Eggs are being laid" : "Prepare for the clutch",
      detail: "The reproductive cycle is entering the clutch phase.",
    };
  }

  return {
    src: "/hatchery/game/fresh-eggs.webp",
    eyebrow: "Clutch room",
    title: "Follow the clutch from laying through establishment",
    detail: "The clutch art changes with the active reproductive stage instead of remaining a static decoration.",
  };
}

export function ChondroClutchStageArt() {
  const [save, setSave] = useState<LooseSave | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => setSave(readSave());
    const initial = window.setTimeout(refresh, 0);
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    window.addEventListener("arboreal-chondro-breeder-save-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(tick);
      window.removeEventListener("arboreal-chondro-breeder-save-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const art = useMemo(() => chooseArt(save, now), [save, now]);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <div className="overflow-hidden rounded-[26px] border border-emerald-300/10 bg-[radial-gradient(circle_at_left,rgba(16,185,129,.08),transparent_36%),#06100c] shadow-[0_18px_60px_rgba(0,0,0,.18)]">
        <div className="grid items-center gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-5">
          <div className="mx-auto overflow-hidden rounded-[20px] border border-white/[.07] bg-black/30">
            <Image src={art.src} alt="Chondro Breeder clutch progression illustration" width={560} height={560} className="h-auto w-full" />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/48">{art.eyebrow}</div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white">{art.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">{art.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
